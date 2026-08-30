import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ProcessAuditEventEntity } from './entities/process-audit-event.entity';
import { ProcessDefinitionEntity } from './entities/process-definition.entity';
import { BusinessProcessDefinition, ProcessAuditAction, ProcessAuditEvent } from './process.types';

interface AppendAuditInput {
  action: ProcessAuditAction;
  process: BusinessProcessDefinition;
  actor: string;
  details: Record<string, unknown>;
}

@Injectable()
export class ProcessRegistryRepository {
  constructor(
    @InjectRepository(ProcessDefinitionEntity)
    private readonly processDefinitions: Repository<ProcessDefinitionEntity>,
    @InjectRepository(ProcessAuditEventEntity)
    private readonly auditEvents: Repository<ProcessAuditEventEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listProcesses(): Promise<BusinessProcessDefinition[]> {
    const entities = await this.getProcessRepository().find({
      order: { processId: 'ASC', version: 'ASC' },
    });
    return entities.map((entity) => this.toProcessDefinition(entity));
  }

  async findProcess(
    processId: string,
    version: number,
    manager?: EntityManager,
  ): Promise<BusinessProcessDefinition | null> {
    const entity = await this.getProcessRepository(manager).findOne({ where: { processId, version } });
    return entity ? this.toProcessDefinition(entity) : null;
  }

  async findProcessForUpdate(
    manager: EntityManager,
    processId: string,
    version: number,
  ): Promise<BusinessProcessDefinition | null> {
    const entity = await this.getProcessRepository(manager).findOne({
      where: { processId, version },
      lock: { mode: 'pessimistic_write' },
    });
    return entity ? this.toProcessDefinition(entity) : null;
  }

  async saveProcess(
    process: BusinessProcessDefinition,
    manager?: EntityManager,
  ): Promise<BusinessProcessDefinition> {
    const repo = this.getProcessRepository(manager);
    const existing = await repo.findOne({
      where: {
        processId: process.processId,
        version: process.version,
      },
    });

    const entity = repo.create({
      processDefinitionId: existing?.processDefinitionId,
      schemaVersion: process.schemaVersion,
      processId: process.processId,
      version: process.version,
      status: process.status,
      activeFrom: process.activeFrom ?? null,
      activeTo: process.activeTo ?? null,
      policyRefs: [...process.policyRefs],
      workflowRefs: [...process.workflowRefs],
      campaignRefs: [...process.campaignRefs],
      killSwitch: process.killSwitch,
      lastValidation: process.lastValidation ?? null,
      createdAt: this.toDate(process.createdAt),
      updatedAt: this.toDate(process.updatedAt),
    });

    const saved = await repo.save(entity);
    return this.toProcessDefinition(saved);
  }

  async listAudit(processId: string, version?: number): Promise<ProcessAuditEvent[]> {
    const where: Partial<ProcessAuditEventEntity> = { processId };
    if (version !== undefined) {
      where.version = version;
    }

    const entities = await this.getAuditRepository().find({
      where,
      order: {
        sequenceNumber: 'ASC',
      },
    });

    return entities.map((entity) => this.toAuditEvent(entity));
  }

  async appendAudit(input: AppendAuditInput, manager?: EntityManager): Promise<ProcessAuditEvent> {
    const sequenceNumber = await this.nextAuditSequence(manager);
    const createdAt = new Date().toISOString();
    const audit: ProcessAuditEvent = {
      schemaVersion: 'bpcp.process-audit.v1',
      id: `${input.process.processId}:${input.process.version}:${input.action}:${sequenceNumber}`,
      processId: input.process.processId,
      version: input.process.version,
      action: input.action,
      actor: input.actor,
      createdAt,
      details: input.details,
    };

    const repo = this.getAuditRepository(manager);
    await repo.save(
      repo.create({
        processId: audit.processId,
        version: audit.version,
        sequenceNumber: String(sequenceNumber),
        schemaVersion: audit.schemaVersion,
        id: audit.id,
        action: audit.action,
        actor: audit.actor,
        createdAt: this.toDate(audit.createdAt),
        details: audit.details,
      }),
    );

    return audit;
  }

  async counts(): Promise<{ processCount: number; auditEventCount: number }> {
    const [processCount, auditEventCount] = await Promise.all([
      this.getProcessRepository().count(),
      this.getAuditRepository().count(),
    ]);
    return { processCount, auditEventCount };
  }

  private getProcessRepository(manager?: EntityManager): Repository<ProcessDefinitionEntity> {
    return manager ? manager.getRepository(ProcessDefinitionEntity) : this.processDefinitions;
  }

  private getAuditRepository(manager?: EntityManager): Repository<ProcessAuditEventEntity> {
    return manager ? manager.getRepository(ProcessAuditEventEntity) : this.auditEvents;
  }

  private toProcessDefinition(entity: ProcessDefinitionEntity): BusinessProcessDefinition {
    return {
      schemaVersion: entity.schemaVersion,
      processId: entity.processId,
      version: entity.version,
      status: entity.status,
      activeFrom: entity.activeFrom ?? undefined,
      activeTo: entity.activeTo ?? undefined,
      policyRefs: [...entity.policyRefs],
      workflowRefs: [...entity.workflowRefs],
      campaignRefs: [...entity.campaignRefs],
      killSwitch: entity.killSwitch,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      lastValidation: entity.lastValidation ?? undefined,
    };
  }

  private toAuditEvent(entity: ProcessAuditEventEntity): ProcessAuditEvent {
    return {
      schemaVersion: entity.schemaVersion,
      id: entity.id,
      processId: entity.processId,
      version: entity.version,
      action: entity.action,
      actor: entity.actor,
      createdAt: entity.createdAt.toISOString(),
      details: entity.details,
    };
  }

  private async nextAuditSequence(manager?: EntityManager): Promise<number> {
    const runner = manager ?? this.dataSource.manager;
    const rows = (await runner.query(`SELECT nextval('bpcp_process_audit_event_seq')::text AS "value"`)) as Array<{
      value: string;
    }>;
    const value = Number.parseInt(rows[0]?.value ?? '', 10);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Failed to allocate process audit sequence number');
    }
    return value;
  }

  private toDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date value: ${value}`);
    }
    return date;
  }
}
