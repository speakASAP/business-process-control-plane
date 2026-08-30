# TASKS — BPCP Verified Review Fixes (2026-08-30)

## Goal
Apply only the two verified BPCP review fixes in remote `main`: auth validation contract alignment and outbox dispatch/replay `limit` hardening.

## Work items
- [x] Read current auth validation, outbox dispatch/replay controller/service flow, and related tests before changes.
- [x] Update auth validation defaults from `GET /api/auth/validate` to `POST /auth/validate` while preserving fail-closed behavior.
- [x] Align environment and Kubernetes wiring defaults with the validated auth contract.
- [x] Add/adjust focused auth tests for the new default contract.
- [x] Validate/coerce `limit` safely at events controller boundary for dispatch/replay and add defensive bounded-limit fallback.
- [x] Add focused tests ensuring malformed `limit` is controlled and non-finite values cannot reach TypeORM limits.
- [x] Run targeted tests, relevant verification scripts, build, and `git diff --check`.
- [x] Record validation evidence and update state artifacts.

## Blockers
- [MISSING: exact Auth RBAC roles for BPCP mutation scopes] (identity-only guard remains by design)
