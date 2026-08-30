# Vision: Business Process Control Plane

> Protected intent baseline. Human approval is required before changes to the approved project direction.

```yaml
id: VISION-business-process-control-plane
status: approved
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: validated
upstream:
  - ../00_constitution/CONSTITUTION.md
downstream:
  - ../../BUSINESS.md
  - ../17_governance/PROJECT_INVARIANTS.md
  - ../22_goal_impact/GOAL-IMPACT-TASK-001.md
```

## one-sentence vision

Give the Alfares ecosystem a single, auditable control plane for dynamic business-process, policy, and workflow lifecycle state.

## problem statement

Without a shared control plane, business-process, policy, and workflow definitions would be scattered across domain services with inconsistent versioning, validation, and audit trails. BPCP centralizes this lifecycle with fail-closed mutation contracts and a durable event outbox, while explicitly not owning domain data it does not need to own.

## target users

- Ecosystem service owners authoring and publishing processes, policies, and workflows
- Downstream services consuming BPCP's registries and process event outbox
- Operators using the visual process editor

## core user need

Owners need a governed, auditable way to define, validate, simulate, publish, and retire business processes and workflows, with events propagated durably to downstream consumers, without BPCP silently taking over domain ownership it does not have.

## key outcomes

- Process registry, audit history, and event outbox durably persisted in PostgreSQL
- Fail-closed, auth-gated mutation endpoints for all sensitive process/outbox operations
- Bounded, safe outbox dispatch/replay that cannot reach unbounded database queries
- Optional RabbitMQ event transport that can be enabled without code changes

## non-goals

- Owning product catalog, pricing, payment, or invoice data
- Delivering notifications directly
- Mutating domain-service databases directly

## success criteria

- All mutation endpoints correctly enforce auth validation via AUTH_SERVICE_URL
- Outbox dispatch/replay limits remain bounded to 1..500 under all inputs
- Verification scripts (verify:contracts, verify:process-registry, etc.) and npm test pass

## approval

Status: approved
Approved by: project owner
Approval evidence: owner-confirmation: business-process-control-plane-onboarding-approved
