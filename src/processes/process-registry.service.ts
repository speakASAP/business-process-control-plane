import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { EventPublisherService } from '../events/event-publisher.service';
import { ProcessEventType } from '../events/process-event.types';
import { CreateProcessDto } from './dto/create-process.dto';
import { ProcessRegistryRepository } from './process-registry.repository';
import {
  BusinessProcessDefinition,
  ProcessAuditAction,
  ProcessStatus,
  ProcessValidationResult,
  ValidationFinding,
} from './process.types';

const EVENT_TYPE_BY_AUDIT_ACTION: Partial<Record<ProcessAuditAction, ProcessEventType>> = {
  created: 'process.created',
  validated: 'process.validated',
  scheduled: 'process.scheduled',
  published: 'process.published',
  paused: 'process.paused',
  retired: 'process.retired',
};

@Injectable()
export class ProcessRegistryService implements OnModuleInit {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly processRegistryRepository: ProcessRegistryRepository,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeedProcesses();
  }

  async listProcesses(): Promise<BusinessProcessDefinition[]> {
    return this.processRegistryRepository.listProcesses();
  }

  async createProcess(dto: CreateProcessDto, actor = 'system'): Promise<BusinessProcessDefinition> {
    const version = dto.version ?? 1;
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.processRegistryRepository.findProcess(dto.processId, version, manager);
      if (existing) {
        throw new ConflictException(`Process ${dto.processId}:${version} already exists`);
      }

      const now = new Date().toISOString();
      const process: BusinessProcessDefinition = {
        schemaVersion: 'bpcp.process.v1',
        processId: dto.processId,
        version,
        status: dto.status ?? 'draft',
        activeFrom: dto.activeFrom,
        activeTo: dto.activeTo,
        policyRefs: dto.policyRefs,
        workflowRefs: dto.workflowRefs,
        campaignRefs: dto.campaignRefs ?? [],
        killSwitch: dto.killSwitch ?? true,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await this.processRegistryRepository.saveProcess(process, manager);
      await this.appendAuditAndEvent(
        {
          action: 'created',
          process: saved,
          actor: this.normalizedActor(actor),
          details: {
            source: 'api',
          },
        },
        manager,
      );
      return saved;
    });
  }

  async getProcess(processId: string, version: number): Promise<BusinessProcessDefinition> {
    const process = await this.processRegistryRepository.findProcess(processId, version);
    if (!process) {
      throw new NotFoundException(`Process ${processId}:${version} was not found`);
    }
    return process;
  }

  async getAudit(processId: string, version?: number) {
    return this.processRegistryRepository.listAudit(processId, version);
  }

  async validateProcess(processId: string, version: number, actor = 'system'): Promise<ProcessValidationResult> {
    return this.dataSource.transaction(async (manager) => {
      const process = await this.requireProcessForUpdate(manager, processId, version);
      const findings = this.collectValidationFindings(process);
      const validation: ProcessValidationResult = {
        processId,
        version,
        valid: findings.every((finding) => finding.severity !== 'fail'),
        validatedAt: new Date().toISOString(),
        findings,
      };

      const updated: BusinessProcessDefinition = {
        ...process,
        status: validation.valid && process.status === 'draft' ? 'validated' : process.status,
        lastValidation: validation,
        updatedAt: new Date().toISOString(),
      };

      const saved = await this.processRegistryRepository.saveProcess(updated, manager);
      await this.appendAuditAndEvent(
        {
          action: 'validated',
          process: saved,
          actor: this.normalizedActor(actor),
          details: {
            valid: validation.valid,
            failCount: findings.filter((finding) => finding.severity === 'fail').length,
            warningCount: findings.filter((finding) => finding.severity === 'warning').length,
          },
        },
        manager,
      );

      return validation;
    });
  }

  async scheduleProcess(processId: string, version: number, actor = 'system'): Promise<BusinessProcessDefinition> {
    const validation = await this.validateProcess(processId, version, actor);
    if (!validation.valid) {
      throw new ConflictException(`Process ${processId}:${version} cannot be scheduled before validation passes`);
    }

    return this.transition(
      processId,
      version,
      'scheduled',
      'scheduled',
      {
        warnings: ['[MISSING: activation scheduler runtime is not wired]'],
      },
      actor,
    );
  }

  async publishProcess(processId: string, version: number, actor = 'system'): Promise<BusinessProcessDefinition> {
    const validation = await this.validateProcess(processId, version, actor);
    if (!validation.valid) {
      throw new ConflictException(`Process ${processId}:${version} cannot be published before validation passes`);
    }

    return this.transition(
      processId,
      version,
      'active',
      'published',
      {
        warnings: ['[MISSING: signed publication and event bus broadcast]'],
      },
      actor,
    );
  }

  async pauseProcess(processId: string, version: number, actor = 'system'): Promise<BusinessProcessDefinition> {
    return this.transition(
      processId,
      version,
      'paused',
      'paused',
      {
        warnings: ['[MISSING: pause event broadcast to service adapters]'],
      },
      actor,
      (process) => {
        if (!process.killSwitch) {
          throw new ConflictException(`Process ${processId}:${version} cannot be paused because killSwitch is disabled`);
        }
      },
    );
  }

  async retireProcess(processId: string, version: number, actor = 'system'): Promise<BusinessProcessDefinition> {
    return this.transition(
      processId,
      version,
      'retired',
      'retired',
      {
        warnings: ['[MISSING: retirement event broadcast to service adapters]'],
      },
      actor,
    );
  }

  async getStoreInfo() {
    const counts = await this.processRegistryRepository.counts();
    return {
      schemaVersion: 'bpcp.store-info.v1',
      dataDir: null,
      storeFile: null,
      runtimeStore: 'postgresql',
      processTable: 'bpcp_process_definition',
      auditTable: 'bpcp_process_audit_event',
      processCount: counts.processCount,
      auditEventCount: counts.auditEventCount,
      warnings: [
        'Process registry runtime persistence is PostgreSQL-backed via TypeORM migrations.',
        'Process lifecycle events are durable in PostgreSQL outbox storage before dispatch attempts.',
      ],
    };
  }

  private async transition(
    processId: string,
    version: number,
    status: ProcessStatus,
    auditAction: ProcessAuditAction,
    details: Record<string, unknown>,
    actor: string,
    guard?: (process: BusinessProcessDefinition) => void,
  ): Promise<BusinessProcessDefinition> {
    return this.dataSource.transaction(async (manager) => {
      const process = await this.requireProcessForUpdate(manager, processId, version);
      guard?.(process);

      const updated: BusinessProcessDefinition = {
        ...process,
        status,
        updatedAt: new Date().toISOString(),
      };

      const saved = await this.processRegistryRepository.saveProcess(updated, manager);
      await this.appendAuditAndEvent(
        {
          action: auditAction,
          process: saved,
          actor: this.normalizedActor(actor),
          details,
        },
        manager,
      );

      return saved;
    });
  }

  private collectValidationFindings(process: BusinessProcessDefinition): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const dateWindow = this.validateDateWindow(process.activeFrom, process.activeTo);

    findings.push({
      code: 'SCHEMA_VERSION_SUPPORTED',
      severity: process.schemaVersion === 'bpcp.process.v1' ? 'pass' : 'fail',
      message: 'Process schema version must be bpcp.process.v1.',
    });
    findings.push({
      code: 'PROCESS_ID_PRESENT',
      severity: process.processId.trim().length > 0 ? 'pass' : 'fail',
      message: 'Process id must be present.',
    });
    findings.push({
      code: 'POLICY_REFS_PRESENT',
      severity: process.policyRefs.length > 0 ? 'pass' : 'fail',
      message: 'At least one policy reference is required.',
    });
    findings.push({
      code: 'WORKFLOW_REFS_PRESENT',
      severity: process.workflowRefs.length > 0 ? 'pass' : 'fail',
      message: 'At least one workflow reference is required.',
    });
    findings.push({
      code: 'KILL_SWITCH_PRESENT',
      severity: process.killSwitch ? 'pass' : 'fail',
      message: 'Every active-capable process must define a kill switch.',
    });
    findings.push({
      code: 'DATE_WINDOW_VALID',
      severity: dateWindow.valid ? 'pass' : 'fail',
      message: dateWindow.message,
    });
    findings.push({
      code: 'POSTGRES_RUNTIME_STORE_CONFIGURED',
      severity: 'pass',
      message: 'Process registry runtime persistence is backed by PostgreSQL tables and TypeORM migrations.',
    });
    findings.push({
      code: 'POLICY_WORKFLOW_REGISTRY_PENDING',
      severity: 'warning',
      message: '[MISSING: policy/workflow module integration must verify every ref before production publish]',
    });
    findings.push({
      code: 'LOCAL_EVENT_OUTBOX_CONFIGURED',
      severity: 'pass',
      message: 'Process lifecycle transitions append durable process events to the PostgreSQL outbox.',
    });
    findings.push({
      code: 'EVENT_BUS_PRODUCTION_ENABLEMENT_MISSING',
      severity: 'warning',
      message: '[MISSING: BPCP event dispatch enablement, signing secret, and approved consumer bindings]',
    });

    return findings;
  }

  private validateDateWindow(activeFrom?: string, activeTo?: string): { valid: boolean; message: string } {
    if (!activeFrom || !activeTo) {
      return {
        valid: true,
        message: 'Date window is optional for drafts; scheduled/active process owners should define it.',
      };
    }

    const from = Date.parse(activeFrom);
    const to = Date.parse(activeTo);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      return { valid: false, message: 'Date window values must be valid ISO-compatible dates.' };
    }

    if (from > to) {
      return { valid: false, message: 'activeFrom must be before activeTo.' };
    }

    return { valid: true, message: 'Date window is valid.' };
  }

  private async appendAuditAndEvent(
    input: {
      action: ProcessAuditAction;
      process: BusinessProcessDefinition;
      actor: string;
      details: Record<string, unknown>;
    },
    manager: EntityManager,
  ): Promise<void> {
    await this.processRegistryRepository.appendAudit(
      {
        action: input.action,
        process: input.process,
        actor: input.actor,
        details: input.details,
      },
      manager,
    );

    const type = EVENT_TYPE_BY_AUDIT_ACTION[input.action];
    if (!type) {
      return;
    }

    await this.eventPublisher.publishProcessEvent(
      {
        type,
        process: input.process,
        auditAction: input.action,
        details: input.details,
      },
      manager,
    );
  }

  private async requireProcessForUpdate(
    manager: EntityManager,
    processId: string,
    version: number,
  ): Promise<BusinessProcessDefinition> {
    const process = await this.processRegistryRepository.findProcessForUpdate(manager, processId, version);
    if (!process) {
      throw new NotFoundException(`Process ${processId}:${version} was not found`);
    }
    return process;
  }

  private normalizedActor(actor: string): string {
    const trimmed = actor.trim();
    return trimmed.length > 0 ? trimmed : 'system';
  }

  private async ensureSeedProcesses(): Promise<void> {
    await this.ensureSeedProcess(this.seedHolidayDiscountDefinition(), {
      source: 'service bootstrap',
      reason: 'Holiday Discount pilot seed process',
    });

    await this.ensureSeedProcess(this.seedFlipFlopSuccessfulCustomerJourneyDefinition(), {
      source: 'process-registry/definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json',
      reason: 'FlipFlop successful customer journey registry-first draft seed',
      blockers: [
        '[MISSING: approved FlipFlop process-owner role and approval authority]',
        '[MISSING: event payload contracts for customer journey steps]',
        '[MISSING: runtime projection storage decision]',
      ],
    });
  }

  private async ensureSeedProcess(
    process: BusinessProcessDefinition,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await this.processRegistryRepository.findProcess(process.processId, process.version, manager);
      if (existing) {
        return;
      }

      const saved = await this.processRegistryRepository.saveProcess(process, manager);
      await this.processRegistryRepository.appendAudit(
        {
          action: 'seeded',
          process: saved,
          actor: 'system',
          details,
        },
        manager,
      );
    });
  }

  private seedHolidayDiscountDefinition(): BusinessProcessDefinition {
    const now = new Date().toISOString();
    return {
      schemaVersion: 'bpcp.process.v1',
      processId: 'holiday-discount-2026',
      version: 1,
      status: 'draft',
      activeFrom: '2026-12-01T00:00:00Z',
      activeTo: '2027-01-07T23:59:59Z',
      policyRefs: ['holiday-10-percent-selected-categories'],
      workflowRefs: [
        'product-view-holiday-badge',
        'cart-updated-discount-evaluation',
        'checkout-upsell-suggestion',
        'order-paid-holiday-notification',
      ],
      campaignRefs: ['holiday-2026-main'],
      killSwitch: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  private seedFlipFlopSuccessfulCustomerJourneyDefinition(): BusinessProcessDefinition {
    const now = new Date().toISOString();
    return {
      schemaVersion: 'bpcp.process.v1',
      processId: 'flipflop.successful_customer_journey.v1',
      version: 1,
      status: 'draft',
      policyRefs: [],
      workflowRefs: [],
      campaignRefs: [],
      killSwitch: true,
      createdAt: now,
      updatedAt: now,
    };
  }
}
