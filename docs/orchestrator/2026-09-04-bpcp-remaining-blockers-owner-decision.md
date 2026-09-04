# Owner Decision Record — Remaining Blockers (2026-09-04)

Date: 2026-09-04
Status: closed by explicit owner decision; no code or infrastructure change made

## Context

Following the 2026-08-30 durable control-plane slice, four blockers remained
open in `AGENTS.md`/`TASKS.md`. The owner reviewed each with full history
context and issued the following decisions.

## Decisions

1. **Auth RBAC mutation roles** — closed 2026-09-04 (see `TASKS.md` Completed
   entry same date). No differentiated roles are required; the existing
   identity-only fail-closed `AUTH_SERVICE_URL` guard is the accepted
   permanent auth boundary for BPCP mutation endpoints.

2. **Downstream event consumer/replay ownership** — leave as-is. The
   consumer-ownership *model* was already decided in
   `docs/orchestrator/DEPLOYMENT_WIRING.md` (2026-07-02): each downstream
   service (e.g. `catalog-microservice`) owns its own queue binding, retry,
   DLQ, and replay/backfill behavior against `bpcp.events`. That precedent is
   already implemented by `catalog-microservice`. The only unresolved piece —
   an operator-approved runbook and durable audit policy for BPCP's own
   `POST /api/events/outbox/replay` endpoint — remains open validation debt,
   accepted at current risk. No runbook will be written at this time.

3. **Process-editor ingress/domain** — leave as-is. BPCP remains
   ClusterIP-only by design (`ECOSYSTEM_MAP.md`: "no public ingress yet"); the
   editor UI at `/` and `/editor` is merged to `main` but stays internal,
   reachable only via `kubectl port-forward` or in-cluster access. No ingress
   manifest, domain, or DNS entry will be added at this time.

4. **Pricing/cart owner contract** — leave as-is. No dedicated pricing/cart
   microservice exists anywhere in the ecosystem (`orders-microservice` owns
   list-price suggestions/approval as part of the orders domain;
   `payments-microservice` is capture-only). Holiday Discount and future
   BPCP policies continue to use deterministic fixture math via the
   simulation lane (`docs/orchestrator/SIMULATION_HANDOFF.md`), not live
   monetary calculation. No new service or contract will be scoped at this
   time.

5. **STATE.json schema reconciliation** — no action needed. All 47
   ecosystem repositories, including BPCP, use the native
   `schema_version/service/planning/delivery/collection` shape, which is what
   `shared/scripts/scan-next-tasks.py` actually parses
   (`'"schema_version": "1.0"'` detection, `planning.status`/
   `blocked_goal_ids` fields). The IPS template shape
   (`schemaVersion/lifecycle/health/activeTask`) is enforced only when
   `IPS_ADOPTION_REQUIRED=1`, which BPCP does not set. There is no live
   conflict; BPCP's `STATE.json` is already aligned with the ecosystem
   planning/task-tracking standard in active use.

## Outcome

All four originally listed blockers are now resolved or explicitly accepted
as owner-approved deferred state. No `TASKS.md` "Blocked" items remain
pending an owner decision; the three non-RBAC items (2-4 above) are recorded
here as intentionally deferred, not undecided.
