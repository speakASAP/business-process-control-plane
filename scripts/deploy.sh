#!/usr/bin/env bash
set -euo pipefail

npm run build

cat <<'MSG'
[MISSING: production deployment manifest for business-process-control-plane]
Build passed, but deploy is intentionally blocked until Kubernetes manifests,
ingress, service identity, environment variables, and persistence are approved.
MSG

exit 1
