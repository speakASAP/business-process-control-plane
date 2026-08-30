# Integration Contract: Business Process Control Plane

```yaml
id: INTEGRATION-CONTRACT-business-process-control-plane
status: approved
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: validated
upstream:
  - SYSTEM.md
  - BUSINESS.md
downstream:
  - docs/11_tasks/TASK-001-bootstrap-service.md
  - docs/12_validation/VAL-TASK-001-bootstrap-service.md
```

## purpose

This contract records the ecosystem dependencies required for BPCP to operate as the governed control plane for business-process lifecycle state, and the fallback behavior when a dependency degrades.

## capability decisions

| Capability | Component | Decision | Reason |
|---|---|---|---|
| auth | auth-microservice | required | README.md and .env.example document AUTH_SERVICE_URL with a POST /auth/validate default contract, enforced on all sensitive process and outbox mutation endpoints (fail-closed). |
| postgres | database-server (db-server-postgres) | required | .env.example documents BPCP_DATABASE_URL as required, with README.md stating the service refuses to start without it; process registry, audit history, event outbox, and workflow instances are TypeORM-persisted. |
| redis | database-server (db-server-redis) | not-applicable | No Redis client, environment variable, or documented usage exists anywhere in this repository. |
| logging | logging-microservice | required | .env.example documents LOGGING_SERVICE_URL for structured logging. |
| notifications | notifications-microservice | not-applicable | BPCP explicitly does not own notification delivery channels (AGENTS.md, README.md Boundaries). notifications-microservice is registered only as a known service capability (e.g. template-ref-delivery) in BPCP's capability/workflow registries for workflow definitions to reference, not called directly by BPCP itself. |
| ai | ai-microservice | not-applicable | No AI-microservice integration is documented or referenced anywhere in this repository's code, .env.example, or docs. |
| payments | payments-microservice | not-applicable | BPCP explicitly does not own monetary finality or payment capture (README.md Boundaries, AGENTS.md Intent). |
| catalog | catalog-microservice | not-applicable | BPCP explicitly does not own product catalog data (AGENTS.md Intent, README.md Boundaries). |
| orders | orders-microservice | not-applicable | BPCP coordinates process/workflow lifecycle, not order processing; no orders-microservice integration is documented or referenced. |
| warehouse | warehouse-microservice | not-applicable | BPCP has no physical inventory or warehouse concern. |
| invoices | invoices-microservice | not-applicable | BPCP explicitly does not own invoice legal totals (README.md Boundaries); it does not integrate with invoices-microservice directly. |
| object-storage | minio-microservice | not-applicable | No object-storage usage was found in this repository's code, .env.example, or docs. |
| event-bus | RabbitMQ | required | README.md, .env.example, and AGENTS.md document an approved RabbitMQ topic transport adapter for process events (exchange bpcp.events, routing prefix bpcp.process), currently env-gated by BPCP_EVENT_BUS_ENABLED and off by default. |
| docs-rag | docs-rag-microservice | required | This runtime service must remain discoverable through the ecosystem documentation index, consistent with every other runtime-service repository's adoption profile. |
| monitoring | monitoring-microservice | required | .env.example documents MONITORING_SERVICE_URL, and runtime health/rollout readiness must be observable through the shared monitoring stack. |
| backups | backups-microservice | required | The service persists process registry, audit history, event outbox, and workflow instance data durably in PostgreSQL via BPCP_DATABASE_URL, which requires backup coverage consistent with other ecosystem databases. |

## data ownership

BPCP owns process, policy, and workflow definition/version/audit data and its durable event outbox in PostgreSQL. It explicitly does not own product catalog, pricing, payment, invoice, or notification-delivery data, which remain owned by their respective domain services.

## authentication and authorization

- Bearer-token identity validation via AUTH_SERVICE_URL is required on all sensitive process/outbox mutation endpoints (fail-closed).
- GET /health remains public and unauthenticated.

## synchronous dependencies

- Auth validation calls to auth-microservice on mutation endpoints
- PostgreSQL reads/writes for process/policy/workflow/outbox data via BPCP_DATABASE_URL

## asynchronous dependencies

- Optional RabbitMQ dispatch of process events from the durable outbox when BPCP_EVENT_BUS_ENABLED is true
- Structured log delivery to logging-microservice

## degraded operation

When auth-microservice is unreachable, mutation endpoints fail closed (reject) rather than allowing unauthenticated writes. When RabbitMQ is disabled or unreachable, events remain durably queued in the outbox for later bounded dispatch/replay rather than being lost or silently dropped.

## validation

- `GET /health` responds and remains public
- verify:contracts, verify:process-registry, verify:event-publication, verify:event-transport, verify:deployment-wiring, verify:policy-workflow, verify:editor, verify:instances, verify:simulation all pass
- npm test passes
