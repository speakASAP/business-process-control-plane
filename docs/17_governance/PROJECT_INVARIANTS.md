# Project Invariants: Business Process Control Plane

```yaml
id: PROJECT-INVARIANTS-business-process-control-plane
status: approved
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: validated
upstream:
  - BUSINESS.md
  - SYSTEM.md
  - docs/01_vision/VISION.md
downstream:
  - docs/01_vision/VISION.md
  - docs/12_validation/VAL-TASK-001-bootstrap-service.md
```

## purpose

These invariants protect BPCP's control-plane boundary and its fail-closed, auditable mutation contracts.

## applicability

These invariants apply to all process/policy/workflow mutation logic, the event outbox, the RabbitMQ transport adapter, and any change touching auth validation or database persistence.

## invariants

- BPCP-INV-001: BPCP does not directly mutate domain-service databases and does not own monetary finality, catalog data, or invoice legal totals.
- BPCP-INV-002: Sensitive process and outbox mutation endpoints must remain bearer-token authenticated via AUTH_SERVICE_URL and fail closed when validation fails or is unreachable.
- BPCP-INV-003: The service must refuse to start without a configured BPCP_DATABASE_URL; there is no unpersisted fallback for process registry, audit history, or outbox data.
- BPCP-INV-004: Outbox dispatch/replay `limit` parameters must remain integer-validated and clamped to 1..500; malformed or non-finite values must never reach TypeORM query limits.
- BPCP-INV-005: RabbitMQ event-bus wiring (exchange bpcp.events, routing prefix bpcp.process, secret/prod/runlayer URL) must not change without explicit owner approval.

## exceptions

Exceptions to these invariants require explicit owner approval and must be documented in the affected task or validation record.

## review cadence

Review project invariants when entering a materially new scope, a deployment readiness gate, or a workflow change that affects operator trust or production safety.
