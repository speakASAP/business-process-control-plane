import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { EventPublisherService } from './event-publisher.service';
import { EventsController } from './events.controller';

@Module({
  imports: [StorageModule],
  controllers: [EventsController],
  providers: [EventPublisherService],
  exports: [EventPublisherService],
})
export class EventsModule {}
