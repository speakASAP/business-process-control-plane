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
| `events` | Local durable process-event outbox for lifecycle publication contracts |
| `capabilities` | Initial affected-service capability registry |
| `simulation` | Deterministic Holiday Discount simulation endpoint |
| `editor` | Built-in visual process editor skeleton |
| `health` | Service health and missing runtime facts |

## Runtime persistence

The process registry persists to `BPCP_DATA_DIR/processes.json`.
The process event outbox persists to `BPCP_DATA_DIR/process-event-outbox.json`.
Default `BPCP_DATA_DIR` is `<repo>/data`, and `data/` is ignored by Git.

This is a development persistence layer only. Production still requires an
approved database/persistence decision.

## Process event publication

Lifecycle actions emit `bpcp.process-event.v1` envelopes with process id,
version, status, policy refs, workflow refs, campaign refs, lifecycle details,
and pending delivery metadata.

Current endpoints:

```text
GET /api/events/outbox
GET /api/events/outbox/info
GET /api/events/outbox/:processId
```

The outbox is local and durable enough for code validation. Production dispatch
is still blocked by `[MISSING: event bus transport, topic naming, signing,
retry, and consumer ack contract]`.

## Future modules

- publication transport adapter;
- publication signer;
- audit log client;
- service adapter executor;
- RBAC integration.
