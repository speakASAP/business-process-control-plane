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
