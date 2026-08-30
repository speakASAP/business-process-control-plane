import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthIdentityGuard } from '../auth/auth-identity.guard';
import { EventPublisherService } from './event-publisher.service';
import { ProcessEventType } from './process-event.types';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventPublisher: EventPublisherService) {}

  @Get('outbox')
  async listOutbox(@Query('processId') processId?: string) {
    return this.eventPublisher.listEvents(processId);
  }

  @Get('outbox/info')
  async getOutboxInfo() {
    return this.eventPublisher.getOutboxInfo();
  }

  @Post('outbox/dispatch')
  @UseGuards(AuthIdentityGuard)
  async dispatchOutbox(@Query('limit') limit?: string) {
    return this.eventPublisher.dispatchPending(limit ? Number.parseInt(limit, 10) : undefined);
  }

  @Post('outbox/replay')
  @UseGuards(AuthIdentityGuard)
  async replayOutbox(
    @Query('limit') limit?: string,
    @Query('processId') processId?: string,
    @Query('eventType') eventType?: ProcessEventType,
  ) {
    return this.eventPublisher.replayDispatched({
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      processId,
      eventType,
    });
  }

  @Get('outbox/:processId')
  async listProcessOutbox(@Param('processId') processId: string) {
    return this.eventPublisher.listEvents(processId);
  }

  @Get('transport/info')
  getTransportInfo() {
    return this.eventPublisher.getTransportInfo();
  }
}
