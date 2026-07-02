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
| `events` | Local durable process-event outbox and disabled-by-default RabbitMQ transport |
| `capabilities` | Initial affected-service capability registry |
| `simulation` | Deterministic Holiday Discount simulation endpoint |
| `editor` | Built-in visual process editor skeleton |
| `health` | Service health and missing runtime facts |
| `k8s` | Initial Kubernetes deployment wiring with ConfigMap, ExternalSecret, PVC, Deployment, and Service |

## Runtime persistence

The process registry persists to `BPCP_DATA_DIR/processes.json`.
The process event outbox persists to `BPCP_DATA_DIR/process-event-outbox.json`.
Default `BPCP_DATA_DIR` is `<repo>/data`, and `data/` is ignored by Git.

This is the current file-backed persistence layer. The Kubernetes manifest mounts `/var/lib/bpcp` from `business-process-control-plane-data` PVC for initial deployment durability. Final database/HA persistence remains `[MISSING: database persistence decision beyond initial file-backed PVC]`.

## Process event publication

Lifecycle actions emit `bpcp.process-event.v1` envelopes with process id,
version, status, policy refs, workflow refs, campaign refs, lifecycle details,
and pending delivery metadata.

Current endpoints:

```text
GET /api/events/outbox
GET /api/events/outbox/info
POST /api/events/outbox/dispatch
GET /api/events/outbox/:processId
GET /api/events/transport/info
```

The RabbitMQ adapter follows the verified Alfares pattern used by Orders,
Marketing, Leads, and Invoices: topic exchange, durable exchange assertion,
versioned routing keys, persistent JSON messages, and env-gated enablement.

Default BPCP publication contract:

```text
exchange: bpcp.events
routing keys:
  bpcp.process.created.v1
  bpcp.process.validated.v1
  bpcp.process.scheduled.v1
  bpcp.process.published.v1
  bpcp.process.paused.v1
  bpcp.process.retired.v1
```

Dispatch is enabled in `k8s/configmap.yaml` after owner approval. `BPCP_EVENT_BUS_URL` and `RABBITMQ_URL` are sourced from Vault key `secret/prod/runlayer` property `RABBITMQ_URL`; `BPCP_PROCESS_SIGNING_SECRET` is sourced from `secret/prod/business-process-control-plane`. Downstream consumer queues and replay/backfill ownership remain service-owned.

## Future modules

- audit log client;
- service adapter executor;
- RBAC integration.
