# Editor Handoff: Holiday Discount Visual Draft

Date: 2026-07-02
Branch: `bpcp-editor`
Worktree: `/home/ssf/Documents/Github/codex-worktrees/bpcp-editor`
Deploy status: not deployed

## Intent Preservation Chain

- Vision: business-process-control-plane gives operators a visual way to draft and inspect process behavior before runtime contracts are finalized.
- Goal Impact: Holiday Discount can now be represented as an editable canvas instead of a static skeleton.
- System: NestJS service serving the process editor at `/` and `/editor`.
- Feature: dependency-free visual process editor lane for `holiday-discount-2026`.
- Task: add typed nodes, selection inspector, basic edge creation, exportable canvas JSON, and client-side validation.
- Execution Plan: keep all edits inside `src/editor/**`, add this handoff, and optionally add an editor verifier without touching shared process, policy, workflow, simulation, or package files.
- Coding Prompt: implement a dense operational UI and preserve current route endpoints.
- Code: `src/editor/editor-ui.ts` plus optional `scripts/verify-editor-ui.js`.
- Validation: `node scripts/verify-editor-ui.js`; `npm run build`.

## Changed Files

- `src/editor/editor-ui.ts`
  - Replaced the skeleton drag canvas with a seeded Holiday Discount graph.
  - Added typed node templates for events, conditions, policies, actions, and slots.
  - Added SVG connector rendering, node dragging, selection state, and edge creation between selected nodes.
  - Added inspector controls for node type, label, intent, edge source arming, connector removal, and node deletion.
  - Added export controls for copy/download JSON.
  - Added validation panel for missing connectors, invalid connector order, invalid nodes, and disconnected nodes.
- `docs/orchestrator/EDITOR_HANDOFF.md`
  - Documents capabilities, limitations, validation evidence, blockers, and handoff notes.
- `scripts/verify-editor-ui.js`
  - Static verifier for route preservation and editor UI capabilities.

## UI Capabilities

- Root `/` and `/editor` both render the editor through the existing controller.
- Canvas starts with a Holiday Discount draft: `CartUpdated` -> category/date checks -> `10% Holiday Discount` -> pricing action -> upsell slot.
- Operators can drag new typed nodes from the palette to the canvas.
- Operators can drag existing nodes to reposition them.
- Selecting a node opens an inspector with editable type, label, and intent fields.
- Edge creation uses the inspector: select a source node, arm it as source, then select a target node or use the connect button.
- Edge removal and node deletion are available from the inspector.
- Draft JSON can be copied or downloaded as `holiday-discount-2026-canvas.json`.
- Sample simulation still calls `/api/simulate` with the existing Holiday Discount sample payload.

## Client-Side Validation

- Missing incoming connector is an error for condition, policy, action, and slot nodes.
- Missing outgoing connector is an error for event, condition, policy, and action nodes.
- Isolated nodes are flagged as disconnected.
- Unknown node types, missing labels, duplicate or missing ids, invalid coordinates, missing edge endpoints, self edges, and invalid connector order are errors.
- Nodes not reachable from an event are warnings.

## Limitations

- Canvas state is client-only and is not persisted to a backend.
- Exported JSON is a draft canvas model, not a runtime workflow contract.
- Edge labels are generated from node types and are not yet editable.
- The validation rules are draft heuristics and are not a replacement for process/policy/workflow contract validation.
- No authentication, RBAC, or multi-user concurrency behavior is implemented in the editor lane.

## Blockers

- [MISSING: persistent store decision]
- [MISSING: event bus runtime contract]
- [MISSING: Auth RBAC roles]
- [MISSING: pricing/cart owner contract]
- [MISSING: canonical runtime workflow import contract for canvas JSON]

## Validation Commands

- `node scripts/verify-editor-ui.js`
- `npm run build`

## Parallel Execution Notes

- Editor UI lane: ready now; owner role: editor UI agent; scope: `src/editor/**`, `docs/orchestrator/EDITOR_HANDOFF.md`, optional `scripts/verify-editor-ui.js`; validation owner: editor UI agent.
- Runtime import contract lane: dependency-gated; owner role: workflow/process integration agent; forbidden during this task because `src/processes/**`, `src/policies/**`, `src/workflows/**`, and `src/simulation/**` are owned by other lanes.
- Persistence/RBAC lane: blocked by missing product decisions and service contracts.
- Final integration: merge editor branch after build/verifier pass; runtime import should integrate later by consuming exported canvas JSON through a documented contract.
