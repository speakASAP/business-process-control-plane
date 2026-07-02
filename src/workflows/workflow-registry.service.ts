import { Injectable, NotFoundException } from '@nestjs/common';
import { containsMissingMarker, validateCapabilityRefs } from '../policies/capability-reference';
import {
  KNOWN_WORKFLOW_ACTION_TYPES,
  KNOWN_WORKFLOW_TRIGGER_TYPES,
  KnownWorkflowActionType,
  KnownWorkflowTriggerType,
  WorkflowDefinition,
  WorkflowValidationFinding,
  WorkflowValidationResult,
} from './workflow.types';

const HOLIDAY_WORKFLOW_CREATED_AT = '2026-07-02T00:00:00.000Z';
const HOLIDAY_POLICY_REF = 'holiday-10-percent-selected-categories';

export const HOLIDAY_DISCOUNT_WORKFLOWS: WorkflowDefinition[] = [
  {
    schemaVersion: 'bpcp.workflow.v1',
    workflowId: 'product-view-holiday-badge',
    version: 1,
    status: 'draft',
    description: 'Evaluate product eligibility and render the Holiday Discount badge on product-view surfaces.',
    appliesToProcessRefs: ['holiday-discount-2026'],
    trigger: {
      type: 'product-viewed',
      sourceService: 'storefront-web',
      eventRef: '[MISSING: storefront product-view event contract]',
      correlationKeys: ['processId', 'productId', 'sessionId'],
      missingRuntimeFacts: ['[MISSING: storefront product-view event contract]'],
    },
    actions: [
      {
        actionId: 'evaluate-holiday-policy-for-product',
        type: 'evaluate-policy',
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: 'catalog-microservice',
            capability: 'discount-eligibility-facts',
            reason: 'Resolve selected-category eligibility facts for the viewed product.',
          },
        ],
      },
      {
        actionId: 'render-holiday-product-badge',
        type: 'render-experience',
        dependsOn: ['evaluate-holiday-policy-for-product'],
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: 'marketing-microservice',
            capability: 'experience-slot-content',
            reason: 'Marketing owns badge copy/content references for storefront slots.',
          },
        ],
        parameters: {
          slot: 'product-view-holiday-badge',
          campaignRef: 'holiday-2026-main',
        },
      },
    ],
    requiredCapabilities: [
      { service: 'catalog-microservice', capability: 'discount-eligibility-facts' },
      { service: 'marketing-microservice', capability: 'experience-slot-content' },
    ],
    missingRuntimeFacts: ['[MISSING: storefront product-view event contract]'],
    createdAt: HOLIDAY_WORKFLOW_CREATED_AT,
    updatedAt: HOLIDAY_WORKFLOW_CREATED_AT,
  },
  {
    schemaVersion: 'bpcp.workflow.v1',
    workflowId: 'cart-updated-discount-evaluation',
    version: 1,
    status: 'draft',
    description: 'Re-evaluate discount eligibility when the cart changes and request a fail-closed monetary quote.',
    appliesToProcessRefs: ['holiday-discount-2026'],
    trigger: {
      type: 'cart-updated',
      sourceService: '[MISSING: cart service owner]',
      eventRef: '[MISSING: cart updated event contract]',
      correlationKeys: ['processId', 'cartId', 'customerId'],
      missingRuntimeFacts: ['[MISSING: cart updated event contract]'],
    },
    actions: [
      {
        actionId: 'evaluate-holiday-policy-for-cart',
        type: 'evaluate-policy',
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          { service: 'catalog-microservice', capability: 'discount-eligibility-facts' },
        ],
      },
      {
        actionId: 'request-holiday-discount-quote',
        type: 'call-service-capability',
        dependsOn: ['evaluate-holiday-policy-for-cart'],
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: '[MISSING: pricing service owner]',
            capability: 'discount-evaluation',
            reason: 'Pricing owner must calculate monetary discount and fail closed on invalid input.',
          },
        ],
      },
      {
        actionId: 'display-holiday-cart-discount-line',
        type: 'call-service-capability',
        dependsOn: ['request-holiday-discount-quote'],
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: '[MISSING: cart service owner]',
            capability: 'discount-line-display',
            reason: 'Cart owner must display the accepted quote without owning monetary calculation.',
          },
        ],
      },
    ],
    requiredCapabilities: [
      { service: 'catalog-microservice', capability: 'discount-eligibility-facts' },
      { service: '[MISSING: pricing service owner]', capability: 'discount-evaluation' },
      { service: '[MISSING: cart service owner]', capability: 'discount-line-display' },
    ],
    missingRuntimeFacts: [
      '[MISSING: cart service owner and API contract]',
      '[MISSING: pricing service owner and API contract]',
      '[MISSING: cart updated event contract]',
    ],
    createdAt: HOLIDAY_WORKFLOW_CREATED_AT,
    updatedAt: HOLIDAY_WORKFLOW_CREATED_AT,
  },
  {
    schemaVersion: 'bpcp.workflow.v1',
    workflowId: 'checkout-upsell-suggestion',
    version: 1,
    status: 'draft',
    description: 'Suggest eligible Holiday Discount upsells during checkout without moving pricing authority into BPCP.',
    appliesToProcessRefs: ['holiday-discount-2026'],
    trigger: {
      type: 'checkout-context-loaded',
      sourceService: '[MISSING: cart service owner]',
      eventRef: '[MISSING: checkout context event contract]',
      correlationKeys: ['processId', 'cartId', 'customerId'],
      missingRuntimeFacts: ['[MISSING: checkout context event contract]'],
    },
    actions: [
      {
        actionId: 'evaluate-holiday-policy-for-checkout',
        type: 'evaluate-policy',
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          { service: 'catalog-microservice', capability: 'discount-eligibility-facts' },
        ],
      },
      {
        actionId: 'select-holiday-upsell-content',
        type: 'render-experience',
        dependsOn: ['evaluate-holiday-policy-for-checkout'],
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: 'marketing-microservice',
            capability: 'upsell-content',
            reason: 'Marketing owns upsell content references.',
          },
        ],
        parameters: {
          slot: 'checkout-holiday-upsell',
          campaignRef: 'holiday-2026-main',
        },
      },
      {
        actionId: 'quote-holiday-upsell-price',
        type: 'call-service-capability',
        dependsOn: ['select-holiday-upsell-content'],
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: '[MISSING: pricing service owner]',
            capability: 'final-price-quote',
            reason: 'Pricing owner must quote upsell totals before checkout acceptance.',
          },
        ],
      },
    ],
    requiredCapabilities: [
      { service: 'catalog-microservice', capability: 'discount-eligibility-facts' },
      { service: 'marketing-microservice', capability: 'upsell-content' },
      { service: '[MISSING: pricing service owner]', capability: 'final-price-quote' },
    ],
    missingRuntimeFacts: [
      '[MISSING: cart service owner and checkout context event contract]',
      '[MISSING: pricing service owner and final quote API contract]',
    ],
    createdAt: HOLIDAY_WORKFLOW_CREATED_AT,
    updatedAt: HOLIDAY_WORKFLOW_CREATED_AT,
  },
  {
    schemaVersion: 'bpcp.workflow.v1',
    workflowId: 'order-paid-holiday-notification',
    version: 1,
    status: 'draft',
    description: 'After an order is paid, preserve the applied discount snapshot and send the approved Holiday Discount notification template.',
    appliesToProcessRefs: ['holiday-discount-2026'],
    trigger: {
      type: 'order-paid',
      sourceService: 'orders-microservice',
      eventRef: '[MISSING: final paid-order event contract]',
      correlationKeys: ['processId', 'orderId', 'customerId'],
      missingRuntimeFacts: ['[MISSING: final paid-order event contract]'],
    },
    actions: [
      {
        actionId: 'snapshot-holiday-discount-on-order',
        type: 'snapshot-order-discount',
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: 'orders-microservice',
            capability: 'applied-discounts-snapshot',
            reason: 'Orders own immutable order discount snapshots.',
          },
        ],
      },
      {
        actionId: 'send-holiday-paid-order-notification',
        type: 'send-notification-template',
        dependsOn: ['snapshot-holiday-discount-on-order'],
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: 'notifications-microservice',
            capability: 'template-ref-delivery',
            reason: 'Notifications own template execution and idempotent delivery.',
          },
        ],
        parameters: {
          templateRef: '[MISSING: approved Holiday Discount paid-order notification template ref]',
        },
      },
      {
        actionId: 'record-holiday-discount-observability',
        type: 'record-observability-event',
        dependsOn: ['send-holiday-paid-order-notification'],
        policyRefs: [HOLIDAY_POLICY_REF],
        serviceCapabilityRefs: [
          {
            service: 'orders-microservice',
            capability: 'order-lifecycle-events',
            reason: 'Orders provide the lifecycle correlation source until observability ownership is finalized.',
          },
        ],
        parameters: {
          eventBus: '[MISSING: event bus owner, transport, topic, and publication contract]',
        },
      },
    ],
    requiredCapabilities: [
      { service: 'orders-microservice', capability: 'applied-discounts-snapshot' },
      { service: 'orders-microservice', capability: 'order-lifecycle-events' },
      { service: 'notifications-microservice', capability: 'template-ref-delivery' },
    ],
    missingRuntimeFacts: [
      '[MISSING: final paid-order event contract]',
      '[MISSING: approved Holiday Discount paid-order notification template ref]',
      '[MISSING: event bus owner, transport, topic, and publication contract]',
    ],
    createdAt: HOLIDAY_WORKFLOW_CREATED_AT,
    updatedAt: HOLIDAY_WORKFLOW_CREATED_AT,
  },
];

@Injectable()
export class WorkflowRegistryService {
  private readonly workflows = new Map<string, WorkflowDefinition>();

  constructor() {
    for (const workflow of HOLIDAY_DISCOUNT_WORKFLOWS) {
      this.upsertWorkflow(workflow);
    }
  }

  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).sort((a, b) => `${a.workflowId}:${a.version}`.localeCompare(`${b.workflowId}:${b.version}`));
  }

  getWorkflow(workflowId: string, version: number): WorkflowDefinition {
    const workflow = this.workflows.get(this.key(workflowId, version));
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId}:${version} was not found`);
    }

    return workflow;
  }

  validateWorkflow(workflowId: string, version: number): WorkflowValidationResult {
    return this.validateWorkflowDefinition(this.getWorkflow(workflowId, version));
  }

  validateWorkflowDefinition(workflow: WorkflowDefinition): WorkflowValidationResult {
    const findings: WorkflowValidationFinding[] = [];

    findings.push({
      code: 'WORKFLOW_ID_PRESENT',
      severity: workflow.workflowId ? 'pass' : 'fail',
      message: 'Workflow id must be present.',
    });
    findings.push({
      code: 'WORKFLOW_PROCESS_REFS_PRESENT',
      severity: workflow.appliesToProcessRefs.length > 0 ? 'pass' : 'fail',
      message: 'Workflow must reference at least one business process.',
    });
    findings.push({
      code: 'WORKFLOW_ACTIONS_PRESENT',
      severity: workflow.actions.length > 0 ? 'pass' : 'fail',
      message: 'Workflow must define at least one action.',
    });

    if (!this.isKnownTriggerType(workflow.trigger.type)) {
      findings.push({
        code: 'UNKNOWN_WORKFLOW_TRIGGER_TYPE',
        severity: 'fail',
        message: `Workflow ${workflow.workflowId} uses unknown trigger type ${workflow.trigger.type}; validation fails closed.`,
      });
    }

    if (containsMissingMarker(workflow.trigger.sourceService) || containsMissingMarker(workflow.trigger.eventRef)) {
      findings.push({
        code: 'WORKFLOW_TRIGGER_RUNTIME_FACT_MISSING',
        severity: 'fail',
        message: `Workflow ${workflow.workflowId} trigger has unresolved runtime facts; validation fails closed.`,
      });
    }

    for (const missingFact of workflow.trigger.missingRuntimeFacts ?? []) {
      findings.push({
        code: 'WORKFLOW_TRIGGER_RUNTIME_FACT_MISSING',
        severity: 'fail',
        message: `${missingFact}; workflow trigger cannot be published until resolved.`,
      });
    }

    const actionIds = new Set(workflow.actions.map((action) => action.actionId));
    for (const action of workflow.actions) {
      if (!this.isKnownActionType(action.type)) {
        findings.push({
          code: 'UNKNOWN_WORKFLOW_ACTION_TYPE',
          severity: 'fail',
          message: `Action ${action.actionId} uses unknown action type ${action.type}; validation fails closed.`,
        });
      }

      for (const dependency of action.dependsOn ?? []) {
        findings.push({
          code: 'WORKFLOW_ACTION_DEPENDENCY_PRESENT',
          severity: actionIds.has(dependency) ? 'pass' : 'fail',
          message: `Action ${action.actionId} dependency ${dependency} must reference another action in the same workflow.`,
        });
      }

      for (const policyRef of action.policyRefs ?? []) {
        findings.push({
          code: 'WORKFLOW_POLICY_REF_PRESENT',
          severity: policyRef === HOLIDAY_POLICY_REF ? 'pass' : 'fail',
          message: `Action ${action.actionId} policy ref ${policyRef} must resolve to a known policy seed.`,
        });
      }

      if (containsMissingMarker(action.parameters)) {
        findings.push({
          code: 'WORKFLOW_ACTION_RUNTIME_FACT_MISSING',
          severity: 'fail',
          message: `Action ${action.actionId} contains unresolved runtime facts; validation fails closed.`,
        });
      }

      findings.push(...validateCapabilityRefs(action.serviceCapabilityRefs, `Workflow action ${action.actionId}`));
    }

    findings.push(...validateCapabilityRefs(workflow.requiredCapabilities, `Workflow ${workflow.workflowId} required capabilities`));

    for (const missingFact of workflow.missingRuntimeFacts) {
      findings.push({
        code: 'WORKFLOW_RUNTIME_FACT_MISSING',
        severity: 'fail',
        message: `${missingFact}; workflow cannot be published until resolved.`,
      });
    }

    findings.push({
      code: 'WORKFLOW_PERSISTENCE_MISSING',
      severity: 'warning',
      message: '[MISSING: persistent workflow store is not implemented in skeleton]',
    });

    return {
      workflowId: workflow.workflowId,
      version: workflow.version,
      valid: findings.every((finding) => finding.severity !== 'fail'),
      findings,
    };
  }

  private upsertWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(this.key(workflow.workflowId, workflow.version), workflow);
  }

  private key(workflowId: string, version: number): string {
    return `${workflowId}:${version}`;
  }

  private isKnownTriggerType(type: string): type is KnownWorkflowTriggerType {
    return (KNOWN_WORKFLOW_TRIGGER_TYPES as readonly string[]).includes(type);
  }

  private isKnownActionType(type: string): type is KnownWorkflowActionType {
    return (KNOWN_WORKFLOW_ACTION_TYPES as readonly string[]).includes(type);
  }
}
