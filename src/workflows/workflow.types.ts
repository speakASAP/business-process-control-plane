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
] as const;
export type KnownWorkflowActionType = (typeof KNOWN_WORKFLOW_ACTION_TYPES)[number];
export type WorkflowActionType = KnownWorkflowActionType | string;
export type WorkflowValue = string | number | boolean | string[] | number[] | boolean[];

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
