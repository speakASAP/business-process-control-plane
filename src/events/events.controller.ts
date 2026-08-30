import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
    return this.eventPublisher.dispatchPending(this.parseLimit(limit));
  }

  @Post('outbox/replay')
  @UseGuards(AuthIdentityGuard)
  async replayOutbox(
    @Query('limit') limit?: string,
    @Query('processId') processId?: string,
    @Query('eventType') eventType?: ProcessEventType,
  ) {
    return this.eventPublisher.replayDispatched({
      limit: this.parseLimit(limit),
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

  private parseLimit(limit?: string): number | undefined {
    if (limit === undefined) {
      return undefined;
    }

    const normalized = limit.trim();
    if (!/^-?\d+$/.test(normalized)) {
      throw new BadRequestException('Query parameter "limit" must be an integer.');
    }

    return Number.parseInt(normalized, 10);
  }
}
