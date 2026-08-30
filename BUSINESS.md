# Business: Business Process Control Plane

> Protected business baseline. Human approval is required before changes to the approved product scope.

```yaml
id: BUSINESS-business-process-control-plane
status: approved
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: validated
upstream:
  - docs/01_vision/VISION.md
  - docs/00_constitution/CONSTITUTION.md
downstream:
  - SYSTEM.md
  - docs/22_goal_impact/GOAL-IMPACT-TASK-001.md
```

## problem

The Alfares ecosystem needs a single control plane for dynamic business-process lifecycle state (processes, policies, workflows) with versioned publication, audit history, simulation, and event propagation, so process changes are governed, auditable, and fail-closed rather than scattered ad hoc across domain services.

## target users and stakeholders

- Ecosystem service owners defining and publishing business processes, policies, and workflows
- Downstream domain services and workflow consumers that reference BPCP's process/policy/workflow registries and event outbox
- Operators using the visual process editor to author and review process definitions

## value proposition

BPCP centralizes versioned process/policy/workflow lifecycle management with audit history and a durable event outbox, so domain services can consume governed process state and events without each service reimplementing lifecycle, validation, and publication logic.

## goals

- Provide a process registry with versioned lifecycle (validate, schedule, publish, pause, retire) and audit history
- Provide policy and workflow registries with validation and simulation
- Persist process registry, audit history, and event outbox durably in PostgreSQL
- Propagate process events via a durable outbox with bounded, auth-gated dispatch/replay and an optional RabbitMQ transport adapter
- Enforce fail-closed, bearer-token-authenticated mutation contracts on sensitive endpoints

## non-goals

- Owning product catalog data
- Owning final price calculation or monetary finality
- Owning payment capture
- Owning invoice legal totals
- Owning notification delivery channels (BPCP only registers notifications-microservice as a known capability for workflow definitions to reference)

## success metrics

- Process/policy/workflow validation and simulation correctness against their documented contracts
- Outbox dispatch/replay operates within the bounded 1..500 limit clamp without unbounded queries
- Auth-gated mutation endpoints reject unauthenticated requests (fail-closed)

## business constraints

- The service refuses to start without a configured `BPCP_DATABASE_URL`
- Sensitive process and outbox mutation endpoints require bearer-token identity validation via `AUTH_SERVICE_URL`
- RabbitMQ event-bus dispatch is env-gated (`BPCP_EVENT_BUS_ENABLED`) and off by default
- BPCP does not directly mutate domain-service databases and does not own monetary finality

## approval

Status: approved
Approved by: project owner
Approval evidence: owner-confirmation: business-process-control-plane-onboarding-approved
