const fs = require('fs');
const path = require('path');

const root = process.cwd();
const required = [
  'README.md',
  'AGENTS.md',
  'package.json',
  'src/main.ts',
  'src/app.module.ts',
  'src/storage/json-file-store.service.ts',
  'src/processes/process-registry.controller.ts',
  'src/capabilities/capability-registry.controller.ts',
  'src/simulation/simulation.controller.ts',
  'src/editor/editor.controller.ts',
  'docs/business-process-control-plane/README.md',
  'docs/intent-preservation/README.md',
  'docs/orchestrator/STATUS.md',
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error('Missing required files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (packageJson.name !== 'business-process-control-plane') {
  console.error(`Unexpected package name: ${packageJson.name}`);
  process.exit(1);
}

const editor = fs.readFileSync(path.join(root, 'src/editor/editor-ui.ts'), 'utf8');
for (const marker of ['drag', 'canvas', 'holiday-discount-2026', 'api/simulate']) {
  if (!editor.includes(marker)) {
    console.error(`Editor UI missing marker: ${marker}`);
    process.exit(1);
  }
}

const processController = fs.readFileSync(path.join(root, 'src/processes/process-registry.controller.ts'), 'utf8');
for (const marker of ['store/info', '/schedule', '/retire', '/audit']) {
  if (!processController.includes(marker)) {
    console.error(`Process controller missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log('BPCP contract verification passed.');
