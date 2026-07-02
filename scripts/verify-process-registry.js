const fs = require('fs');
const path = require('path');

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

console.log('BPCP process registry verification passed.');
