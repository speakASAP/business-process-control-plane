export type BusinessHealthStatus = 'pass' | 'warn' | 'fail' | 'blocked' | 'ready';

export type BusinessHealthPlaneKey =
  | 'controlPlane'
  | 'warehouse'
  | 'orders'
  | 'catalog'
  | 'suppliers'
  | 'marketplaces';

export interface BusinessHealthMutationBoundary {
  mutatesProduction: false;
  mutationType: 'none';
  declaration: string;
}

export interface EvidenceSummary {
  plane: BusinessHealthPlaneKey;
  status: BusinessHealthStatus;
  summary: string;
  source: string;
  sourceRefs: string[];
  blockers: string[];
  mutationBoundary: BusinessHealthMutationBoundary;
  mutatesProduction: false;
}

export interface BusinessHealthEvidenceAdapterResult {
  plane: BusinessHealthPlaneKey;
  status: BusinessHealthStatus;
  evidence: EvidenceSummary;
  blockers: string[];
  sourceRefs: string[];
  mutationBoundary: BusinessHealthMutationBoundary;
}

export interface BusinessHealthEvidenceAdapter {
  readonly plane: BusinessHealthPlaneKey;
  collectEvidence(): BusinessHealthEvidenceAdapterResult;
}

export interface BusinessHealthOwnershipBoundary {
  owner: 'business-process-control-plane';
  declaration: string;
  forbiddenRuntimeReads: string[];
}

export interface IntentPreservationSummary {
  vision: string;
  goalImpact: string;
  system: string;
  feature: string;
  task: string;
  executionPlan: string;
  codingPrompt: string;
  code: string;
  validation: string;
}

export interface BusinessHealthReport {
  schemaVersion: 'stock-order-marketplace-business-health.v1';
  processId: 'stock-reservation-cross-channel-v1';
  generatedAt: string;
  mutatesProduction: false;
  overallStatus: Exclude<BusinessHealthStatus, 'ready'>;
  planes: Record<BusinessHealthPlaneKey, BusinessHealthStatus>;
  evidence: EvidenceSummary[];
  blockers: string[];
  nextAction: string;
  ownershipBoundary: BusinessHealthOwnershipBoundary;
  intentPreservation: IntentPreservationSummary;
  sourceRefs: string[];
}
