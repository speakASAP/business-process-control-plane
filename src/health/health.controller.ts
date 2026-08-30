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
        'PostgreSQL-backed process registry runtime persistence',
        'PostgreSQL-backed process event outbox runtime persistence',
        'workflow instance runtime persistence',
        'policy registry',
        'workflow registry',
        'simulation scenarios',
        'visual process editor',
        'RabbitMQ process event transport adapter controlled by environment',
        'Kubernetes Deployment, Service, ConfigMap, and secret wiring',
      ],
      missing: [
        'downstream BPCP event consumers and replay/backfill ownership',
        'auth RBAC role mapping',
        'public process-editor ingress/domain',
      ],
    };
  }
}
