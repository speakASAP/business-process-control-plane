# System: Business Process Control Plane

```yaml
id: SYSTEM-business-process-control-plane
status: approved
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: validated
upstream:
  - BUSINESS.md
  - docs/01_vision/VISION.md
downstream:
  - docs/06_architecture/INTEGRATION_CONTRACT.md
  - docs/11_tasks/TASK-001-bootstrap-service.md
```

## purpose

BPCP is the ecosystem control plane for dynamic business processes: it owns process, policy, and workflow definitions, simulation, validation, publication lifecycle, audit boundaries, and the visual process editor.

## responsibilities

- Maintain the process registry with versioned lifecycle transitions and audit history, persisted in PostgreSQL via TypeORM
- Maintain policy and workflow registries (currently in-memory/seed-driven for the Holiday Discount pilot) with validation endpoints
- Serve the visual process editor
- Maintain a service capability registry describing known ecosystem service capabilities (e.g. notifications-microservice template-ref-delivery) for workflow definitions to reference
- Persist a durable process event outbox and dispatch/replay it with bounded, integer-validated limits, optionally over a RabbitMQ topic transport adapter
- Enforce fail-closed, bearer-token-authenticated mutation contracts via AUTH_SERVICE_URL

## non-responsibilities

- It does not own product catalog data, final price calculation, payment capture, or invoice legal totals
- It does not directly mutate domain-service databases
- It does not deliver notifications itself; it only registers notifications-microservice as a known workflow-referenceable capability
- It does not own monetary finality

## inputs

- Process/policy/workflow definitions authored via the API or visual editor
- Auth-validated mutation requests (validate/schedule/publish/pause/retire)
- Outbox dispatch/replay requests with bounded `limit` query parameters

## outputs

- Process audit history and versioned process/policy/workflow state
- Durable process events in the outbox, optionally dispatched over RabbitMQ
- Simulation results for process/policy/workflow validation

## dependencies

- PostgreSQL via `BPCP_DATABASE_URL` (required; the service refuses to start without it)
- auth-microservice via `AUTH_SERVICE_URL` (`POST /auth/validate` by default) for mutation-endpoint identity validation
- logging-microservice via `LOGGING_SERVICE_URL`
- monitoring-microservice via `MONITORING_SERVICE_URL`
- RabbitMQ via `RABBITMQ_URL`/`BPCP_EVENT_BUS_URL` for the optional, env-gated event transport adapter (exchange `bpcp.events`, routing prefix `bpcp.process`)

## upstream traceability

This system implements the approved intent in `BUSINESS.md` and the product vision in `docs/01_vision/VISION.md`.

## downstream artifacts

- `docs/06_architecture/INTEGRATION_CONTRACT.md`
- `docs/11_tasks/TASK-001-bootstrap-service.md`
- `docs/12_validation/VAL-TASK-001-bootstrap-service.md`
- `docs/21_execution_plans/EP-TASK-001-bootstrap-service.md`

## validation criteria

- `npm run verify:contracts`, `verify:process-registry`, `verify:event-publication`, `verify:event-transport`, `verify:deployment-wiring`, `verify:policy-workflow`, `verify:editor`, `verify:instances`, `verify:simulation`
- `npm test` and `npm run build`
- Outbox dispatch/replay `limit` is validated/coerced at the controller boundary so malformed or non-finite values cannot reach TypeORM limits (see docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md)

## open questions

- Downstream BPCP event consumers and replay/backfill ownership are not yet defined (AGENTS.md current blockers).
- Exact Auth RBAC roles for BPCP mutation scopes are not yet defined; an identity-only guard remains by design pending this decision.
- Public process-editor ingress/domain approval is pending.
- The authoritative pricing/cart owner contract referenced by workflow definitions is not yet defined.
