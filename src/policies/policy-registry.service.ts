import { Injectable, NotFoundException } from '@nestjs/common';
import { containsMissingMarker, validateCapabilityRefs } from './capability-reference';
import {
  KNOWN_POLICY_CONDITION_TYPES,
  KNOWN_POLICY_EFFECT_TYPES,
  KnownPolicyConditionType,
  KnownPolicyEffectType,
  PolicyDefinition,
  PolicyValidationFinding,
  PolicyValidationResult,
} from './policy.types';

const HOLIDAY_POLICY_CREATED_AT = '2026-07-02T00:00:00.000Z';

export const HOLIDAY_DISCOUNT_POLICY: PolicyDefinition = {
  schemaVersion: 'bpcp.policy.v1',
  policyId: 'holiday-10-percent-selected-categories',
  version: 1,
  status: 'draft',
  description: 'Apply a 10 percent holiday discount to approved selected-category items for the Holiday Discount 2026 process.',
  appliesToProcessRefs: ['holiday-discount-2026'],
  priority: 100,
  conditions: [
    {
      conditionId: 'holiday-process-window-active',
      type: 'process-window',
      factRef: 'holiday-discount-2026.activeWindow',
      operator: 'between',
      parameters: {
        activeFrom: '2026-12-01T00:00:00Z',
        activeTo: '2027-01-07T23:59:59Z',
      },
    },
    {
      conditionId: 'product-in-selected-holiday-category',
      type: 'category-match',
      factRef: 'catalog.product.categoryRefs',
      operator: 'anyOf',
      parameters: {
        selectedCategoryRefs: ['[MISSING: approved Holiday Discount selected category references]'],
      },
      serviceCapabilityRefs: [
        {
          service: 'catalog-microservice',
          capability: 'discount-eligibility-facts',
          reason: 'Catalog owns product category and eligibility facts for selected-category matching.',
        },
      ],
    },
    {
      conditionId: 'holiday-kill-switch-enabled',
      type: 'kill-switch',
      factRef: 'holiday-discount-2026.killSwitch',
      operator: 'equals',
      value: true,
    },
  ],
  effects: [
    {
      effectId: 'apply-ten-percent-line-discount',
      type: 'percentage-discount',
      target: 'eligible-line-items',
      parameters: {
        percent: 10,
        label: 'Holiday 10%',
        roundingMode: '[MISSING: pricing rounding mode and monetary precision contract]',
      },
      serviceCapabilityRefs: [
        {
          service: '[MISSING: pricing service owner]',
          capability: 'discount-evaluation',
          reason: 'Monetary authority must evaluate and quote the discount.',
        },
      ],
    },
    {
      effectId: 'block-unapproved-discount-stacking',
      type: 'stacking-rule',
      target: 'discount-combinability',
      parameters: {
        allowStacking: false,
        precedence: '[MISSING: approved discount precedence and stacking contract]',
      },
      serviceCapabilityRefs: [
        {
          service: '[MISSING: pricing service owner]',
          capability: 'final-price-quote',
          reason: 'Final quote owner must enforce precedence and prevent unauthorized stacking.',
        },
      ],
    },
  ],
  requiredCapabilities: [
    {
      service: 'catalog-microservice',
      capability: 'discount-eligibility-facts',
      reason: 'Selected-category eligibility source.',
    },
    {
      service: '[MISSING: pricing service owner]',
      capability: 'discount-evaluation',
      reason: 'Discount calculation and final price quote source.',
    },
  ],
  missingRuntimeFacts: [
    '[MISSING: approved Holiday Discount selected category references]',
    '[MISSING: pricing service owner and API contract]',
    '[MISSING: pricing rounding mode and monetary precision contract]',
    '[MISSING: approved discount precedence and stacking contract]',
  ],
  audit: {
    createdBy: 'bpcp-policy-workflow lane',
    source: 'BPCP Holiday Discount plan',
    notes: [
      'Policy registry is in-memory until a persistent policy store is approved.',
      '[MISSING: signed publication and policy audit-log contract]',
    ],
  },
  createdAt: HOLIDAY_POLICY_CREATED_AT,
  updatedAt: HOLIDAY_POLICY_CREATED_AT,
};

@Injectable()
export class PolicyRegistryService {
  private readonly policies = new Map<string, PolicyDefinition>();

  constructor() {
    this.upsertPolicy(HOLIDAY_DISCOUNT_POLICY);
  }

  listPolicies(): PolicyDefinition[] {
    return Array.from(this.policies.values()).sort((a, b) => `${a.policyId}:${a.version}`.localeCompare(`${b.policyId}:${b.version}`));
  }

  getPolicy(policyId: string, version: number): PolicyDefinition {
    const policy = this.policies.get(this.key(policyId, version));
    if (!policy) {
      throw new NotFoundException(`Policy ${policyId}:${version} was not found`);
    }

    return policy;
  }

  validatePolicy(policyId: string, version: number): PolicyValidationResult {
    return this.validatePolicyDefinition(this.getPolicy(policyId, version));
  }

  validatePolicyDefinition(policy: PolicyDefinition): PolicyValidationResult {
    const findings: PolicyValidationFinding[] = [];

    findings.push({
      code: 'POLICY_ID_PRESENT',
      severity: policy.policyId ? 'pass' : 'fail',
      message: 'Policy id must be present.',
    });
    findings.push({
      code: 'POLICY_PROCESS_REFS_PRESENT',
      severity: policy.appliesToProcessRefs.length > 0 ? 'pass' : 'fail',
      message: 'Policy must reference at least one business process.',
    });
    findings.push({
      code: 'POLICY_CONDITIONS_PRESENT',
      severity: policy.conditions.length > 0 ? 'pass' : 'fail',
      message: 'Policy must define at least one condition.',
    });
    findings.push({
      code: 'POLICY_EFFECTS_PRESENT',
      severity: policy.effects.length > 0 ? 'pass' : 'fail',
      message: 'Policy must define at least one effect.',
    });

    for (const condition of policy.conditions) {
      if (!this.isKnownConditionType(condition.type)) {
        findings.push({
          code: 'UNKNOWN_CONDITION_TYPE',
          severity: 'fail',
          message: `Condition ${condition.conditionId} uses unknown condition type ${condition.type}; validation fails closed.`,
        });
      }

      if (containsMissingMarker(condition.factRef) || containsMissingMarker(condition.parameters) || containsMissingMarker(condition.value)) {
        findings.push({
          code: 'POLICY_CONDITION_RUNTIME_FACT_MISSING',
          severity: 'fail',
          message: `Condition ${condition.conditionId} contains unresolved runtime facts; validation fails closed.`,
        });
      }

      if (condition.serviceCapabilityRefs) {
        findings.push(...validateCapabilityRefs(condition.serviceCapabilityRefs, `Policy condition ${condition.conditionId}`));
      }
    }

    for (const effect of policy.effects) {
      if (!this.isKnownEffectType(effect.type)) {
        findings.push({
          code: 'UNKNOWN_EFFECT_TYPE',
          severity: 'fail',
          message: `Effect ${effect.effectId} uses unknown effect type ${effect.type}; validation fails closed.`,
        });
      }

      if (effect.type === 'percentage-discount') {
        const percent = effect.parameters.percent;
        findings.push({
          code: 'PERCENTAGE_DISCOUNT_VALUE_VALID',
          severity: typeof percent === 'number' && percent > 0 && percent <= 100 ? 'pass' : 'fail',
          message: `Effect ${effect.effectId} must define percent as a number between 0 and 100.`,
        });
      }

      if (containsMissingMarker(effect.parameters)) {
        findings.push({
          code: 'POLICY_EFFECT_RUNTIME_FACT_MISSING',
          severity: 'fail',
          message: `Effect ${effect.effectId} contains unresolved runtime facts; validation fails closed.`,
        });
      }

      findings.push(...validateCapabilityRefs(effect.serviceCapabilityRefs, `Policy effect ${effect.effectId}`));
    }

    findings.push(...validateCapabilityRefs(policy.requiredCapabilities, `Policy ${policy.policyId} required capabilities`));

    for (const missingFact of policy.missingRuntimeFacts) {
      findings.push({
        code: 'POLICY_RUNTIME_FACT_MISSING',
        severity: 'fail',
        message: `${missingFact}; policy cannot be published until resolved.`,
      });
    }

    findings.push({
      code: 'POLICY_PERSISTENCE_MISSING',
      severity: 'warning',
      message: '[MISSING: persistent policy store is not implemented in skeleton]',
    });

    return {
      policyId: policy.policyId,
      version: policy.version,
      valid: findings.every((finding) => finding.severity !== 'fail'),
      findings,
    };
  }

  private upsertPolicy(policy: PolicyDefinition): void {
    this.policies.set(this.key(policy.policyId, policy.version), policy);
  }

  private key(policyId: string, version: number): string {
    return `${policyId}:${version}`;
  }

  private isKnownConditionType(type: string): type is KnownPolicyConditionType {
    return (KNOWN_POLICY_CONDITION_TYPES as readonly string[]).includes(type);
  }

  private isKnownEffectType(type: string): type is KnownPolicyEffectType {
    return (KNOWN_POLICY_EFFECT_TYPES as readonly string[]).includes(type);
  }
}
