# Business Process Control Plane Agent Notes

Repository: `business-process-control-plane`
Remote path: `/home/ssf/Documents/Github/business-process-control-plane`

## Intent

This service is the ecosystem control plane for dynamic business processes.
It owns process definitions, policy definitions, workflow definitions,
simulation, validation, publication lifecycle, audit boundaries, and the visual
process editor.

It does not own product catalog data, final price calculation, payment capture,
invoice legal totals, or notification delivery channels.

## Remote workflow

Use the Alfares remote repository as source of truth:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/business-process-control-plane && <command>'
```

Do not create local MacBook code copies under `/Users/Sergej.Stasok/Documents`.

## Intent Preservation chain

Preserve:

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

Mark unresolved facts as `[MISSING: ...]` or `[UNKNOWN: ...]`.

## Current blockers

- [MISSING: GitHub origin URL]
- [MISSING: production deployment manifest]
- [MISSING: database persistence decision]
- [MISSING: event bus runtime URL and exchange/queue names]
- [MISSING: exact Auth RBAC roles]
- [MISSING: authoritative pricing/cart owner contract]
