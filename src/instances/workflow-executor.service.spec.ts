import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowActionDefinition } from '../workflows/workflow.types';

const actions: WorkflowActionDefinition[] = [
  {
    actionId: 'generate',
    type: 'call-service-capability',
    serviceCapabilityRefs: [],
    parameters: { url: 'http://x/generate' },
  },
  {
    actionId: 'await-approval',
    type: 'wait-for-signal',
    dependsOn: ['generate'],
    serviceCapabilityRefs: [],
    parameters: { signalName: 'approval' },
  },
  {
    actionId: 'export',
    type: 'call-service-capability',
    dependsOn: ['await-approval'],
    serviceCapabilityRefs: [],
    parameters: { url: 'http://x/export' },
  },
];

describe('WorkflowExecutorService', () => {
  let executor: WorkflowExecutorService;
  let repo: any;
  let dispatcher: any;
  let workflows: any;
  let state: any;

  beforeEach(() => {
    state = {
      instanceId: 'i1',
      workflowId: 'wf',
      workflowVersion: 1,
      status: 'running',
      context: {},
      wait: null,
      lastError: null,
      steps: [
        { actionId: 'generate', status: 'pending', attempts: 0 },
        { actionId: 'await-approval', status: 'pending', attempts: 0 },
        { actionId: 'export', status: 'pending', attempts: 0 },
      ],
    };

    const manager = {
      update: jest.fn(async (_entity: unknown, _where: unknown, patch: any) => Object.assign(state, patch)),
    };

    repo = {
      withLockedInstance: jest.fn(async (_id: string, fn: any) => fn(state, manager)),
      findSteps: jest.fn(async () => state.steps),
      updateStep: jest.fn(async (_i: string, actionId: string, patch: any) => {
        Object.assign(
          state.steps.find((s: any) => s.actionId === actionId),
          patch,
        );
      }),
      claimSignal: jest.fn(async () => null),
      findById: jest.fn(async () => state),
      createIfAbsent: jest.fn(async () => ({ instance: state, created: true })),
    };

    dispatcher = { execute: jest.fn(async () => ({ ok: true, output: { done: true } })) };
    workflows = { getWorkflow: jest.fn(() => ({ workflowId: 'wf', version: 1, actions })) };

    executor = new WorkflowExecutorService(repo, dispatcher, workflows);
  });

  it('runs the first ready action and halts at the wait', async () => {
    await executor.advance('i1');

    expect(dispatcher.execute).toHaveBeenCalledTimes(1);
    expect(state.status).toBe('waiting');
    expect(state.wait.signalName).toBe('approval');
  });

  it('does not run an action whose dependsOn is unmet, even with no wait in the way', async () => {
    // Two independent actions plus one gated on a step that never succeeds. Without a
    // dependsOn check the gated action would run anyway, so this must fail if gating breaks.
    workflows.getWorkflow.mockReturnValue({
      workflowId: 'wf',
      version: 1,
      actions: [
        { actionId: 'first', type: 'call-service-capability', serviceCapabilityRefs: [], parameters: { url: 'http://x/1' } },
        {
          actionId: 'gated',
          type: 'call-service-capability',
          dependsOn: ['never-runs'],
          serviceCapabilityRefs: [],
          parameters: { url: 'http://x/2' },
        },
      ],
    });
    state.steps = [
      { actionId: 'first', status: 'pending', attempts: 0 },
      { actionId: 'gated', status: 'pending', attempts: 0 },
      { actionId: 'never-runs', status: 'pending', attempts: 0 },
    ];

    await executor.advance('i1');

    const ran = dispatcher.execute.mock.calls.map((c: any[]) => c[0].actionId);
    expect(ran).toContain('first');
    expect(ran).not.toContain('gated');
  });

  it('resumes and completes when the signal arrives', async () => {
    await executor.advance('i1');
    repo.claimSignal.mockResolvedValueOnce({ signalId: 's1', name: 'approval', payload: { by: 'user' } });

    await executor.advance('i1');

    expect(state.status).toBe('completed');
  });

  it('fails the instance and records the error on a permanent action failure', async () => {
    dispatcher.execute.mockResolvedValueOnce({
      ok: false,
      error: { actionId: 'generate', code: 'ACTION_HTTP_ERROR', message: 'bad', permanent: true, occurredAt: 'now' },
    });

    await executor.advance('i1');

    expect(state.status).toBe('failed');
    expect(state.lastError.code).toBe('ACTION_HTTP_ERROR');
  });

  it('never leaves the instance running after a permanent failure', async () => {
    dispatcher.execute.mockResolvedValueOnce({
      ok: false,
      error: { actionId: 'generate', code: 'X', message: 'x', permanent: true, occurredAt: 'now' },
    });

    await executor.advance('i1');

    expect(state.status).not.toBe('running');
  });

  it('keeps the instance running and increments attempts on a transient failure', async () => {
    dispatcher.execute.mockResolvedValueOnce({
      ok: false,
      error: {
        actionId: 'generate',
        code: 'ACTION_TRANSPORT_ERROR',
        message: 'econn',
        permanent: false,
        occurredAt: 'now',
      },
    });

    await executor.advance('i1');

    const step = state.steps.find((s: any) => s.actionId === 'generate');
    expect(step.attempts).toBe(1);
    expect(step.status).toBe('pending');
    expect(state.status).toBe('running');
  });

  it('fails the instance once transient retries are exhausted', async () => {
    state.steps.find((s: any) => s.actionId === 'generate').attempts = 2;
    dispatcher.execute.mockResolvedValueOnce({
      ok: false,
      error: {
        actionId: 'generate',
        code: 'ACTION_TRANSPORT_ERROR',
        message: 'econn',
        permanent: false,
        occurredAt: 'now',
      },
    });

    await executor.advance('i1');

    expect(state.status).toBe('failed');
  });

  it('is a no-op on an already completed instance', async () => {
    state.status = 'completed';

    await executor.advance('i1');

    expect(dispatcher.execute).not.toHaveBeenCalled();
  });

  it('is a no-op on a cancelled instance', async () => {
    state.status = 'cancelled';

    await executor.advance('i1');

    expect(dispatcher.execute).not.toHaveBeenCalled();
  });

  it('completes a workflow whose actions are all already succeeded', async () => {
    state.steps.forEach((s: any) => {
      s.status = 'succeeded';
    });

    await executor.advance('i1');

    expect(state.status).toBe('completed');
  });
});
