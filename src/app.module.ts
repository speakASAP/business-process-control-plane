import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CapabilityRegistryModule } from './capabilities/capability-registry.module';
import { EditorModule } from './editor/editor.module';
import { HealthModule } from './health/health.module';
import { ProcessRegistryModule } from './processes/process-registry.module';
import { SimulationModule } from './simulation/simulation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CapabilityRegistryModule,
    EditorModule,
    HealthModule,
    ProcessRegistryModule,
    SimulationModule,
  ],
})
export class AppModule {}
