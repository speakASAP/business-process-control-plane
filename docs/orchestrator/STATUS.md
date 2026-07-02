# BPCP Orchestrator Status

Date: 2026-07-02
Status: code implementation in progress

## Current scope

- NestJS service skeleton.
- JSON-backed process registry.
- Holiday Discount seed process.
- Process lifecycle gates: validate, schedule, publish, pause, retire.
- Process audit events persisted with process registry state.
- Capability registry.
- Simulation endpoint.
- Visual editor skeleton.
- Contract verification scripts.

## Goal-driven lanes

| Lane | Owner | Status | Files |
|---|---|---|---|
| Process registry and persistence | main orchestrator | in progress | `src/processes/**`, `src/storage/**` |
| Policy/workflow schema registry | sub-agent | ready_parallel | `src/policies/**`, `src/workflows/**` |
| Visual editor | sub-agent | ready_parallel | `src/editor/**` |
| Simulation scenarios | sub-agent | ready_parallel | `src/simulation/**` |
| Integration and validation | main orchestrator | final_integration | shared scripts/docs/package/app module |

## Blockers

- [MISSING: production persistence decision]
- [MISSING: event bus runtime contract]
- [MISSING: Auth RBAC roles]
- [MISSING: production deployment manifest]
- [MISSING: pricing/cart owner contract]

## Deployment status

Deployment is intentionally skipped. Kubernetes deployment is blocked by the
owner until cluster/deployment issues are fixed.

## Validation

- `npm run verify:contracts`
- `npm run verify:process-registry`
- `npm run build`
- runtime smoke for `/health`, `/api/processes`, `/editor`
