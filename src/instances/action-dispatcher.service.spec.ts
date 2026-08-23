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
