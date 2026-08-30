# BPCP Durable Control Plane Execution Plan

Date: 2026-08-30
Status: complete in source, commit pending
Task ID: `TASK-BPCP-DURABLE-CONTROL-PLANE-SLICE-001`

## Intent Preservation Chain
- Vision: BPCP remains the durable, auditable control-plane authority for business-process lifecycle governance.
- Goal Impact: Process definitions, lifecycle audit, and publication outbox survive restarts and concurrent API activity without file/PVC race risks.
- System: `business-process-control-plane`
- Feature: `FEAT-BPCP-DURABLE-CONTROL-PLANE-SLICE-001`
- Task: Replace process-registry/outbox runtime persistence with Postgres/TypeORM and add fail-closed authenticated mutation boundaries.
- Execution Plan: completed steps below.
- Coding Prompt: `docs/orchestrator/2026-08-30-bpcp-durable-control-plane-coding-prompt.md`
- Code: implemented
- Validation: `docs/orchestrator/2026-08-30-bpcp-durable-control-plane-validation-report.md`

## Completed implementation steps
1. Added process-registry/outbox entities and migration for durable persistence.
2. Added repository services for process definitions, audit events, and outbox events with idempotent dispatch-claim behavior.
3. Refactored `ProcessRegistryService` and `EventPublisherService` to use repositories instead of JSON file store.
4. Added auth client + guard using `AUTH_SERVICE_URL`; applied to mutation/publication/outbox mutation endpoints.
5. Updated config/docs/verifier scripts from JSON/PVC assumptions to Postgres runtime assumptions.
6. Added focused tests for repository idempotency and auth guard fail-closed behavior.
7. Ran targeted verification and build commands.

## Parallel execution map
| Workstream | Status | Shared files | Owner |
|---|---|---|---|
| Persistence layer (entities/migration/repositories) | complete | `src/database/**`, `src/processes/**`, `src/events/**` | main orchestrator |
| Auth boundary (client/guard/controller wiring) | complete | `src/auth/**`, `src/processes/process-registry.controller.ts`, `src/events/events.controller.ts` | main orchestrator |
| Validation/docs/verifier updates | complete | `scripts/verify-*.js`, `README.md`, `docs/**`, `k8s/**`, `TASKS.md`, `STATE.json` | main orchestrator |

## Known blocker to preserve
- [MISSING: exact Auth RBAC roles for BPCP mutation scopes]
