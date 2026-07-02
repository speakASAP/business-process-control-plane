# Business Process Control Plane

Business Process Control Plane, or BPCP, is an Alfares ecosystem service for
dynamic business processes.

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

This service has a JSON-backed local process registry for code validation and
typed in-memory policy/workflow registries for the Holiday Discount pilot.

The JSON process store is not the final production persistence decision; it
exists so process lifecycle, validation, audit, editor, policy/workflow, and
simulation flows can be developed without waiting for Kubernetes or database
wiring.

## Local commands

```bash
npm install
npm run verify:contracts
npm run verify:process-registry
npm run verify:policy-workflow
npm run verify:editor
npm run build
npm run verify:simulation
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
GET  /api/policies
GET  /api/policies/:policyId/versions/:version
POST /api/policies/:policyId/versions/:version/validate
GET  /api/workflows
GET  /api/workflows/:workflowId/versions/:version
POST /api/workflows/:workflowId/versions/:version/validate
GET  /api/capabilities
POST /api/simulate
```

## Boundaries

BPCP coordinates business process versions. It does not directly mutate
domain-service databases and does not own monetary finality.

## Deployment

Deployment is intentionally blocked until Kubernetes, ingress, service identity,
event bus, and production persistence are approved.
