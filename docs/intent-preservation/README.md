# Intent Preservation

Target: `business-process-control-plane`
Date: 2026-07-02

## Vision

Business users can change bounded business processes dynamically while domain
services remain stable, safe, and auditable.

## Goal Impact

The Holiday Discount pilot proves the control-plane pattern across campaign,
catalog, pricing/cart, orders, payments, invoices, notifications, storefronts,
and observability.

## System

`business-process-control-plane`

## Feature

`FEAT-BPCP-001`: process registry, policy/workflow contracts, visual editor,
simulation, publication lifecycle, local process-event outbox, service
capability registry, RabbitMQ process-event transport adapter.

## Task

`TASK-BPCP-001`: initialize service skeleton, wire local lifecycle publication,
add disabled-by-default RabbitMQ transport, and preserve missing runtime facts.

## Execution Plan

1. Initialize NestJS service skeleton.
2. Add in-memory Holiday Discount process registry.
3. Add capability registry for affected services.
4. Add visual editor skeleton.
5. Add simulation endpoint.
6. Add validation script.
7. Add local process-event outbox for lifecycle publication validation.
8. Add RabbitMQ process-event transport adapter behind an explicit env gate.
9. Block production deploy until runtime contracts are resolved.

## Coding Prompt

Implement BPCP without moving domain ownership from existing services. Monetary
authority stays in pricing/order/payment boundaries. Invoices render snapshots.
Notifications execute template refs. BPCP validates and publishes process
versions.

## Code

Initial skeleton exists under `src/`. Lifecycle transitions append
`bpcp.process-event.v1` envelopes to the local JSON outbox while production
transport remains disabled by default. `RabbitMqProcessEventTransportService`
can dispatch pending outbox events to `bpcp.events` with routing keys
`bpcp.process.<action>.v1` after URL, enablement, and signing secret are
configured.

## Validation

Run:

```bash
npm run verify:contracts
npm run verify:event-publication
npm run verify:event-transport
npm run build
```

[MISSING: production deployment readiness validation]
[MISSING: BPCP_EVENT_BUS_ENABLED=true production approval]
[MISSING: BPCP_EVENT_BUS_URL or RABBITMQ_URL production value]
[MISSING: BPCP_PROCESS_SIGNING_SECRET vault-managed production value]
[MISSING: approved BPCP event consumer bindings and replay/backfill policy]
