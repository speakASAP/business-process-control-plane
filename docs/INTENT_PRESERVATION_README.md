# Intent Preservation

Target: `business-process-control-plane`
Date: 2026-08-30

## Vision

Business users can change bounded business processes dynamically while domain
services remain stable, safe, and auditable.

## Goal Impact

BPCP process lifecycle state, immutable process audit history, and process-event
publication outbox are durable and restart-safe through PostgreSQL persistence
instead of file/PVC-backed runtime storage.

## System

`business-process-control-plane`

## Feature

`FEAT-BPCP-002`: durable control-plane runtime persistence and authenticated
mutation boundary.

## Task

`TASK-BPCP-DURABLE-CONTROL-PLANE-SLICE-001`: replace process-registry and
outbox runtime persistence with TypeORM/PostgreSQL behavior, retain existing
workflow-instance persistence, and enforce fail-closed authenticated mutation
for sensitive process/outbox endpoints.

## Execution Plan

1. Add TypeORM entities + migration for process definitions, audit events, and outbox rows.
2. Implement process/outbox repositories with durable sequence ids and idempotent dispatch claims.
3. Refactor process and event services/controllers to use repositories while preserving API routes.
4. Add fail-closed auth validation client/guard using `AUTH_SERVICE_URL`.
5. Update deployment/config/verifier contracts away from file/PVC runtime assumptions.
6. Add focused unit tests for auth, repositories, event publication, and migration contract markers.

## Coding Prompt

Do not invent RBAC roles. Validate identity for sensitive mutation endpoints,
keep `/health` public, preserve simulation/editor workflows, and keep unresolved
role mapping as `[MISSING: ...]`.

## Code

Durable runtime slice implemented under:

- `src/processes/**` (entities, repository, service/controller refactor)
- `src/events/**` (outbox entity/repository/service/controller refactor)
- `src/auth/**` (auth validation client + guard)
- `src/database/migrations/1756660000000-CreateProcessRegistryOutboxTables.ts`
- `k8s/configmap.yaml`, `k8s/deployment.yaml`, `deploy.config.sh`

## Validation

Run:

```bash
npm run verify:contracts
npm run verify:process-registry
npm run verify:event-publication
npm run verify:event-transport
npm run verify:deployment-wiring
npm run build
npm run test:unit -- --runInBand src/auth/auth-validation.client.spec.ts src/auth/auth-identity.guard.spec.ts src/events/event-publisher.service.spec.ts src/events/process-event-outbox.repository.spec.ts src/processes/process-registry.repository.spec.ts src/database/migrations/1756660000000-CreateProcessRegistryOutboxTables.spec.ts
git diff --check
```

[MISSING: exact Auth RBAC roles]
[MISSING: downstream BPCP event consumer implementation and replay/backfill ownership]
[MISSING: operator-approved replay endpoint runbook and durable replay audit policy]
