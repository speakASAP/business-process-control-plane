const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requiredFiles = [
  'k8s/configmap.yaml',
  'k8s/external-secret.yaml',
  'k8s/pvc.yaml',
  'k8s/deployment.yaml',
  'k8s/service.yaml',
  'k8s/secret.yaml.example',
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
const pvc = read('k8s/pvc.yaml');
const deploy = read('scripts/deploy.sh');
const packageJson = JSON.parse(read('package.json'));

const checks = [
  [configmap, 'BPCP_EVENT_BUS_ENABLED: "true"'],
  [configmap, 'BPCP_DATA_DIR: "/var/lib/bpcp"'],
  [configmap, 'BPCP_EVENTS_EXCHANGE: "bpcp.events"'],
  [configmap, 'BPCP_EVENTS_ROUTING_KEY_PREFIX: "bpcp.process"'],
  [externalSecret, 'secret/prod/runlayer'],
  [externalSecret, 'property: RABBITMQ_URL'],
  [externalSecret, 'secret/prod/business-process-control-plane'],
  [externalSecret, 'BPCP_PROCESS_SIGNING_SECRET'],
  [deployment, 'image: localhost:5000/business-process-control-plane:latest'],
  [deployment, 'configMapRef:'],
  [deployment, 'secretRef:'],
  [deployment, 'mountPath: /var/lib/bpcp'],
  [deployment, 'claimName: business-process-control-plane-data'],
  [deployment, 'path: /health'],
  [service, 'port: 3375'],
  [pvc, 'storage: 1Gi'],
  [deploy, 'npm test'],
  [deploy, 'docker build'],
  [deploy, 'kubectl apply'],
  [deploy, 'kubectl rollout status'],
  [deploy, '/api/events/transport/info'],
];

const failed = checks.filter(([content, marker]) => !content.includes(marker)).map(([, marker]) => marker);
if (failed.length > 0) {
  console.error('Deployment wiring verification failed. Missing markers:');
  for (const marker of failed) console.error(`- ${marker}`);
  process.exit(1);
}

if (packageJson.scripts?.['verify:deployment-wiring'] !== 'node scripts/verify-deployment-wiring.js') {
  console.error('Deployment wiring verification failed. package.json is missing verify:deployment-wiring script.');
  process.exit(1);
}

console.log('BPCP deployment wiring verification passed.');
