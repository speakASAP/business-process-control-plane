import { ServiceCapabilityReference } from '../policies/capability-reference';

export type WorkflowStatus = 'draft' | 'validated' | 'scheduled' | 'active' | 'paused' | 'retired';

export const KNOWN_WORKFLOW_TRIGGER_TYPES = ['product-viewed', 'cart-updated', 'checkout-context-loaded', 'order-paid'] as const;
export type KnownWorkflowTriggerType = (typeof KNOWN_WORKFLOW_TRIGGER_TYPES)[number];
export type WorkflowTriggerType = KnownWorkflowTriggerType | string;

export const KNOWN_WORKFLOW_ACTION_TYPES = [
  'evaluate-policy',
  'call-service-capability',
  'render-experience',
  'snapshot-order-discount',
  'send-notification-template',
  'record-observability-event',
  'wait-for-signal',
] as const;
export type KnownWorkflowActionType = (typeof KNOWN_WORKFLOW_ACTION_TYPES)[number];
export type WorkflowActionType = KnownWorkflowActionType | string;
/**
 * A `headers` parameter carries outbound HTTP headers for a `call-service-capability` action.
 * Values may be `${env:VAR}` references, resolved by the dispatcher at send time — a secret must
 * never be a literal in a workflow document, which is stored, listed, and version-controlled.
 */
export type WorkflowHeaders = Record<string, string>;
export type WorkflowValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | boolean[]
  | WorkflowHeaders;

export interface WorkflowTriggerDefinition {
  type: WorkflowTriggerType;
  sourceService: string;
  eventRef: string;
  correlationKeys: string[];
  missingRuntimeFacts?: string[];
}

export interface WorkflowActionDefinition {
  actionId: string;
  type: WorkflowActionType;
  dependsOn?: string[];
  policyRefs?: string[];
  serviceCapabilityRefs: ServiceCapabilityReference[];
  parameters?: Record<string, WorkflowValue>;
}

export interface WorkflowDefinition {
  schemaVersion: 'bpcp.workflow.v1';
  workflowId: string;
  version: number;
  status: WorkflowStatus;
  description: string;
  appliesToProcessRefs: string[];
  trigger: WorkflowTriggerDefinition;
  actions: WorkflowActionDefinition[];
  requiredCapabilities: ServiceCapabilityReference[];
  missingRuntimeFacts: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowValidationFinding {
  code: string;
  severity: 'pass' | 'warning' | 'fail';
  message: string;
  ref?: ServiceCapabilityReference;
}

export interface WorkflowValidationResult {
  workflowId: string;
  version: number;
  valid: boolean;
  findings: WorkflowValidationFinding[];
}

export interface WaitForSignalParameters {
  signalName: string;
  /** null means wait indefinitely. */
  timeoutMs: number | null;
  onTimeout: 'fail' | 'continue';
}

export function isWaitForSignalAction(action: WorkflowActionDefinition): boolean {
  return action.type === 'wait-for-signal';
}

export function readWaitParameters(action: WorkflowActionDefinition): WaitForSignalParameters {
  const params = action.parameters ?? {};
  const signalName = params.signalName;
  if (typeof signalName !== 'string' || signalName.length === 0) {
    // A defaulted signal name would make the instance wait for something nobody sends.
    throw new Error(`wait-for-signal action "${action.actionId}" is missing a signalName parameter`);
  }

  const rawTimeout = params.timeoutMs;
  const timeoutMs = typeof rawTimeout === 'number' && rawTimeout > 0 ? rawTimeout : null;
  const onTimeout = params.onTimeout === 'continue' ? 'continue' : 'fail';

  return { signalName, timeoutMs, onTimeout };
}
