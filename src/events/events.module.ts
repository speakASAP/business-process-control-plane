import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { EventPublisherService } from './event-publisher.service';
import { EventsController } from './events.controller';
import { RabbitMqProcessEventTransportService } from './rabbitmq-process-event-transport.service';

@Module({
  imports: [StorageModule],
  controllers: [EventsController],
  providers: [EventPublisherService, RabbitMqProcessEventTransportService],
  exports: [EventPublisherService],
})
export class EventsModule {}
