import { Module } from '@nestjs/common';
import { WorkflowRegistryController } from './workflow-registry.controller';
import { WorkflowRegistryService } from './workflow-registry.service';

@Module({
  controllers: [WorkflowRegistryController],
  providers: [WorkflowRegistryService],
  exports: [WorkflowRegistryService],
})
export class WorkflowRegistryModule {}
