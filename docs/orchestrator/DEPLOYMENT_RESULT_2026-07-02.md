# BPCP Deployment Result

Date: 2026-07-02
Status: deployed initial Kubernetes service with operational Vault workaround

## Vision

Business process changes can be published through a stable, auditable control plane.

## Goal Impact

The Holiday Discount pilot now has a running BPCP service in `statex-apps` with process registry, editor, outbox, and RabbitMQ transport readiness.

## System

`business-process-control-plane`

## Feature

`FEAT-BPCP-DEPLOYMENT-001`: Kubernetes deployment and process-event transport enablement.

## Task

Run the approved deployment and record blockers honestly.

## Execution Plan

1. Run repo validation.
2. Build and push Docker image.
3. Apply Kubernetes manifests.
4. Wait for rollout.
5. Verify `/health` and `/api/events/transport/info`.
6. If Vault/ExternalSecret blocks rollout, preserve the blocker and use only approved secret creation.

## Code

Deployed image: `localhost:5000/business-process-control-plane:0dde7e1`

Kubernetes resources:

- `deployment/business-process-control-plane`
- `service/business-process-control-plane`
- `pvc/business-process-control-plane-data`
- `configmap/business-process-control-plane-config`
- `secret/business-process-control-plane-secret`
- `externalsecret/business-process-control-plane-secret`

## Validation

Passed:

- `npm test`
- Docker build and push
- Kubernetes manifests applied
- `kubectl rollout status deployment/business-process-control-plane -n statex-apps --timeout=120s`
- Pod `/health`
- Pod `/api/events/transport/info`

## Runtime Note

ExternalSecret is still not Ready because Vault path `secret/prod/business-process-control-plane` does not exist and the ESO token cannot write it (`403 permission denied`). A direct Kubernetes target secret was created as an approved operational workaround using the existing RabbitMQ URL and a generated signing secret. Secret values were not printed.

## Remaining Blockers

- [MISSING: Vault write-capable token to create `secret/prod/business-process-control-plane` / `BPCP_PROCESS_SIGNING_SECRET`]
- [MISSING: database persistence decision beyond initial file-backed PVC]
- [MISSING: downstream BPCP event consumer implementation and replay/backfill ownership]
- [MISSING: public process-editor ingress/domain]
