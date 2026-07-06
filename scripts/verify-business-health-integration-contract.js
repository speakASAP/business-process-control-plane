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
      'mutatesProduction: false',
      "overallStatus: 'blocked'",
      'Domain services must publish service-owned evidence envelopes before BPCP can aggregate runtime truth.',
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
    label: 'Warehouse verifier',
    path: path.join(githubRoot, 'warehouse-microservice/scripts/verify-business-health-stock-authority-contract.js'),
    snippets: [
      'warehouse.stock_authority_business_health.v1',
      'mutatesWarehouse',
    ],
  },
  {
    label: 'Catalog handoff',
    path: path.join(githubRoot, 'catalog-microservice/docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md'),
    snippets: [
      'Catalog Channel Business Health Handoff',
      'live regression',
      'validation debt',
      'External Marketplace Mutation Blockers',
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
