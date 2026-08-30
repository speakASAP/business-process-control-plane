# Validation: Business Process Control Plane IPS adoption bootstrap

```yaml
id: VAL-TASK-001-bootstrap-service
status: validated
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: validated
upstream:
  - ../11_tasks/TASK-001-bootstrap-service.md
  - ../22_goal_impact/GOAL-IMPACT-TASK-001.md
downstream:
[]
```

## summary

The business-process-control-plane repository now includes the complete required IPS adoption document set, including newly created BUSINESS.md/SYSTEM.md/AGENT_OPERATIONS.md/CLAUDE.md reformatted from real pre-existing README.md/AGENTS.md/STATE.json/TASKS.md content plus observed .env.example and src/ facts, with no fabricated business claims.

## upstream goal

This validation closes `TASK-001-bootstrap-service`, which advances `../22_goal_impact/GOAL-IMPACT-TASK-001.md`.

## acceptance criteria evidence

- Required root and docs/ artifacts are present and populated with project-specific content
- Integration review covers all 16 capabilities with concrete required/not-applicable decisions and evidence-grounded reasons
- STATE.json and TASKS.md reflect the real current state, including the four open [MISSING: ...] blockers

## gate evidence

- `validate_adoption_profile.py --root business-process-control-plane --phase planning` exits 0 (see command output recorded in the onboarding session)

## integration evidence

- BPCP_DATABASE_URL required-at-startup behavior confirmed via .env.example comment and README.md Current state section
- notifications-microservice confirmed as capability-registry-only reference via src/capabilities/capability-registry.service.ts and src/workflows/workflow-registry.service.ts, supporting the not-applicable decision for direct notification delivery
- RabbitMQ topic transport adapter confirmed via README.md, AGENTS.md approved wiring, and .env.example RABBITMQ_URL/BPCP_EVENTS_EXCHANGE variables

## invariant evidence

BPCP-INV-001..005 are drawn directly from README.md (Boundaries, Current state) and AGENTS.md (Intent, Current blockers) without alteration.

## sensitive-data evidence

No secrets, tokens, or production data appear in any adoption artifact; BPCP_PROCESS_SIGNING_SECRET and BPCP_DATABASE_URL are referenced only by variable name.

## replay and determinism evidence

Not applicable; this bootstrap is documentation-only and does not affect runtime replay or determinism.

## issues and validation debt

No new validation debt was created. No pre-existing validation-debt ledger existed in this repository before this bootstrap; a fresh ledger with no active entries was created. The four pre-existing open blockers in AGENTS.md/STATE.json remain open project blockers, not validation debt.

## deviations

None beyond creating the previously missing BUSINESS.md, SYSTEM.md, AGENT_OPERATIONS.md, and CLAUDE.md root documents, which the standard requires and this repository lacked.

## recommendation

Approve for planning phase. Deployment-phase (implementation) validation is not required for a documentation-only onboarding.

## traceability confirmation

This validation confirms the traceability chain `TASK-001-bootstrap-service` -> `../22_goal_impact/GOAL-IMPACT-TASK-001.md` -> `EP-TASK-001-bootstrap-service.md` -> `VAL-TASK-001-bootstrap-service.md` is intact and evidenced.
