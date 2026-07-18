# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase C) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.

SERVICE_NAME="business-process-control-plane"
PORT="3375"

IMAGES=(
  "business-process-control-plane|.||"
)

DEPLOYMENTS=(
  "business-process-control-plane|app|business-process-control-plane"
)

# No ingress.yaml for this service.
MANIFESTS=(configmap.yaml external-secret.yaml pvc.yaml service.yaml deployment.yaml)
