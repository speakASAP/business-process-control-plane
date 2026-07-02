const fs = require('fs');
const path = require('path');

const root = process.cwd();
const transport = fs.readFileSync(path.join(root, 'src/events/rabbitmq-process-event-transport.service.ts'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/events/process-event.types.ts'), 'utf8');
const moduleSource = fs.readFileSync(path.join(root, 'src/events/events.module.ts'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'src/events/events.controller.ts'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  [transport, "import * as amqp from 'amqplib'"],
  [transport, "DEFAULT_EXCHANGE = 'bpcp.events'"],
  [transport, "DEFAULT_ROUTING_KEY_PREFIX = 'bpcp.process'"],
  [transport, 'BPCP_EVENT_BUS_ENABLED'],
  [transport, 'BPCP_EVENT_BUS_URL'],
  [transport, 'RABBITMQ_URL'],
  [transport, 'BPCP_PROCESS_SIGNING_SECRET'],
  [transport, 'createHmac'],
  [transport, 'assertExchange(config.exchange,'],
  [transport, 'channel.publish(config.exchange, routingKey'],
  [transport, 'persistent: true'],
  [transport, 'messageId: event.id'],
  [transport, 'type: routingKey'],
  [transport, "'x-bpcp-signature'"],
  [transport, "'process.published': `${prefix}.published.v1`"],
  [types, 'ProcessEventTransportInfo'],
  [types, 'ProcessEventDispatchSummary'],
  [moduleSource, 'RabbitMqProcessEventTransportService'],
  [controller, "@Get('transport/info')"],
  [controller, "@Post('outbox/dispatch')"],
  [envExample, 'BPCP_EVENT_BUS_ENABLED=false'],
  [envExample, 'BPCP_EVENTS_EXCHANGE=bpcp.events'],
  [envExample, 'BPCP_EVENTS_ROUTING_KEY_PREFIX=bpcp.process'],
];

const failed = checks.filter(([content, marker]) => !content.includes(marker)).map(([, marker]) => marker);
if (failed.length > 0) {
  console.error('Event transport verification failed. Missing markers:');
  for (const marker of failed) console.error(`- ${marker}`);
  process.exit(1);
}

if (!packageJson.dependencies?.amqplib || !packageJson.devDependencies?.['@types/amqplib']) {
  console.error('Event transport verification failed. Missing amqplib dependencies.');
  process.exit(1);
}

console.log('BPCP event transport verification passed.');
