import { ActionDispatcherService } from './action-dispatcher.service';
import { WorkflowActionDefinition } from '../workflows/workflow.types';

describe('ActionDispatcherService', () => {
  let service: ActionDispatcherService;
  let fetchMock: jest.Mock;

  const action: WorkflowActionDefinition = {
    actionId: 'call-thing',
    type: 'call-service-capability',
    serviceCapabilityRefs: [],
    parameters: { url: 'http://cv-tuning:3379/api/internal/generate' },
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    service = new ActionDispatcherService(fetchMock as unknown as typeof fetch);
  });

  it('returns the output on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ renderId: 'r1' }) });

    const result = await service.execute(action, {});

    expect(result).toEqual({ ok: true, output: { renderId: 'r1' } });
  });

  it('classifies a 500 as transient', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.permanent).toBe(false);
      expect(result.error.context).toMatchObject({ status: 500, body: 'boom' });
    }
  });

  it('classifies a 429 as transient despite being 4xx', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => 'slow down' });

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.permanent).toBe(false);
  });

  it('classifies a 400 as permanent', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' });

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.permanent).toBe(true);
  });

  it('classifies a 401 as permanent', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.permanent).toBe(true);
  });

  it('never returns an empty success when the call fails', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.permanent).toBe(false);
      expect(result.error.message).toContain('ECONNREFUSED');
    }
  });

  it('rejects an action with no url parameter rather than silently skipping it', async () => {
    const bad: WorkflowActionDefinition = { ...action, parameters: {} };

    const result = await service.execute(bad, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.permanent).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records the actionId on every error so the failure is attributable', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.actionId).toBe('call-thing');
  });

  it('passes the instance context to the capability', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await service.execute(action, { applicationId: 'app-1' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.context).toEqual({ applicationId: 'app-1' });
  });
});

describe('ActionDispatcherService headers and env references', () => {
  let fetchMock: jest.Mock;
  let service: ActionDispatcherService;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    service = new ActionDispatcherService(fetchMock as unknown as typeof fetch);
  });

  afterEach(() => {
    delete process.env.TEST_NUDGE_SECRET;
  });

  const withParams = (parameters: Record<string, unknown>): WorkflowActionDefinition => ({
    actionId: 'call-thing',
    type: 'call-service-capability',
    serviceCapabilityRefs: [],
    parameters: parameters as WorkflowActionDefinition['parameters'],
  });

  it('forwards a headers parameter alongside the content type', async () => {
    await service.execute(
      withParams({ url: 'http://cv-tuning:3379/api/nudges/outcome', headers: { 'x-a': 'b' } }),
      {},
    );

    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers['content-type']).toBe('application/json');
    expect(init.headers['x-a']).toBe('b');
  });

  it('resolves an ${env:VAR} reference so a secret never lives in the workflow document', async () => {
    process.env.TEST_NUDGE_SECRET = 'super-secret';

    await service.execute(
      withParams({
        url: 'http://cv-tuning:3379/api/nudges/outcome',
        headers: { 'x-cv-nudge-secret': '${env:TEST_NUDGE_SECRET}' },
      }),
      {},
    );

    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers['x-cv-nudge-secret']).toBe('super-secret');
  });

  it('fails permanently when a referenced env var is unset, rather than sending an empty header', async () => {
    const result = await service.execute(
      withParams({
        url: 'http://cv-tuning:3379/api/nudges/outcome',
        headers: { 'x-cv-nudge-secret': '${env:TEST_NUDGE_SECRET}' },
      }),
      {},
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.permanent).toBe(true);
      expect(result.error.message).toContain('TEST_NUDGE_SECRET');
    }
    // An unresolved reference must never reach the wire: sending a literal "${env:...}" would
    // look like a wrong secret and be diagnosed as an auth bug rather than a config one.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never echoes a resolved secret into the error context on a failure', async () => {
    process.env.TEST_NUDGE_SECRET = 'super-secret';
    fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'forbidden' });

    const result = await service.execute(
      withParams({
        url: 'http://cv-tuning:3379/api/nudges/outcome',
        headers: { 'x-cv-nudge-secret': '${env:TEST_NUDGE_SECRET}' },
      }),
      {},
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(JSON.stringify(result.error)).not.toContain('super-secret');
  });

  it('resolves an ${env:VAR} reference in the url too', async () => {
    process.env.TEST_NUDGE_SECRET = 'cv-tuning:3379';

    await service.execute(withParams({ url: 'http://${env:TEST_NUDGE_SECRET}/api/x' }), {});

    expect(fetchMock.mock.calls[0][0]).toBe('http://cv-tuning:3379/api/x');
  });

  it('does not send the headers parameter in the body it posts', async () => {
    process.env.TEST_NUDGE_SECRET = 'super-secret';

    await service.execute(
      withParams({
        url: 'http://cv-tuning:3379/api/nudges/outcome',
        headers: { 'x-cv-nudge-secret': '${env:TEST_NUDGE_SECRET}' },
      }),
      {},
    );

    // `parameters` is echoed into the body; a resolved secret there would be logged by every
    // receiver that logs its request body.
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(JSON.stringify(body)).not.toContain('super-secret');
  });
});
