import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BusinessProcessDefinition, ProcessAuditAction } from '../processes/process.types';
import { ProcessEventOutboxRepository } from './process-event-outbox.repository';
import { RabbitMqProcessEventTransportService } from './rabbitmq-process-event-transport.service';
import {
  ProcessEventDispatchResult,
  ProcessEventDispatchSummary,
  ProcessEventEnvelope,
  ProcessEventType,
} from './process-event.types';

const EVENT_TRANSPORT = 'local-json-outbox';
const EVENT_BUS_MISSING =
  '[MISSING: RabbitMQ dispatch not attempted; use POST /api/events/outbox/dispatch after transport config is approved]';
const OUTBOX_TABLE = 'bpcp_process_event_outbox';
const DEFAULT_DISPATCH_LIMIT = 100;

interface PublishProcessEventInput {
  type: ProcessEventType;
  process: BusinessProcessDefinition;
  auditAction: ProcessAuditAction;
  details: Record<string, unknown>;
}

@Injectable()
export class EventPublisherService {
  constructor(
    private readonly outboxRepository: ProcessEventOutboxRepository,
    private readonly transport: RabbitMqProcessEventTransportService,
  ) {}

  async publishProcessEvent(input: PublishProcessEventInput, manager?: EntityManager): Promise<ProcessEventEnvelope> {
    return this.outboxRepository.appendEvent(
      {
        schemaVersion: 'bpcp.process-event.v1',
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
                failCount: input.process.lastValidation.findings.filter((finding) => finding.severity === 'fail').length,
                warningCount: input.process.lastValidation.findings.filter((finding) => finding.severity === 'warning').length,
              }
            : undefined,
        },
        delivery: {
          state: 'pending',
          transport: EVENT_TRANSPORT,
          attempts: 0,
          missing: [EVENT_BUS_MISSING],
        },
      },
      manager,
    );
  }

  async listEvents(processId?: string): Promise<ProcessEventEnvelope[]> {
    return this.outboxRepository.listEvents(processId);
  }

  async getOutboxInfo() {
    const transportInfo = this.transport.getTransportInfo();
    const counts = await this.outboxRepository.countByState();
    return {
      schemaVersion: 'bpcp.process-event-outbox-info.v1',
      dataDir: null,
      storeFile: null,
      runtimeStore: 'postgresql',
      outboxTable: OUTBOX_TABLE,
      eventCount: counts.pending + counts.dispatched + counts.failed,
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

  async dispatchPending(limit = DEFAULT_DISPATCH_LIMIT): Promise<ProcessEventDispatchSummary> {
    const boundedLimit = this.boundedLimit(limit);
    const transportInfo = this.transport.getTransportInfo();

    if (!transportInfo.readyForDispatch) {
      const candidates = await this.outboxRepository.listUndispatched(boundedLimit);
      return {
        schemaVersion: 'bpcp.process-event-dispatch-summary.v1',
        attempted: 0,
        dispatched: 0,
        failed: 0,
        skipped: candidates.length,
        blockers: transportInfo.blockers,
        results: candidates.map((event) => this.skippedResult(event, transportInfo.blockers)),
      };
    }

    const candidates = await this.outboxRepository.claimUndispatched(boundedLimit);
    return this.dispatchCandidates('bpcp.process-event-dispatch-summary.v1', candidates, true);
  }

  async replayDispatched(input: {
    limit?: number;
    processId?: string;
    eventType?: ProcessEventType;
  } = {}): Promise<ProcessEventDispatchSummary> {
    const candidates = await this.outboxRepository.listDispatchedForReplay({
      limit: this.boundedLimit(input.limit ?? DEFAULT_DISPATCH_LIMIT),
      processId: input.processId,
      eventType: input.eventType,
    });

    return this.dispatchCandidates('bpcp.process-event-replay-summary.v1', candidates, false);
  }

  private async dispatchCandidates(
    schemaVersion: ProcessEventDispatchSummary['schemaVersion'],
    candidates: ProcessEventEnvelope[],
    mutateDelivery: boolean,
  ): Promise<ProcessEventDispatchSummary> {
    const transportInfo = this.transport.getTransportInfo();

    if (!transportInfo.readyForDispatch) {
      if (mutateDelivery) {
        await Promise.all(
          candidates.map((event) => this.outboxRepository.releaseDispatchClaim(event.id, transportInfo.blockers)),
        );
      }

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
        if (result.state === 'skipped') {
          await this.outboxRepository.releaseDispatchClaim(event.id, result.blockers);
        } else {
          await this.outboxRepository.applyDispatchResult(event.id, result);
        }
      }
      results.push(result);
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
    if (!Number.isFinite(limit)) {
      return DEFAULT_DISPATCH_LIMIT;
    }

    return Math.max(1, Math.min(Math.trunc(limit), 500));
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
