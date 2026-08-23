import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BusinessHealthModule } from './business-health/business-health.module';
import { CapabilityRegistryModule } from './capabilities/capability-registry.module';
import { DatabaseModule } from './database/database.module';
import { EditorModule } from './editor/editor.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { InstancesModule } from './instances/instances.module';
import { PolicyRegistryModule } from './policies/policy-registry.module';
import { ProcessRegistryModule } from './processes/process-registry.module';
import { SimulationModule } from './simulation/simulation.module';
import { WorkflowRegistryModule } from './workflows/workflow-registry.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CapabilityRegistryModule,
    BusinessHealthModule,
    EditorModule,
    EventsModule,
    HealthModule,
    InstancesModule,
    PolicyRegistryModule,
    ProcessRegistryModule,
    SimulationModule,
    WorkflowRegistryModule,
  ],
})
export class AppModule {}
