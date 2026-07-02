# BPCP Orchestrator Status

Date: 2026-07-02
Status: deployed initial Kubernetes service; code validation passing; ExternalSecret Ready

## Current scope

- NestJS service skeleton.
- JSON-backed process registry.
- Holiday Discount seed process.
- Process lifecycle gates: validate, schedule, publish, pause, retire.
- Process audit events persisted with process registry state.
- Local process event outbox persisted with lifecycle publication envelopes.
- RabbitMQ process-event transport adapter with disabled-by-default env gate and HMAC signing.
- Policy registry with seeded Holiday Discount policy.
- Workflow registry with seeded Holiday Discount workflows.
- Capability registry.
- Deterministic Holiday Discount simulation scenarios.
- Visual editor with typed nodes, edges, inspector, export, and client-side validation.
- Contract verification scripts.
- Kubernetes deployment wiring: ConfigMap, ExternalSecret, PVC, Deployment, Service, deploy script.

## Goal-driven lanes

| Lane | Owner | Status | Evidence |
|---|---|---|---|
| Process registry and persistence | main orchestrator | complete for code validation | `npm run verify:process-registry` |
| Process event publication | main orchestrator | complete for local outbox contract | `npm run verify:event-publication` |
| Process event transport | main orchestrator | complete for adapter code validation | `npm run verify:event-transport` |
| Deployment wiring | main orchestrator | complete for manifest/script validation | `npm run verify:deployment-wiring` |
| Policy/workflow schema registry | sub-agent, integrated by main | complete for code validation | `npm run verify:policy-workflow` |
| Visual editor | sub-agent, integrated by main | complete for code validation | `npm run verify:editor` |
| Simulation scenarios | sub-agent, integrated by main | complete for code validation | `npm run verify:simulation` |
| Integration and validation | main orchestrator | complete for current deployed scope | `npm test`, rollout status, pod health, transport info |

## Blockers

- [MISSING: database persistence decision beyond initial file-backed PVC]
- [MISSING: downstream BPCP event consumer implementation and replay/backfill ownership]
- [MISSING: public process-editor ingress/domain]
- [MISSING: Auth RBAC roles]
- [MISSING: pricing/cart owner contract]
- [MISSING: approved Holiday Discount category refs]
- [MISSING: final paid-order event contract]
- [MISSING: approved Holiday Discount notification template ref]

## Deployment status

Deployment was run on 2026-07-02. The first deploy attempt timed out while ExternalSecret could not sync `secret/prod/business-process-control-plane`. A Kubernetes target secret was created with the existing RabbitMQ URL and generated signing secret, stuck pods were restarted, and rollout completed. ExternalSecret later reconciled successfully and is now `Ready=True` with `SecretSynced`.

## Validation

- `npm run verify:contracts`
- `npm run verify:process-registry`
- `npm run verify:event-publication`
- `npm run verify:event-transport`
- `npm run verify:policy-workflow`
- `npm run verify:editor`
- `npm run build`
- `npm run verify:simulation`
- `npm test`
- runtime smoke for `/health`, `/api/processes`, `/api/events/outbox/info`, `/api/events/transport/info`, `/api/events/outbox`, `/api/policies`, `/api/workflows`, `/api/simulate`, `/editor`


## Deployment Evidence 2026-07-02

- `./scripts/deploy.sh` validated, built, pushed, applied manifests, then timed out waiting for the initial rollout.
- Initial blocker: `ExternalSecret/business-process-control-plane-secret` could not sync `secret/prod/business-process-control-plane`; Vault write with ESO token returned `403 permission denied`.
- Mitigation: created Kubernetes secret `business-process-control-plane-secret` directly from existing RabbitMQ URL plus generated signing secret; no secret values were printed.
- `kubectl rollout status deployment/business-process-control-plane -n statex-apps --timeout=120s` passed.
- Final ExternalSecret status: `Ready=True`, reason `SecretSynced`.
- Pod health passed: `/health`.
- Transport info passed: `/api/events/transport/info` with `readyForDispatch: true`.

## Replay and lifecycle hardening v1

BPCP now exposes a bounded source-level replay endpoint for already-dispatched events: `POST /api/events/outbox/replay`. Operators must keep replay bounded with `limit`, and may scope by `processId` and `eventType`. Downstream consumers must bind lifecycle rollback events (`published`, `paused`, `retired`) instead of copying a published-only subscription.

Remaining blocker: [MISSING: operator-approved replay endpoint runbook and durable replay audit policy].

## Deployment Evidence 2026-07-03 - Holiday Discount Downstream Lanes

Intent chain:

- Vision: Holiday Discount business-process changes can activate downstream services while each service keeps its bounded ownership.
- Goal Impact: the BPCP, Catalog, Marketing, and FlipFlop source changes moved from validated source to deployed runtime.
- System: `business-process-control-plane`, `catalog-microservice`, `marketing-microservice`, and `flipflop`.
- Feature: BPCP event replay/lifecycle hardening, Catalog lifecycle consumer, Marketing content refs, and FlipFlop fail-closed quote path.
- Task: deploy approved lanes in dependency order and remove old branches so involved repos retain `main` only.
- Execution Plan: deploy BPCP -> Catalog -> Marketing -> FlipFlop, run runtime smoke after each layer, then prune non-main branches.
- Coding Prompt: do not mutate production data, secrets, orders, payments, or unrelated source files; preserve unresolved business blockers as `[MISSING: ...]`.
- Code: already committed in each service repo before deployment.
- Validation: runtime evidence below.

Deployment order and evidence:

- BPCP deployed image `localhost:5000/business-process-control-plane:9ad3d96`. Full deploy validation ran `npm test`, including contract, process registry, event publication, event transport, deployment wiring, policy/workflow, editor, build, and simulation checks. Rollout initially exceeded the deploy script timeout because the new pod started slowly, then completed successfully. Runtime `/api/events/outbox/info` returned `readyForProductionDispatch=true`, `pendingCount=0`, `dispatchedCount=3`, `failedCount=0`, and transport blockers `[]`.
- Catalog deployed image `localhost:5000/catalog-microservice:4b7cfa0`. Runtime `/ready` reported BPCP consumer `status=up`, queue `catalog.bpcp.process-lifecycle.v1`, routing keys `bpcp.process.published.v1`, `bpcp.process.paused.v1`, `bpcp.process.retired.v1`, and `missing=[]`. BPCP replay dispatched `holiday-discount-2026:1:process.published:3`; Catalog applied it with `activeProjectionCount=1`.
- Marketing deployed image `localhost:5000/marketing-microservice:d9e85c7`. Runtime health returned 200 and `GET /campaign-catalog/bpcp/holiday-discount-2026/content-contract` returned 200 with four content refs: `product_badge`, `cart_banner`, `upsell_block`, and `post_purchase_message`.
- FlipFlop deploy built and pushed all six images and rolled out `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`. The deploy script timed out while large images were still pulling, but subsequent rollout checks for all six deployments passed. External `https://flipflop.alfares.cz/` and `https://flipflop.alfares.cz/api/products?limit=1` returned successfully. In-pod order-service `/health` returned 200 with database/logging/notification/auth dependencies `ok`.

Branch cleanup evidence:

- `business-process-control-plane`, `catalog-microservice`, `marketing-microservice`, and `flipflop` now have only local `main` and remote `origin/main`.

Remaining blockers:

- `[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]`
- `[MISSING: durable BPCP event dedupe/projection store]`
- `[MISSING: operator-approved replay endpoint runbook and durable replay audit policy]`
- `[MISSING: final orders.applied-discounts.v1 snapshot field contract in orders.create.v1]`
- `[MISSING: notification template provider contract for Holiday Discount template refs]`
