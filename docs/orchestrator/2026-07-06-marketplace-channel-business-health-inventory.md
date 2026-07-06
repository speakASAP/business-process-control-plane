# Marketplace Channel Business Health Inventory

Date: 2026-07-06
Repository of record: `business-process-control-plane`
Lane: Marketplace channel readiness inventory
Status: docs-only inventory complete
Scope repos: `bazos`, `aukro`, `allegro`, `heureka`, `flipflop`
Mutation boundary: no marketplace API mutation, no credentials/secrets, no deploy/Kubernetes changes, no channel source edits.

## Intent Preservation Chain

- Vision: Alfares must only expose sellable channel inventory when Warehouse/Catalog/Orders evidence proves it can be fulfilled and read back safely.
- Goal Impact: The business-health monitor can classify each marketplace channel by stock propagation, de-list/update policy, order ingestion, Orders lifecycle readback, and runtime gates without inventing missing provider facts.
- System: `business-process-control-plane` records cross-channel readiness inventory only. Channel repos own channel adapters/UI. Warehouse owns stock. Catalog owns product/channel readiness. Orders owns canonical order lifecycle.
- Feature: `stock-order-marketplace-business-health-v1` marketplace readiness inventory.
- Task: Inventory Bazos, Aukro, Allegro, Heureka, and FlipFlop readiness using existing scripts/docs evidence.
- Execution Plan: Read remote channel docs/scripts only, create this BPCP doc, run `git diff --check` in BPCP.
- Coding Prompt: Preserve missing facts as `[MISSING: ...]` or `[UNKNOWN: ...]`; do not mutate marketplace offers/orders/listings or expose credentials.
- Code: Documentation only: this file.
- Validation: `git diff --check` in `business-process-control-plane` after writing this doc.

## BPCP Process-Agent Conflict Check

Remote preflight on `business-process-control-plane` before this write:

```text
## main...origin/main
?? docs/orchestrator/2026-07-06-stock-order-marketplace-business-health-master-plan.md
HEAD 2eb6f7e docs: record holiday discount canary v2 evidence
```

`AGENTS.md` defines BPCP as the process/audit/validation control plane and lists current blockers. The existing untracked master plan already assigns `Marketplace readiness inventory` to a channel agent and allows marketplace repo docs-only evidence. This lane does not edit the untracked master plan or any existing BPCP process-agent file; it adds only this new inventory document.

## Status Legend

- `ready now`: source/runtime evidence is sufficient for read-only monitor ingestion without new approval.
- `runtime-gated`: source path exists, but live proof or row-level readback needs an approved session/token/runtime packet or non-mutating runtime environment.
- `product-gated`: business/product policy decision is missing, such as external de-list/import approval, category mapping, or provider capability decision.
- `blocked`: required owner/provider/schema facts are absent; claiming readiness would invent a contract.

## Channel Matrix

| Channel | Stock availability propagation | Channel de-list/update policy | Order ingestion | Orders lifecycle UI/readback | Runtime gates | Overall readiness |
|---|---|---|---|---|---|---|
| Bazos | `runtime-gated`: local Warehouse `stock.out` and Catalog non-sellability consumers deactivate local ads and zero stock; sellable refresh is not defined. | `blocked`: external Bazos delete/de-list capability and safe catalog refresh policy are missing. | `blocked`: provider-backed order/status support is unknown; current source accepts synthetic/internal envelopes only. | `runtime-gated`: source/UI verifier passes for central lifecycle labels and refresh controls; provider-backed proof and browser/runtime proof remain missing. | Provider packet required for webhook/status, item identity, Warehouse `warehouseId`, and non-secret fixture/live smoke. | `blocked` for provider-backed business health; local source-only availability is monitorable. |
| Aukro | `runtime-gated`: local consumers zero/deactivate linked `AukroOffer` rows; positive stock refreshes local cache only and does not reactivate. | `runtime-gated`: local publish queue/reconciliation and official Public API executor foundation exist, but live mutation requires credentials, rate limit, mapping, test-listing approval, and cleanup plan. | `runtime-gated`: central row-level proof is source-present but live row-level smoke needs approved customer/admin session and non-stale row. | `runtime-gated`: dashboard/admin stats consume central Orders read-model fields; anonymous protected APIs fail closed. | Row-level cabinet packet required: approved bearer/browser session, target row criteria, freshness threshold, admin stats readback boundary. | `runtime-gated`. |
| Allegro | `runtime-gated`: stock-order-profit contract defines durable account/rate-limited stock sync attempts; runtime queue/persistence and remote Allegro quantity reconciliation remain future work. | `runtime-gated`: governed publish/update lifecycle exists and remote-affecting updates are lifecycle-routed; live account/rate-limit/provider evidence still gates production mutation. | `runtime-gated`: order forwarding/idempotency contract exists; runtime reconciliation storage and natural row proof remain future/session gated. | `runtime-gated`: customer/admin order cabinet source verifier covers all central lifecycle stages; natural buyer/admin row proof requires approved subject-bound packets. | Buyer/admin session packet required; email fallback forbidden; future stock sync needs approved account/rate-limit/reconciliation source. | `runtime-gated`. |
| Heureka | `product-gated`: live stock readiness verifier proved Warehouse totals match Heureka readiness for checked products, but feed readiness stayed blocked by category/settings/shop approval facts. | `product-gated`: local feed exclusion/deactivation exists; external Heureka feed approval/import removal behavior and category mapping remain missing/unknown. | `runtime-gated`: order ingestion contract and smoke runner exist; mutating create/replay must remain preflight-gated and sanitized. Historical preflight found schema blockers; later feed setup evidence does not by itself prove current order-ingestion runtime readiness. | `runtime-gated`: source and pod-local runtime readiness pass; protected row-level dashboard/admin proof requires approved session and non-stale row. | Row-level session packet; external Heureka shop/feed approval; category mapping; current order-ingestion schema/runtime preflight must be rerun before any create/replay. | `product-gated` plus `runtime-gated`. |
| FlipFlop | `runtime-gated`: storefront/product stock is Warehouse-backed and proactive consumers exist, but Catalog producer routing and sellable refresh policy remain missing. | `product-gated`: channel cleanup/side-effect acknowledgement policy is source-defined for future checkout/provider/order/warehouse cleanup, but runtime side effects require exact packets. | `ready now` for central Orders create/read/cancel smoke evidence on FlipFlop storefront path; provider/payment correction flows remain separate. | `ready now` for central Orders lifecycle readback and route-to-Orders admin status authority after action-admin runtime proof; payment/refund/provider correction workflow remains missing. | Future paid/provider/channel cleanup requires exact provider, Orders, Warehouse, Auth token-source, idempotency, and redacted evidence packets. | `ready now` for central Orders lifecycle/status authority; `runtime-gated` for paid/provider/channel cleanup. |

## Evidence References By Channel

### Bazos

- `reports/validation/W4C-availability-propagation-bazos-2026-07-02.md`: local Warehouse/Catalog availability consumers; external mutation explicitly not called.
- `scripts/reconcile_bazos_availability.ts` and package script `reconcile:availability`: candidate read/reconciliation input for availability monitor.
- `reports/validation/2026-07-03-orders-lifecycle-ui-reliability.md` and `scripts/verify-orders-lifecycle-ui.js`: central lifecycle label/readback source coverage, browser smoke missing.
- `reports/validation/2026-07-05-W8-bazos-provider-backed-order-lifecycle-proof-blocker.md`: provider-backed order proof is blocked by missing provider support/status/item/warehouse packet facts.
- `docs/orchestrator/2026-07-05-runtime-gate-packet-handoff.md`: Bazos provider runtime gate packet boundary.
- `implementation-goals/GOAL-24-bazos-paid-order-source-contract.md`: paid order source contract, replay activation still approval-gated.

Recommended monitor inputs:

- Local ad count by `isActive`, `publishStatus`, `stockQuantity`, and `lastPolicyCheck.catalogProductAvailabilitySync` / `warehouseStockSync` event age.
- `reconcile:availability` output with mutatesProduction=false.
- Provider-backed proof gate status from `verify:bazos-provider-proof-gate` and `verify:bazos-provider-proof-boundary`.
- Count of Bazos orders with central `orderId`, lifecycle read status, provider-backed status sample availability, and `[UNKNOWN: live Bazos marketplace webhook support]`.

### Aukro

- `reports/validation/W4C-availability-propagation-aukro-2026-07-02.md`: local offer deactivation/zero-stock consumers and external de-list blocker.
- `12_validation/VAL-TASK-007-publish-queue-reconciliation.md`: publish queue, blocked attempts, idempotency, and drift reports without marketplace mutation.
- `12_validation/VAL-TASK-014-official-aukro-public-api-executor.md`: fail-closed official Public API executor foundation; live mutation blocked pending credentials/rate-limit/mapping/test-listing evidence.
- `reports/validation/2026-07-05-w5-aukro-orders-lifecycle-cabinet-proof.md`: source proof for central Orders lifecycle dashboard/admin stats; protected runtime proof session-gated.
- `docs/orchestrator/2026-07-05-runtime-gate-packet-handoff.md`: row-level runtime gate packet.
- `scripts/reconcile_aukro_availability.ts` and `scripts/verify-orders-lifecycle-ui.js`.

Recommended monitor inputs:

- Offer count by `isActive`, `stockQuantity`, warehouse/catalog sync event ids, and stale event age.
- Publish attempt counts by lifecycle state: blocked, queued, running, failed, stale, succeeded, cancelled.
- Reconciliation drift summary for stock/price/status with mutation disabled.
- Public API executor readiness fields: credential backend present, rate-limit evidence, mapping completeness, test-listing approval, cleanup plan.
- Central Orders read-model availability/staleness counts from dashboard/admin stats, without raw order rows.

### Allegro

- `12_validation/VAL-TASK-002-validation-report.md`: governed publish/update lifecycle; remote-affecting update remains lifecycle-routed and observable.
- `12_validation/VAL-TASK-006-validation-report.md`: stock/order/profit loop contract, stock sync attempt envelope, order forwarding idempotency, read-only payments/suppliers, margin coverage.
- `10_features/FEAT-006-stock-order-profit-loop.md`: business acceptance for stock, order retry, payment/supplier read-only, and profitability flags.
- `reports/validation/2026-07-03-orders-lifecycle-ui-reliability.md`: central lifecycle UI source coverage.
- `docs/orchestrator/2026-07-05-runtime-gate-packet-handoff.md`: natural buyer/admin row-level proof gate.
- `scripts/reconcile:availability`, `scripts/verify-orders-lifecycle-ui.js`, `scripts/smoke-allegro-real-buyer-cabinet.js`, `scripts/manage-allegro-real-buyer-fixture.js`.

Recommended monitor inputs:

- Stock sync attempt envelope counts by account, action, drift class, terminal state, and rate-limit window.
- Publish lifecycle attempt counts by action/status and redacted terminal Allegro failure codes.
- Order-forwarding classification by `(channel, channelAccountId, externalOrderId)`: accepted same payload, conflict different payload, unknown, retry needed.
- Natural buyer/admin cabinet proof gate: approved session present, subject-bound ownership evidence, stale-row policy, email fallback absent.
- Margin coverage output: pass/warning/unknown with missing economics inputs listed.

### Heureka

- `reports/validation/W4C-availability-propagation-heureka-2026-07-02.md`: local feed/listing exclusion and offer deactivation, no external submission/import endpoint called.
- `docs/orchestrator/TASK-STOCK-004-heureka-stock-readiness-live.md`: packaged live verifier matched Warehouse totals for checked products; readiness blocked by `MISSING_CATEGORY` and `SETTINGS_INACTIVE`.
- `docs/orchestrator/TASK-FEED-010-single-product-feed-publish-smoke.md`: one-product feed smoke, external Heureka import/shop approval still unknown and category mapping missing.
- `docs/orchestrator/TASK-ORDERS-007-heureka-orders-smoke-readiness.md`: order ingestion smoke runner and preflight history; mutating smoke must stop on `[MISSING: ...]` blockers.
- `reports/validation/2026-07-05-w5-heureka-orders-lifecycle-cabinet-proof.md`: source and runtime-presence proof, row-level proof session-gated.
- `docs/orchestrator/2026-07-05-runtime-gate-packet-handoff.md`: row-level packet boundary.
- Scripts: `verify:heureka-stock-readiness-live`, `verify:heureka-order-ingestion`, `verify:heureka-orders-runtime-readiness`, `verify:heureka-external-readiness`, `reconcile:availability`.

Recommended monitor inputs:

- Feed product counts by included/excluded, blocker codes (`MISSING_CATEGORY`, `SETTINGS_INACTIVE`, approval/import pending), and last feed hash.
- Warehouse-vs-Heureka readiness stock comparison for sampled product ids.
- Public feed health: HTTP status, content type, SHOPITEM count, XML lifecycle header, external import/approval status when available.
- Order ingestion preflight: health, Catalog product status, Warehouse stock status, reservable route count, required table presence, execute flag false unless approved.
- Orders lifecycle runtime readiness blockers and protected dashboard/admin status-only HTTP results.

### FlipFlop

- `implementation-goals/GOAL-03-catalog-stock-storefront.validation-report.md`: live product/category/detail/cart stock path and Warehouse-backed stock storefront evidence.
- `docs/orchestrator/W4A_FLIPFLOP_PROACTIVE_CONSUMERS.md`: proactive local offer disablement for Warehouse/Catalog events; Catalog producer routing and refresh policy missing.
- `implementation-goals/GOAL-06-orders-hub-integration.validation-report.md`: central Orders forwarding integration and later readiness addendum preserving Warehouse token blockers for live order mutation at that time.
- `docs/orchestrator/2026-07-03-orders-lifecycle-ui-reliability-report.md`: customer/admin lifecycle UI verifier coverage and source-only gates.
- `docs/orchestrator/2026-07-05-w6-flipflop-centralization-gap-report.md`: runtime-complete central Orders authority proof, Auth-issued action-admin token projection, guarded create/read/cancel smoke, and remaining payment/refund/provider correction gap.
- `reports/validation/2026-07-05-w6b-admin-status-central-authority.md` and `reports/validation/2026-07-05-w6b-flipflop-admin-status-authority-contract.md`: fail-closed admin status authority and route-to-Orders contract history.
- `docs/orchestrator/2026-07-05-runtime-gate-packet-handoff.md`: action-admin packet boundary.
- Scripts: `verify:orders-hub-integration`, `verify:orders-lifecycle-ui`, `verify:admin-status-central-authority`, `verify:w6b-admin-status-authority-contract`, `smoke:orders-auth-subject`, `verify:goal24-channel-no-cleanup-ack`.

Recommended monitor inputs:

- Product stock storefront health: product count, category/detail stock rendering, cart overstock rejection status, Warehouse enrichment alert count.
- Proactive consumer status: Warehouse/Catalog event age, disabled local products, stale event skips, missing producer routing policy.
- Central Orders forwarding: `centralOrdersForwarding.status`, central order id presence hash, Orders auth validation status, create/read/cancel smoke status.
- Admin status authority: local status/payment mutation rejected for central-owned orders, route-to-Orders action status, action-admin role/token projection boolean.
- Paid/provider/channel cleanup packet status: provider rollback proof, Orders side-effect acknowledgements, Warehouse cleanup facts, channel cleanup idempotency key, final redacted evidence path.

## Cross-Channel Business Health Inputs

A first read-only BPCP monitor can ingest these channel-owned outputs without live mutation:

| Input | Owner | Shape | Mutation boundary |
|---|---|---|---|
| Availability projection | Channel service + Warehouse/Catalog evidence | counts by active/inactive/zero-stock/stale/missing-policy | read-only or local-source verifier only |
| External de-list/update gate | Channel service | ready/runtime-gated/product-gated/blocked plus exact `[MISSING: ...]` facts | no external API call |
| Order ingestion gate | Channel service + Orders/Warehouse | source contract pass/fail, preflight blockers, idempotency identity, warehouse route presence | no order creation unless approved packet exists |
| Orders lifecycle readback | Orders + channel UI/API | central read-model status counts, stale/missing states, lifecycle stage coverage, auth/session gate | no raw rows/tokens/customer payloads |
| Runtime packet readiness | Channel + Orders/Auth/Warehouse/Payments as needed | packet fields present/missing, approval id/hash, idempotency policy, redacted evidence path | no token output, no provider/marketplace mutation |

## Blockers And Missing Facts

- `[MISSING: approved Bazos external delete/de-list capability]`
- `[UNKNOWN: live Bazos marketplace webhook support]`
- `[MISSING: provider-backed Bazos order item/status ingestion contract]`
- `[MISSING: approved Aukro customer/admin session packet for row-level dashboard/admin smoke]`
- `[MISSING: Aukro production credential backend values, rate-limit evidence, mapping evidence, test-listing approval, and cleanup/rollback plan]`
- `[MISSING: Allegro runtime stock sync queue/persistence and authoritative remote quantity reconciliation source]`
- `[MISSING: approved Allegro buyer/admin subject-bound session packet for natural row proof]`
- `[MISSING: Heureka external feed approval/import removal behavior]`
- `[MISSING: Heureka Catalog category mapping for CATEGORYTEXT]`
- `[UNKNOWN: current Heureka order-ingestion schema/runtime preflight after latest setup; rerun required before create/replay]`
- `[MISSING: FlipFlop Catalog producer exchange/routing key contract]`
- `[MISSING: safe FlipFlop catalog-event refresh policy]`
- `[MISSING: FlipFlop payment/refund/provider correction workflow]`
- `[MISSING: final redacted evidence path and owner-approved packets for future paid/provider/channel cleanup proof]`

## Parallel Execution Notes

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation owner | Merge order |
|---|---|---|---|---|---|---|---|---|
| BPCP monitor schema | ready now | BPCP integration owner | Normalize the matrix into `businessHealth.evidence[]` and `blockers[]` shape | new BPCP docs/schema/verifier files | channel source edits, deploys, secrets | this inventory | BPCP owner | 1 |
| Bazos provider packet | blocked | Bazos provider owner | Decide provider-backed support and supply non-secret order/status/item/Warehouse packet | Bazos docs/reports/verifier only until packet exists | provider calls, scraping, credentials | provider/product owner decision | Bazos owner | later |
| Aukro row-level proof | runtime-gated | Aukro validation owner | Prove one non-stale central Orders row in dashboard/admin stats with approved session | Aukro docs/reports/verifier | raw tokens/customer rows/API mutation | approved session packet | Aukro owner | parallel after packet |
| Allegro stock/order runtime contract | runtime-gated | Allegro integration owner | Implement/read runtime attempt/readback contracts without direct ungated mutation | Allegro docs/verifier first | direct offer/stock mutation without packet | account/rate-limit/reconciliation source | Allegro owner | parallel after contract packet |
| Heureka feed/order readiness refresh | product-gated | Heureka validation owner | Rerun feed/shop/category and order-ingestion preflight, no create unless clean packet | Heureka docs/reports/verifier | external import mutation or order creation without approval | shop/category/schema facts | Heureka owner | parallel |
| FlipFlop paid/provider cleanup packet | runtime-gated | FlipFlop channel owner | Preserve channel cleanup/readback packet and expose monitorable booleans | FlipFlop docs/reports/verifier | provider/payment/order/warehouse mutation without exact packet | Payments/Orders/Warehouse/Auth packets | FlipFlop owner | after upstream packets |

## Validation

Command: `git diff --check`

Result: PASS, no output.
