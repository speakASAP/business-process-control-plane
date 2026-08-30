import { DataSource, Repository } from 'typeorm';
import { ProcessEventOutboxEntity } from './entities/process-event-outbox.entity';
import { ProcessEventOutboxRepository } from './process-event-outbox.repository';

describe('ProcessEventOutboxRepository', () => {
  let repository: ProcessEventOutboxRepository;
  let outboxEvents: any;
  let dataSource: any;

  beforeEach(() => {
    outboxEvents = {
      create: jest.fn((entity: unknown) => entity),
      save: jest.fn(async (entity: any) => ({
        ...entity,
        outboxEventId: 'row-1',
        occurredAt: new Date(entity.occurredAt),
      })),
      findOne: jest.fn(async () => null),
      update: jest.fn(async () => undefined),
      count: jest.fn(async () => 0),
    };

    dataSource = {
      manager: {
        query: jest.fn(async () => [{ value: '9' }]),
      },
    };

    repository = new ProcessEventOutboxRepository(
      outboxEvents as Repository<ProcessEventOutboxEntity>,
      dataSource as DataSource,
    );
  });

  it('creates outbox ids from durable sequence numbers', async () => {
    const event = await repository.appendEvent({
      schemaVersion: 'bpcp.process-event.v1',
      type: 'process.published',
      processId: 'holiday-discount-2026',
      version: 2,
      status: 'active',
      policyRefs: ['p1'],
      workflowRefs: ['w1'],
      campaignRefs: ['c1'],
      occurredAt: '2026-08-30T18:00:00.000Z',
      payload: {
        lifecycle: { auditAction: 'published', details: { source: 'test' } },
      },
      delivery: {
        state: 'pending',
        transport: 'local-json-outbox',
        attempts: 0,
        missing: [],
      },
    });

    expect(event.id).toBe('holiday-discount-2026:2:process.published:9');
    expect(outboxEvents.save).toHaveBeenCalled();
  });

  it('updates delivery metadata after a successful dispatch', async () => {
    outboxEvents.findOne.mockResolvedValue({
      eventId: 'holiday-discount-2026:2:process.published:9',
      delivery: {
        state: 'pending',
        transport: 'local-json-outbox',
        attempts: 1,
        missing: [],
      },
    });

    await repository.applyDispatchResult('holiday-discount-2026:2:process.published:9', {
      schemaVersion: 'bpcp.process-event-dispatch-result.v1',
      eventId: 'holiday-discount-2026:2:process.published:9',
      state: 'dispatched',
      transport: 'rabbitmq-topic',
      exchange: 'bpcp.events',
      routingKey: 'bpcp.process.published.v1',
      attemptedAt: '2026-08-30T18:00:03.000Z',
      blockers: [],
    });

    expect(outboxEvents.update).toHaveBeenCalledWith(
      { eventId: 'holiday-discount-2026:2:process.published:9' },
      expect.objectContaining({
        dispatching: false,
        deliveryState: 'dispatched',
      }),
    );
  });
});
