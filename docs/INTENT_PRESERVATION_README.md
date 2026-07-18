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
capability registry, RabbitMQ process-event transport adapter, Kubernetes deployment wiring.

## Task

`TASK-BPCP-001`: initialize service skeleton, wire local lifecycle publication,
add RabbitMQ transport, prepare Kubernetes deployment wiring, and preserve missing runtime facts.

## Execution Plan

1. Initialize NestJS service skeleton.
2. Add in-memory Holiday Discount process registry.
3. Add capability registry for affected services.
4. Add visual editor skeleton.
5. Add simulation endpoint.
6. Add validation script.
7. Add local process-event outbox for lifecycle publication validation.
8. Add RabbitMQ process-event transport adapter behind an explicit env gate.
9. Add Kubernetes deployment wiring with ConfigMap, ExternalSecret, PVC, Deployment, Service, and deploy script.
10. Block live deploy until remaining Vault/domain/persistence checks are accepted.

## Coding Prompt

Implement BPCP without moving domain ownership from existing services. Monetary
authority stays in pricing/order/payment boundaries. Invoices render snapshots.
Notifications execute template refs. BPCP validates and publishes process
versions.

## Code

Initial skeleton exists under `src/`. Lifecycle transitions append
`bpcp.process-event.v1` envelopes to the local JSON outbox while production
transport is configured by environment. `RabbitMqProcessEventTransportService`
can dispatch pending outbox events to `bpcp.events` with routing keys
`bpcp.process.<action>.v1` after URL, enablement, and signing secret are
configured.

## Validation

Run:

```bash
npm run verify:contracts
npm run verify:event-publication
npm run verify:event-transport
npm run verify:deployment-wiring
npm run build
```

[MISSING: production deployment readiness validation]
[MISSING: database persistence decision beyond initial file-backed PVC]
[MISSING: Vault property `secret/prod/business-process-control-plane` / `BPCP_PROCESS_SIGNING_SECRET` must exist before live deploy]
[MISSING: downstream BPCP event consumer implementation and replay/backfill ownership]
[MISSING: public process-editor ingress/domain]
