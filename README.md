# Business Process Control Plane

Business Process Control Plane (BPCP) is an Alfares ecosystem service for
managing dynamic business-process lifecycle state.

It provides:

- process registry;
- policy registry;
- workflow registry;
- visual process editor;
- service capability registry;
- simulation endpoint;
- publication lifecycle;
- durable process event outbox;
- RabbitMQ topic transport adapter for process events;
- audit-ready metadata;
- fail-closed mutation contracts.

## Current state

Process registry runtime persistence, process audit history, and process event
outbox persistence are now PostgreSQL-backed through TypeORM entities and
migrations. Workflow instances remain PostgreSQL-backed.

Policy/workflow definition registries remain in-memory/seed-driven for the
Holiday Discount pilot. RabbitMQ dispatch remains env-gated and can replay
already dispatched outbox events with bounded filters.

Sensitive process and outbox mutation endpoints require bearer-token identity
validation via `AUTH_SERVICE_URL`; `/health` remains public.

## Local commands

```bash
npm install
npm run verify:contracts
npm run verify:process-registry
npm run verify:event-publication
npm run verify:event-transport
npm run verify:deployment-wiring
npm run verify:policy-workflow
npm run verify:editor
npm run verify:instances
npm run build
npm run verify:simulation
npm test
npm run start:dev
```

## Runtime

Default port: `3375`

Useful endpoints:

```text
GET  /health                                 (public)
GET  /editor
GET  /api/processes
POST /api/processes                          (auth required)
GET  /api/processes/store/info
GET  /api/processes/:processId/audit
GET  /api/processes/:processId/versions/:version
GET  /api/processes/:processId/versions/:version/audit
POST /api/processes/:processId/versions/:version/validate   (auth required)
POST /api/processes/:processId/versions/:version/schedule   (auth required)
POST /api/processes/:processId/versions/:version/publish    (auth required)
POST /api/processes/:processId/versions/:version/pause      (auth required)
POST /api/processes/:processId/versions/:version/retire     (auth required)
GET  /api/events/outbox
GET  /api/events/outbox/info
POST /api/events/outbox/dispatch             (auth required)
POST /api/events/outbox/replay               (auth required)
GET  /api/events/outbox/:processId
GET  /api/events/transport/info
GET  /api/policies
GET  /api/policies/:policyId/versions/:version
POST /api/policies/:policyId/versions/:version/validate
GET  /api/workflows
GET  /api/workflows/:workflowId/versions/:version
POST /api/workflows/:workflowId/versions/:version/validate
GET  /api/capabilities
POST /api/simulate
```

## Boundaries

BPCP coordinates versioned process lifecycle and publication contracts. It does
not directly mutate domain-service databases and does not own monetary
finality.

## Deployment

Kubernetes deployment wiring exists under `k8s/` with ConfigMap,
ExternalSecret, Deployment, and Service manifests. `scripts/deploy.sh`
delegates to shared deployment automation and verifies rollout plus health.

No ingress is included yet; public editor/domain approval remains pending.
