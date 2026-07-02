#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="business-process-control-plane"
NAMESPACE="${K8S_NAMESPACE:-statex-apps}"
REGISTRY="${K8S_REGISTRY:-localhost:5000}"
K8S_DIR="$PROJECT_ROOT/k8s"
HEALTH_PORT="${HEALTH_PORT:-3375}"
IMAGE_TAG="${1:-$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)}"
IMAGE="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/${SERVICE_NAME}:latest"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf '[%s] %s\n' "$(ts)" "$*"; }

cd "$PROJECT_ROOT"

if [ ! -d "$K8S_DIR" ]; then
  echo "Missing k8s directory: $K8S_DIR" >&2
  exit 1
fi

log "Validate ${SERVICE_NAME}"
npm test

log "Build image ${IMAGE}"
docker build -t "$IMAGE" -t "$IMAGE_LATEST" "$PROJECT_ROOT"

log "Push image"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"

log "Apply Kubernetes manifests"
for manifest in configmap.yaml external-secret.yaml pvc.yaml service.yaml deployment.yaml; do
  kubectl apply -f "$K8S_DIR/$manifest" -n "$NAMESPACE"
done

log "Set deployment image"
kubectl set image "deployment/${SERVICE_NAME}" app="$IMAGE" -n "$NAMESPACE"

log "Wait for rollout"
kubectl rollout status "deployment/${SERVICE_NAME}" -n "$NAMESPACE" --timeout=180s

log "Verify pod health and transport info"
POD="$(kubectl get pod -n "$NAMESPACE" -l "app=${SERVICE_NAME}" -o jsonpath='{.items[0].metadata.name}')"
if [ -z "$POD" ]; then
  echo "No pod found for ${SERVICE_NAME}" >&2
  exit 1
fi
kubectl exec -n "$NAMESPACE" "$POD" -- wget -qO- "http://127.0.0.1:${HEALTH_PORT}/health" >/dev/null
kubectl exec -n "$NAMESPACE" "$POD" -- wget -qO- "http://127.0.0.1:${HEALTH_PORT}/api/events/transport/info" >/dev/null

log "Deployed ${IMAGE}"
