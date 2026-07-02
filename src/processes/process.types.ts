export type ProcessStatus = 'draft' | 'validated' | 'scheduled' | 'active' | 'paused' | 'retired';

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
  findings: ValidationFinding[];
}
