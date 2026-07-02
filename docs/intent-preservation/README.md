# Intent Preservation

Target: `business-process-control-plane`
Date: 2026-07-02

## Vision

Business users can change bounded business processes dynamically while domain
services remain stable, safe, and auditable.

## Goal Impact

The Holiday Discount pilot proves the control-plane pattern across campaign,
catalog, pricing/cart, orders, payments, invoices, notifications, storefronts,
and observability.

## System

`business-process-control-plane`

## Feature

`FEAT-BPCP-001`: process registry, policy/workflow contracts, visual editor,
simulation, publication lifecycle, service capability registry.

## Task

`TASK-BPCP-001`: initialize service skeleton and preserve missing runtime facts.

## Execution Plan

1. Initialize NestJS service skeleton.
2. Add in-memory Holiday Discount process registry.
3. Add capability registry for affected services.
4. Add visual editor skeleton.
5. Add simulation endpoint.
6. Add validation script.
7. Block production deploy until runtime contracts are resolved.

## Coding Prompt

Implement BPCP without moving domain ownership from existing services. Monetary
authority stays in pricing/order/payment boundaries. Invoices render snapshots.
Notifications execute template refs. BPCP validates and publishes process
versions.

## Code

Initial skeleton exists under `src/`.

## Validation

Run:

```bash
npm run verify:contracts
npm run build
```

[MISSING: production deployment readiness validation]
