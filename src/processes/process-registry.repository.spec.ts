import { DataSource, Repository } from 'typeorm';
import { ProcessAuditEventEntity } from './entities/process-audit-event.entity';
import { ProcessDefinitionEntity } from './entities/process-definition.entity';
import { ProcessRegistryRepository } from './process-registry.repository';

describe('ProcessRegistryRepository', () => {
  let repository: ProcessRegistryRepository;
  let processDefinitions: any;
  let auditEvents: any;
  let dataSource: any;

  beforeEach(() => {
    processDefinitions = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      create: jest.fn((entity: unknown) => entity),
      save: jest.fn(async (entity: unknown) => entity),
      count: jest.fn(async () => 0),
    };

    auditEvents = {
      find: jest.fn(async () => []),
      create: jest.fn((entity: unknown) => entity),
      save: jest.fn(async (entity: unknown) => entity),
      count: jest.fn(async () => 0),
    };

    dataSource = {
      manager: {
        query: jest.fn(async () => [{ value: '17' }]),
      },
    };

    repository = new ProcessRegistryRepository(
      processDefinitions as Repository<ProcessDefinitionEntity>,
      auditEvents as Repository<ProcessAuditEventEntity>,
      dataSource as DataSource,
    );
  });

  it('maps persisted process rows to API shape', async () => {
    processDefinitions.find.mockResolvedValue([
      {
        schemaVersion: 'bpcp.process.v1',
        processId: 'holiday-discount-2026',
        version: 1,
        status: 'draft',
        activeFrom: null,
        activeTo: null,
        policyRefs: ['policy-1'],
        workflowRefs: ['workflow-1'],
        campaignRefs: ['campaign-1'],
        killSwitch: true,
        lastValidation: null,
        createdAt: new Date('2026-08-30T18:00:00.000Z'),
        updatedAt: new Date('2026-08-30T18:01:00.000Z'),
      },
    ]);

    const processes = await repository.listProcesses();

    expect(processes).toHaveLength(1);
    expect(processes[0]).toMatchObject({
      processId: 'holiday-discount-2026',
      version: 1,
      status: 'draft',
    });
    expect(processes[0].createdAt).toBe('2026-08-30T18:00:00.000Z');
  });

  it('appends immutable audit events with monotonic sequence ids', async () => {
    await repository.appendAudit({
      action: 'created',
      actor: 'owner@example.com',
      details: { source: 'api' },
      process: {
        schemaVersion: 'bpcp.process.v1',
        processId: 'holiday-discount-2026',
        version: 3,
        status: 'draft',
        policyRefs: ['policy-1'],
        workflowRefs: ['workflow-1'],
        campaignRefs: [],
        killSwitch: true,
        createdAt: '2026-08-30T18:00:00.000Z',
        updatedAt: '2026-08-30T18:00:00.000Z',
      },
    });

    expect(auditEvents.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'holiday-discount-2026:3:created:17',
        actor: 'owner@example.com',
        sequenceNumber: '17',
      }),
    );
  });
});
