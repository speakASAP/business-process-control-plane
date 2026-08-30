# Coding Prompt — BPCP Durable Control Plane Slice

Implement DB-backed process registry and process-event outbox persistence in `business-process-control-plane` using TypeORM entities/migrations/repositories while preserving API shape, immutable audit/outbox history semantics, and existing workflow-instance persistence.

Constraints:
- Keep `/health` public.
- Protect sensitive process/outbox mutation endpoints with fail-closed auth identity validation over `AUTH_SERVICE_URL`.
- Do not invent RBAC roles; enforce identity validation only.
- Keep simulation/editor/process registry workflows operational.
- Do not manually deploy.
- Keep unresolved authorization-role mapping as `[MISSING: ...]` blocker.
