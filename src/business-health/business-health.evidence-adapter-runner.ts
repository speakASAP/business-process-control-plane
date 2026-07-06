import { Injectable } from '@nestjs/common';
import {
  BusinessHealthEvidenceAdapter,
  BusinessHealthEvidenceAdapterResult,
  BusinessHealthMutationBoundary,
  BusinessHealthPlaneKey,
  BusinessHealthStatus,
  EvidenceSummary,
} from './business-health.types';

export const CHECKPOINT_DOC = 'docs/orchestrator/2026-07-06-business-health-integration-checkpoint.md';
export const PROCESS_CONTRACT_DOC = 'docs/orchestrator/2026-07-06-stock-reservation-cross-channel-process-contract.md';

const READ_ONLY_MUTATION_BOUNDARY: BusinessHealthMutationBoundary = {
  mutatesProduction: false,
  mutationType: 'none',
  declaration:
    'In-process BPCP adapter runner returns committed source references only; it performs no sibling repo filesystem reads, service calls, provider calls, deploys, Kubernetes access, secret reads, or production mutations.',
};

interface StaticAdapterDefinition {
  plane: BusinessHealthPlaneKey;
  status: BusinessHealthStatus;
  summary: string;
  sourceRefs: string[];
  blockers: string[];
}

class StaticBusinessHealthEvidenceAdapter implements BusinessHealthEvidenceAdapter {
  readonly plane: BusinessHealthPlaneKey;

  constructor(private readonly definition: StaticAdapterDefinition) {
    this.plane = definition.plane;
  }

  collectEvidence(): BusinessHealthEvidenceAdapterResult {
    const evidence: EvidenceSummary = {
      plane: this.definition.plane,
      status: this.definition.status,
      summary: this.definition.summary,
      source: this.definition.sourceRefs[0],
      sourceRefs: [...this.definition.sourceRefs],
      blockers: [...this.definition.blockers],
      mutationBoundary: { ...READ_ONLY_MUTATION_BOUNDARY },
      mutatesProduction: false,
    };

    return {
      plane: this.definition.plane,
      status: this.definition.status,
      evidence,
      blockers: [...this.definition.blockers],
      sourceRefs: [...this.definition.sourceRefs],
      mutationBoundary: { ...READ_ONLY_MUTATION_BOUNDARY },
    };
  }
}

const ADAPTER_DEFINITIONS: StaticAdapterDefinition[] = [
  {
    plane: 'controlPlane',
    status: 'ready',
    summary:
      'BPCP source checkpoint, process contract, and in-process adapter runner exist for the business-health aggregation schema.',
    sourceRefs: [CHECKPOINT_DOC, PROCESS_CONTRACT_DOC, 'src/business-health/business-health.evidence-adapter-runner.ts'],
    blockers: [],
  },
  {
    plane: 'warehouse',
    status: 'warn',
    summary: 'Warehouse read-only stock authority evidence endpoint exists; live stock-row proof remains runtime-packet gated.',
    sourceRefs: [
      'warehouse-microservice/src/business-health/business-health.controller.ts',
      'warehouse-microservice/src/business-health/business-health.service.ts',
      'warehouse-microservice/docs/orchestrator/2026-07-06-warehouse-business-health-handoff.md',
    ],
    blockers: [
      '[MISSING: approved live Warehouse stock authority runtime evidence packet for target products]',
      '[MISSING: exact target product/warehouse/reservation readback scope for live stock-row proof]',
    ],
  },
  {
    plane: 'orders',
    status: 'warn',
    summary:
      'Orders read-only order/reservation correlation evidence endpoint exists; live order proof remains runtime-packet gated.',
    sourceRefs: [
      'orders-microservice/src/business-health/business-health.controller.ts',
      'orders-microservice/src/business-health/business-health.service.ts',
      'orders-microservice/docs/orchestrator/2026-07-06-orders-business-health-handoff.md',
    ],
    blockers: [
      '[MISSING: approved live Orders/Warehouse runtime evidence packet for target order/product/channel]',
      '[MISSING: exact target order/product/channel and warehouse reservation lookup scope for live correlation proof]',
      '[MISSING: approved cleanup/payment/provider boundary packet if runtime proof creates or cancels a real order]',
    ],
  },
  {
    plane: 'catalog',
    status: 'warn',
    summary:
      'Catalog read-only channel availability evidence endpoint exists; live product/channel proof remains runtime-packet gated.',
    sourceRefs: [
      'catalog-microservice/src/business-health/business-health.controller.ts',
      'catalog-microservice/src/business-health/business-health.service.ts',
      'catalog-microservice/docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md',
    ],
    blockers: [
      '[MISSING: approved live Catalog channel availability runtime evidence packet for target products]',
      '[MISSING: exact target product IDs and channel list for live business-health proof]',
      '[MISSING: approved protected Catalog service token or JWT for live coverage/projection/readiness checks]',
      '[MISSING: channel-owner credentials/ownership packet for marketplace-side listing status proof]',
    ],
  },
  {
    plane: 'suppliers',
    status: 'warn',
    summary:
      'Suppliers read-only supplier-to-Warehouse traceability endpoint exists; real supplier procurement readiness remains data-gated.',
    sourceRefs: [
      'suppliers-microservice/src/business-health/business-health.controller.ts',
      'suppliers-microservice/src/business-health/business-health.service.ts',
      'suppliers-microservice/docs/orchestrator/2026-07-06-suppliers-business-health-handoff.md',
    ],
    blockers: [
      '[MISSING: real supplier display name, stable supplier code, business owner, technical owner, and escalation path]',
      '[MISSING: authentication shape and runtime credential reference key names]',
      '[MISSING: product identity mapping, Catalog category mapping prerequisites, and Catalog write constraints]',
      '[MISSING: warehouse/location mapping, dropship versus supplier-managed semantics, and Warehouse mutation approval boundary]',
      '[MISSING: owner validation evidence and explicit approval for any runtime import, deployment, Catalog write, or Warehouse mutation]',
    ],
  },
  {
    plane: 'marketplaces',
    status: 'warn',
    summary:
      'Marketplace inventory exists; Aukro read-only channel readback endpoint exists; Heureka read-only channel readback endpoint exists; Allegro read-only channel readback endpoint exists; remaining channel envelopes and live provider proofs are gated.',
    sourceRefs: [
      'docs/orchestrator/2026-07-06-marketplace-channel-business-health-inventory.md',
      'aukro/services/aukro-service/src/business-health/business-health.controller.ts',
      'aukro/services/aukro-service/src/business-health/business-health.service.ts',
      'aukro/docs/orchestrator/2026-07-06-aukro-business-health-handoff.md',
      'heureka/services/heureka-service/src/business-health/business-health.controller.ts',
      'heureka/services/heureka-service/src/business-health/business-health.service.ts',
      'heureka/docs/orchestrator/2026-07-06-heureka-business-health-handoff.md',
      'allegro/services/allegro-service/src/business-health/business-health.controller.ts',
      'allegro/services/allegro-service/src/business-health/business-health.service.ts',
      'allegro/docs/orchestrator/2026-07-06-allegro-business-health-handoff.md',
    ],
    blockers: [
      '[MISSING: FlipFlop service-owned channel readback business-health endpoint]',
      '[MISSING: Bazos service-owned channel readback business-health endpoint]',
      '[MISSING: approved live Aukro readback packet]',
      '[MISSING: approved live Heureka readback packet]',
      '[MISSING: approved live Allegro readback packet]',
      '[MISSING: approved marketplace sandbox/dry-run/de-list policy for each live channel]',
    ],
  },
];

const ADAPTER_ORDER: BusinessHealthPlaneKey[] = [
  'controlPlane',
  'warehouse',
  'orders',
  'catalog',
  'suppliers',
  'marketplaces',
];

@Injectable()
export class BusinessHealthEvidenceAdapterRunner {
  private readonly adapters: BusinessHealthEvidenceAdapter[] = ADAPTER_DEFINITIONS.map(
    (definition) => new StaticBusinessHealthEvidenceAdapter(definition),
  );

  runAdapters(): BusinessHealthEvidenceAdapterResult[] {
    return ADAPTER_ORDER.map((plane) => this.requireAdapter(plane).collectEvidence());
  }

  private requireAdapter(plane: BusinessHealthPlaneKey): BusinessHealthEvidenceAdapter {
    const adapter = this.adapters.find((candidate) => candidate.plane === plane);
    if (!adapter) {
      throw new Error(`Missing business health evidence adapter for ${plane}`);
    }
    return adapter;
  }
}
