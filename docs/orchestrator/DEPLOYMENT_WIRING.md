# BPCP Deployment Wiring

Date: 2026-07-02
Status: prepared in code; not deployed in this turn

## Vision

Business process changes can be published through a stable control plane with auditable process events.

## Goal Impact

The Holiday Discount pilot can now be packaged as a Kubernetes service with approved BPCP event-bus producer wiring while downstream consumers remain service-owned.

## System

`business-process-control-plane`

## Feature

`FEAT-BPCP-DEPLOYMENT-001`: Kubernetes deployment wiring and RabbitMQ producer enablement.

## Task

Prepare production wiring without running a live deploy.

## Execution Plan

1. Add ConfigMap for non-secret runtime settings.
2. Add ExternalSecret for RabbitMQ URL and process-event signing secret.
3. Add PVC for the current JSON store.
4. Add Deployment and Service manifests.
5. Replace the blocking deploy script with a standard validate/build/push/apply/rollout/health flow.
6. Add `verify:deployment-wiring` to keep manifests and deploy script contract-checked.

## Coding Prompt

Do not invent downstream consumer ownership. BPCP publishes signed process events to `bpcp.events`; each affected service owns its own queue binding, retry, DLQ, and replay/backfill behavior.

## Code

- `k8s/configmap.yaml`
- `k8s/external-secret.yaml`
- `k8s/pvc.yaml`
- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `scripts/deploy.sh`
- `scripts/verify-deployment-wiring.js`

## Validation

Run:

```bash
npm run verify:deployment-wiring
npm test
```

## Remaining Blockers

- [MISSING: database persistence decision beyond initial file-backed PVC]
- [MISSING: Vault property `secret/prod/business-process-control-plane` / `BPCP_PROCESS_SIGNING_SECRET` must exist before live deploy]
- [MISSING: downstream BPCP event consumer implementation and replay/backfill ownership]
- [MISSING: public process-editor ingress/domain]
