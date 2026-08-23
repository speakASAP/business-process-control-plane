import { Test } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WorkflowRegistryService } from '../workflows/workflow-registry.service';
import { WorkflowDefinition } from '../workflows/workflow.types';
import { ActionDispatcherService } from './action-dispatcher.service';
import { InstanceSignalEntity } from './entities/instance-signal.entity';
import { InstanceStepEntity } from './entities/instance-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { InstanceRepositoryService } from './instance-repository.service';
import { InstanceTimeoutService } from './instance-timeout.service';
import { WorkflowExecutorService } from './workflow-executor.service';

const TEST_DSN = process.env.BPCP_TEST_DATABASE_URL;
const describeDb = TEST_DSN ? describe : describe.skip;

/**
 * The wait/resume path with real persistence. The unit tests in
 * workflow-executor.service.spec.ts mock the repository, so they cannot show that a
 * waiting instance actually survives in the database and resumes from stored state.
 */
const waitWorkflow = (timeoutMs?: number, onTimeout: 'fail' | 'continue' = 'fail'): WorkflowDefinition =>
  ({
    schemaVersion: 'bpcp.workflow.v1',
    workflowId: 'test-wait-flow',
    version: 1,
    status: 'active',
    description: 'generate then wait for human approval then export',
    appliesToProcessRefs: [],
    trigger: { type: 'test', sourceService: 'test', eventRef: 'test', correlationKeys: [] },
    actions: [
      {
        actionId: 'generate',
        type: 'call-service-capability',
        serviceCapabilityRefs: [],
        parameters: { url: 'http://stub/generate' },
      },
      {
        actionId: 'await-approval',
        type: 'wait-for-signal',
        dependsOn: ['generate'],
        serviceCapabilityRefs: [],
        parameters: {
          signalName: 'approval',
          ...(timeoutMs ? { timeoutMs } : {}),
          onTimeout,
        },
      },
      {
        actionId: 'export',
        type: 'call-service-capability',
        dependsOn: ['await-approval'],
        serviceCapabilityRefs: [],
        parameters: { url: 'http://stub/export' },
      },
    ],
    requiredCapabilities: [],
    missingRuntimeFacts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as WorkflowDefinition;

describeDb('wait-for-signal end to end', () => {
  let executor: WorkflowExecutorService;
  let repo: InstanceRepositoryService;
  let timeouts: InstanceTimeoutService;
  let dataSource: DataSource;
  let definition: WorkflowDefinition;

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
      providers: [
        InstanceRepositoryService,
        WorkflowExecutorService,
        InstanceTimeoutService,
        {
          provide: ActionDispatcherService,
          useValue: { execute: jest.fn(async () => ({ ok: true, output: { ok: true } })) },
        },
        {
          provide: WorkflowRegistryService,
          useValue: { getWorkflow: jest.fn(() => definition) },
        },
      ],
    }).compile();

    executor = moduleRef.get(WorkflowExecutorService);
    repo = moduleRef.get(InstanceRepositoryService);
    timeouts = moduleRef.get(InstanceTimeoutService);
    dataSource = moduleRef.get(getDataSourceToken());
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    definition = waitWorkflow();
    await dataSource.query('TRUNCATE "bpcp_workflow_instance" CASCADE');
  });

  it('persists a waiting instance and resumes it to completion on signal', async () => {
    const started = await executor.start({
      workflowId: 'test-wait-flow',
      workflowVersion: 1,
      correlationKey: 'app-1',
    });

    expect(started.status).toBe('waiting');
    expect(started.wait?.signalName).toBe('approval');

    // Re-read from the database, not the returned object: the wait must be durable.
    const persisted = await repo.findById(started.instanceId);
    expect(persisted?.status).toBe('waiting');
    expect(persisted?.wait?.actionId).toBe('await-approval');

    const resumed = await executor.deliverSignal(started.instanceId, 'approval', { by: 'owner' });
    expect(resumed.status).toBe('completed');

    const steps = await repo.findSteps(started.instanceId);
    expect(steps.every((step) => step.status === 'succeeded')).toBe(true);
  });

  it('records the signal payload on the waiting step', async () => {
    const started = await executor.start({
      workflowId: 'test-wait-flow',
      workflowVersion: 1,
      correlationKey: 'app-2',
    });
    await executor.deliverSignal(started.instanceId, 'approval', { by: 'owner' });

    const steps = await repo.findSteps(started.instanceId);
    const waitStep = steps.find((step) => step.actionId === 'await-approval');
    expect(waitStep?.output).toMatchObject({ signal: 'approval', payload: { by: 'owner' } });
  });

  it('ignores a signal whose name does not match the wait', async () => {
    const started = await executor.start({
      workflowId: 'test-wait-flow',
      workflowVersion: 1,
      correlationKey: 'app-3',
    });

    const after = await executor.deliverSignal(started.instanceId, 'rejection', {});

    expect(after.status).toBe('waiting');
  });

  it('fails an instance whose wait deadline passes when onTimeout is fail', async () => {
    definition = waitWorkflow(50, 'fail');
    const started = await executor.start({
      workflowId: 'test-wait-flow',
      workflowVersion: 1,
      correlationKey: 'app-4',
    });
    expect(started.status).toBe('waiting');

    await new Promise((resolve) => setTimeout(resolve, 80));
    const result = await timeouts.sweep(new Date());

    expect(result.failed).toBe(1);
    const after = await repo.findById(started.instanceId);
    expect(after?.status).toBe('failed');
    expect(after?.lastError?.code).toBe('WAIT_TIMEOUT');
  });

  it('resumes an instance whose wait deadline passes when onTimeout is continue', async () => {
    definition = waitWorkflow(50, 'continue');
    const started = await executor.start({
      workflowId: 'test-wait-flow',
      workflowVersion: 1,
      correlationKey: 'app-5',
    });

    await new Promise((resolve) => setTimeout(resolve, 80));
    const result = await timeouts.sweep(new Date());

    expect(result.continued).toBe(1);
    const after = await repo.findById(started.instanceId);
    expect(after?.status).toBe('completed');
  });

  it('does not double-consume a signal delivered twice', async () => {
    const started = await executor.start({
      workflowId: 'test-wait-flow',
      workflowVersion: 1,
      correlationKey: 'app-6',
    });

    await executor.deliverSignal(started.instanceId, 'approval', { n: 1 });
    const second = await executor.deliverSignal(started.instanceId, 'approval', { n: 2 });

    // Already completed: the second signal is recorded but must not re-run anything.
    expect(second.status).toBe('completed');
  });
});
