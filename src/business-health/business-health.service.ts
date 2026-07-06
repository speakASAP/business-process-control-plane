import { Injectable } from '@nestjs/common';
import { BusinessHealthEvidenceAdapterRunner, CHECKPOINT_DOC, PROCESS_CONTRACT_DOC } from './business-health.evidence-adapter-runner';
import { BusinessHealthPlaneKey, BusinessHealthReport, BusinessHealthStatus } from './business-health.types';

const PROCESS_ID = 'stock-reservation-cross-channel-v1';
const SCHEMA_VERSION = 'stock-order-marketplace-business-health.v1';

const GLOBAL_BLOCKERS = [
  '[MISSING: payment outcome redaction boundary and finality evidence source]',
  '[MISSING: scheduler owner, cadence, alert routing, and dashboard/report destination]',
  '[MISSING: business health evidence retention policy]',
  '[MISSING: synthetic product/warehouse/channel runtime packet]',
  '[MISSING: cleanup/retention policy for synthetic orders and reservations]',
];

@Injectable()
export class BusinessHealthService {
  constructor(private readonly adapterRunner: BusinessHealthEvidenceAdapterRunner) {}

  getStockOrderMarketplaceHealth(): BusinessHealthReport {
    const adapterResults = this.adapterRunner.runAdapters();
    const planes = adapterResults.reduce(
      (accumulator, result) => ({ ...accumulator, [result.plane]: result.status }),
      {} as Record<BusinessHealthPlaneKey, BusinessHealthStatus>,
    );
    const adapterBlockers = adapterResults.flatMap((result) => result.blockers);
    const blockers = [...new Set([...adapterBlockers, ...GLOBAL_BLOCKERS])];
    const sourceRefs = [
      ...new Set([CHECKPOINT_DOC, PROCESS_CONTRACT_DOC, ...adapterResults.flatMap((result) => result.sourceRefs)]),
    ];

    return {
      schemaVersion: SCHEMA_VERSION,
      processId: PROCESS_ID,
      generatedAt: new Date().toISOString(),
      mutatesProduction: false,
      overallStatus: this.computeOverallStatus(
        adapterResults.map((result) => result.status),
        blockers,
      ),
      planes,
      evidence: adapterResults.map((result) => ({ ...result.evidence })),
      blockers,
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
          'Run in-process read-only evidence adapters over committed source references until service-owned runtime evidence exists.',
        codingPrompt:
          'Keep the report read-only, preserve blockers, and do not infer domain truth from BPCP.',
        code: 'src/business-health/*',
        validation:
          'npm run build; node scripts/verify-business-health-integration-contract.js; git diff --check',
      },
      sourceRefs,
    };
  }

  private computeOverallStatus(
    statuses: BusinessHealthStatus[],
    blockers: string[],
  ): Exclude<BusinessHealthStatus, 'ready'> {
    if (statuses.includes('fail')) return 'fail';
    if (blockers.length > 0 || statuses.includes('blocked')) return 'blocked';
    if (statuses.includes('warn')) return 'warn';
    return 'pass';
  }
}
