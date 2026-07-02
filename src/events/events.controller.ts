import { Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Post('outbox/dispatch')
  dispatchOutbox(@Query('limit') limit?: string) {
    return this.eventPublisher.dispatchPending(limit ? Number.parseInt(limit, 10) : undefined);
  }

  @Get('outbox/:processId')
  listProcessOutbox(@Param('processId') processId: string) {
    return this.eventPublisher.listEvents(processId);
  }

  @Get('transport/info')
  getTransportInfo() {
    return this.eventPublisher.getTransportInfo();
  }
}
