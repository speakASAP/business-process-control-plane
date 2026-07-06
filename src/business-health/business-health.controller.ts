import { Controller, Get } from '@nestjs/common';
import { BusinessHealthService } from './business-health.service';
import { BusinessHealthReport } from './business-health.types';

@Controller('api/business-health')
export class BusinessHealthController {
  constructor(private readonly businessHealth: BusinessHealthService) {}

  @Get('stock-order-marketplace')
  getStockOrderMarketplaceHealth(): BusinessHealthReport {
    return this.businessHealth.getStockOrderMarketplaceHealth();
  }
}
