
This file is the concise human-readable work queue. Detailed task contracts live under `docs/11_tasks/` and execution records remain linked there.


# Tasks: Business Process Control Plane

## Active

- None in progress; the most recent task (TASK-BPCP-REVIEW-FIXES-2026-08-30) is done per STATE.json.


## Ready next

- None; all four originally open blockers are resolved or owner-accepted as deferred (see `docs/orchestrator/2026-09-04-bpcp-remaining-blockers-owner-decision.md`).


## Blocked

- None open pending an owner decision. Three items remain intentionally deferred by owner decision (2026-09-04): downstream event consumer/replay runbook, process-editor ingress/domain, pricing/cart owner contract. Details in `docs/orchestrator/2026-09-04-bpcp-remaining-blockers-owner-decision.md`.


## Completed

- 2026-09-04 Remaining three blockers (event consumer/replay ownership, editor ingress/domain, pricing/cart owner contract) reviewed with full history context and left as-is by explicit owner decision; recorded in `docs/orchestrator/2026-09-04-bpcp-remaining-blockers-owner-decision.md`. STATE.json schema reviewed and confirmed already compliant with the ecosystem's native planning/task-tracking standard; no change needed.
- 2026-09-04 Auth RBAC mutation-scope blocker closed by owner decision: no differentiated roles are required; the existing identity-only fail-closed guard (`AUTH_SERVICE_URL` validation) remains the accepted long-term auth boundary for BPCP mutation endpoints. No code change required.
- 2026-08-30 TASK-BPCP-REVIEW-FIXES-2026-08-30: auth validation contract alignment (POST /auth/validate default) and outbox dispatch/replay limit hardening, with focused tests and validation evidence recorded in docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md.


## Handoff


Current machine-readable state: [`STATE.json`](STATE.json). See `docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md` for the latest validation evidence and AGENTS.md for open blockers.
