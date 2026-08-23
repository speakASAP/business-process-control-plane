const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'src/instances/instance.types.ts',
  'src/instances/entities/workflow-instance.entity.ts',
  'src/instances/entities/instance-step.entity.ts',
  'src/instances/entities/instance-signal.entity.ts',
  'src/instances/instance-repository.service.ts',
  'src/instances/action-dispatcher.service.ts',
  'src/instances/workflow-executor.service.ts',
  'src/instances/instance-timeout.service.ts',
  'src/instances/instance.controller.ts',
  'src/instances/instances.module.ts',
  'src/database/database.module.ts',
  'docs/specs/2026-08-22-bpcp-workflow-executor-design.md',
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`missing required file: ${file}`);
  }
}

const migrationsDir = path.join(root, 'src/database/migrations');
if (!fs.existsSync(migrationsDir) || fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.ts')).length === 0) {
  failures.push('no migration found in src/database/migrations');
}

// synchronize:true would let TypeORM rewrite the production schema on boot.
const dbModulePath = path.join(root, 'src/database/database.module.ts');
if (fs.existsSync(dbModulePath)) {
  const dbModule = fs.readFileSync(dbModulePath, 'utf8');
  if (!/synchronize:\s*false/.test(dbModule)) {
    failures.push('database.module.ts must set synchronize: false');
  }
}

const workflowTypesPath = path.join(root, 'src/workflows/workflow.types.ts');
if (fs.existsSync(workflowTypesPath)) {
  const workflowTypes = fs.readFileSync(workflowTypesPath, 'utf8');
  if (!workflowTypes.includes("'wait-for-signal'")) {
    failures.push('wait-for-signal is not registered in KNOWN_WORKFLOW_ACTION_TYPES');
  }
}

// The row lock is the whole reason runtime state moved off the JSON store.
const repoPath = path.join(root, 'src/instances/instance-repository.service.ts');
if (fs.existsSync(repoPath)) {
  const repo = fs.readFileSync(repoPath, 'utf8');
  if (!repo.includes('pessimistic_write')) {
    failures.push('instance-repository.service.ts must lock instances FOR UPDATE (pessimistic_write)');
  }
}

if (failures.length > 0) {
  console.error('verify:instances FAILED');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('verify:instances PASSED');
