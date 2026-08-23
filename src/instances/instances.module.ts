import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowRegistryModule } from '../workflows/workflow-registry.module';
import { ActionDispatcherService } from './action-dispatcher.service';
import { InstanceSignalEntity } from './entities/instance-signal.entity';
import { InstanceStepEntity } from './entities/instance-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { InstanceRepositoryService } from './instance-repository.service';
import { InstanceTimeoutService } from './instance-timeout.service';
import { InstanceController } from './instance.controller';
import { WorkflowExecutorService } from './workflow-executor.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([WorkflowInstanceEntity, InstanceStepEntity, InstanceSignalEntity]),
    WorkflowRegistryModule,
  ],
  controllers: [InstanceController],
  providers: [InstanceRepositoryService, ActionDispatcherService, WorkflowExecutorService, InstanceTimeoutService],
  exports: [WorkflowExecutorService, InstanceRepositoryService],
})
export class InstancesModule {}
