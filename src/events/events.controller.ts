import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventPublisher: EventPublisherService) {}

  @Get('outbox')
  listOutbox(@Query('processId') processId?: string) {
    return this.eventPublisher.listEvents(processId);
  }

  @Get('outbox/info')
  getOutboxInfo() {
    return this.eventPublisher.getOutboxInfo();
  }

  @Get('outbox/:processId')
  listProcessOutbox(@Param('processId') processId: string) {
    return this.eventPublisher.listEvents(processId);
  }
}
