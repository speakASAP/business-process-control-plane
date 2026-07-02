import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { StorageModule } from '../storage/storage.module';
import { ProcessRegistryController } from './process-registry.controller';
import { ProcessRegistryService } from './process-registry.service';

@Module({
  imports: [StorageModule, EventsModule],
  controllers: [ProcessRegistryController],
  providers: [ProcessRegistryService],
  exports: [ProcessRegistryService],
})
export class ProcessRegistryModule {}
