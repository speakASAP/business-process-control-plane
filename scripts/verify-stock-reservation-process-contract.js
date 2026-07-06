const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  'docs/orchestrator/2026-07-06-stock-reservation-cross-channel-process-contract.md',
);

const requiredSnippets = [
  '# Stock Reservation Cross-Channel Process Contract',
  '## Intent Preservation Chain',
  'Process id: `stock-reservation-cross-channel-v1`',
  '## Process States',
  '## Process Steps',
  '## Service Ownership Boundaries',
  '## Health Evidence Envelope Schema',
  '"schemaVersion": "bpcp.health-evidence.v1"',
  '"contract": "stock-order-marketplace-business-health.v1"',
  '"processId": "stock-reservation-cross-channel-v1"',
  '## Required Simulation Scenarios Later',
  '[MISSING:',
  '## Validation Result',
];

const requiredScenarioIds = [
  'stock-reservation-cross-channel-stock-authority-pass',
  'stock-reservation-cross-channel-negative-stock-fail',
  'stock-reservation-cross-channel-catalog-overprojection-fail',
  'stock-reservation-cross-channel-reservation-before-acceptance-pass',
  'stock-reservation-cross-channel-missing-reservation-fail',
  'stock-reservation-cross-channel-convergence-pass',
  'stock-reservation-cross-channel-payment-success-finality-pass',
  'stock-reservation-cross-channel-payment-failure-release-pass',
  'stock-reservation-cross-channel-supplier-traceability-blocked',
  'stock-reservation-cross-channel-synthetic-probe-blocked',
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(contractPath)) {
  fail(`Missing contract file: ${contractPath}`);
  process.exit();
}

const contract = fs.readFileSync(contractPath, 'utf8');

for (const snippet of requiredSnippets) {
  if (!contract.includes(snippet)) {
    fail(`Contract missing required snippet: ${snippet}`);
  }
}

for (const scenarioId of requiredScenarioIds) {
  if (!contract.includes(scenarioId)) {
    fail(`Contract missing simulation scenario id: ${scenarioId}`);
  }
}

const forbiddenMutationHints = [
  'kubectl apply',
  './scripts/deploy.sh',
  'npm run start:prod',
  'UPDATE ',
  'DELETE FROM',
  'INSERT INTO',
];

for (const hint of forbiddenMutationHints) {
  if (contract.includes(hint)) {
    fail(`Contract contains forbidden runtime/deploy/mutation hint: ${hint}`);
  }
}

if (!process.exitCode) {
  console.log('PASS: stock reservation cross-channel process contract is source-valid.');
}
