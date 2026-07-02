import { ServiceCapabilityReference } from './capability-reference';

export type PolicyStatus = 'draft' | 'validated' | 'scheduled' | 'active' | 'paused' | 'retired';

export const KNOWN_POLICY_CONDITION_TYPES = ['process-window', 'category-match', 'customer-segment', 'kill-switch'] as const;
export type KnownPolicyConditionType = (typeof KNOWN_POLICY_CONDITION_TYPES)[number];
export type PolicyConditionType = KnownPolicyConditionType | string;

export const KNOWN_POLICY_EFFECT_TYPES = ['percentage-discount', 'stacking-rule', 'display-badge'] as const;
export type KnownPolicyEffectType = (typeof KNOWN_POLICY_EFFECT_TYPES)[number];
export type PolicyEffectType = KnownPolicyEffectType | string;

export type PolicyOperator = 'equals' | 'notEquals' | 'in' | 'notIn' | 'anyOf' | 'allOf' | 'between' | 'exists';
export type PolicyValue = string | number | boolean | string[] | number[] | boolean[];

export interface PolicyConditionDefinition {
  conditionId: string;
  type: PolicyConditionType;
  factRef: string;
  operator: PolicyOperator;
  value?: PolicyValue;
  parameters?: Record<string, PolicyValue>;
  serviceCapabilityRefs?: ServiceCapabilityReference[];
}

export interface PolicyEffectDefinition {
  effectId: string;
  type: PolicyEffectType;
  target: string;
  parameters: Record<string, PolicyValue>;
  serviceCapabilityRefs: ServiceCapabilityReference[];
}

export interface PolicyAuditMetadata {
  createdBy: string;
  source: string;
  notes: string[];
}

export interface PolicyDefinition {
  schemaVersion: 'bpcp.policy.v1';
  policyId: string;
  version: number;
  status: PolicyStatus;
  description: string;
  appliesToProcessRefs: string[];
  priority: number;
  conditions: PolicyConditionDefinition[];
  effects: PolicyEffectDefinition[];
  requiredCapabilities: ServiceCapabilityReference[];
  missingRuntimeFacts: string[];
  audit: PolicyAuditMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyValidationFinding {
  code: string;
  severity: 'pass' | 'warning' | 'fail';
  message: string;
  ref?: ServiceCapabilityReference;
}

export interface PolicyValidationResult {
  policyId: string;
  version: number;
  valid: boolean;
  findings: PolicyValidationFinding[];
}
