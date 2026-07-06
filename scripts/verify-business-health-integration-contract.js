const fs = require('fs');
const path = require('path');

const bpcpRoot = process.cwd();
const githubRoot = path.resolve(bpcpRoot, '..');

const checks = [
  {
    label: 'BPCP master plan',
    path: path.join(bpcpRoot, 'docs/orchestrator/2026-07-06-stock-order-marketplace-business-health-master-plan.md'),
    snippets: [
      'stock-order-marketplace-business-health-v1',
      'stock-reservation-cross-channel-v1',
      'Orders live transaction packet | blocked',
    ],
  },
  {
    label: 'BPCP process contract',
    path: path.join(bpcpRoot, 'docs/orchestrator/2026-07-06-stock-reservation-cross-channel-process-contract.md'),
    snippets: [
      'Process id: `stock-reservation-cross-channel-v1`',
      '"schemaVersion": "bpcp.health-evidence.v1"',
      '"contract": "stock-order-marketplace-business-health.v1"',
      'Synthetic transaction execution',
    ],
  },
  {
    label: 'BPCP marketplace inventory',
    path: path.join(bpcpRoot, 'docs/orchestrator/2026-07-06-marketplace-channel-business-health-inventory.md'),
    snippets: [
      'Bazos',
      'Aukro',
      'Allegro',
      'Heureka',
      'FlipFlop',
      'no external API call',
    ],
  },
  {
    label: 'BPCP integration checkpoint',
    path: path.join(bpcpRoot, 'docs/orchestrator/2026-07-06-business-health-integration-checkpoint.md'),
    snippets: [
      'stock-order-marketplace-business-health.v1',
      'Business Health Report Shape',
      'BPCP source-only aggregator scaffold',
      'Synthetic end-to-end transaction probing remains blocked',
    ],
  },
  {
    label: 'BPCP business health module',
    path: path.join(bpcpRoot, 'src/business-health/business-health.module.ts'),
    snippets: [
      'BusinessHealthController',
      'BusinessHealthEvidenceAdapterRunner',
      'BusinessHealthService',
      'export class BusinessHealthModule',
    ],
  },
  {
    label: 'BPCP business health controller',
    path: path.join(bpcpRoot, 'src/business-health/business-health.controller.ts'),
    snippets: [
      "@Controller('api/business-health')",
      "@Get('stock-order-marketplace')",
      'getStockOrderMarketplaceHealth',
    ],
  },
  {
    label: 'BPCP business health service',
    path: path.join(bpcpRoot, 'src/business-health/business-health.service.ts'),
    snippets: [
      'stock-order-marketplace-business-health.v1',
      'stock-reservation-cross-channel-v1',
      'adapterRunner.runAdapters()',
      'computeOverallStatus',
      'mutatesProduction: false',
      'Domain services must publish service-owned evidence envelopes before BPCP can aggregate runtime truth.',
    ],
  },
  {
    label: 'BPCP business health adapter runner',
    path: path.join(bpcpRoot, 'src/business-health/business-health.evidence-adapter-runner.ts'),
    snippets: [
      'BusinessHealthEvidenceAdapterRunner',
      'BusinessHealthEvidenceAdapter',
      'runAdapters()',
      "plane: 'controlPlane'",
      "plane: 'warehouse'",
      "status: 'warn'",
      'Warehouse read-only stock authority evidence endpoint exists',
      'approved live Warehouse stock authority runtime evidence packet',
      "plane: 'orders'",
      'Orders read-only order/reservation correlation evidence endpoint exists',
      'approved live Orders/Warehouse runtime evidence packet',
      "plane: 'catalog'",
      'Catalog read-only channel availability evidence endpoint exists',
      'approved live Catalog channel availability runtime evidence packet',
      "plane: 'suppliers'",
      "plane: 'marketplaces'",
      'READ_ONLY_MUTATION_BOUNDARY',
      'mutatesProduction: false',
    ],
  },
  {
    label: 'BPCP business health types',
    path: path.join(bpcpRoot, 'src/business-health/business-health.types.ts'),
    snippets: [
      'BusinessHealthReport',
      'BusinessHealthPlaneKey',
      'BusinessHealthStatus',
      'EvidenceSummary',
      'BusinessHealthEvidenceAdapter',
      'BusinessHealthEvidenceAdapterResult',
      'BusinessHealthMutationBoundary',
    ],
  },
  {
    label: 'Warehouse handoff',
    path: path.join(githubRoot, 'warehouse-microservice/docs/orchestrator/2026-07-06-warehouse-business-health-handoff.md'),
    snippets: [
      'warehouse.stock_authority_business_health.v1',
      'stock-order-marketplace-business-health.v1',
      'mutatesWarehouse',
      'mutatesWarehouse false',
      '[MISSING:',
    ],
  },
  {
    label: 'Warehouse business health controller',
    path: path.join(githubRoot, 'warehouse-microservice/src/business-health/business-health.controller.ts'),
    snippets: [
      "@Controller('business-health')",
      '@Public()',
      "@Get('stock-authority')",
      'getStockAuthorityEnvelope',
    ],
  },
  {
    label: 'Warehouse business health service',
    path: path.join(githubRoot, 'warehouse-microservice/src/business-health/business-health.service.ts'),
    snippets: [
      "const ENDPOINT = '/api/business-health/stock-authority' as const;",
      'warehouse.stock_authority_business_health.v1',
      'stock-order-marketplace-business-health.v1',
      'runtimeDataQueried: false',
      'productionDbQueried: false',
      'liveSyntheticMutationAuthorized: false',
      'Keep live synthetic Warehouse mutation blocked',
    ],
  },
  {
    label: 'Warehouse business health types',
    path: path.join(githubRoot, 'warehouse-microservice/src/business-health/business-health.types.ts'),
    snippets: [
      'StockAuthorityBusinessHealthEnvelope',
      "endpoint: '/api/business-health/stock-authority'",
      'mutatesWarehouse: false',
      'productionDbQueried: false',
    ],
  },
  {
    label: 'Warehouse verifier',
    path: path.join(githubRoot, 'warehouse-microservice/scripts/verify-business-health-stock-authority-contract.js'),
    snippets: [
      'warehouse.stock_authority_business_health.v1',
      'mutatesWarehouse',
    ],
  },
  {
    label: 'Orders handoff',
    path: path.join(githubRoot, 'orders-microservice/docs/orchestrator/2026-07-06-orders-business-health-handoff.md'),
    snippets: [
      'Orders Business Health Handoff',
      'orders.order_reservation_correlation_business_health.v1',
      'stock-order-marketplace-business-health.v1',
      'reservation-before-order-acceptance',
      '[MISSING:',
    ],
  },
  {
    label: 'Orders business health controller',
    path: path.join(githubRoot, 'orders-microservice/src/business-health/business-health.controller.ts'),
    snippets: [
      "@Controller('business-health')",
      '@Public()',
      "@Get('order-reservation-correlation')",
      'getOrderReservationCorrelation',
    ],
  },
  {
    label: 'Orders business health service',
    path: path.join(githubRoot, 'orders-microservice/src/business-health/business-health.service.ts'),
    snippets: [
      "const ENDPOINT = '/api/business-health/order-reservation-correlation' as const;",
      'orders.order_reservation_correlation_business_health.v1',
      'stock-order-marketplace-business-health.v1',
      'mutatesOrders: false',
      'mutatesWarehouse: false',
      'mutatesPayments: false',
      'runtimeDataQueried: false',
      'productionDbQueried: false',
      'liveSyntheticMutationAuthorized: false',
      'approved live Orders/Warehouse runtime evidence packet',
    ],
  },
  {
    label: 'Orders business health types',
    path: path.join(githubRoot, 'orders-microservice/src/business-health/business-health.types.ts'),
    snippets: [
      'OrderReservationCorrelationBusinessHealthEnvelope',
      "endpoint: '/api/business-health/order-reservation-correlation'",
      'mutatesOrders: false',
      'mutatesWarehouse: false',
      'mutatesPayments: false',
      'productionDbQueried: false',
    ],
  },
  {
    label: 'Orders verifier',
    path: path.join(githubRoot, 'orders-microservice/scripts/verify-business-health-orders-reservation-contract.js'),
    snippets: [
      'orders.order_reservation_correlation_business_health.v1',
      'forbiddenEndpointPatternsChecked',
      'mutatesOrders',
    ],
  },
  {
    label: 'Catalog handoff',
    path: path.join(githubRoot, 'catalog-microservice/docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md'),
    snippets: [
      'Catalog Channel Business Health Handoff',
      'catalog.channel_availability_business_health.v1',
      'stock-order-marketplace-business-health.v1',
      'live regression',
      'validation debt',
      'External Marketplace Mutation Blockers',
    ],
  },
  {
    label: 'Catalog business health controller',
    path: path.join(githubRoot, 'catalog-microservice/src/business-health/business-health.controller.ts'),
    snippets: [
      '@Controller("business-health")',
      '@Get("channel-availability")',
      'getChannelAvailabilityEnvelope',
    ],
  },
  {
    label: 'Catalog business health service',
    path: path.join(githubRoot, 'catalog-microservice/src/business-health/business-health.service.ts'),
    snippets: [
      'const ENDPOINT = "/api/business-health/channel-availability" as const;',
      'catalog.channel_availability_business_health.v1',
      'stock-order-marketplace-business-health.v1',
      'runtimeDataQueried: false',
      'productionDbQueried: false',
      'liveSyntheticMutationAuthorized: false',
      'approved live Catalog channel availability runtime evidence packet',
    ],
  },
  {
    label: 'Catalog business health types',
    path: path.join(githubRoot, 'catalog-microservice/src/business-health/business-health.types.ts'),
    snippets: [
      'CatalogChannelAvailabilityBusinessHealthEnvelope',
      'endpoint: "/api/business-health/channel-availability"',
      'mutatesCatalog: false',
      'mutatesWarehouse: false',
      'mutatesMarketplace: false',
      'productionDbQueried: false',
    ],
  },
  {
    label: 'Catalog verifier',
    path: path.join(githubRoot, 'catalog-microservice/scripts/verify-business-health-catalog-channel-contract.js'),
    snippets: [
      'catalog.channel_availability_business_health.v1',
      'mutatesCatalog',
      'forbiddenBusinessHealthPatternsChecked',
    ],
  },
  {
    label: 'Suppliers handoff',
    path: path.join(githubRoot, 'suppliers-microservice/docs/orchestrator/2026-07-06-suppliers-business-health-handoff.md'),
    snippets: [
      'Suppliers Business-Health Handoff',
      'synthetic_traceability_runtime_complete',
      'real_supplier_procurement_ready',
      'The monitor must not collapse synthetic evidence into real supplier readiness',
    ],
  },
  {
    label: 'Suppliers verifier',
    path: path.join(githubRoot, 'suppliers-microservice/scripts/verify-business-health-suppliers-contract.js'),
    snippets: [
      'checkedSnippets',
      'missingMarkers',
    ],
  },
];

const forbiddenSnippets = [
  'kubectl apply',
  './scripts/deploy.sh',
  'DROP TABLE',
  'DELETE FROM',
  'UPDATE stock',
  'INSERT INTO stock',
];

const runtimeSourceChecks = [
  'src/business-health/business-health.controller.ts',
  'src/business-health/business-health.evidence-adapter-runner.ts',
  'src/business-health/business-health.module.ts',
  'src/business-health/business-health.service.ts',
  'src/business-health/business-health.types.ts',
];

const forbiddenRuntimeSnippets = [
  'readFileSync',
  'readdirSync',
  'writeFileSync',
  'existsSync',
  'createReadStream',
  'fetch(',
  'axios',
  'HttpService',
  'ClientProxy',
  'child_process',
  'exec(',
  'spawn(',
  'kubectl',
  './scripts/deploy.sh',
  'process.env',
  '@nestjs/schedule',
];

const summary = {
  schemaVersion: 'stock-order-marketplace-business-health.integration-check.v1',
  processId: 'stock-reservation-cross-channel-v1',
  mutatesProduction: false,
  checkedAt: new Date().toISOString(),
  checkedFiles: [],
  missing: [],
  forbidden: [],
  blockersPreserved: 0,
};

function readFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    summary.missing.push(`${label}: missing file ${filePath}`);
    return '';
  }
  const text = fs.readFileSync(filePath, 'utf8');
  summary.checkedFiles.push({
    label,
    path: filePath,
    bytes: Buffer.byteLength(text),
    lines: text.split('\n').length,
  });
  return text;
}

for (const check of checks) {
  const text = readFile(check.path, check.label);
  if (!text) continue;

  for (const snippet of check.snippets) {
    if (!text.includes(snippet)) {
      summary.missing.push(`${check.label}: missing snippet ${snippet}`);
    }
  }

  for (const forbidden of forbiddenSnippets) {
    if (text.includes(forbidden)) {
      summary.forbidden.push(`${check.label}: forbidden snippet ${forbidden}`);
    }
  }

  summary.blockersPreserved += (text.match(/\[MISSING:|\[UNKNOWN:/g) || []).length;
}

for (const runtimePath of runtimeSourceChecks) {
  const text = readFile(path.join(bpcpRoot, runtimePath), `Runtime source boundary ${runtimePath}`);
  if (!text) continue;

  for (const forbidden of forbiddenRuntimeSnippets) {
    if (text.includes(forbidden)) {
      summary.forbidden.push(`${runtimePath}: forbidden runtime snippet ${forbidden}`);
    }
  }
}

const bpcpProcessVerifier = path.join(bpcpRoot, 'scripts/verify-stock-reservation-process-contract.js');
if (!fs.existsSync(bpcpProcessVerifier)) {
  summary.missing.push(`BPCP process verifier missing file ${bpcpProcessVerifier}`);
}

if (summary.blockersPreserved < 20) {
  summary.missing.push(`Expected at least 20 preserved [MISSING]/[UNKNOWN] blockers, got ${summary.blockersPreserved}`);
}

if (summary.missing.length > 0 || summary.forbidden.length > 0) {
  console.error(JSON.stringify({ ...summary, status: 'fail' }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ...summary, status: 'pass' }, null, 2));
