# BPCP Policy/Workflow Handoff

Status: implemented in branch `bpcp-policy-workflow`
Worktree: `/home/ssf/Documents/Github/codex-worktrees/bpcp-policy-workflow`
Date: 2026-07-02
Deploy: not run

## Intent Preservation Chain

- Vision: Business users can change bounded business processes dynamically while domain services remain stable, safe, and auditable.
- Goal Impact: The Holiday Discount pilot gets typed policy/workflow registries that validate before runtime publication.
- System: `business-process-control-plane`
- Feature: `FEAT-BPCP-001` policy and workflow contracts for the Holiday Discount plan.
- Task: Add typed policy/workflow seeds and fail-closed validators for `holiday-discount-2026`.
- Execution Plan: Create policy and workflow modules, seed the Holiday Discount definitions, expose list/get/validate endpoints, add source verifier, document handoff blockers.
- Coding Prompt: Keep BPCP as validator/orchestrator metadata only; do not move pricing/cart/event ownership into BPCP.
- Code: Files listed below.
- Validation: `node scripts/verify-policy-workflow.js` and `npm run build`.

## Endpoints

These controllers are implemented, but they are not reachable from the running Nest app until an AppModule owner imports `PolicyRegistryModule` and `WorkflowRegistryModule`.

- `GET /api/policies`
- `GET /api/policies/:policyId/versions/:version`
- `POST /api/policies/:policyId/versions/:version/validate`
- `GET /api/workflows`
- `GET /api/workflows/:workflowId/versions/:version`
- `POST /api/workflows/:workflowId/versions/:version/validate`

## Seeded Registry Data

Policy:

- `holiday-10-percent-selected-categories`, version `1`

Workflows referenced by `holiday-discount-2026`:

- `product-view-holiday-badge`, version `1`
- `cart-updated-discount-evaluation`, version `1`
- `checkout-upsell-suggestion`, version `1`
- `order-paid-holiday-notification`, version `1`

## Fail-Closed Validation

Policy validation fails closed for:

- unknown condition types (`UNKNOWN_CONDITION_TYPE`)
- unknown effect types (`UNKNOWN_EFFECT_TYPE`)
- unresolved policy runtime facts (`POLICY_*_RUNTIME_FACT_MISSING`)
- missing/unregistered service capability references (`SERVICE_CAPABILITY_REF_MISSING`)
- unresolved service owners such as `[MISSING: pricing service owner]` (`SERVICE_OWNER_MISSING`)

Workflow validation fails closed for:

- unknown trigger types (`UNKNOWN_WORKFLOW_TRIGGER_TYPE`)
- unknown action types (`UNKNOWN_WORKFLOW_ACTION_TYPE`)
- unresolved trigger/action runtime facts (`WORKFLOW_*_RUNTIME_FACT_MISSING`)
- unresolved policy refs in actions (`WORKFLOW_POLICY_REF_PRESENT` with `fail`)
- missing/unregistered service capability references (`SERVICE_CAPABILITY_REF_MISSING`)
- unresolved service owners such as `[MISSING: cart service owner]` (`SERVICE_OWNER_MISSING`)

Warnings remain for skeleton persistence gaps so publication cannot be confused with durable runtime readiness.

## Files

- `src/policies/capability-reference.ts`
- `src/policies/policy.types.ts`
- `src/policies/policy-registry.service.ts`
- `src/policies/policy-registry.controller.ts`
- `src/policies/policy-registry.module.ts`
- `src/workflows/workflow.types.ts`
- `src/workflows/workflow-registry.service.ts`
- `src/workflows/workflow-registry.controller.ts`
- `src/workflows/workflow-registry.module.ts`
- `scripts/verify-policy-workflow.js`
- `docs/orchestrator/POLICY_WORKFLOW_HANDOFF.md`

## Validation Commands

Run from `/home/ssf/Documents/Github/codex-worktrees/bpcp-policy-workflow`:

```bash
node scripts/verify-policy-workflow.js
npm run build
```

## Blockers

- `[MISSING: AppModule integration owner to import PolicyRegistryModule and WorkflowRegistryModule]`
- `[MISSING: persistent policy/workflow store]`
- `[MISSING: signed publication and audit-log contract]`
- `[MISSING: approved Holiday Discount selected category references]`
- `[MISSING: pricing service owner and API contract]`
- `[MISSING: cart service owner and API contract]`
- `[MISSING: pricing rounding mode and monetary precision contract]`
- `[MISSING: final paid-order event contract]`
- `[MISSING: event bus owner, transport, topic, and publication contract]`
- `[MISSING: approved Holiday Discount paid-order notification template ref]`

## Parallel Execution

- Policy/workflow schema lane: complete in this branch; owns `src/policies/**`, `src/workflows/**`, this handoff, and optional verifier.
- AppModule integration lane: dependency-gated; owner must edit `src/app.module.ts` after this branch is merged or with an explicit conflict-resolution order.
- Process cross-validation lane: dependency-gated; owner can validate that `holiday-discount-2026.policyRefs` and `.workflowRefs` resolve once policy/workflow modules are imported.
- Runtime contract lane: blocked; pricing owner, cart owner, event bus owner, category refs, and notification template refs must be supplied before publication can become valid.
- Validation owner: integration owner should run `npm run test`, `npm run build`, and endpoint smoke checks after AppModule wiring.
- Merge order: policy/workflow schema lane, AppModule integration lane, process cross-validation lane, runtime contract lane.
