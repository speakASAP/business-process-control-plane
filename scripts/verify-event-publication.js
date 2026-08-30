const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = {
  service: fs.readFileSync(path.join(root, 'src/events/event-publisher.service.ts'), 'utf8'),
  controller: fs.readFileSync(path.join(root, 'src/events/events.controller.ts'), 'utf8'),
  module: fs.readFileSync(path.join(root, 'src/events/events.module.ts'), 'utf8'),
  types: fs.readFileSync(path.join(root, 'src/events/process-event.types.ts'), 'utf8'),
  repository: fs.readFileSync(path.join(root, 'src/events/process-event-outbox.repository.ts'), 'utf8'),
  entity: fs.readFileSync(path.join(root, 'src/events/entities/process-event-outbox.entity.ts'), 'utf8'),
  migration: fs.readFileSync(
    path.join(root, 'src/database/migrations/1756660000000-CreateProcessRegistryOutboxTables.ts'),
    'utf8',
  ),
  processRegistry: fs.readFileSync(path.join(root, 'src/processes/process-registry.service.ts'), 'utf8'),
  processModule: fs.readFileSync(path.join(root, 'src/processes/process-registry.module.ts'), 'utf8'),
  appModule: fs.readFileSync(path.join(root, 'src/app.module.ts'), 'utf8'),
};

const checks = [
  [files.types, 'bpcp.process-event.v1'],
  [files.types, 'bpcp.process-event-outbox.v1'],
  [files.service, 'ProcessEventOutboxRepository'],
  [files.service, 'publishProcessEvent'],
  [files.service, 'dispatchPending'],
  [files.service, 'EVENT_BUS_MISSING'],
  [files.service, "runtimeStore: 'postgresql'"],
  [files.repository, 'claimUndispatched'],
  [files.repository, 'listDispatchedForReplay'],
  [files.repository, 'bpcp_process_outbox_event_seq'],
  [files.entity, "@Entity('bpcp_process_event_outbox')"],
  [files.migration, 'bpcp_process_event_outbox'],
  [files.migration, 'bpcp_process_outbox_event_seq'],
  [files.controller, "@Controller('api/events')"],
  [files.controller, "@Get('outbox')"],
  [files.controller, "@Get('outbox/info')"],
  [files.controller, "@Post('outbox/dispatch')"],
  [files.controller, "@Post('outbox/replay')"],
  [files.controller, '@UseGuards(AuthIdentityGuard)'],
  [files.service, 'replayDispatched'],
  [files.types, 'bpcp.process-event-replay-summary.v1'],
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

if (files.service.includes('process-event-outbox.json')) {
  console.error('Event publication verification failed. File-backed outbox marker still present.');
  process.exit(1);
}

console.log('BPCP event publication verification passed.');
