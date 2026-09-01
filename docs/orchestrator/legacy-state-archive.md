# business-process-control-plane — Legacy STATE.json Archive

## Migrated 2026-09-01 — STATE.json legacy mirror archive

Archived verbatim from STATE.json's legacy mirror block prior to removal during the ecosystem-wide Wave-projection-only STATE.json standardization. Actionable blocker/follow-up items were also copied into TASKS.md.

```json
{
  "schemaVersion": 1,
  "project": "business-process-control-plane",
  "lifecycle": "active",
  "health": "blocked",
  "activeTask": "wave-1-contract-remediation",
  "lastUpdated": "2026-08-30T00:00:00Z",
  "deployment": {
    "status": "kubernetes"
  },
  "blockers": [
    "Auth RBAC roles for BPCP mutation scopes are undefined.",
    "Downstream event consumer/replay ownership is undefined.",
    "Process-editor ingress/domain assignment is pending.",
    "Pricing/cart owner contract is undefined."
  ],
  "followUps": [
    "Reconcile STATE.json schema between the IPS-required top-level keys and this repository's native schema_version/service/planning/delivery/collection structure."
  ]
}
```
