export type SimulationProcessStatus = 'draft' | 'validated' | 'scheduled' | 'active' | 'paused' | 'retired';

export type SimulationScenarioId =
  | 'holiday-discount-eligible-category'
  | 'holiday-discount-ineligible-category'
  | 'holiday-discount-expired-process'
  | 'holiday-discount-paused-kill-switch'
  | 'holiday-discount-order-snapshot-immutable';

export type SimulationDecisionCode =
  | 'APPLY_DISCOUNT'
  | 'NOT_ELIGIBLE'
  | 'PROCESS_NOT_SUPPORTED'
  | 'PROCESS_NOT_STARTED'
  | 'PROCESS_EXPIRED'
  | 'CONTROLLED_OFF';

export type SimulationDecisionReason =
  | 'PROCESS_SUPPORTED'
  | 'PROCESS_NOT_SUPPORTED'
  | 'PROCESS_ACTIVE_WINDOW'
  | 'PROCESS_NOT_STARTED'
  | 'PROCESS_EXPIRED'
  | 'PROCESS_PAUSED'
  | 'KILL_SWITCH_ACTIVE'
  | 'ELIGIBLE_CATEGORY'
  | 'CATEGORY_NOT_ELIGIBLE'
  | 'ORDER_SNAPSHOT_PRESENT';

export type SimulationGateSeverity = 'pass' | 'warning' | 'fail';

export interface SimulationRequest {
  scenarioId?: SimulationScenarioId | string;
  processId: string;
  processVersion: number;
  productCategoryIds?: string[];
  cartSubtotal?: number;
  currentDate?: string;
  processStatus?: SimulationProcessStatus;
  killSwitchActive?: boolean;
  orderSnapshot?: SimulationOrderSnapshot;
}

export interface SimulationProcessFixture {
  processId: string;
  processVersion: number;
  policyId: string;
  activeFrom: string;
  activeTo: string;
  eligibleCategoryIds: string[];
  discountPercent: number;
  defaultDate: string;
  defaultStatus: SimulationProcessStatus;
}

export interface SimulationAppliedDiscount {
  processId: string;
  processVersion: number;
  policyId: string;
  amount: number;
}

export interface SimulationOrderSnapshot {
  snapshotId: string;
  capturedAt: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  appliedDiscounts: SimulationAppliedDiscount[];
}

export interface SimulationOrderSnapshotExpectation {
  immutable: true;
  expectation: 'preserve-existing-order-snapshot';
  status: 'snapshot-preserved' | 'snapshot-preserved-despite-new-quote';
  snapshot: {
    snapshotId: string;
    subtotal: number;
    discountTotal: number;
    total: number;
  };
  simulatedQuote: {
    subtotal: number;
    discountTotal: number;
    total: number;
  };
  message: string;
}

export interface SimulationValidationGate {
  code: string;
  severity: SimulationGateSeverity;
  passed: boolean;
  message: string;
}

export interface SimulationDecision {
  code: SimulationDecisionCode;
  eligible: boolean;
  reasons: SimulationDecisionReason[];
}

export interface SimulationResponse {
  schemaVersion: 'bpcp.simulation-result.v1';
  scenarioId?: string;
  processId: string;
  processVersion: number;
  processStatus: SimulationProcessStatus;
  currentDate: string;
  productCategoryIds: string[];
  activeDate: boolean;
  eligibleCategory: boolean;
  eligible: boolean;
  subtotal: number;
  discountTotal: number;
  total: number;
  appliedDiscounts: SimulationAppliedDiscount[];
  decision: SimulationDecision;
  validationGates: SimulationValidationGate[];
  orderSnapshotExpectation?: SimulationOrderSnapshotExpectation;
  warnings: string[];
}

export interface SimulationScenarioExpectation {
  decision: SimulationDecisionCode;
  eligible: boolean;
  activeDate: boolean;
  eligibleCategory: boolean;
  discountTotal: number;
  total: number;
  reasons: SimulationDecisionReason[];
  orderSnapshotImmutable?: boolean;
}

export interface SimulationScenarioDefinition {
  id: SimulationScenarioId;
  title: string;
  purpose: string;
  request: SimulationRequest;
  expected: SimulationScenarioExpectation;
  warnings: string[];
}

export interface SimulationScenarioSummary {
  id: SimulationScenarioId;
  title: string;
  purpose: string;
  expected: SimulationScenarioExpectation;
  warnings: string[];
}
