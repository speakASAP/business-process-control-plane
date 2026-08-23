import {
  KNOWN_WORKFLOW_ACTION_TYPES,
  WorkflowActionDefinition,
  isWaitForSignalAction,
  readWaitParameters,
} from './workflow.types';

describe('wait-for-signal action', () => {
  it('is a known action type', () => {
    expect(KNOWN_WORKFLOW_ACTION_TYPES).toContain('wait-for-signal');
  });

  it('identifies a wait action', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'await-approval',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: { signalName: 'approval', timeoutMs: 604800000, onTimeout: 'fail' },
    };
    expect(isWaitForSignalAction(action)).toBe(true);
  });

  it('does not identify a normal action as a wait', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'generate',
      type: 'call-service-capability',
      serviceCapabilityRefs: [],
    };
    expect(isWaitForSignalAction(action)).toBe(false);
  });

  it('reads wait parameters with defaults', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'await-approval',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: { signalName: 'approval' },
    };
    expect(readWaitParameters(action)).toEqual({ signalName: 'approval', timeoutMs: null, onTimeout: 'fail' });
  });

  it('reads an explicit timeout and onTimeout', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'await-approval',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: { signalName: 'approval', timeoutMs: 1000, onTimeout: 'continue' },
    };
    expect(readWaitParameters(action)).toEqual({ signalName: 'approval', timeoutMs: 1000, onTimeout: 'continue' });
  });

  it('treats a non-positive timeout as no timeout rather than an instant expiry', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'await-approval',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: { signalName: 'approval', timeoutMs: 0 },
    };
    expect(readWaitParameters(action).timeoutMs).toBeNull();
  });

  it('rejects a wait action with no signalName rather than defaulting one', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'bad',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: {},
    };
    expect(() => readWaitParameters(action)).toThrow(/signalName/);
  });

  it('rejects a wait action with no parameters at all', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'bad',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
    };
    expect(() => readWaitParameters(action)).toThrow(/signalName/);
  });
});
