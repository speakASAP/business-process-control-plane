# Stock / Order / Marketplace Business Health Master Plan

Date: 2026-07-06
Repository of record: `business-process-control-plane`
Status: implementation-started
Owner: business-health-orchestrator

## Intent Preservation Chain

- Vision: Alfares commerce must only sell products that can be fulfilled, and every business-critical stock/order/channel transition must be observable, testable, and auditable.
- Goal Impact: Operators get a scheduled business-level health system that proves stock authority, cross-channel availability, reservation/payment lifecycle, supplier traceability, and marketplace propagation without moving business ownership into one service.
- System: `business-process-control-plane` coordinates business process definitions and health evidence; `warehouse-microservice` owns stock; `orders-microservice` owns order lifecycle; `catalog-microservice` owns product/channel readiness; marketplace services own channel-specific publication/readback; `suppliers-microservice` owns supplier intake and supplier-to-Warehouse traceability.
- Feature: `stock-order-marketplace-business-health-v1`.
- Task: Build a layered business transaction monitoring system from atomic service verifiers up to cross-service business health dashboards/reports.
- Execution Plan: Start with read-only contracts and existing verifiers, add explicit process definitions, then add scheduled aggregation, then gate any synthetic mutation probe behind owner-approved runtime packets.
- Coding Prompt: Do not mutate live stock, orders, payments, suppliers, or marketplace listings without an exact owner-approved runtime packet. Preserve service ownership. Mark unavailable facts as `[MISSING: ...]` or `[UNKNOWN: ...]`.
- Code: Initial lanes will add docs and read-only verifier/health artifacts only. Live mutation code is dependency-gated.
- Validation: Each lane must run source/static validation for its files and record commands/results in a handoff report.

## Target Business Process

Canonical process id: `stock-reservation-cross-channel-v1`.

Required business assertions:

1. A sellable Catalog product has Warehouse-owned stock authority.
2. Warehouse `available = quantity - reserved` and no negative quantity/reserved/available exists.
3. Catalog/channel projections never exceed Warehouse availability.
4. A product with positive Warehouse availability can be published/readied on approved channels.
5. A sellable channel order must reserve Warehouse stock before the order is accepted.
6. If one physical unit is reserved on one channel, all other channels must converge to unavailable or blocked for that unit.
7. If payment succeeds, Warehouse fulfillment/decrement makes the unit permanently unavailable elsewhere.
8. If payment fails, order is cancelled, or reservation expires, Warehouse releases the hold and channels can converge back to available if stock remains.
9. Supplier stock can enter availability only through validated Suppliers -> Warehouse reconciliation.
10. Every health claim must name evidence, source service, timestamp, mutation boundary, and redaction boundary.

## Planes

### Plane 0: Process Control Plane

Repository: `business-process-control-plane`.

Responsibilities:

- Store process definitions, versions, validation status, audit metadata, and visual process model.
- Publish process lifecycle events only; do not mutate domain service databases.
- Add simulation fixtures for stock/order/channel outcomes.
- Own business-health aggregation schema and dashboard/endpoint later.

Initial outputs:

- `stock-reservation-cross-channel-v1` process contract.
- process simulation scenarios.
- health evidence envelope contract.

### Plane 1: Atomic Service Verifiers

Repositories and existing anchors:

- `warehouse-microservice`: `verify:stock-authority-live`, reservation lifecycle tests, stock events/outbox.
- `orders-microservice`: `verify:order-reservation-gate`, `verify:order-fulfillment-handoff`, runtime packet contracts.
- `catalog-microservice`: `verify:stock-acceptance:gates`, `catalog-smoke.js`, channel readiness and availability projections.
- `suppliers-microservice`: runtime stock traceability evidence bundle.
- Marketplace services: availability reconciliation and `verify:orders-lifecycle-ui` / channel-specific readiness scripts.

Initial rule: use read-only or source-level verifiers first. Mutating probes require exact runtime packets.

### Plane 2: Cross-Service Business Health Aggregation

Create a scheduled monitor that reads existing verifier outputs and emits a normalized report:

```text
businessHealth.status = pass | warn | fail | blocked
businessHealth.contract = stock-order-marketplace-business-health.v1
businessHealth.mutatesProduction = false
businessHealth.checkedAt = ISO timestamp
businessHealth.processId = stock-reservation-cross-channel-v1
businessHealth.evidence[] = service-owned proof summaries
businessHealth.blockers[] = [MISSING: ...] or [UNKNOWN: ...]
businessHealth.nextAction = concrete owner/action
```

The monitor must distinguish:

- live regression: currently failing invariant or mismatch;
- validation debt: missing proof but no current evidence of regression;
- runtime-gated: proof requires owner-approved session/token/provider/mutation packet;
- product-gated: business decision missing.

### Plane 3: Synthetic Transaction Probe

Deferred until packets exist.

Candidate flow:

1. Select approved synthetic SKU and Warehouse row with max quantity 1.
2. Publish/read channel availability in dry-run or sandbox mode.
3. Create synthetic order through one channel.
4. Assert Warehouse active reservation and channel convergence.
5. Choose branch: payment success or timeout/release.
6. Assert final Warehouse/Catalog/channel readback.
7. Cleanup or retention follows approved packet.

Hard blockers:

- `[MISSING: approved synthetic product/warehouse/channel runtime packet]`
- `[MISSING: approved marketplace sandbox/dry-run/de-list policy for each live channel]`
- `[MISSING: cleanup/retention policy for synthetic orders and reservations]`
- `[MISSING: final redacted evidence path and retention policy]`

## Milestones

- M0: Master plan and agent lanes created.
- M1: BPCP process contract and health evidence schema exist.
- M2: Atomic read-only service health adapters documented/validated.
- M3: Cross-service business health report can be generated from existing verifiers without live mutation.
- M4: Scheduled monitor/job wiring proposed and source-validated.
- M5: Synthetic transaction probe packet drafted, not executed.
- M6: Owner-approved synthetic probe executed once and evidence stored.
- M7: Business health dashboard/visual editor integration.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Dependencies | Validation owner | Merge order |
|---|---|---|---|---|---|---|---|---|
| BPCP process contract | ready now | BPCP process agent | Define `stock-reservation-cross-channel-v1`, evidence schema, simulation requirements | `business-process-control-plane/docs/orchestrator/*stock*`, optional new verifier script | runtime manifests, secrets, deploy script, domain DB mutation | none | BPCP agent | 1 |
| Warehouse atomic health | ready now | Warehouse stock agent | Document/read-only verifier boundary for stock authority, reservation expiry, events | `warehouse-microservice/docs/orchestrator/*business-health*`, optional read-only script | stock mutation code, migrations, k8s deploy | none | Warehouse agent | 1 |
| Catalog/channel health | ready now | Catalog health agent | Define read-only aggregation from Warehouse availability to Catalog/channel projections | `catalog-microservice/docs/orchestrator/*business-health*`, optional read-only script | product mutation, price changes, channel publish/delete | none | Catalog agent | 1 |
| Suppliers traceability health | ready now | Suppliers health agent | Normalize Suppliers -> Warehouse -> Catalog traceability evidence | `suppliers-microservice/docs/orchestrator/*business-health*`, optional read-only script | supplier credentials, live imports, Warehouse mutation | none | Suppliers agent | 1 |
| Marketplace readiness inventory | ready now | Marketplace channel agent | Inventory channel availability/readback scripts and missing mutation policies | channel repo docs only | external marketplace writes/deletes, credentials, source changes | none | Channel agent | 1 |
| Orders live transaction packet | blocked | Orders packet agent | Define exact future synthetic order packet | none until current untracked files are resolved | any Orders source edits | dirty worktree and packet facts | Orchestrator | later |
| Cross-service monitor integration | dependency-gated | Integration owner | Compose service-owned outputs into one report | future monitor files after M1/M2 | service-owned mutation code | M1/M2 outputs | Integration owner | 2 |
| Scheduled runtime job/dashboard | dependency-gated | Ops/BPCP owner | Cron/K8s/dashboard wiring | future BPCP/Ops files | deploy without approval | monitor source complete | Ops owner | 3 |

## Current Repository Caveats

- `orders-microservice` has untracked validation files: `reports/validation/VAL-W5-aukro-heureka-current-gate-2026-07-06.md` and `scripts/verify-w5-aukro-heureka-current-gate.py`. Do not assign Orders edits until ownership is resolved.
- `warehouse-microservice` production deployment still requires explicit owner approval.
- Marketplace external de-list/update remains gated by channel-specific policy and provider capability facts.

## Immediate Agent Tasks

1. BPCP process agent: create the stock reservation process contract and validation/evidence schema.
2. Warehouse stock agent: create read-only business-health handoff for stock authority and reservation lifecycle.
3. Catalog health agent: create read-only business-health handoff for Warehouse/Catalog/channel availability consistency.
4. Suppliers health agent: create read-only business-health handoff for supplier stock traceability.
5. Marketplace channel agent: create channel readiness inventory and missing external mutation policy matrix.

## Next Integration Checkpoint

After the five ready lanes finish, the orchestrator will:

1. Inspect diffs and validation outputs.
2. Resolve any file conflicts.
3. Build `stock-order-marketplace-business-health.v1` report schema.
4. Decide whether the next code step belongs in BPCP, Catalog, or a new dedicated monitor service.
5. Keep synthetic mutation probe blocked until exact packets exist.
