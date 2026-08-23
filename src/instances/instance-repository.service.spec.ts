import { Test } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InstanceRepositoryService } from './instance-repository.service';
import { InstanceSignalEntity } from './entities/instance-signal.entity';
import { InstanceStepEntity } from './entities/instance-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';

const TEST_DSN = process.env.BPCP_TEST_DATABASE_URL;
const describeDb = TEST_DSN ? describe : describe.skip;

describeDb('InstanceRepositoryService', () => {
  let service: InstanceRepositoryService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: TEST_DSN,
          entities: [WorkflowInstanceEntity, InstanceStepEntity, InstanceSignalEntity],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([WorkflowInstanceEntity, InstanceStepEntity, InstanceSignalEntity]),
      ],
      providers: [InstanceRepositoryService],
    }).compile();

    service = moduleRef.get(InstanceRepositoryService);
    dataSource = moduleRef.get(getDataSourceToken());
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE "bpcp_workflow_instance" CASCADE');
  });

  it('creates an instance', async () => {
    const { instance, created } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-1',
      actionIds: ['step-a'],
    });

    expect(created).toBe(true);
    expect(instance.status).toBe('running');
  });

  it('is idempotent on (workflowId, correlationKey)', async () => {
    const input = { workflowId: 'wf-a', workflowVersion: 1, correlationKey: 'app-1', actionIds: ['step-a'] };
    const first = await service.createIfAbsent(input);
    const second = await service.createIfAbsent(input);

    expect(second.created).toBe(false);
    expect(second.instance.instanceId).toBe(first.instance.instanceId);
  });

  it('does not lose updates when two writers race on one instance', async () => {
    const { instance } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-race',
      actionIds: ['step-a'],
    });

    // Both writers read, increment, and write. Without FOR UPDATE one increment is lost.
    const bump = () =>
      service.withLockedInstance(instance.instanceId, async (locked, manager) => {
        const current = (locked.context.counter as number | undefined) ?? 0;
        await new Promise((resolve) => setTimeout(resolve, 25));
        await manager.update(
          WorkflowInstanceEntity,
          { instanceId: locked.instanceId },
          { context: { ...locked.context, counter: current + 1 } },
        );
      });

    await Promise.all([bump(), bump()]);

    const after = await service.findById(instance.instanceId);
    expect(after?.context.counter).toBe(2);
  });

  it('distinguishes a missing instance from a failed lookup', async () => {
    const missing = await service.findById('00000000-0000-0000-0000-000000000000');
    expect(missing).toBeNull();
  });

  it('claims an unconsumed signal exactly once', async () => {
    const { instance } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-signal',
      actionIds: ['step-a'],
    });
    await service.recordSignal(instance.instanceId, 'approval', { by: 'user' });

    const first = await dataSource.transaction((manager) =>
      service.claimSignal(manager, instance.instanceId, 'approval'),
    );
    const second = await dataSource.transaction((manager) =>
      service.claimSignal(manager, instance.instanceId, 'approval'),
    );

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('finds instances whose wait deadline has passed', async () => {
    const { instance } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-timeout',
      actionIds: ['step-a'],
    });

    await dataSource.query(
      `UPDATE "bpcp_workflow_instance" SET status = 'waiting', wait = $2 WHERE "instanceId" = $1`,
      [
        instance.instanceId,
        JSON.stringify({
          actionId: 'step-a',
          signalName: 'approval',
          waitingSince: new Date(Date.now() - 60_000).toISOString(),
          timeoutAt: new Date(Date.now() - 1_000).toISOString(),
          onTimeout: 'fail',
        }),
      ],
    );

    const expired = await service.findExpiredWaits(new Date());
    expect(expired.map((row) => row.instanceId)).toContain(instance.instanceId);
  });

  it('does not return waits whose deadline is still in the future', async () => {
    const { instance } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-future',
      actionIds: ['step-a'],
    });

    await dataSource.query(
      `UPDATE "bpcp_workflow_instance" SET status = 'waiting', wait = $2 WHERE "instanceId" = $1`,
      [
        instance.instanceId,
        JSON.stringify({
          actionId: 'step-a',
          signalName: 'approval',
          waitingSince: new Date().toISOString(),
          timeoutAt: new Date(Date.now() + 3_600_000).toISOString(),
          onTimeout: 'fail',
        }),
      ],
    );

    const expired = await service.findExpiredWaits(new Date());
    expect(expired.map((row) => row.instanceId)).not.toContain(instance.instanceId);
  });
});
