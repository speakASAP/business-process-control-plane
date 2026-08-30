# Task: Business Process Control Plane IPS adoption bootstrap

```yaml
id: TASK-001-bootstrap-service
status: validated
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: validated
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../01_vision/VISION.md
downstream:
  - ../21_execution_plans/EP-TASK-001-bootstrap-service.md
  - ../22_goal_impact/GOAL-IMPACT-TASK-001.md
  - ../12_validation/VAL-TASK-001-bootstrap-service.md
```

## objective

Bring the business-process-control-plane repository into full compliance with the IPS project-adoption standard: create the missing root docs (BUSINESS.md, SYSTEM.md, AGENT_OPERATIONS.md, CLAUDE.md) and all required docs/ artifacts, integration review, and state files without fabricating product intent beyond what is already documented in README.md, AGENTS.md, STATE.json, TASKS.md, and .env.example.

## upstream links

- `../00_constitution/CONSTITUTION.md`
- `../01_vision/VISION.md`
- `../../BUSINESS.md`

## goal impact

See `../22_goal_impact/GOAL-IMPACT-TASK-001.md` for the full contribution mapping to approved project goals.

## project invariant impact

This task does not change BPCP-INV-001..005; it documents them formally in docs/17_governance/PROJECT_INVARIANTS.md for the first time.

## sensitive-data classification

No secrets, tokens, or production data are included in any adoption artifact; BPCP_PROCESS_SIGNING_SECRET and BPCP_DATABASE_URL values are referenced only by variable name, never by value.

## contract and schema impact

No API, database schema, or public contract changes. This is a documentation-only bootstrap.

## replay and determinism impact

Not applicable; no code execution, migration, or replay behavior is affected by this documentation bootstrap.

## scope

- Root IPS artifacts (README, new BUSINESS/SYSTEM/AGENT_OPERATIONS/CLAUDE, AGENTS, TASKS, STATE.json, ips-adoption.json)
- Protected governance docs (CONSTITUTION, VISION, PROJECT_INVARIANTS)
- Bootstrap task chain (TASK-001, GOAL-IMPACT-TASK-001, EP-TASK-001, VAL-TASK-001)
- Integration contract and capability review

## non-goals

- Changing any running service behavior, schema, or deployment configuration
- Resolving the four open project blockers described in AGENTS.md as part of this task
- Modifying docs/orchestrator/* dated review/fix records or process-registry/ source

## acceptance criteria

- The IPS planning validator passes with no unresolved findings for business-process-control-plane
- All 16 integration capabilities have concrete required/not-applicable decisions grounded in observed repo facts
- Protected docs (BUSINESS, CONSTITUTION, VISION) carry human-approval evidence
- STATE.json and TASKS.md reflect the real current state, including the four open project blockers described in AGENTS.md

## required context

- README.md, AGENTS.md, STATE.json, TASKS.md (pre-existing real content)
- .env.example and deploy.config.sh for integration facts
- src/capabilities and src/workflows for confirming the notifications-microservice capability-registry-only usage

## validation task

Run `python3 ../intent-preservation-system/scripts/validate_adoption_profile.py --root . --phase planning` from the ecosystem root and confirm a clean pass.

## required gates

- IPS adoption planning validator exits 0
- No placeholder markers remain in any non-blocker artifact section

## parallel workstream context

This is a single-owner documentation bootstrap with no parallel workstreams; it does not resolve or touch the four open project blockers already recorded in AGENTS.md and STATE.json.
