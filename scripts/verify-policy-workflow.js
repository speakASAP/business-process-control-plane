const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'src/policies/capability-reference.ts',
  'src/policies/policy.types.ts',
  'src/policies/policy-registry.service.ts',
  'src/policies/policy-registry.controller.ts',
  'src/policies/policy-registry.module.ts',
  'src/workflows/workflow.types.ts',
  'src/workflows/workflow-registry.service.ts',
  'src/workflows/workflow-registry.controller.ts',
  'src/workflows/workflow-registry.module.ts',
  'docs/orchestrator/POLICY_WORKFLOW_HANDOFF.md',
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missingFiles.length > 0) {
  console.error('Missing policy/workflow files:');
  for (const file of missingFiles) console.error(`- ${file}`);
  process.exit(1);
}

const policy = fs.readFileSync(path.join(root, 'src/policies/policy-registry.service.ts'), 'utf8');
const workflow = fs.readFileSync(path.join(root, 'src/workflows/workflow-registry.service.ts'), 'utf8');
const capability = fs.readFileSync(path.join(root, 'src/policies/capability-reference.ts'), 'utf8');
const handoff = fs.readFileSync(path.join(root, 'docs/orchestrator/POLICY_WORKFLOW_HANDOFF.md'), 'utf8');

const requiredMarkers = [
  ['policy seed', policy, 'holiday-10-percent-selected-categories'],
  ['policy unknown condition fail-closed', policy, 'UNKNOWN_CONDITION_TYPE'],
  ['policy unknown effect fail-closed', policy, 'UNKNOWN_EFFECT_TYPE'],
  ['workflow product badge seed', workflow, 'product-view-holiday-badge'],
  ['workflow cart evaluation seed', workflow, 'cart-updated-discount-evaluation'],
  ['workflow checkout upsell seed', workflow, 'checkout-upsell-suggestion'],
  ['workflow notification seed', workflow, 'order-paid-holiday-notification'],
  ['workflow unknown action fail-closed', workflow, 'UNKNOWN_WORKFLOW_ACTION_TYPE'],
  ['capability missing ref fail-closed', capability, 'SERVICE_CAPABILITY_REF_MISSING'],
  ['capability missing owner fail-closed', capability, 'SERVICE_OWNER_MISSING'],
  ['missing runtime fact markers', `${policy}\n${workflow}\n${handoff}`, '[MISSING:'],
  ['handoff policies endpoint', handoff, '/api/policies'],
  ['handoff workflows endpoint', handoff, '/api/workflows'],
];

const missingMarkers = requiredMarkers.filter(([, content, marker]) => !content.includes(marker));
if (missingMarkers.length > 0) {
  console.error('Missing policy/workflow markers:');
  for (const [label, , marker] of missingMarkers) console.error(`- ${label}: ${marker}`);
  process.exit(1);
}

console.log('BPCP policy/workflow verification passed.');
