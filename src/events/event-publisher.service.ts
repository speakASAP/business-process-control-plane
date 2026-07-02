import { Injectable } from '@nestjs/common';
import { BusinessProcessDefinition, ProcessAuditAction } from '../processes/process.types';
import { JsonFileStoreService } from '../storage/json-file-store.service';
import { ProcessEventEnvelope, ProcessEventOutboxSnapshot, ProcessEventType } from './process-event.types';

const EVENT_STORE_FILE = 'process-event-outbox.json';
const EVENT_TRANSPORT = 'local-json-outbox';
const EVENT_BUS_MISSING =
  '[MISSING: event bus transport, topic naming, signing, retry, and consumer ack contract]';

@Injectable()
export class EventPublisherService {
  private readonly events: ProcessEventEnvelope[] = [];

  constructor(private readonly store: JsonFileStoreService) {
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
    return {
      schemaVersion: 'bpcp.process-event-outbox-info.v1',
      dataDir: this.store.getDataDir(),
      storeFile: EVENT_STORE_FILE,
      eventCount: this.events.length,
      transport: EVENT_TRANSPORT,
      readyForProductionDispatch: false,
      blockers: [EVENT_BUS_MISSING],
    };
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
}
