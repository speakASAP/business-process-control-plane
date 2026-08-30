const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requiredFiles = [
  'k8s/configmap.yaml',
  'k8s/external-secret.yaml',
  'k8s/deployment.yaml',
  'k8s/service.yaml',
  'k8s/secret.yaml.example',
  'deploy.config.sh',
  'scripts/deploy.sh',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error('Deployment wiring verification failed. Missing files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const configmap = read('k8s/configmap.yaml');
const externalSecret = read('k8s/external-secret.yaml');
const deployment = read('k8s/deployment.yaml');
const service = read('k8s/service.yaml');
const secretExample = read('k8s/secret.yaml.example');
const deployConfig = read('deploy.config.sh');
// deploy.sh became a shim delegating to shared/scripts/deploy.sh (commit c6bfdf7), so the
// deployment steps live there now. Follow the shim rather than grepping an exec line.
const localDeploy = read('scripts/deploy.sh');
const sharedDeployPath = path.join(root, '../shared/scripts/deploy.sh');
const deploy = /shared\/scripts\/deploy\.sh/.test(localDeploy) && fs.existsSync(sharedDeployPath)
  ? fs.readFileSync(sharedDeployPath, 'utf8')
  : localDeploy;
const packageJson = JSON.parse(read('package.json'));

const checks = [
  [configmap, 'AUTH_SERVICE_URL: "http://auth-microservice.statex-apps.svc.cluster.local:3370"'],
  [configmap, 'AUTH_VALIDATION_PATH: "/api/auth/validate"'],
  [configmap, 'AUTH_VALIDATION_METHOD: "GET"'],
  [configmap, 'BPCP_EVENT_BUS_ENABLED: "true"'],
  [configmap, 'BPCP_EVENTS_EXCHANGE: "bpcp.events"'],
  [configmap, 'BPCP_EVENTS_ROUTING_KEY_PREFIX: "bpcp.process"'],
  [externalSecret, 'secret/prod/runlayer'],
  [externalSecret, 'property: RABBITMQ_URL'],
  [externalSecret, 'secret/prod/business-process-control-plane'],
  [externalSecret, 'BPCP_PROCESS_SIGNING_SECRET'],
  [externalSecret, 'BPCP_DATABASE_URL'],
  [deployment, 'image: localhost:5000/business-process-control-plane:latest'],
  [deployment, 'configMapRef:'],
  [deployment, 'secretRef:'],
  [deployment, 'type: Recreate'],
  [deployment, 'path: /health'],
  [deployment, 'name: workflow-seeds'],
  [service, 'port: 3375'],
  [secretExample, 'BPCP_DATABASE_URL'],
  [deployConfig, 'MANIFESTS=(configmap.yaml external-secret.yaml service.yaml deployment.yaml)'],
  // The shared runner orchestrates via functions rather than inline commands, so assert
  // the phases it must perform, not the literal shell strings it used to contain.
  [deploy, 'deploy_build_and_push_images'],
  [deploy, 'deploy_apply_manifests'],
  [deploy, 'deploy_verify_health'],
  [deploy, 'kubectl rollout status'],
  [localDeploy, 'shared/scripts/deploy.sh'],
];

const failed = checks.filter(([content, marker]) => !content.includes(marker)).map(([, marker]) => marker);
if (failed.length > 0) {
  console.error('Deployment wiring verification failed. Missing markers:');
  for (const marker of failed) console.error(`- ${marker}`);
  process.exit(1);
}

if (configmap.includes('BPCP_DATA_DIR') || deployment.includes('/var/lib/bpcp') || deployConfig.includes('pvc.yaml')) {
  console.error('Deployment wiring verification failed. Legacy file/PVC runtime-store wiring is still present.');
  process.exit(1);
}

if (packageJson.scripts?.['verify:deployment-wiring'] !== 'node scripts/verify-deployment-wiring.js') {
  console.error('Deployment wiring verification failed. package.json is missing verify:deployment-wiring script.');
  process.exit(1);
}

console.log('BPCP deployment wiring verification passed.');
