# Tasks: Business Process Control Plane

This file is the concise human-readable work queue. Detailed task contracts live under `docs/11_tasks/` and execution records remain linked there.

## active

- None in progress; the most recent task (TASK-BPCP-REVIEW-FIXES-2026-08-30) is done per STATE.json.

## ready next

- Resolve the four open blockers in AGENTS.md (downstream event consumers/replay ownership, Auth RBAC roles, editor ingress/domain, pricing/cart owner contract) once the owner provides direction.

## blocked

- Exact Auth RBAC roles for BPCP mutation scopes are not yet defined; identity-only guard remains by design until resolved.

## completed

- 2026-08-30 TASK-BPCP-REVIEW-FIXES-2026-08-30: auth validation contract alignment (POST /auth/validate default) and outbox dispatch/replay limit hardening, with focused tests and validation evidence recorded in docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md.

## handoff

Current machine-readable state: [`STATE.json`](STATE.json). See `docs/orchestrator/2026-08-30-bpcp-review-fixes-validation-report.md` for the latest validation evidence and AGENTS.md for open blockers.
