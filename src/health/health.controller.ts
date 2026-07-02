import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'business-process-control-plane',
      status: 'skeleton',
      missing: [
        'persistent store',
        'event bus runtime',
        'auth RBAC role mapping',
        'production deployment manifest',
      ],
    };
  }
}
