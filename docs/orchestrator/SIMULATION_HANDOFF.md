# Simulation Handoff

Date: 2026-07-02
Branch: `bpcp-simulation`
Worktree: `/home/ssf/Documents/Github/codex-worktrees/bpcp-simulation`
Deploy status: not deployed

## Intent Preservation Chain

- Vision: Business users can change bounded business processes dynamically while domain services remain stable, safe, and auditable.
- Goal Impact: Holiday Discount simulation becomes a reusable validation lane for BPCP gates before publication.
- System: `business-process-control-plane`
- Feature: `FEAT-BPCP-001` simulation and validation gates.
- Task: Implement typed deterministic simulation scenarios for Holiday Discount and future BPCP validation gates.
- Execution Plan: Keep the evaluator pure TypeScript, embed deterministic fixtures, expose scenario endpoints, and validate with build plus fixture verifier.
- Coding Prompt: Do not move pricing/cart/order authority into BPCP; mark missing service contracts as warnings.
- Code: `src/simulation/**` and `scripts/verify-simulation-scenarios.js`.
- Validation: `npm run build`; `node scripts/verify-simulation-scenarios.js`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/simulate` | Evaluate a typed simulation request. Keeps the existing Holiday Discount request shape and adds control-state and order-snapshot inputs. |
| `GET` | `/api/simulate/scenarios` | List deterministic scenario fixtures and expected results. |
| `POST` | `/api/simulate/scenarios/:scenarioId` | Execute one deterministic scenario fixture by id. |

## Request Fields

| Field | Notes |
|---|---|
| `processId`, `processVersion` | Currently supports `holiday-discount-2026:1`; other processes return `PROCESS_NOT_SUPPORTED` with `[MISSING: ...]` warning context. |
| `productCategoryIds` | Evaluated against fixture categories `christmas-gifts` and `winter-season`. |
| `cartSubtotal` | Deterministic fixture math only; BPCP is not the pricing authority. |
| `currentDate` | Defaults to `2026-12-24T12:00:00Z` for deterministic output. |
| `processStatus` | Supports pause-like control evaluation; `paused` disables execution. |
| `killSwitchActive` | Disables execution when true. |
| `orderSnapshot` | Preserved as immutable expectation while a new simulated quote may differ. |

## Scenario Fixtures

| Scenario id | Expected decision | Purpose |
|---|---|---|
| `holiday-discount-eligible-category` | `APPLY_DISCOUNT` | Eligible category inside active process window. |
| `holiday-discount-ineligible-category` | `NOT_ELIGIBLE` | Ineligible category inside active process window. |
| `holiday-discount-expired-process` | `PROCESS_EXPIRED` | Eligible category after process end date. |
| `holiday-discount-paused-kill-switch` | `CONTROLLED_OFF` | Pause-like status plus active kill switch prevents execution. |
| `holiday-discount-order-snapshot-immutable` | `APPLY_DISCOUNT` plus immutable snapshot expectation | Existing order discount snapshot remains authoritative even if a new quote changes. |

## Validation Commands

```bash
npm run build
node scripts/verify-simulation-scenarios.js
```

## Blockers And Missing Runtime Facts

- `[MISSING: pricing/cart service quote API]` The simulation uses deterministic fixture math and is not monetary authority.
- `[MISSING: production policy registry]` Holiday Discount policy facts are embedded fixtures, not durable policy records.
- `[MISSING: orders-microservice final immutable discount snapshot field contract]` Snapshot immutability is represented as an expectation until the order contract is finalized.
- `[MISSING: reusable process fixture registry]` Future BPCP gates need externalized fixtures or a persistent scenario source.

## Parallel Execution Notes

- Ready now: scenario consumer agents can use `GET /api/simulate/scenarios` and `POST /api/simulate/scenarios/:scenarioId` without editing simulation files.
- Dependency-gated: pricing/cart integration must wait for the quote API contract owner.
- Dependency-gated: order snapshot integration must wait for the final orders snapshot field contract.
- Final integration: publication gates should consume these deterministic outputs after process/policy/workflow owners finalize their public contracts.
- Shared files/contracts: `src/simulation/simulation.types.ts` is the owned simulation contract; do not edit process, policy, workflow, editor, or app module files for this lane.
