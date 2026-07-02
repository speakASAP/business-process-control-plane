import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CapabilityRegistryModule } from './capabilities/capability-registry.module';
import { EditorModule } from './editor/editor.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { PolicyRegistryModule } from './policies/policy-registry.module';
import { ProcessRegistryModule } from './processes/process-registry.module';
import { SimulationModule } from './simulation/simulation.module';
import { WorkflowRegistryModule } from './workflows/workflow-registry.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CapabilityRegistryModule,
    EditorModule,
    EventsModule,
    HealthModule,
    PolicyRegistryModule,
    ProcessRegistryModule,
    SimulationModule,
    WorkflowRegistryModule,
  ],
})
export class AppModule {}
