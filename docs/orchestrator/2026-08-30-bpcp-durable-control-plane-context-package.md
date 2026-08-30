# BPCP Durable Control Plane Context Package

Date: 2026-08-30
System: `business-process-control-plane`
Task ID: `TASK-BPCP-DURABLE-CONTROL-PLANE-SLICE-001`

## Scope accepted
- Replace runtime persistence for process registry and process event outbox from JSON/PVC to PostgreSQL/TypeORM.
- Preserve current public API surface and immutable audit/history semantics.
- Keep workflow-instance runtime storage (already Postgres-backed) unchanged.
- Make outbox dispatch/replay durable and idempotent.
- Add authenticated boundary for sensitive mutation endpoints using existing `AUTH_SERVICE_URL` configuration.

## Explicit out of scope
- No changes in `shared`, RunLayer, Goalkeeper, auth service, deploy queue, or other repositories.
- No manual deploys.
- No invented RBAC roles.
- No new ingress.

## Source reads completed
- `AGENTS.md`
- `README.md`
- `docs/business-process-control-plane/README.md`
- `docs/INTENT_PRESERVATION_README.md`
- `docs/specs/2026-08-22-bpcp-workflow-executor-design.md`
- `docs/orchestrator/STATUS.md`
- process/event/workflow/instance code in `src/**`
- database migration/entity code in `src/database/**`, `src/instances/entities/**`
- verification scripts in `scripts/verify-*.js`
- `git status`

## Architectural baseline and outcome
- Baseline: process registry and outbox persistence used local JSON files via `JsonFileStoreService` and PVC wiring.
- Outcome: process registry/audit/outbox persistence now uses PostgreSQL TypeORM entities + migrations; outbox dispatch claims use `FOR UPDATE SKIP LOCKED` with stale-claim recovery; mutation endpoints use fail-closed auth identity validation.

## Remaining blocker to preserve
- [MISSING: exact Auth RBAC roles for BPCP mutation scopes]
