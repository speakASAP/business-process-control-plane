import { Module } from '@nestjs/common';
import { BusinessHealthController } from './business-health.controller';
import { BusinessHealthEvidenceAdapterRunner } from './business-health.evidence-adapter-runner';
import { BusinessHealthService } from './business-health.service';

@Module({
  controllers: [BusinessHealthController],
  providers: [BusinessHealthEvidenceAdapterRunner, BusinessHealthService],
})
export class BusinessHealthModule {}
