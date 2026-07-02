# Holiday Discount Parallel Execution Plan

Date: 2026-07-03
Status: active integration-owner plan
Owner: BPCP integration orchestrator

## Intent Preservation Chain

- Vision: business users can publish bounded Holiday Discount process changes while domain services keep stable ownership and fail closed.
- Goal Impact: the pilot moves from a deployed BPCP/Catalog reference path into independently owned Marketing, FlipFlop quote, and event-hardening lanes.
- System: `business-process-control-plane`, `catalog-microservice`, `marketing-microservice`, `flipflop`, with later Orders/Invoices/Notifications follow-ups.
- Feature: `holiday-discount-2026` downstream adoption after the Catalog reference consumer.
- Task: run independent workstreams with explicit owners, write scopes, blockers, and validation evidence.
- Execution Plan: keep process/event hardening separate from Marketing content refs and FlipFlop server quote work; merge in dependency order.
- Coding Prompt: do not move pricing, cart, order, invoice, notification, or campaign ownership into BPCP or Catalog; preserve `[MISSING: ...]` blockers instead of inventing contracts.
- Code: per-workstream code changes are owned by each worker below.
- Validation: per-workstream commands below plus final integration smoke.

## Current Baseline

- BPCP is deployed in `statex-apps` and RabbitMQ transport reports ready.
- Catalog is deployed with BPCP process-event consumer and consumed `holiday-discount-2026:1:process.published:3`.
- Catalog exposes `catalog.discount-eligibility-facts.v1` through `GET /api/business-process/catalog/products/:productId/discount-eligibility`.
- Catalog remains product fact owner only; it does not calculate monetary discounts.
- Remaining blocker: `[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]`.

## Parallel Workstreams

| ID | Status | Owner Role | Repo | Objective | Allowed Files | Dependencies | Validation Owner |
|---|---|---|---|---|---|---|---|
| W4 | running | Marketing worker | `marketing-microservice` | Add Holiday Discount campaign/content refs and slot contract. | Marketing docs, `src/types.ts`, `src/campaign-blueprints.ts`, `src/api-contracts.ts`, tests/verifier. | None for content refs; no delivery. | Marketing worker |
| W5 | running | FlipFlop quote worker | `flipflop` | Add server-owned Holiday Discount quote path using Catalog eligibility facts. | shared Catalog client, order-service quote logic, focused tests/verifier. | Catalog facts endpoint deployed; category allow-list may keep quote fail-closed. | FlipFlop worker |
| W6 | running | Event hardening worker | `business-process-control-plane`, `catalog-microservice` | Harden lifecycle subscription, idempotency, replay/backfill contract. | BPCP event source files/docs; Catalog `src/bpcp-events`, config, docs. | Must avoid dirty unrelated Catalog `src/product-relations/*`. | Event hardening worker |
| W7 | dependency-gated | Orders snapshot worker | `orders-microservice` | Add immutable applied-discounts snapshot contract. | `[MISSING: exact files after W5 quote contract]` | W5 quote evidence and approved snapshot schema. | Orders worker |
| W8 | dependency-gated | Invoices renderer worker | `invoices-microservice` | Render discount lines from Orders snapshot. | `[MISSING: exact files after W7]` | W7 snapshot contract. | Invoices worker |
| W9 | dependency-gated | Notifications worker | `notifications-microservice` | Deliver post-purchase message by template ref. | `[MISSING: exact files after W4 and paid-order event contract]` | W4 content refs and `[MISSING: final paid-order event contract]`. | Notifications worker |

## Shared Contracts

- BPCP process: `holiday-discount-2026`, version `1`.
- Policy ref: `holiday-10-percent-selected-categories`.
- Campaign ref: `holiday-2026-main`.
- Catalog fact schema: `catalog.discount-eligibility-facts.v1`.
- BPCP exchange: `bpcp.events`.
- BPCP lifecycle routing keys: `bpcp.process.created.v1`, `bpcp.process.validated.v1`, `bpcp.process.scheduled.v1`, `bpcp.process.published.v1`, `bpcp.process.paused.v1`, `bpcp.process.retired.v1`.

## Forbidden Cross-Edits

- W4 must not edit BPCP, Catalog, Notifications delivery, storefront/cart/checkout pricing, Kubernetes manifests, deploy scripts, secrets, or production data.
- W5 must not edit Catalog, BPCP, Payments, central Orders, Invoices, Kubernetes manifests, deploy scripts, secrets, production orders, or payment provider state.
- W6 must not edit Marketing, FlipFlop, pricing/cart/order/payment/invoice code and must not edit Catalog dirty `src/product-relations/*`.
- No worker may deploy without explicit integration-owner approval.

## Blockers

- `[MISSING: approved Holiday Discount selected category references]`
- `[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]`
- `[MISSING: pricing rounding mode and monetary precision contract]`
- `[MISSING: approved discount precedence and stacking contract]`
- `[MISSING: final orders.applied-discounts.v1 snapshot field contract in orders.create.v1]`
- `[MISSING: approved Holiday Discount notification template ref]`
- `[MISSING: final paid-order event contract]`
- `[UNKNOWN: first storefront rollout target beyond FlipFlop checkout]`

## Merge Order

1. W6 event hardening source changes, because future BPCP queue consumers must not copy published-only/no-replay behavior.
2. W4 Marketing content/ref contract, because it is independent and does not execute delivery.
3. W5 FlipFlop quote core, gated by Catalog fact endpoint and fail-closed behavior.
4. W7 Orders immutable applied-discount snapshot.
5. W8 Invoices discount-line renderer.
6. W9 Notifications post-purchase delivery.
7. Final integration validation and deploy sequencing.

## Validation Matrix

- BPCP: `npm run verify:event-publication`, `npm run verify:event-transport`, `npm run build`, `npm test`.
- Catalog: `npm run verify:bpcp-consumer`, focused BPCP projection Jest, `npm run build`.
- Marketing: `npm run build`, `npm test`, focused campaign blueprint/API contract tests.
- FlipFlop: shared build, order-service build, focused Holiday Discount quote verifier.
- Runtime smoke after deploy approval: BPCP outbox/transport info, Catalog `/ready`, FlipFlop dry-run quote endpoint or non-mutating verifier.

## Integration Owner Notes

- Keep Marketing content refs and FlipFlop quote work moving in parallel, but do not let either add live BPCP queue consumers before W6 completes.
- If Catalog remains dirty outside `src/bpcp-events`, W6 may proceed only if it does not touch those files and validation can be run without overwriting them.
- If FlipFlop cannot safely persist discount evidence without Orders schema changes, W5 should document `[MISSING: final orders.applied-discounts.v1 snapshot field contract]` and keep the first implementation bounded to server quote calculation and response metadata.
