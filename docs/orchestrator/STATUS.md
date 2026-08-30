# BPCP Orchestrator Status

Date: 2026-08-30
Status: durable-control-plane slice and verified auth/outbox review fixes implemented in source; awaiting automated deploy and runtime verification

## Current scope

- PostgreSQL-backed process registry runtime persistence.
- PostgreSQL-backed process audit event persistence.
- PostgreSQL-backed process event outbox runtime persistence.
- Durable/idempotent outbox dispatch claim/update behavior.
- Outbox replay endpoint with stable event ids and bounded filters.
- Authenticated fail-closed guards on sensitive process/outbox mutation endpoints.
- Auth validation defaults aligned with production auth contract (`POST /auth/validate`).
- Outbox dispatch/replay malformed `limit` now fails with controlled client validation, with defensive bounded limit fallback.
- Workflow instance runtime persistence remains PostgreSQL-backed.
- Policy/workflow registries, simulation, editor, and capability registry retained.
- Kubernetes wiring updated for DB-backed runtime store (no process-registry/outbox PVC dependency).

## Goal-driven lanes

| Lane | Owner | Status | Evidence |
|---|---|---|---|
| Durable process registry persistence | main orchestrator | complete in source | `npm run verify:process-registry` |
| Durable outbox persistence and idempotent dispatch/replay | main orchestrator | complete in source | `npm run verify:event-publication` |
| Authenticated mutation boundary | main orchestrator | complete in source | focused auth/unit tests + `npm run verify:contracts` |
| Deployment wiring update for DB-backed runtime store | main orchestrator | complete in source | `npm run verify:deployment-wiring` |
| Verified review fixes (auth contract + outbox limit hardening) | main orchestrator | complete in source | targeted unit tests + `npm run build` + `git diff --check` |
| Integration and validation | main orchestrator | in progress | validation reports for active slices |

## Blockers

- [MISSING: exact Auth RBAC roles]
- [MISSING: downstream BPCP event consumer implementation and replay/backfill ownership]
- [MISSING: operator-approved replay endpoint runbook and durable replay audit policy]
- [MISSING: public process-editor ingress/domain]
- [MISSING: authoritative pricing/cart owner contract]

## Validation

See:

- `docs/orchestrator/2026-08-30-bpcp-durable-control-plane-validation-report.md`
- `docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md`

## Related artifacts

- `docs/orchestrator/2026-08-30-bpcp-durable-control-plane-context-package.md`
- `docs/orchestrator/2026-08-30-bpcp-durable-control-plane-execution-plan.md`
- `docs/orchestrator/2026-08-30-bpcp-durable-control-plane-coding-prompt.md`
- `docs/orchestrator/2026-08-30-bpcp-durable-control-plane-validation-report.md`
- `docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md`

Historical deployment/runtime evidence remains in dated `docs/orchestrator/*.md` files.
