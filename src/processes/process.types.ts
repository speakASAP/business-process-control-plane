export type ProcessStatus = 'draft' | 'validated' | 'scheduled' | 'active' | 'paused' | 'retired';

export type ProcessAuditAction =
  | 'created'
  | 'validated'
  | 'scheduled'
  | 'published'
  | 'paused'
  | 'retired'
  | 'seeded';

export interface BusinessProcessDefinition {
  schemaVersion: 'bpcp.process.v1';
  processId: string;
  version: number;
  status: ProcessStatus;
  activeFrom?: string;
  activeTo?: string;
  policyRefs: string[];
  workflowRefs: string[];
  campaignRefs: string[];
  killSwitch: boolean;
  createdAt: string;
  updatedAt: string;
  lastValidation?: ProcessValidationResult;
}

export interface ValidationFinding {
  code: string;
  severity: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface ProcessValidationResult {
  processId: string;
  version: number;
  valid: boolean;
  validatedAt: string;
  findings: ValidationFinding[];
}

export interface ProcessAuditEvent {
  schemaVersion: 'bpcp.process-audit.v1';
  id: string;
  processId: string;
  version: number;
  action: ProcessAuditAction;
  actor: string;
  createdAt: string;
  details: Record<string, unknown>;
}

export interface ProcessStoreSnapshot {
  schemaVersion: 'bpcp.process-store.v1';
  processes: BusinessProcessDefinition[];
  auditEvents: ProcessAuditEvent[];
}
