import { EventPublisherService } from './event-publisher.service';
import { ProcessEventEnvelope, ProcessEventTransportInfo } from './process-event.types';

describe('EventPublisherService', () => {
  let service: EventPublisherService;
  let outboxRepository: any;
  let transport: any;

  beforeEach(() => {
    outboxRepository = {
      appendEvent: jest.fn(),
      listEvents: jest.fn(async () => []),
      countByState: jest.fn(async () => ({ pending: 1, dispatched: 2, failed: 1 })),
      listUndispatched: jest.fn(async () => []),
      claimUndispatched: jest.fn(async () => []),
      listDispatchedForReplay: jest.fn(async () => []),
      applyDispatchResult: jest.fn(async () => undefined),
      releaseDispatchClaim: jest.fn(async () => undefined),
    };

    transport = {
      getTransportInfo: jest.fn(() => transportInfo(false)),
      dispatch: jest.fn(),
    };

    service = new EventPublisherService(outboxRepository, transport);
  });

  it('returns skipped dispatch results when transport is not ready', async () => {
    const event = makeEvent('event-1', 'process.published');
    outboxRepository.listUndispatched.mockResolvedValue([event]);

    const summary = await service.dispatchPending(50);

    expect(summary.attempted).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(outboxRepository.claimUndispatched).not.toHaveBeenCalled();
  });

  it('falls back to the default dispatch limit when a non-finite value reaches the service', async () => {
    await service.dispatchPending(Number.NaN);

    expect(outboxRepository.listUndispatched).toHaveBeenCalledWith(100);
  });

  it('updates durable delivery state for successful and failed dispatch attempts', async () => {
    transport.getTransportInfo.mockReturnValue(transportInfo(true));

    const first = makeEvent('event-1', 'process.published');
    const second = makeEvent('event-2', 'process.paused');
    outboxRepository.claimUndispatched.mockResolvedValue([first, second]);

    transport.dispatch
      .mockResolvedValueOnce({
        schemaVersion: 'bpcp.process-event-dispatch-result.v1',
        eventId: 'event-1',
        state: 'dispatched',
        transport: 'rabbitmq-topic',
        exchange: 'bpcp.events',
        routingKey: 'bpcp.process.published.v1',
        attemptedAt: '2026-08-30T18:00:00.000Z',
        blockers: [],
      })
      .mockResolvedValueOnce({
        schemaVersion: 'bpcp.process-event-dispatch-result.v1',
        eventId: 'event-2',
        state: 'failed',
        transport: 'rabbitmq-topic',
        exchange: 'bpcp.events',
        routingKey: 'bpcp.process.paused.v1',
        attemptedAt: '2026-08-30T18:00:01.000Z',
        blockers: [],
        error: 'broker timeout',
      });

    const summary = await service.dispatchPending(100);

    expect(summary.attempted).toBe(2);
    expect(summary.dispatched).toBe(1);
    expect(summary.failed).toBe(1);
    expect(outboxRepository.applyDispatchResult).toHaveBeenCalledTimes(2);
  });

  it('replays dispatched events without mutating delivery state', async () => {
    transport.getTransportInfo.mockReturnValue(transportInfo(true));
    outboxRepository.listDispatchedForReplay.mockResolvedValue([makeEvent('event-3', 'process.retired')]);
    transport.dispatch.mockResolvedValue({
      schemaVersion: 'bpcp.process-event-dispatch-result.v1',
      eventId: 'event-3',
      state: 'dispatched',
      transport: 'rabbitmq-topic',
      exchange: 'bpcp.events',
      routingKey: 'bpcp.process.retired.v1',
      attemptedAt: '2026-08-30T18:00:02.000Z',
      blockers: [],
    });

    const summary = await service.replayDispatched({ limit: 10 });

    expect(summary.attempted).toBe(1);
    expect(summary.dispatched).toBe(1);
    expect(outboxRepository.applyDispatchResult).not.toHaveBeenCalled();
  });

  it('falls back to the default replay limit when a non-finite value reaches the service', async () => {
    await service.replayDispatched({ limit: Number.NaN });

    expect(outboxRepository.listDispatchedForReplay).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  function transportInfo(ready: boolean): ProcessEventTransportInfo {
    return {
      schemaVersion: 'bpcp.process-event-transport-info.v1',
      enabled: ready,
      transport: 'rabbitmq-topic',
      exchange: 'bpcp.events',
      routingKeyPrefix: 'bpcp.process',
      urlConfigured: ready,
      signingSecretConfigured: ready,
      publishTimeoutMs: 5000,
      readyForDispatch: ready,
      blockers: ready ? [] : ['transport-disabled'],
      routingKeys: {
        'process.created': 'bpcp.process.created.v1',
        'process.validated': 'bpcp.process.validated.v1',
        'process.scheduled': 'bpcp.process.scheduled.v1',
        'process.published': 'bpcp.process.published.v1',
        'process.paused': 'bpcp.process.paused.v1',
        'process.retired': 'bpcp.process.retired.v1',
      },
    };
  }

  function makeEvent(id: string, type: ProcessEventEnvelope['type']): ProcessEventEnvelope {
    return {
      schemaVersion: 'bpcp.process-event.v1',
      id,
      type,
      processId: 'holiday-discount-2026',
      version: 2,
      status: 'active',
      policyRefs: ['p1'],
      workflowRefs: ['w1'],
      campaignRefs: ['c1'],
      occurredAt: '2026-08-30T18:00:00.000Z',
      payload: {
        lifecycle: {
          auditAction: 'published',
          details: { source: 'test' },
        },
      },
      delivery: {
        state: 'pending',
        transport: 'local-json-outbox',
        attempts: 0,
        missing: [],
      },
    };
  }
});
