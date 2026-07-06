import { Injectable } from '@nestjs/common';
import {
  BusinessHealthPlaneKey,
  BusinessHealthReport,
  BusinessHealthStatus,
  EvidenceSummary,
} from './business-health.types';

const PROCESS_ID = 'stock-reservation-cross-channel-v1';
const SCHEMA_VERSION = 'stock-order-marketplace-business-health.v1';
const CHECKPOINT_DOC = 'docs/orchestrator/2026-07-06-business-health-integration-checkpoint.md';
const PROCESS_CONTRACT_DOC = 'docs/orchestrator/2026-07-06-stock-reservation-cross-channel-process-contract.md';

const PLANE_STATUSES: Record<BusinessHealthPlaneKey, BusinessHealthStatus> = {
  controlPlane: 'ready',
  warehouse: 'blocked',
  orders: 'blocked',
  catalog: 'blocked',
  suppliers: 'blocked',
  marketplaces: 'blocked',
};

const EVIDENCE: EvidenceSummary[] = [
  {
    plane: 'controlPlane',
    status: 'ready',
    summary: 'BPCP source checkpoint and process contract exist for the business-health aggregation schema.',
    source: CHECKPOINT_DOC,
    mutatesProduction: false,
  },
  {
    plane: 'warehouse',
    status: 'blocked',
    summary: 'Warehouse handoff exists, but BPCP has no stable runtime evidence envelope to consume yet.',
    source: 'warehouse-microservice/docs/orchestrator/2026-07-06-warehouse-business-health-handoff.md',
    mutatesProduction: false,
  },
  {
    plane: 'orders',
    status: 'blocked',
    summary: 'Orders packet work remains blocked by ownership and correlation-evidence readiness.',
    source: CHECKPOINT_DOC,
    mutatesProduction: false,
  },
  {
    plane: 'catalog',
    status: 'blocked',
    summary: 'Catalog/channel handoff exists, but the projection evidence contract is not yet stable.',
    source: 'catalog-microservice/docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md',
    mutatesProduction: false,
  },
  {
    plane: 'suppliers',
    status: 'blocked',
    summary: 'Suppliers traceability handoff exists, but real supplier readiness must remain distinct from synthetic evidence.',
    source: 'suppliers-microservice/docs/orchestrator/2026-07-06-suppliers-business-health-handoff.md',
    mutatesProduction: false,
  },
  {
    plane: 'marketplaces',
    status: 'blocked',
    summary: 'Marketplace inventory exists, but per-channel readback semantics and mutation policies are unresolved.',
    source: 'docs/orchestrator/2026-07-06-marketplace-channel-business-health-inventory.md',
    mutatesProduction: false,
  },
];

const BLOCKERS = [
  '[MISSING: stable read-only Warehouse stock authority evidence envelope]',
  '[MISSING: stable Orders reservation gate and order/reservation correlation evidence contract]',
  '[MISSING: Catalog/Warehouse/channel availability projection evidence contract]',
  '[MISSING: Suppliers -> Warehouse traceability evidence contract]',
  '[MISSING: per-marketplace read-only availability readback evidence and provider semantics]',
  '[MISSING: payment outcome redaction boundary and finality evidence source]',
  '[MISSING: scheduler owner, cadence, alert routing, and dashboard/report destination]',
  '[MISSING: business health evidence retention policy]',
  '[MISSING: synthetic product/warehouse/channel runtime packet]',
  '[MISSING: approved marketplace sandbox/dry-run/de-list policy for each live channel]',
  '[MISSING: cleanup/retention policy for synthetic orders and reservations]',
];

@Injectable()
export class BusinessHealthService {
  getStockOrderMarketplaceHealth(): BusinessHealthReport {
    return {
      schemaVersion: SCHEMA_VERSION,
      processId: PROCESS_ID,
      generatedAt: new Date().toISOString(),
      mutatesProduction: false,
      overallStatus: 'blocked',
      planes: { ...PLANE_STATUSES },
      evidence: EVIDENCE.map((item) => ({ ...item })),
      blockers: [...BLOCKERS],
      nextAction:
        'Domain services must publish service-owned evidence envelopes before BPCP can aggregate runtime truth.',
      ownershipBoundary: {
        owner: 'business-process-control-plane',
        declaration:
          'BPCP declares integration readiness from committed source checkpoints; domain services own domain truth and mutation authority.',
        forbiddenRuntimeReads: [
          'No filesystem reads of sibling repositories from Nest runtime.',
          'No live stock, order, product, supplier, payment, or marketplace service calls.',
          'No provider, Kubernetes, secret, deploy, or mutation side effects.',
        ],
      },
      intentPreservation: {
        vision:
          'Alfares commerce must only expose sellable stock when service-owned evidence proves fulfillment readiness.',
        goalImpact:
          'Expose the first BPCP API scaffold for monitorable business-health readiness without live mutations.',
        system:
          'BPCP owns process contracts, aggregation schema, audit metadata, and future monitor lifecycle.',
        feature: SCHEMA_VERSION,
        task: 'Return the committed source-only integration-readiness checkpoint through a Nest API.',
        executionPlan:
          'Serve static report data from source code until service-owned evidence adapters and scheduler ownership exist.',
        codingPrompt:
          'Keep the report read-only, preserve blockers, and do not infer domain truth from BPCP.',
        code: 'src/business-health/*',
        validation:
          'npm run build; node scripts/verify-business-health-integration-contract.js; git diff --check',
      },
      sourceRefs: [CHECKPOINT_DOC, PROCESS_CONTRACT_DOC],
    };
  }
}
