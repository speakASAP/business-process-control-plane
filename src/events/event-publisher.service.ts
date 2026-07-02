import { Injectable } from '@nestjs/common';
import { BusinessProcessDefinition, ProcessAuditAction } from '../processes/process.types';
import { JsonFileStoreService } from '../storage/json-file-store.service';
import { RabbitMqProcessEventTransportService } from './rabbitmq-process-event-transport.service';
import {
  ProcessEventDispatchResult,
  ProcessEventDispatchSummary,
  ProcessEventEnvelope,
  ProcessEventOutboxSnapshot,
  ProcessEventType,
} from './process-event.types';

const EVENT_STORE_FILE = 'process-event-outbox.json';
const EVENT_TRANSPORT = 'local-json-outbox';
const EVENT_BUS_MISSING =
  '[MISSING: RabbitMQ dispatch not attempted; use POST /api/events/outbox/dispatch after transport config is approved]';

@Injectable()
export class EventPublisherService {
  private readonly events: ProcessEventEnvelope[] = [];

  constructor(
    private readonly store: JsonFileStoreService,
    private readonly transport: RabbitMqProcessEventTransportService,
  ) {
    this.loadFromStore();
  }

  publishProcessEvent(input: {
    type: ProcessEventType;
    process: BusinessProcessDefinition;
    auditAction: ProcessAuditAction;
    details: Record<string, unknown>;
  }): ProcessEventEnvelope {
    const event: ProcessEventEnvelope = {
      schemaVersion: 'bpcp.process-event.v1',
      id: this.nextId(input.process.processId, input.process.version, input.type),
      type: input.type,
      processId: input.process.processId,
      version: input.process.version,
      status: input.process.status,
      policyRefs: [...input.process.policyRefs],
      workflowRefs: [...input.process.workflowRefs],
      campaignRefs: [...input.process.campaignRefs],
      occurredAt: new Date().toISOString(),
      payload: {
        activeFrom: input.process.activeFrom,
        activeTo: input.process.activeTo,
        lifecycle: {
          auditAction: input.auditAction,
          details: input.details,
        },
        validation: input.process.lastValidation
          ? {
              valid: input.process.lastValidation.valid,
              validatedAt: input.process.lastValidation.validatedAt,
              failCount: input.process.lastValidation.findings.filter((finding) => finding.severity === 'fail')
                .length,
              warningCount: input.process.lastValidation.findings.filter((finding) => finding.severity === 'warning')
                .length,
            }
          : undefined,
      },
      delivery: {
        state: 'pending',
        transport: EVENT_TRANSPORT,
        attempts: 0,
        missing: [EVENT_BUS_MISSING],
      },
    };

    this.events.push(event);
    this.persist();
    return event;
  }

  listEvents(processId?: string): ProcessEventEnvelope[] {
    return this.events
      .filter((event) => !processId || event.processId === processId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  getOutboxInfo() {
    const transportInfo = this.transport.getTransportInfo();
    const counts = this.getStateCounts();
    return {
      schemaVersion: 'bpcp.process-event-outbox-info.v1',
      dataDir: this.store.getDataDir(),
      storeFile: EVENT_STORE_FILE,
      eventCount: this.events.length,
      pendingCount: counts.pending,
      dispatchedCount: counts.dispatched,
      failedCount: counts.failed,
      transport: EVENT_TRANSPORT,
      dispatchTransport: transportInfo,
      readyForProductionDispatch: transportInfo.readyForDispatch,
      blockers: transportInfo.blockers,
    };
  }

  getTransportInfo() {
    return this.transport.getTransportInfo();
  }

  async dispatchPending(limit = 100): Promise<ProcessEventDispatchSummary> {
    const candidates = this.events
      .filter((event) => event.delivery.state !== 'dispatched')
      .slice(0, this.boundedLimit(limit));

    return this.dispatchCandidates('bpcp.process-event-dispatch-summary.v1', candidates, true);
  }

  async replayDispatched(input: {
    limit?: number;
    processId?: string;
    eventType?: ProcessEventType;
  } = {}): Promise<ProcessEventDispatchSummary> {
    const candidates = this.events
      .filter((event) => event.delivery.state === 'dispatched')
      .filter((event) => !input.processId || event.processId === input.processId)
      .filter((event) => !input.eventType || event.type === input.eventType)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .slice(0, this.boundedLimit(input.limit ?? 100));

    return this.dispatchCandidates('bpcp.process-event-replay-summary.v1', candidates, false);
  }

  private async dispatchCandidates(
    schemaVersion: ProcessEventDispatchSummary['schemaVersion'],
    candidates: ProcessEventEnvelope[],
    mutateDelivery: boolean,
  ): Promise<ProcessEventDispatchSummary> {
    const transportInfo = this.transport.getTransportInfo();

    if (!transportInfo.readyForDispatch) {
      return {
        schemaVersion,
        attempted: 0,
        dispatched: 0,
        failed: 0,
        skipped: candidates.length,
        blockers: transportInfo.blockers,
        results: candidates.map((event) => this.skippedResult(event, transportInfo.blockers)),
      };
    }

    const results: ProcessEventDispatchResult[] = [];
    for (const event of candidates) {
      const result = await this.transport.dispatch(event);
      if (mutateDelivery) {
        this.applyDispatchResult(event, result);
      }
      results.push(result);
    }

    if (mutateDelivery) {
      this.persist();
    }

    return {
      schemaVersion,
      attempted: results.length,
      dispatched: results.filter((result) => result.state === 'dispatched').length,
      failed: results.filter((result) => result.state === 'failed').length,
      skipped: results.filter((result) => result.state === 'skipped').length,
      blockers: [],
      results,
    };
  }

  private boundedLimit(limit: number): number {
    return Math.max(1, Math.min(limit, 500));
  }

  private loadFromStore(): void {
    const snapshot = this.store.readJson<ProcessEventOutboxSnapshot>(EVENT_STORE_FILE, {
      schemaVersion: 'bpcp.process-event-outbox.v1',
      events: [],
    });
    this.events.splice(0, this.events.length, ...snapshot.events);
  }

  private persist(): void {
    this.store.writeJson<ProcessEventOutboxSnapshot>(EVENT_STORE_FILE, {
      schemaVersion: 'bpcp.process-event-outbox.v1',
      events: this.events,
    });
  }

  private nextId(processId: string, version: number, type: ProcessEventType): string {
    return `${processId}:${version}:${type}:${this.events.length + 1}`;
  }

  private getStateCounts(): Record<'pending' | 'dispatched' | 'failed', number> {
    return this.events.reduce(
      (counts, event) => {
        counts[event.delivery.state] += 1;
        return counts;
      },
      { pending: 0, dispatched: 0, failed: 0 },
    );
  }

  private applyDispatchResult(event: ProcessEventEnvelope, result: ProcessEventDispatchResult): void {
    const attempts = event.delivery.attempts + 1;
    if (result.state === 'dispatched') {
      event.delivery = {
        state: 'dispatched',
        transport: result.transport,
        attempts,
        exchange: result.exchange,
        routingKey: result.routingKey,
        lastAttemptAt: result.attemptedAt,
        dispatchedAt: result.attemptedAt,
        missing: [],
      };
      return;
    }

    if (result.state === 'failed') {
      event.delivery = {
        ...event.delivery,
        state: 'failed',
        transport: result.transport,
        attempts,
        exchange: result.exchange,
        routingKey: result.routingKey,
        lastAttemptAt: result.attemptedAt,
        error: result.error,
        missing: result.blockers,
      };
    }
  }

  private skippedResult(event: ProcessEventEnvelope, blockers: string[]): ProcessEventDispatchResult {
    const transportInfo = this.transport.getTransportInfo();
    const routingKey = transportInfo.routingKeys[event.type];
    return {
      schemaVersion: 'bpcp.process-event-dispatch-result.v1',
      eventId: event.id,
      state: 'skipped',
      transport: 'rabbitmq-topic',
      exchange: transportInfo.exchange,
      routingKey,
      attemptedAt: new Date().toISOString(),
      blockers,
    };
  }
}
