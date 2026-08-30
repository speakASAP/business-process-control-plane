import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ProcessStatus } from '../processes/process.types';
import { ProcessEventOutboxEntity } from './entities/process-event-outbox.entity';
import {
  ProcessEventDelivery,
  ProcessEventDispatchResult,
  ProcessEventEnvelope,
  ProcessEventPayload,
  ProcessEventType,
} from './process-event.types';

const DISPATCH_CLAIM_STALE_SECONDS = 300;

export interface ReplayFilter {
  limit: number;
  processId?: string;
  eventType?: ProcessEventType;
}

@Injectable()
export class ProcessEventOutboxRepository {
  constructor(
    @InjectRepository(ProcessEventOutboxEntity)
    private readonly outboxEvents: Repository<ProcessEventOutboxEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async appendEvent(
    input: Omit<ProcessEventEnvelope, 'id'>,
    manager?: EntityManager,
  ): Promise<ProcessEventEnvelope> {
    const sequenceNumber = await this.nextOutboxSequence(manager);
    const eventId = `${input.processId}:${input.version}:${input.type}:${sequenceNumber}`;
    const repo = this.getRepository(manager);
    const entity = repo.create({
      sequenceNumber: String(sequenceNumber),
      schemaVersion: input.schemaVersion,
      eventId,
      type: input.type,
      processId: input.processId,
      version: input.version,
      status: input.status,
      policyRefs: [...input.policyRefs],
      workflowRefs: [...input.workflowRefs],
      campaignRefs: [...input.campaignRefs],
      occurredAt: this.toDate(input.occurredAt),
      payload: input.payload,
      delivery: input.delivery,
      deliveryState: input.delivery.state,
      dispatching: false,
    });

    const saved = await repo.save(entity);
    return this.toEnvelope(saved);
  }

  async listEvents(processId?: string): Promise<ProcessEventEnvelope[]> {
    const repo = this.getRepository();
    const entities = await repo.find({
      where: processId ? { processId } : {},
      order: { occurredAt: 'ASC', sequenceNumber: 'ASC' },
    });
    return entities.map((entity) => this.toEnvelope(entity));
  }

  async listUndispatched(limit: number): Promise<ProcessEventEnvelope[]> {
    const entities = await this.getRepository()
      .createQueryBuilder('event')
      .where('event.deliveryState <> :dispatched', { dispatched: 'dispatched' })
      .orderBy('event.occurredAt', 'ASC')
      .addOrderBy('event.sequenceNumber', 'ASC')
      .limit(this.boundLimit(limit))
      .getMany();

    return entities.map((entity) => this.toEnvelope(entity));
  }

  async claimUndispatched(limit: number): Promise<ProcessEventEnvelope[]> {
    const boundedLimit = this.boundLimit(limit);
    const rows = (await this.dataSource.transaction((manager) =>
      manager.query(
        `WITH candidates AS (
          SELECT "outboxEventId"
            FROM "bpcp_process_event_outbox"
           WHERE "deliveryState" <> 'dispatched'
             AND (
               "dispatching" = false
               OR "updatedAt" <= (now() - interval '${DISPATCH_CLAIM_STALE_SECONDS} seconds')
             )
           ORDER BY "occurredAt" ASC, "sequenceNumber" ASC
           LIMIT $1
           FOR UPDATE SKIP LOCKED
        )
        UPDATE "bpcp_process_event_outbox" outbox
           SET "dispatching" = true,
               "updatedAt" = now()
          FROM candidates
         WHERE outbox."outboxEventId" = candidates."outboxEventId"
        RETURNING outbox.*`,
        [boundedLimit],
      ),
    )) as Array<Record<string, unknown>>;

    return rows.map((row) => this.fromRawRow(row));
  }

  async listDispatchedForReplay(filter: ReplayFilter): Promise<ProcessEventEnvelope[]> {
    const query = this.getRepository()
      .createQueryBuilder('event')
      .where('event.deliveryState = :state', { state: 'dispatched' });

    if (filter.processId) {
      query.andWhere('event.processId = :processId', { processId: filter.processId });
    }
    if (filter.eventType) {
      query.andWhere('event.type = :eventType', { eventType: filter.eventType });
    }

    const entities = await query
      .orderBy('event.occurredAt', 'ASC')
      .addOrderBy('event.sequenceNumber', 'ASC')
      .limit(this.boundLimit(filter.limit))
      .getMany();

    return entities.map((entity) => this.toEnvelope(entity));
  }

  async applyDispatchResult(eventId: string, result: ProcessEventDispatchResult): Promise<void> {
    const repo = this.getRepository();
    const entity = await repo.findOne({ where: { eventId } });
    if (!entity) {
      return;
    }

    const attempts = entity.delivery.attempts + 1;
    let delivery: ProcessEventDelivery = entity.delivery;

    if (result.state === 'dispatched') {
      delivery = {
        state: 'dispatched',
        transport: result.transport,
        attempts,
        exchange: result.exchange,
        routingKey: result.routingKey,
        lastAttemptAt: result.attemptedAt,
        dispatchedAt: result.attemptedAt,
        missing: [],
      };
    }

    if (result.state === 'failed') {
      delivery = {
        ...entity.delivery,
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

    await repo.update(
      { eventId },
      {
        delivery,
        deliveryState: delivery.state,
        dispatching: false,
      },
    );
  }

  async releaseDispatchClaim(eventId: string, blockers: string[]): Promise<void> {
    const repo = this.getRepository();
    const entity = await repo.findOne({ where: { eventId } });
    if (!entity) {
      return;
    }

    const delivery: ProcessEventDelivery = {
      ...entity.delivery,
      missing: blockers.length > 0 ? blockers : entity.delivery.missing,
    };

    await repo.update(
      { eventId },
      {
        delivery,
        deliveryState: delivery.state,
        dispatching: false,
      },
    );
  }

  async countByState(): Promise<Record<'pending' | 'dispatched' | 'failed', number>> {
    const repo = this.getRepository();
    const [pending, dispatched, failed] = await Promise.all([
      repo.count({ where: { deliveryState: 'pending' } }),
      repo.count({ where: { deliveryState: 'dispatched' } }),
      repo.count({ where: { deliveryState: 'failed' } }),
    ]);

    return { pending, dispatched, failed };
  }

  private getRepository(manager?: EntityManager): Repository<ProcessEventOutboxEntity> {
    return manager ? manager.getRepository(ProcessEventOutboxEntity) : this.outboxEvents;
  }

  private toEnvelope(entity: ProcessEventOutboxEntity): ProcessEventEnvelope {
    return {
      schemaVersion: entity.schemaVersion,
      id: entity.eventId,
      type: entity.type,
      processId: entity.processId,
      version: entity.version,
      status: entity.status,
      policyRefs: [...entity.policyRefs],
      workflowRefs: [...entity.workflowRefs],
      campaignRefs: [...entity.campaignRefs],
      occurredAt: entity.occurredAt.toISOString(),
      payload: entity.payload,
      delivery: entity.delivery,
    };
  }

  private fromRawRow(row: Record<string, unknown>): ProcessEventEnvelope {
    return {
      schemaVersion: String(row.schemaVersion) as ProcessEventEnvelope['schemaVersion'],
      id: String(row.eventId),
      type: String(row.type) as ProcessEventType,
      processId: String(row.processId),
      version: Number(row.version),
      status: String(row.status) as ProcessStatus,
      policyRefs: this.readStringArray(row.policyRefs),
      workflowRefs: this.readStringArray(row.workflowRefs),
      campaignRefs: this.readStringArray(row.campaignRefs),
      occurredAt: this.toIsoString(row.occurredAt),
      payload: this.readPayload(row.payload),
      delivery: this.readDelivery(row.delivery),
    };
  }

  private readStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
  }

  private readPayload(value: unknown): ProcessEventPayload {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Outbox payload column contains non-object JSON');
    }
    return value as ProcessEventPayload;
  }

  private readDelivery(value: unknown): ProcessEventDelivery {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Outbox delivery column contains non-object JSON');
    }
    return value as ProcessEventDelivery;
  }

  private toDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date value: ${value}`);
    }
    return date;
  }

  private toIsoString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    throw new Error(`Unable to map outbox occurredAt value: ${String(value)}`);
  }

  private async nextOutboxSequence(manager?: EntityManager): Promise<number> {
    const runner = manager ?? this.dataSource.manager;
    const rows = (await runner.query(`SELECT nextval('bpcp_process_outbox_event_seq')::text AS "value"`)) as Array<{
      value: string;
    }>;
    const value = Number.parseInt(rows[0]?.value ?? '', 10);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Failed to allocate process outbox sequence number');
    }
    return value;
  }

  private boundLimit(limit: number): number {
    return Math.max(1, Math.min(limit, 500));
  }
}
