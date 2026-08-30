import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProcessEventOutboxEntity } from './entities/process-event-outbox.entity';
import { EventPublisherService } from './event-publisher.service';
import { EventsController } from './events.controller';
import { ProcessEventOutboxRepository } from './process-event-outbox.repository';
import { RabbitMqProcessEventTransportService } from './rabbitmq-process-event-transport.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessEventOutboxEntity]), AuthModule],
  controllers: [EventsController],
  providers: [ProcessEventOutboxRepository, EventPublisherService, RabbitMqProcessEventTransportService],
  exports: [EventPublisherService],
})
export class EventsModule {}
