# BPCP Service Implementation Notes

Status: skeleton
Date: 2026-07-02

This repository implements the proposed Business Process Control Plane service.
The central cross-service contract pack lives in:

`/home/ssf/Documents/Github/statex-ecosystem/docs/business-process-control-plane/`

## Skeleton modules

| Module | Purpose |
|---|---|
| `processes` | In-memory process registry and lifecycle endpoints |
| `capabilities` | Initial affected-service capability registry |
| `simulation` | Deterministic Holiday Discount simulation endpoint |
| `editor` | Built-in visual process editor skeleton |
| `health` | Service health and missing runtime facts |

## Future modules

- policy registry;
- workflow compiler;
- publication signer;
- audit log client;
- event bus publisher;
- service adapter executor;
- persistent store;
- RBAC integration.
