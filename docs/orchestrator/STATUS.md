# BPCP Orchestrator Status

Date: 2026-07-02
Status: implementation started; deployment wiring prepared; code validation passing; no deployment run in this turn

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
| Integration and validation | main orchestrator | complete for current non-deploy scope | `npm test`, runtime smoke |

## Blockers

- [MISSING: database persistence decision beyond initial file-backed PVC]
- [MISSING: Vault property `secret/prod/business-process-control-plane` / `BPCP_PROCESS_SIGNING_SECRET` must exist before live deploy]
- [MISSING: downstream BPCP event consumer implementation and replay/backfill ownership]
- [MISSING: public process-editor ingress/domain]
- [MISSING: Auth RBAC roles]
- [MISSING: pricing/cart owner contract]
- [MISSING: approved Holiday Discount category refs]
- [MISSING: final paid-order event contract]
- [MISSING: approved Holiday Discount notification template ref]

## Deployment status

Deployment was not run in this turn. Kubernetes wiring is now present in code and can be deployed through `./scripts/deploy.sh` after the remaining Vault/domain/persistence checks are accepted.

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
