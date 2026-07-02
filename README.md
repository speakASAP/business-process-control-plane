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

This service now has a JSON-backed local process registry for code validation.
The JSON store is not the final production persistence decision; it exists so
process lifecycle, validation, audit, and editor flows can be developed without
waiting for Kubernetes or database wiring.

## Local commands

```bash
npm install
npm run verify:contracts
npm run verify:process-registry
npm run build
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
GET  /api/processes/store/info
GET  /api/processes/:processId/audit
GET  /api/processes/:processId/versions/:version
GET  /api/processes/:processId/versions/:version/audit
POST /api/processes/:processId/versions/:version/validate
POST /api/processes/:processId/versions/:version/schedule
POST /api/processes/:processId/versions/:version/publish
POST /api/processes/:processId/versions/:version/pause
POST /api/processes/:processId/versions/:version/retire
GET  /api/capabilities
POST /api/simulate
```

## Boundaries

BPCP coordinates business process versions. It does not directly mutate
domain-service databases and does not own monetary finality.

## Deployment

Deployment is intentionally blocked until Kubernetes, ingress, service identity,
event bus, and production persistence are approved.
