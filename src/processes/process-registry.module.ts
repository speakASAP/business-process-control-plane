import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { ProcessAuditEventEntity } from './entities/process-audit-event.entity';
import { ProcessDefinitionEntity } from './entities/process-definition.entity';
import { ProcessRegistryController } from './process-registry.controller';
import { ProcessRegistryRepository } from './process-registry.repository';
import { ProcessRegistryService } from './process-registry.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessDefinitionEntity, ProcessAuditEventEntity]), EventsModule, AuthModule],
  controllers: [ProcessRegistryController],
  providers: [ProcessRegistryRepository, ProcessRegistryService],
  exports: [ProcessRegistryService],
})
export class ProcessRegistryModule {}
