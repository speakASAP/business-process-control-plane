# Business Process Control Plane

Business Process Control Plane, or BPCP, is a proposed Alfares ecosystem
service for dynamic business processes.

It provides:

- process registry;
- policy registry;
- workflow registry;
- visual process editor;
- service capability registry;
- simulation endpoint;
- publication lifecycle;
- audit-ready metadata;
- fail-closed contracts for affected services.

## Current state

This is an initial skeleton. It intentionally keeps runtime persistence in
memory until the storage and event-bus contracts are approved.

## Local commands

```bash
npm install
npm run build
npm run verify:contracts
npm test
npm run start:dev
```

## Runtime

Default port: `3375`

Useful endpoints:

```text
GET  /health
GET  /editor
GET  /api/processes
POST /api/processes
POST /api/processes/:processId/versions/:version/validate
POST /api/processes/:processId/versions/:version/publish
POST /api/processes/:processId/versions/:version/pause
GET  /api/capabilities
POST /api/simulate
```

## Boundaries

BPCP coordinates business process versions. It does not directly mutate
domain-service databases and does not own monetary finality.
