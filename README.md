# Business Process Control Plane

## status

Business Process Control Plane (BPCP) is an active Alfares ecosystem service managing dynamic business-process lifecycle state: process/policy/workflow registries, a visual process editor, simulation, publication lifecycle, and a durable process event outbox.

## documentation authority

- `AGENTS.md` for repository intent and current blockers
- `README.md` for runtime endpoints and current implementation state
- `docs/01_vision/VISION.md` for durable product direction
- `docs/orchestrator/` for dated review/fix task records

## capabilities

- Process registry with versioned lifecycle (validate, schedule, publish, pause, retire) and audit history
- Policy registry and workflow registry (in-memory/seed-driven for the Holiday Discount pilot)
- Visual process editor (`GET /editor`)
- Service capability registry describing known ecosystem service capabilities for workflow definitions to reference
- Simulation endpoint (`POST /api/simulate`)
- Durable process event outbox with bounded dispatch/replay (`limit` query param, default 100, clamped 1..500)
- RabbitMQ topic transport adapter for process events (env-gated)
- Audit-ready metadata and fail-closed mutation contracts

## interfaces

- `GET /health` (public)
- `GET /editor`, `GET /api/processes`, `POST /api/processes` (auth required)
- `GET /api/processes/:processId/audit`, `.../versions/:version`, `.../versions/:version/audit`
- `POST /api/processes/:processId/versions/:version/{validate,schedule,publish,pause,retire}` (auth required)
- `GET /api/events/outbox`, `/outbox/info`, `/outbox/:processId`, `POST /outbox/dispatch`, `/outbox/replay` (auth required)
- `GET /api/events/transport/info`
- `GET /api/policies`, `/api/workflows`, `/api/capabilities`, `POST /api/simulate`

## development

- Stack: NestJS, TypeScript, TypeORM, PostgreSQL
- Local run: `npm install`, `npm run start:dev`
- Verification scripts: `npm run verify:contracts`, `verify:process-registry`, `verify:event-publication`, `verify:event-transport`, `verify:deployment-wiring`, `verify:policy-workflow`, `verify:editor`, `verify:instances`, `verify:simulation`
- Tests: `npm test`; build: `npm run build`

## configuration

- Default port: 3375
- `BPCP_DATABASE_URL` is required; the service refuses to start without a configured PostgreSQL connection
- `AUTH_SERVICE_URL`, `AUTH_VALIDATION_PATH` (default `/auth/validate`), `AUTH_VALIDATION_METHOD` (default `POST`), `AUTH_VALIDATION_TIMEOUT_MS`
- `LOGGING_SERVICE_URL`, `MONITORING_SERVICE_URL`
- `BPCP_EVENT_BUS_ENABLED` (env-gated, default false), `BPCP_EVENT_BUS_URL`/`RABBITMQ_URL`, `BPCP_EVENTS_EXCHANGE`, `BPCP_EVENTS_ROUTING_KEY_PREFIX`
- `BPCP_PROCESS_SIGNING_SECRET` is Vault-managed

## deployment

- Deploy command: `./scripts/deploy.sh`, delegating to shared deployment automation and verifying rollout + health
- Kubernetes manifests under `k8s/`: ConfigMap, ExternalSecret, Deployment, Service (no Ingress yet; public editor/domain approval pending)
- Target namespace: `statex-apps`

## health and observability

- Health endpoint: `GET /health` (public, no auth required)
- Structured logging via `logging-microservice` (`LOGGING_SERVICE_URL`)
- Monitoring via `monitoring-microservice` (`MONITORING_SERVICE_URL`)
