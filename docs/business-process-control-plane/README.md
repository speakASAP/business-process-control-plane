# BPCP Service Implementation Notes

Status: implementation started
Date: 2026-07-02

This repository implements the proposed Business Process Control Plane service.
The central cross-service contract pack lives in:

`/home/ssf/Documents/Github/statex-ecosystem/docs/business-process-control-plane/`

## Implemented modules

| Module | Purpose |
|---|---|
| `processes` | JSON-backed process registry, lifecycle gates, validation, audit |
| `storage` | Local JSON file store for code validation before production persistence |
| `capabilities` | Initial affected-service capability registry |
| `simulation` | Deterministic Holiday Discount simulation endpoint |
| `editor` | Built-in visual process editor skeleton |
| `health` | Service health and missing runtime facts |

## Runtime persistence

The process registry persists to `BPCP_DATA_DIR/processes.json`.
Default `BPCP_DATA_DIR` is `<repo>/data`, and `data/` is ignored by Git.

This is a development persistence layer only. Production still requires an
approved database/persistence decision.

## Future modules

- policy registry integration;
- workflow compiler integration;
- publication signer;
- audit log client;
- event bus publisher;
- service adapter executor;
- RBAC integration.
