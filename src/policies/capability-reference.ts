export interface ServiceCapabilityReference {
  service: string;
  capability: string;
  reason?: string;
}

export type CapabilityFindingSeverity = 'pass' | 'warning' | 'fail';

export interface CapabilityReferenceFinding {
  code: string;
  severity: CapabilityFindingSeverity;
  message: string;
  ref?: ServiceCapabilityReference;
}

interface ServiceCapabilitySnapshot {
  capabilities: string[];
  missing: string[];
}

export const BPCP_SERVICE_CAPABILITY_SNAPSHOT: Record<string, ServiceCapabilitySnapshot> = {
  'marketing-microservice': {
    capabilities: ['campaign-content-ref', 'experience-slot-content', 'upsell-content'],
    missing: ['canonical campaign content API'],
  },
  'catalog-microservice': {
    capabilities: ['product-category-facts', 'product-tags', 'discount-eligibility-facts'],
    missing: ['final holiday eligibility fact schema'],
  },
  '[MISSING: pricing service owner]': {
    capabilities: ['discount-evaluation', 'final-price-quote'],
    missing: ['service owner', 'API contract'],
  },
  '[MISSING: cart service owner]': {
    capabilities: ['discount-line-display', 'quote-to-checkout'],
    missing: ['service owner', 'API contract'],
  },
  'orders-microservice': {
    capabilities: ['applied-discounts-snapshot', 'order-lifecycle-events'],
    missing: ['final snapshot field contract'],
  },
  'invoices-microservice': {
    capabilities: ['invoice-discount-lines'],
    missing: ['legal/tax display constraints'],
  },
  'notifications-microservice': {
    capabilities: ['template-ref-delivery', 'idempotent-notification'],
    missing: ['final paid-order event contract'],
  },
};

export function containsMissingMarker(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes('[MISSING:');
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsMissingMarker(item));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => containsMissingMarker(item));
  }

  return false;
}

export function validateCapabilityRefs(
  refs: ServiceCapabilityReference[],
  context: string,
): CapabilityReferenceFinding[] {
  if (refs.length === 0) {
    return [
      {
        code: 'SERVICE_CAPABILITY_REFS_MISSING',
        severity: 'fail',
        message: `${context} must declare at least one service capability reference.`,
      },
    ];
  }

  return refs.flatMap((ref) => validateCapabilityRef(ref, context));
}

function validateCapabilityRef(ref: ServiceCapabilityReference, context: string): CapabilityReferenceFinding[] {
  const findings: CapabilityReferenceFinding[] = [];
  const service = BPCP_SERVICE_CAPABILITY_SNAPSHOT[ref.service];

  if (containsMissingMarker(ref.service)) {
    findings.push({
      code: 'SERVICE_OWNER_MISSING',
      severity: 'fail',
      message: `${context} references unresolved service owner ${ref.service}.`,
      ref,
    });
  }

  if (!service) {
    findings.push({
      code: 'SERVICE_CAPABILITY_REF_MISSING',
      severity: 'fail',
      message: `${context} references unknown service ${ref.service}.`,
      ref,
    });
    return findings;
  }

  if (containsMissingMarker(ref.capability)) {
    findings.push({
      code: 'SERVICE_CAPABILITY_REF_MISSING',
      severity: 'fail',
      message: `${context} references unresolved capability ${ref.capability}.`,
      ref,
    });
  } else if (!service.capabilities.includes(ref.capability)) {
    findings.push({
      code: 'SERVICE_CAPABILITY_REF_MISSING',
      severity: 'fail',
      message: `${context} references capability ${ref.capability} that is not registered on ${ref.service}.`,
      ref,
    });
  } else if (!containsMissingMarker(ref.service)) {
    findings.push({
      code: 'SERVICE_CAPABILITY_REF_PRESENT',
      severity: 'pass',
      message: `${context} references registered capability ${ref.service}:${ref.capability}.`,
      ref,
    });
  }

  if (service.missing.length > 0) {
    findings.push({
      code: 'SERVICE_CAPABILITY_RUNTIME_FACT_MISSING',
      severity: containsMissingMarker(ref.service) ? 'fail' : 'warning',
      message: `${context} has unresolved capability facts for ${ref.service}:${ref.capability}: ${service.missing.join(', ')}.`,
      ref,
    });
  }

  return findings;
}
