import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'business-process-control-plane',
      status: 'implementation-started',
      implemented: [
        'json-backed process registry for code validation',
        'policy registry',
        'workflow registry',
        'simulation scenarios',
        'visual process editor',
        'local process event outbox',
        'RabbitMQ process event transport adapter disabled by default',
      ],
      missing: [
        'production persistence decision',
        'approved BPCP event consumer bindings and production dispatch enablement',
        'auth RBAC role mapping',
        'production deployment manifest',
      ],
    };
  }
}
