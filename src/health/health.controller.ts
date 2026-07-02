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
      ],
      missing: [
        'production persistence decision',
        'event bus runtime',
        'auth RBAC role mapping',
        'production deployment manifest',
      ],
    };
  }
}
