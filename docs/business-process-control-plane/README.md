# BPCP Service Implementation Notes

Status: durable-control-plane slice implemented
Date: 2026-08-30

This repository implements the Business Process Control Plane service.
The central cross-service contract pack lives in:

`/home/ssf/Documents/Github/statex-ecosystem/docs/business-process-control-plane/`

## Implemented modules

| Module | Purpose |
|---|---|
| `processes` | PostgreSQL-backed process registry, lifecycle gates, validation, audit |
| `events` | PostgreSQL-backed process-event outbox and env-gated RabbitMQ dispatch/replay |
| `auth` | Fail-closed identity validation guard for sensitive process/outbox mutation endpoints |
| `capabilities` | Initial affected-service capability registry |
| `simulation` | Deterministic Holiday Discount simulation endpoint |
| `editor` | Built-in visual process editor skeleton |
| `health` | Service health and missing runtime facts |
| `instances` | PostgreSQL-backed workflow instance runtime executor |
| `k8s` | Kubernetes wiring with ConfigMap, ExternalSecret, Deployment, and Service |

## Runtime persistence

The process registry now persists to PostgreSQL table `bpcp_process_definition`.
Process audit events persist to `bpcp_process_audit_event`.
Process event outbox envelopes persist to `bpcp_process_event_outbox`.
Workflow instances remain in `bpcp_workflow_instance`, `bpcp_instance_step`, and
`bpcp_instance_signal`.

No file/PVC-backed runtime process registry/outbox persistence is used in this
slice.

## Process event publication

Lifecycle actions emit `bpcp.process-event.v1` envelopes with process id,
version, status, policy refs, workflow refs, campaign refs, lifecycle details,
and durable delivery metadata.

Current endpoints:

```text
GET /api/events/outbox
GET /api/events/outbox/info
POST /api/events/outbox/dispatch
POST /api/events/outbox/replay?limit=100&processId=<processId>&eventType=process.published
GET /api/events/outbox/:processId
GET /api/events/transport/info
```

Dispatch/replay behavior:

- dispatch claims undispatched rows with `FOR UPDATE SKIP LOCKED` and stale-claim recovery;
- successful dispatch marks rows `dispatched` with immutable event ids;
- failed dispatch marks rows `failed` with error context;
- replay re-publishes already dispatched envelopes with stable `messageId=event.id`;
- `limit` query values must be integer strings and are clamped to `1..500` with default `100`.

## Auth boundary

Sensitive process lifecycle and outbox mutation endpoints validate bearer tokens
against `AUTH_SERVICE_URL` using a minimal fail-closed validation client/guard
(default contract `POST /auth/validate`, configurable via
`AUTH_VALIDATION_PATH`/`AUTH_VALIDATION_METHOD`).
No RBAC role assumptions are invented in this slice; unresolved role mapping
remains a blocker.

## Remaining blockers

- [MISSING: exact Auth RBAC roles]
- [MISSING: downstream BPCP event consumers and replay/backfill ownership]
- [MISSING: operator-approved replay endpoint runbook and durable replay audit policy]
- [MISSING: public process-editor ingress/domain]
