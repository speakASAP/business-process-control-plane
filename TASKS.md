# TASKS — BPCP Durable Control Plane Slice (2026-08-30)

## Goal
Implement the first approved durable-control-plane slice in `business-process-control-plane` by replacing file/PVC-backed process-registry and process-event-outbox runtime persistence with PostgreSQL/TypeORM, preserving existing public API contracts and immutable audit/history semantics.

## Work items
- [x] Create local planning artifacts (task/goal, execution plan, context package, coding prompt, validation report, STATE/TASKS/orchestrator state).
- [x] Add process-registry and outbox TypeORM entities plus migration.
- [x] Implement process-registry and outbox repository services with durable/idempotent behavior.
- [x] Refactor process/event services/controllers to use database persistence and preserve API shape.
- [x] Add authenticated boundary for sensitive mutation endpoints using `AUTH_SERVICE_URL` fail-closed validation.
- [x] Update deployment/config/docs/verifiers for DB-backed persistence and auth boundary.
- [x] Add focused tests for repository, auth guard/client, and outbox idempotency contracts.
- [x] Run targeted validation commands and build.
- [ ] Commit and push to `main` with required co-author trailer.

## Blockers
- [MISSING: exact Auth RBAC roles for BPCP mutation scopes] (identity-only auth guard implemented without inventing roles).
