import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'business-process-control-plane',
      status: 'deployed-initial',
      implemented: [
        'json-backed process registry backed by Kubernetes PVC',
        'policy registry',
        'workflow registry',
        'simulation scenarios',
        'visual process editor',
        'local process event outbox',
        'RabbitMQ process event transport adapter controlled by environment',
        'Kubernetes Deployment, Service, PVC, ConfigMap, and secret wiring',
      ],
      missing: [
        'database persistence decision beyond initial file-backed PVC',
        'downstream BPCP event consumers and replay/backfill ownership',
        'auth RBAC role mapping',
        'public process-editor ingress/domain',
      ],
    };
  }
}
