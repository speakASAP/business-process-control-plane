const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = {
  service: fs.readFileSync(path.join(root, 'src/events/event-publisher.service.ts'), 'utf8'),
  controller: fs.readFileSync(path.join(root, 'src/events/events.controller.ts'), 'utf8'),
  module: fs.readFileSync(path.join(root, 'src/events/events.module.ts'), 'utf8'),
  types: fs.readFileSync(path.join(root, 'src/events/process-event.types.ts'), 'utf8'),
  processRegistry: fs.readFileSync(path.join(root, 'src/processes/process-registry.service.ts'), 'utf8'),
  processModule: fs.readFileSync(path.join(root, 'src/processes/process-registry.module.ts'), 'utf8'),
  appModule: fs.readFileSync(path.join(root, 'src/app.module.ts'), 'utf8'),
};

const checks = [
  [files.types, 'bpcp.process-event.v1'],
  [files.types, 'bpcp.process-event-outbox.v1'],
  [files.service, 'process-event-outbox.json'],
  [files.service, 'publishProcessEvent'],
  [files.service, 'local-json-outbox'],
  [files.service, '[MISSING: event bus transport, topic naming, signing, retry, and consumer ack contract]'],
  [files.controller, "@Controller('api/events')"],
  [files.controller, "@Get('outbox')"],
  [files.controller, "@Get('outbox/info')"],
  [files.controller, "@Get('outbox/:processId')"],
  [files.module, 'exports: [EventPublisherService]'],
  [files.processRegistry, 'EventPublisherService'],
  [files.processRegistry, 'EVENT_TYPE_BY_AUDIT_ACTION'],
  [files.processRegistry, "'process.published'"],
  [files.processRegistry, 'LOCAL_EVENT_OUTBOX_CONFIGURED'],
  [files.processModule, 'EventsModule'],
  [files.appModule, 'EventsModule'],
];

const failed = checks.filter(([content, marker]) => !content.includes(marker)).map(([, marker]) => marker);
if (failed.length > 0) {
  console.error('Event publication verification failed. Missing markers:');
  for (const marker of failed) console.error(`- ${marker}`);
  process.exit(1);
}

console.log('BPCP event publication verification passed.');
