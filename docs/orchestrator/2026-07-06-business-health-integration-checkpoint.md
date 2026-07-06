# Business Health Integration Checkpoint

Date: 2026-07-06
Repository of record: `business-process-control-plane`
Status: source-integration-contract-ready
Contract: `stock-order-marketplace-business-health.v1`
Process: `stock-reservation-cross-channel-v1`
Mutation boundary: read-only source/docs verification only

## Intent Preservation Chain

- Vision: Alfares commerce must only expose sellable stock when Warehouse, Catalog, Orders, Suppliers, and channel evidence proves the business can fulfill the order.
- Goal Impact: The first integration checkpoint turns independent service-owned handoffs into one monitorable business-health contract without executing live mutations.
- System: BPCP owns the integration schema and process/audit layer; domain services own evidence production and mutation authority.
- Feature: `stock-order-marketplace-business-health.v1` integration checkpoint.
- Task: Verify that BPCP, Warehouse, Catalog, Suppliers, and marketplace channel handoffs exist and are compatible enough for the next read-only monitor implementation lane.
- Execution Plan: Add this checkpoint plus a source-only verifier that reads sibling repo docs/scripts, checks required markers, and emits a normalized readiness summary.
- Coding Prompt: Do not deploy, mutate stock/orders/products/payments/suppliers/marketplaces, read secrets, or run provider APIs. Preserve all `[MISSING: ...]` blockers.
- Code: `docs/orchestrator/2026-07-06-business-health-integration-checkpoint.md`; `scripts/verify-business-health-integration-contract.js`.
- Validation: `node scripts/verify-business-health-integration-contract.js`; `git diff --check`.

## Integrated Inputs

| Input | Repo | File/script | Integration status | Mutation boundary |
|---|---|---|---|---|
| Master plan | `business-process-control-plane` | `docs/orchestrator/2026-07-06-stock-order-marketplace-business-health-master-plan.md` | ready | docs only |
| Process contract | `business-process-control-plane` | `docs/orchestrator/2026-07-06-stock-reservation-cross-channel-process-contract.md` | ready | docs + source verifier only |
| Marketplace inventory | `business-process-control-plane` | `docs/orchestrator/2026-07-06-marketplace-channel-business-health-inventory.md` | ready | docs only; channel repos unchanged |
| Warehouse stock authority packet | `warehouse-microservice` | `GET /api/business-health/stock-authority`; `src/business-health/**`; `scripts/verify-business-health-stock-authority-contract.js` | source endpoint ready; live stock-row proof gated | static source endpoint only; no production DB query/mutation |
| Catalog/channel availability handoff | `catalog-microservice` | `docs/orchestrator/2026-07-06-catalog-channel-business-health-handoff.md` | ready | docs only |
| Suppliers traceability packet | `suppliers-microservice` | `docs/orchestrator/2026-07-06-suppliers-business-health-handoff.md`; `scripts/verify-business-health-suppliers-contract.js` | ready | source/docs verifier; no live supplier import |
| Orders lifecycle packet | `orders-microservice` | existing runtime packet docs and verifiers | blocked for new edits | current untracked files require ownership resolution |

## Business Health Report Shape

The first read-only monitor should emit this shape:

```json
{
  "schemaVersion": "stock-order-marketplace-business-health.v1",
  "processId": "stock-reservation-cross-channel-v1",
  "generatedAt": "ISO-8601",
  "mutatesProduction": false,
  "overallStatus": "pass|warn|fail|blocked",
  "planes": {
    "controlPlane": "ready|blocked",
    "warehouse": "ready|blocked",
    "orders": "ready|blocked",
    "catalog": "ready|blocked",
    "suppliers": "ready|blocked",
    "marketplaces": "ready|blocked"
  },
  "evidence": [],
  "blockers": [],
  "nextAction": "string"
}
```

Status rules:

- `fail`: active evidence proves a business invariant is currently broken.
- `blocked`: evidence cannot be produced without missing owner facts, credentials, sessions, runtime packet, or product policy.
- `warn`: source/readiness evidence exists, but runtime proof is incomplete and no live regression is proven.
- `pass`: all required read-only evidence exists for the requested scope and no blocker remains.

For the current checkpoint, expected overall status is `blocked`, not `pass`, because Orders new-packet work, live Warehouse stock-row proof, and synthetic mutation are intentionally packet-gated.

## Integration Decisions

1. BPCP is the right home for the first aggregator because it already owns process definitions, audit metadata, lifecycle events, simulation, and visual editor integration.
2. The first implementation must be read-only and source/docs backed; it can call existing verifier scripts only when they are non-mutating or already approved as read-only.
3. Domain services must produce service-owned evidence envelopes. BPCP aggregates; it does not infer Warehouse stock, Orders status, Catalog sellability, Suppliers readiness, or marketplace availability.
4. `orders-microservice` is intentionally not assigned a new write lane until the current untracked files are resolved.
5. Synthetic end-to-end transaction probing remains blocked until explicit packets exist for product/warehouse/order/channel/payment/provider/cleanup/redaction.

## Next Code Lane

Ready next lane: BPCP source-only aggregator scaffold.

Allowed files for the next lane:

- `src/business-health/**`
- `scripts/verify-business-health-integration-contract.js`
- focused tests/fixtures if added
- optional `package.json` script only under integration owner control

Forbidden until later:

- k8s/deploy/secret changes
- scheduled CronJob manifests
- live domain service mutation
- provider or marketplace API calls
- Orders edits while untracked files are unresolved

## Validation Result

Commands:

```bash
node scripts/verify-business-health-integration-contract.js
git diff --check
```

Result:

- `node scripts/verify-business-health-integration-contract.js`: PASS, emitted `stock-order-marketplace-business-health.integration-check.v1`.
- `git diff --check`: PASS, no output.
