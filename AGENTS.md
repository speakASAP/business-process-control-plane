# Agents: Business Process Control Plane

## required reading

Before implementation, read:

- `README.md`
- `BUSINESS.md`
- `SYSTEM.md`
- `AGENTS.md`
- `AGENT_OPERATIONS.md`
- `TASKS.md`
- `STATE.json`
- `docs/17_governance/PROJECT_INVARIANTS.md`
- `docs/01_vision/VISION.md`

## authority

Operators and agent workers may act only within the approved project intent, scope boundaries, and validation gates in this repository. Human approval is required for scope changes or production deployment decisions.

## intent preservation system

The project preserves the chain:

`Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation`

This is the binding requirement for planning, coding, and validation work.

## safety and operations

- Never commit secrets, credentials, or raw production data
- Keep the system grounded in proven repository facts
- Use `[MISSING: ...]` or `[UNKNOWN: ...]` instead of inventing facts
- Keep validation debt separate from current-task failures
- Prefer the narrowest valid validation command before broad test suites

## project-specific rules

- Use the Alfares remote repository as source of truth (`ssh alfares 'cd .../business-process-control-plane && <command>'`); never create local MacBook code copies
- BPCP does not own product catalog data, final price calculation, payment capture, invoice legal totals, or notification delivery channels — do not add these responsibilities without explicit approval
- RabbitMQ event producer wiring is approved using the URL from `secret/prod/runlayer`, exchange `bpcp.events`, routing prefix `bpcp.process`; do not change this wiring without explicit approval
- Mark unresolved facts as `[MISSING: ...]` or `[UNKNOWN: ...]`, matching the existing blockers already recorded in AGENTS.md
- The four blockers previously listed here (Auth RBAC roles, event consumer/replay ownership, editor ingress/domain, pricing/cart owner contract) were resolved/owner-accepted-as-deferred on 2026-09-04; see `docs/orchestrator/2026-09-04-bpcp-remaining-blockers-owner-decision.md` and `TASKS.md` for current status before assuming any of them are still open

## required final report

The final task report must include:

- files changed
- documents created or revised
- validation commands and results
- validation debt used or created
- active blockers as `[MISSING: ...]` or `[UNKNOWN: ...]`
- deviations from scope
- next concrete action
