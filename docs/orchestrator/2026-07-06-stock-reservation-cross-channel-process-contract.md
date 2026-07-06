# Stock Reservation Cross-Channel Process Contract

Date: 2026-07-06
Repository of record: `business-process-control-plane`
Contract owner: Business Process Control Plane
Process id: `stock-reservation-cross-channel-v1`
Status: initial source contract
Mutation boundary: read-only contract and evidence schema only

## Intent Preservation Chain

- Vision: Alfares commerce must only sell products that can be fulfilled, and every business-critical stock, order, and channel transition must be observable, testable, and auditable.
- Goal Impact: Operators get a business-level health contract that proves stock authority, cross-channel availability, reservation/payment lifecycle, supplier traceability, and marketplace propagation without moving business ownership into one service.
- System: `business-process-control-plane` owns process definitions, lifecycle evidence contracts, simulation requirements, validation status, audit metadata, and future business-health aggregation; domain services keep their own data and mutation authority.
- Feature: `stock-order-marketplace-business-health-v1`.
- Task: Define the initial BPCP-owned process/evidence contract for `stock-reservation-cross-channel-v1`.
- Execution Plan: Record process states, step ownership, service boundaries, evidence envelope schema, simulation scenarios, blockers, and source validation before any runtime monitor or synthetic probe is implemented.
- Coding Prompt: Do not mutate live stock, orders, payments, suppliers, marketplace listings, secrets, Kubernetes manifests, or runtime config. Preserve service ownership. Mark unavailable facts as `[MISSING: ...]` or `[UNKNOWN: ...]`.
- Code: `docs/orchestrator/2026-07-06-stock-reservation-cross-channel-process-contract.md`; optional source-only verifier `scripts/verify-stock-reservation-process-contract.js`.
- Validation: `node scripts/verify-stock-reservation-process-contract.js`; `git diff --check`.

## Contract Scope

BPCP owns this process contract as a control-plane artifact. The contract is designed to later drive business health monitoring and simulation, but this version is not a live runtime workflow and does not authorize any domain mutation.

### In Scope

- Canonical process id and versioned process states for `stock-reservation-cross-channel-v1`.
- Cross-service step sequence and ownership boundaries.
- Health evidence envelope schema for service-owned proof.
- Required later simulation scenarios for stock, order, supplier, and marketplace outcomes.
- Missing runtime, schema, and ownership facts as explicit blockers.
- Read-only validation of this source contract.

### Out Of Scope

- Live stock, reservation, order, payment, supplier, catalog, or marketplace mutation.
- Kubernetes, deployment, secret, RabbitMQ, cron, or runtime config changes.
- Domain-service source edits.
- Generated `dist` edits.
- Synthetic transaction execution.

## BPCP Process Registry Mapping

This contract maps to the current BPCP process model as an initial process definition candidate:

```json
{
  "schemaVersion": "bpcp.process.v1",
  "processId": "stock-reservation-cross-channel-v1",
  "version": 1,
  "status": "draft",
  "policyRefs": [
    "stock-authority-boundary-v1",
    "cross-channel-availability-convergence-v1",
    "reservation-before-order-acceptance-v1",
    "supplier-to-warehouse-traceability-v1"
  ],
  "workflowRefs": [
    "stock-reservation-cross-channel-health-workflow-v1"
  ],
  "campaignRefs": [],
  "killSwitch": true
}
```

Missing process registry facts:

- `[MISSING: durable BPCP process definition storage decision beyond current JSON-backed/PVC-backed store]`
- `[MISSING: policy registry definitions for stock authority, channel convergence, reservation gate, and supplier traceability]`
- `[MISSING: workflow registry definition for cross-channel business health aggregation]`
- `[MISSING: signed process publication and downstream consumer ownership for this process]`

## Process States

| State | Meaning | Entry Evidence | Exit Evidence | Owning boundary |
|---|---|---|---|---|
| `draft` | Contract exists but is not ready for runtime aggregation. | BPCP source contract and verifier output. | Validation findings are resolved or explicitly blocked. | BPCP |
| `validated` | Source contract and required envelope fields are internally consistent. | Source verifier pass, no malformed blockers. | Runtime adapters or monitor workstream starts. | BPCP |
| `scheduled` | Future monitor or report execution is planned but not live. | `[MISSING: scheduler owner and run cadence]` | Monitor becomes active or is cancelled. | BPCP/Ops `[MISSING: owner]` |
| `active` | Business-health monitor can emit read-only reports from service-owned evidence. | Service adapters produce envelopes with timestamps and redaction boundaries. | Pause, kill switch, retirement, or hard runtime blocker. | BPCP for aggregation; services for evidence |
| `paused` | Aggregation is intentionally disabled or held fail-closed. | Pause reason, actor, timestamp, and affected process version. | Resume approval and validation. | BPCP/Ops `[MISSING: owner]` |
| `retired` | This version is no longer used for monitoring decisions. | Replacement process/version or retirement note. | None. | BPCP |

## Process Steps

| Step | Name | Required assertion | Evidence producer | BPCP responsibility | Mutation boundary |
|---|---|---|---|---|---|
| 1 | Catalog sellability candidate | A sellable product must have product identity, channel readiness, and enough product metadata to correlate with stock. | `catalog-microservice` | Require product/channel evidence references and correlate by product/SKU/channel keys. | BPCP does not edit catalog data or publish channels. |
| 2 | Warehouse stock authority | Warehouse is the stock authority; `available = quantity - reserved`; no negative `quantity`, `reserved`, or `available`. | `warehouse-microservice` | Validate evidence shape and invariant result, not stock rows. | BPCP does not alter warehouse stock or reservations. |
| 3 | Supplier traceability | Stock can enter availability only through validated Suppliers -> Warehouse reconciliation. | `suppliers-microservice` and `warehouse-microservice` | Require traceability evidence and surface missing lineage as validation debt or failure. | BPCP does not import supplier data or reconcile stock. |
| 4 | Channel availability projection | Catalog/channel projections must not exceed Warehouse availability. | `catalog-microservice` plus marketplace/channel services | Compare service-owned evidence summaries by product/SKU/channel and timestamp. | BPCP does not write marketplace listings. |
| 5 | Reservation gate | A channel order must reserve Warehouse stock before the order is accepted. | `orders-microservice` and `warehouse-microservice` | Require order/reservation correlation evidence and fail closed on missing reservation proof. | BPCP does not create orders or reservations. |
| 6 | Cross-channel convergence | When one physical unit is reserved on one channel, other channels converge to unavailable or blocked for that unit. | Marketplace/channel services, Catalog, Warehouse | Aggregate convergence evidence and classify lag/mismatch. | BPCP does not de-list or update channels. |
| 7 | Payment success finality | Successful payment leads to fulfillment/decrement so the unit is permanently unavailable elsewhere. | `orders-microservice`, payment owner, Warehouse | Require finality evidence; mark missing payment/fulfillment contracts as blockers. | BPCP does not capture payment or decrement stock. |
| 8 | Payment failure/cancel/expiry release | Failed payment, cancellation, or reservation expiry releases hold and channels can converge back if stock remains. | `orders-microservice`, Warehouse, channel services | Require release evidence and classify stale holds or projection lag. | BPCP does not cancel orders or release reservations. |
| 9 | Evidence aggregation | Every health claim names evidence, source service, timestamp, mutation boundary, and redaction boundary. | BPCP monitor later, reading service-owned evidence | Normalize envelopes and emit business health status. | Read-only aggregation only. |

## Service Ownership Boundaries

| Service or plane | Owns | Does not own for this process | Required later adapter or evidence |
|---|---|---|---|
| BPCP | Process contract, version status, validation result, health envelope schema, future aggregation/reporting, simulation scenario catalog. | Domain stock, orders, payments, supplier intake, catalog readiness, marketplace writes, final price, invoices, notifications. | `stock-reservation-cross-channel-v1` process definition, monitor schema, source validation. |
| `warehouse-microservice` | Stock authority, quantity/reserved/available invariant, reservation lifecycle, fulfillment/decrement, stock events/outbox. | Order acceptance, catalog channel readiness, marketplace listing state, supplier intake. | `[MISSING: stable read-only stock authority evidence envelope]` |
| `orders-microservice` | Order lifecycle, reservation gate before accepted order, cancellation, payment handoff, fulfillment handoff. | Warehouse stock mutation authority, payment provider capture, marketplace listing writes. | `[RESOLVED: Orders read-only order/reservation correlation evidence endpoint exists at GET /api/business-health/order-reservation-correlation]`; `[MISSING: approved live Orders/Warehouse runtime evidence packet for target order/product/channel]` |
| `catalog-microservice` | Product sellability metadata, channel readiness, projection of availability to product/channel surfaces. | Warehouse stock authority, order reservation, marketplace external write finality. | `[RESOLVED: Catalog read-only channel availability evidence endpoint exists at GET /api/business-health/channel-availability]`; `[MISSING: approved live Catalog channel availability runtime evidence packet for target products]` |
| `suppliers-microservice` | Supplier intake, traceability evidence into Warehouse-owned stock. | Warehouse final stock authority after reconciliation, channel sellability. | `[RESOLVED: Suppliers read-only supplier-to-Warehouse traceability evidence endpoint exists at GET /api/business-health/supplier-warehouse-traceability]`; `[MISSING: real supplier procurement facts and Warehouse mutation approval boundary]` |
| Marketplace/channel services | Channel-specific listing readiness, external readback, availability convergence, provider policy boundaries. | Warehouse stock authority, order/payment domain finality. | `[MISSING: per-channel read-only availability readback evidence and external mutation policy]` |
| Payment/provider owners | Payment success/failure facts and provider-side finality. | Warehouse stock decrement, BPCP health aggregation. | `[MISSING: redacted payment outcome evidence boundary]` |
| Ops/Scheduler | Future run cadence, retention, alert routing, dashboard or report delivery. | Domain service data mutation. | `[MISSING: scheduler owner, cadence, alert routing, and evidence retention policy]` |

## Health Evidence Envelope Schema

Every service-owned proof consumed by future BPCP health aggregation must fit this envelope or be adapted into it without losing source ownership.

```json
{
  "schemaVersion": "bpcp.health-evidence.v1",
  "contract": "stock-order-marketplace-business-health.v1",
  "processId": "stock-reservation-cross-channel-v1",
  "processVersion": 1,
  "evidenceId": "warehouse-stock-authority:SKU-123:2026-07-06T10:00:00.000Z",
  "sourceService": "warehouse-microservice",
  "sourceOwner": "[MISSING: owning team or service owner]",
  "sourceCommand": "npm run verify:stock-authority-live",
  "sourceRef": "reports/validation/[MISSING: concrete artifact path]",
  "collectedAt": "2026-07-06T10:00:00.000Z",
  "subject": {
    "productId": "[MISSING: product id]",
    "sku": "[MISSING: sku]",
    "warehouseStockId": "[MISSING: warehouse stock id]",
    "orderId": "[MISSING: order id when applicable]",
    "reservationId": "[MISSING: reservation id when applicable]",
    "channel": "[MISSING: channel when applicable]",
    "supplierTraceId": "[MISSING: supplier trace id when applicable]"
  },
  "mutationBoundary": {
    "mutatesProduction": false,
    "mutationType": "none",
    "approvedRuntimePacketRef": "[MISSING: required only for synthetic mutation probes]"
  },
  "redactionBoundary": {
    "containsPii": false,
    "containsSecrets": false,
    "redactionLevel": "summary",
    "retentionPolicy": "[MISSING: evidence retention policy]"
  },
  "assertions": [
    {
      "code": "WAREHOUSE_AVAILABLE_EQUALS_QUANTITY_MINUS_RESERVED",
      "status": "pass",
      "severity": "fail",
      "message": "Warehouse available stock matches quantity minus reserved quantity.",
      "observed": {
        "quantity": 1,
        "reserved": 0,
        "available": 1
      },
      "expected": {
        "availableFormula": "quantity - reserved",
        "noNegativeQuantityReservedAvailable": true
      }
    }
  ],
  "blockers": [
    "[MISSING: stable service-owned evidence artifact path]"
  ],
  "links": {
    "processContract": "docs/orchestrator/2026-07-06-stock-reservation-cross-channel-process-contract.md",
    "upstreamEvidence": [],
    "downstreamReport": "[MISSING: future BPCP business health report path]"
  }
}
```

### Envelope Field Rules

- `schemaVersion` must be `bpcp.health-evidence.v1`.
- `contract` must be `stock-order-marketplace-business-health.v1`.
- `processId` must be `stock-reservation-cross-channel-v1`.
- `processVersion` must be a positive integer.
- `evidenceId`, `sourceService`, `collectedAt`, `mutationBoundary`, `redactionBoundary`, and `assertions` are required.
- `sourceCommand` can be `[MISSING: ...]` only until a service owner publishes the adapter/verifier command.
- `mutationBoundary.mutatesProduction` must be `false` for read-only health aggregation.
- Any synthetic mutation probe must remain blocked unless `approvedRuntimePacketRef` points to an owner-approved packet.
- `redactionBoundary.containsSecrets` must never be true in stored BPCP evidence.
- `assertions[].status` is one of `pass`, `warn`, `fail`, `blocked`, or `unknown`.
- Missing facts must stay explicit as `[MISSING: ...]` or `[UNKNOWN: ...]`.

## Business Health Status Mapping

| Status | Meaning | Example |
|---|---|---|
| `pass` | Required evidence exists and all assertions pass. | Warehouse invariant passes and channel projection is within availability. |
| `warn` | Evidence exists but indicates lag, stale timestamp, non-critical validation debt, or degraded confidence. | Marketplace readback is older than the accepted SLA. |
| `fail` | Evidence proves a live invariant violation. | Catalog projection exceeds Warehouse availability. |
| `blocked` | A required proof cannot be produced because a contract, runtime packet, credential boundary, or owner decision is missing. | `[MISSING: approved synthetic product/warehouse/channel runtime packet]` |
| `unknown` | The source cannot currently classify the result and must not be treated as pass. | `[UNKNOWN: provider readback semantics for channel]` |

## Required Simulation Scenarios Later

These scenarios are contract requirements only. They are not implemented by this document and must not mutate live systems.

| Scenario id | Purpose | Expected health classification | Required evidence |
|---|---|---|---|
| `stock-reservation-cross-channel-stock-authority-pass` | Positive Warehouse stock with no reservations produces available stock. | `pass` | Warehouse invariant evidence. |
| `stock-reservation-cross-channel-negative-stock-fail` | Negative quantity/reserved/available is detected. | `fail` | Warehouse invariant evidence with failing assertion. |
| `stock-reservation-cross-channel-catalog-overprojection-fail` | Catalog/channel projection exceeds Warehouse availability. | `fail` | Warehouse availability plus Catalog/channel projection evidence. |
| `stock-reservation-cross-channel-reservation-before-acceptance-pass` | Order acceptance is preceded by active Warehouse reservation. | `pass` | Orders reservation gate evidence plus Warehouse reservation evidence. |
| `stock-reservation-cross-channel-missing-reservation-fail` | Accepted order lacks reservation proof. | `fail` | Orders evidence and missing Warehouse correlation. |
| `stock-reservation-cross-channel-convergence-pass` | One unit reserved on one channel causes other channels to converge unavailable/blocked. | `pass` | Channel readback evidence from each approved channel. |
| `stock-reservation-cross-channel-convergence-lag-warn` | Channels eventually converge but exceed warning threshold. | `warn` | Channel timestamps and SLA threshold `[MISSING: threshold]`. |
| `stock-reservation-cross-channel-payment-success-finality-pass` | Payment success causes final decrement/fulfillment and permanent unavailability elsewhere. | `pass` | Orders/payment/Warehouse finality evidence. |
| `stock-reservation-cross-channel-payment-failure-release-pass` | Failed payment/cancel/expiry releases hold and channels return available when stock remains. | `pass` | Orders cancellation/expiry, Warehouse release, channel readback evidence. |
| `stock-reservation-cross-channel-supplier-traceability-blocked` | Supplier stock lineage is required but not yet provable. | `blocked` | Suppliers/Warehouse traceability evidence or `[MISSING: ...]` blocker. |
| `stock-reservation-cross-channel-synthetic-probe-blocked` | Live synthetic transaction probe remains gated without approved packet. | `blocked` | Runtime packet reference `[MISSING: approved synthetic product/warehouse/channel runtime packet]`. |

## Runtime And Integration Blockers

- `[RESOLVED: Warehouse read-only stock authority evidence endpoint exists at GET /api/business-health/stock-authority]`
- `[MISSING: approved live Warehouse stock authority runtime evidence packet for target products]`
- `[RESOLVED: Orders read-only order/reservation correlation evidence endpoint exists at GET /api/business-health/order-reservation-correlation]`
- `[MISSING: approved live Orders/Warehouse runtime evidence packet for target order/product/channel]`
- `[MISSING: exact target order/product/channel and warehouse reservation lookup scope for live correlation proof]`
- `[MISSING: approved cleanup/payment/provider boundary packet if runtime proof creates or cancels a real order]`
- `[RESOLVED: Catalog read-only channel availability evidence endpoint exists at GET /api/business-health/channel-availability]`
- `[MISSING: approved live Catalog channel availability runtime evidence packet for target products]`
- `[MISSING: exact target product IDs and channel list for live Catalog business-health proof]`
- `[MISSING: approved protected Catalog service token or JWT for live coverage/projection/readiness checks]`
- `[RESOLVED: Suppliers read-only supplier-to-Warehouse traceability evidence endpoint exists at GET /api/business-health/supplier-warehouse-traceability]`
- `[MISSING: real supplier display name, stable supplier code, business owner, technical owner, and escalation path]`
- `[MISSING: authentication shape and runtime credential reference key names]`
- `[MISSING: product identity mapping, Catalog category mapping prerequisites, and Catalog write constraints]`
- `[MISSING: warehouse/location mapping, dropship versus supplier-managed semantics, and Warehouse mutation approval boundary]`
- `[MISSING: owner validation evidence and explicit approval for any runtime import, deployment, Catalog write, or Warehouse mutation]`
- `[MISSING: per-marketplace read-only availability readback evidence and provider semantics]`
- `[MISSING: payment outcome redaction boundary and finality evidence source]`
- `[MISSING: scheduler owner, cadence, alert routing, and dashboard/report destination]`
- `[MISSING: business health evidence retention policy]`
- `[MISSING: synthetic product/warehouse/channel runtime packet]`
- `[MISSING: approved marketplace sandbox/dry-run/de-list policy for each live channel]`
- `[MISSING: cleanup/retention policy for synthetic orders and reservations]`

## Parallel Execution And Handoff

| Workstream | Status | Owner role | Scope | Shared contracts | Validation owner | Merge order |
|---|---|---|---|---|---|---|
| BPCP process contract | ready now | BPCP process contract owner | This document and source verifier only. | `stock-reservation-cross-channel-v1`, `bpcp.health-evidence.v1` | BPCP process contract owner | 1 |
| Warehouse evidence adapter | ready now | Warehouse stock owner | Produce read-only stock authority and reservation lifecycle evidence. | Health evidence envelope | Warehouse owner | 1 |
| Orders evidence adapter | ready now after dirty-worktree ownership check | Orders lifecycle owner | Produce order/reservation/payment handoff correlation evidence. | Health evidence envelope | Orders owner | 1 |
| Catalog/channel adapter | ready now | Catalog/channel owner | Produce sellability and projection evidence. | Health evidence envelope | Catalog owner | 1 |
| Suppliers traceability adapter | ready now | Suppliers owner | Produce supplier-to-Warehouse lineage evidence. | Health evidence envelope | Suppliers owner | 1 |
| Marketplace readback inventory | ready now | Marketplace channel owner | Produce provider/channel readback and policy matrix. | Health evidence envelope | Channel owner | 1 |
| Cross-service monitor | dependency-gated | BPCP integration owner | Aggregate service-owned envelopes into report. | All service envelopes | Integration owner | 2 |
| Scheduled monitor/dashboard | dependency-gated | Ops/BPCP owner | Schedule, retain, alert, and visualize reports. | Business health report schema | Ops/BPCP owner | 3 |
| Synthetic transaction probe | blocked | Runtime packet owner | Execute owner-approved mutation probe only. | Approved runtime packet | Runtime owner | Later |

Integration owner notes:

- Keep BPCP as aggregator and process contract owner, not domain authority.
- Treat missing evidence as `blocked` or `validation debt`, never as pass.
- Classify proven invariant violations as live regressions.
- Require service-owned timestamps and redaction boundaries before storing evidence.

## Validation Result

Commands run from `/home/ssf/Documents/Github/business-process-control-plane`:

```bash
node scripts/verify-stock-reservation-process-contract.js
git diff --check
```

Result:

- `node scripts/verify-stock-reservation-process-contract.js`: PASS - stock reservation cross-channel process contract is source-valid.
- `git diff --check`: PASS - no whitespace errors reported.
