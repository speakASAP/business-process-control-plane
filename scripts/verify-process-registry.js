const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const service = fs.readFileSync(path.join(root, 'src/processes/process-registry.service.ts'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/processes/process.types.ts'), 'utf8');
const store = fs.readFileSync(path.join(root, 'src/storage/json-file-store.service.ts'), 'utf8');

const checks = [
  [service, 'ProcessStoreSnapshot'],
  [service, 'appendAudit'],
  [service, 'scheduleProcess'],
  [service, 'publishProcess'],
  [service, 'pauseProcess'],
  [service, 'retireProcess'],
  [service, 'holiday-discount-2026'],
  [types, 'bpcp.process-audit.v1'],
  [types, 'bpcp.process-store.v1'],
  [store, 'writeJson'],
  [store, 'BPCP_DATA_DIR'],
];

const failed = checks.filter(([content, marker]) => !content.includes(marker)).map(([, marker]) => marker);
if (failed.length > 0) {
  console.error('Process registry verification failed. Missing markers:');
  for (const marker of failed) console.error(`- ${marker}`);
  process.exit(1);
}

const packageRoot = path.join(root, 'process-registry');
const packageFiles = [
  'MANIFEST.json',
  'README.md',
  'registry.collection.json',
  'definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json',
  'docs/ADR-001-flipflop-process-runtime-path.md',
  'docs/PROCESS-REGISTRY-STORAGE-ACCESS-MODEL.md',
  'docs/PROCESS-REGISTRY-VALIDATION-CONTRACT.md',
  'reports/PROCESS-REGISTRY-VALIDATION-REPORT.md',
  'reports/PACKAGE-SMOKE-REPORT.md',
  'schemas/process-definition.schema.json',
  'schemas/process-event-envelope.schema.json',
  'schemas/process-registry-collection.schema.json',
  'validators/validate-process-definition.mjs',
  'validators/validate-process-event-envelope.mjs',
  'validators/validate-process-registry-collection.mjs',
];

if (!fs.existsSync(packageRoot)) {
  console.error('Process registry package verification failed. Missing process-registry directory.');
  process.exit(1);
}

const missingPackageFiles = packageFiles.filter((relativePath) => !fs.existsSync(path.join(packageRoot, relativePath)));
if (missingPackageFiles.length > 0) {
  console.error('Process registry package verification failed. Missing package files:');
  for (const file of missingPackageFiles) console.error(`- ${file}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'MANIFEST.json'), 'utf8'));
if (manifest.process_key !== 'flipflop.successful_customer_journey.v1') {
  console.error(`Process registry package verification failed. Unexpected process key: ${manifest.process_key}`);
  process.exit(1);
}
if (manifest.runtime_ready !== false || manifest.status !== 'draft-package') {
  console.error('Process registry package verification failed. FlipFlop package must remain draft-package and runtime_ready=false until approval/runtime blockers are resolved.');
  process.exit(1);
}

const readme = fs.readFileSync(path.join(packageRoot, 'README.md'), 'utf8');
const adr = fs.readFileSync(path.join(packageRoot, 'docs/ADR-001-flipflop-process-runtime-path.md'), 'utf8');
const report = fs.readFileSync(path.join(packageRoot, 'reports/PROCESS-REGISTRY-VALIDATION-REPORT.md'), 'utf8');
const packageSmoke = fs.readFileSync(path.join(packageRoot, 'reports/PACKAGE-SMOKE-REPORT.md'), 'utf8');
const packageMarkers = [
  [readme, 'business-process-control-plane is the source-of-truth repo'],
  [adr, 'Camunda 8 / Zeebe'],
  [adr, 'Temporal'],
  [adr, 'Flowable'],
  [adr, 'n8n'],
  [adr, 'Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation'],
  [report, 'zero-active runtime-blocking condition'],
  [packageSmoke, 'source-of-truth repo for process-registry package placement'],
];
const missingPackageMarkers = packageMarkers
  .filter(([content, marker]) => !content.includes(marker))
  .map(([, marker]) => marker);
if (missingPackageMarkers.length > 0) {
  console.error('Process registry package verification failed. Missing package markers:');
  for (const marker of missingPackageMarkers) console.error(`- ${marker}`);
  process.exit(1);
}

function runPackageValidator(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: packageRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`Process registry package validator failed: node ${args.join(' ')}`);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(result.status || 1);
  }
}

runPackageValidator([
  'validators/validate-process-definition.mjs',
  'definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json',
  '--expect',
  'pass',
]);
runPackageValidator([
  'validators/validate-process-definition.mjs',
  'definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json',
  '--require-runtime-ready',
  '--expect',
  'fail',
]);
runPackageValidator([
  'validators/validate-process-event-envelope.mjs',
  'fixtures/valid-blocked-event-envelope.json',
  '--expect',
  'pass',
]);
runPackageValidator([
  'validators/validate-process-event-envelope.mjs',
  'fixtures/invalid-blocked-event-envelope-missing-reason.json',
  '--expect',
  'fail',
]);
runPackageValidator([
  'validators/validate-process-registry-collection.mjs',
  'fixtures/registry-valid.collection.json',
  '--process-key',
  'flipflop.successful_customer_journey.v1',
  '--expect',
  'pass',
]);
runPackageValidator([
  'validators/validate-process-registry-collection.mjs',
  'fixtures/registry-duplicate-active.collection.json',
  '--process-key',
  'flipflop.successful_customer_journey.v1',
  '--expect',
  'fail',
]);
runPackageValidator([
  'validators/validate-process-registry-collection.mjs',
  'fixtures/registry-zero-active.collection.json',
  '--process-key',
  'flipflop.successful_customer_journey.v1',
  '--expect',
  'fail',
]);
runPackageValidator([
  'validators/validate-process-registry-collection.mjs',
  'fixtures/registry-runtime-reader-write.collection.json',
  '--process-key',
  'flipflop.successful_customer_journey.v1',
  '--expect',
  'fail',
]);
runPackageValidator([
  'validators/validate-process-registry-collection.mjs',
  'registry.collection.json',
  '--process-key',
  'flipflop.successful_customer_journey.v1',
  '--expect',
  'fail',
]);

console.log('BPCP process registry verification passed, including FlipFlop process-registry package checks.');
