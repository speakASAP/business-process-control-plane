
This file is the concise human-readable work queue. Detailed task contracts live under `docs/11_tasks/` and execution records remain linked there.


# Tasks: Business Process Control Plane

## Active

- None in progress; the most recent task (TASK-BPCP-REVIEW-FIXES-2026-08-30) is done per STATE.json.


## Ready next

- Resolve the three remaining open blockers (downstream event consumers/replay ownership, editor ingress/domain, pricing/cart owner contract) once the owner provides direction.


## Blocked

- Downstream event consumer/replay ownership is undefined.
- Process-editor ingress/domain assignment is pending.
- Pricing/cart owner contract is undefined.


## Completed

- 2026-09-04 Auth RBAC mutation-scope blocker closed by owner decision: no differentiated roles are required; the existing identity-only fail-closed guard (`AUTH_SERVICE_URL` validation) remains the accepted long-term auth boundary for BPCP mutation endpoints. No code change required.
- 2026-08-30 TASK-BPCP-REVIEW-FIXES-2026-08-30: auth validation contract alignment (POST /auth/validate default) and outbox dispatch/replay limit hardening, with focused tests and validation evidence recorded in docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md.


## Handoff


Current machine-readable state: [`STATE.json`](STATE.json). See `docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md` for the latest validation evidence and AGENTS.md for open blockers.
