import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventPublisherService } from '../events/event-publisher.service';
import { ProcessEventType } from '../events/process-event.types';
import { JsonFileStoreService } from '../storage/json-file-store.service';
import { CreateProcessDto } from './dto/create-process.dto';
import {
  BusinessProcessDefinition,
  ProcessAuditAction,
  ProcessAuditEvent,
  ProcessStatus,
  ProcessStoreSnapshot,
  ProcessValidationResult,
  ValidationFinding,
} from './process.types';

const STORE_FILE = 'processes.json';
const EVENT_TYPE_BY_AUDIT_ACTION: Partial<Record<ProcessAuditAction, ProcessEventType>> = {
  created: 'process.created',
  validated: 'process.validated',
  scheduled: 'process.scheduled',
  published: 'process.published',
  paused: 'process.paused',
  retired: 'process.retired',
};

@Injectable()
export class ProcessRegistryService {
  private readonly processes = new Map<string, BusinessProcessDefinition>();
  private readonly auditEvents: ProcessAuditEvent[] = [];

  constructor(
    private readonly store: JsonFileStoreService,
    private readonly eventPublisher: EventPublisherService,
  ) {
    this.loadFromStore();
    if (!this.processes.has(this.key('holiday-discount-2026', 1))) {
      this.seedHolidayDiscount();
    }
    if (!this.processes.has(this.key('flipflop.successful_customer_journey.v1', 1))) {
      this.seedFlipFlopSuccessfulCustomerJourney();
    }
  }

  listProcesses(): BusinessProcessDefinition[] {
    return Array.from(this.processes.values()).sort((a, b) =>
      `${a.processId}:${a.version}`.localeCompare(`${b.processId}:${b.version}`),
    );
  }

  createProcess(dto: CreateProcessDto): BusinessProcessDefinition {
    const version = dto.version ?? 1;
    const key = this.key(dto.processId, version);
    if (this.processes.has(key)) {
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

    this.processes.set(key, process);
    const details = {
      source: 'api',
      warnings: ['[MISSING: authenticated actor propagation]'],
    };
    this.appendAudit('created', process, details);
    this.publishProcessEvent('created', process, details);
    this.persist();
    return process;
  }

  getProcess(processId: string, version: number): BusinessProcessDefinition {
    const process = this.processes.get(this.key(processId, version));
    if (!process) {
      throw new NotFoundException(`Process ${processId}:${version} was not found`);
    }
    return process;
  }

  getAudit(processId: string, version?: number): ProcessAuditEvent[] {
    return this.auditEvents
      .filter((event) => event.processId === processId && (version === undefined || event.version === version))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  validateProcess(processId: string, version: number): ProcessValidationResult {
    const process = this.getProcess(processId, version);
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

    this.processes.set(this.key(processId, version), updated);
    const details = {
      valid: validation.valid,
      failCount: findings.filter((finding) => finding.severity === 'fail').length,
      warningCount: findings.filter((finding) => finding.severity === 'warning').length,
    };
    this.appendAudit('validated', updated, details);
    this.publishProcessEvent('validated', updated, details);
    this.persist();
    return validation;
  }

  scheduleProcess(processId: string, version: number): BusinessProcessDefinition {
    const process = this.getProcess(processId, version);
    const validation = this.validateProcess(processId, version);
    if (!validation.valid) {
      throw new ConflictException(`Process ${processId}:${version} cannot be scheduled before validation passes`);
    }

    return this.transition(processId, version, 'scheduled', 'scheduled', {
      warnings: ['[MISSING: activation scheduler runtime is not wired]'],
    });
  }

  publishProcess(processId: string, version: number): BusinessProcessDefinition {
    const validation = this.validateProcess(processId, version);
    if (!validation.valid) {
      throw new ConflictException(`Process ${processId}:${version} cannot be published before validation passes`);
    }

    return this.transition(processId, version, 'active', 'published', {
      warnings: ['[MISSING: signed publication and event bus broadcast]'],
    });
  }

  pauseProcess(processId: string, version: number): BusinessProcessDefinition {
    const process = this.getProcess(processId, version);
    if (!process.killSwitch) {
      throw new ConflictException(`Process ${processId}:${version} cannot be paused because killSwitch is disabled`);
    }

    return this.transition(processId, version, 'paused', 'paused', {
      warnings: ['[MISSING: pause event broadcast to service adapters]'],
    });
  }

  retireProcess(processId: string, version: number): BusinessProcessDefinition {
    return this.transition(processId, version, 'retired', 'retired', {
      warnings: ['[MISSING: retirement event broadcast to service adapters]'],
    });
  }

  getStoreInfo() {
    return {
      schemaVersion: 'bpcp.store-info.v1',
      dataDir: this.store.getDataDir(),
      storeFile: STORE_FILE,
      processCount: this.processes.size,
      auditEventCount: this.auditEvents.length,
      warnings: [
        'JSON file storage is acceptable for local/code validation, not final production persistence.',
        'Process lifecycle events are durable in the local outbox, but production transport is not approved.',
      ],
    };
  }

  private transition(
    processId: string,
    version: number,
    status: ProcessStatus,
    auditAction: ProcessAuditAction,
    details: Record<string, unknown>,
  ): BusinessProcessDefinition {
    const process = this.getProcess(processId, version);
    const updated = {
      ...process,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.processes.set(this.key(processId, version), updated);
    this.appendAudit(auditAction, updated, details);
    this.publishProcessEvent(auditAction, updated, details);
    this.persist();
    return updated;
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
      code: 'JSON_FILE_STORE_CONFIGURED',
      severity: 'pass',
      message: `Process registry can persist to ${this.store.getDataDir()}/${STORE_FILE}.`,
    });
    findings.push({
      code: 'POLICY_WORKFLOW_REGISTRY_PENDING',
      severity: 'warning',
      message: '[MISSING: policy/workflow module integration must verify every ref before production publish]',
    });
    findings.push({
      code: 'LOCAL_EVENT_OUTBOX_CONFIGURED',
      severity: 'pass',
      message: 'Process lifecycle transitions append durable process events to the local JSON outbox.',
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

  private seedHolidayDiscount(): void {
    const now = new Date().toISOString();
    const process: BusinessProcessDefinition = {
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
    this.processes.set(this.key(process.processId, process.version), process);
    this.appendAudit('seeded', process, {
      source: 'service bootstrap',
      reason: 'Holiday Discount pilot seed process',
    });
    this.persist();
  }

  private seedFlipFlopSuccessfulCustomerJourney(): void {
    const now = new Date().toISOString();
    const process: BusinessProcessDefinition = {
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
    this.processes.set(this.key(process.processId, process.version), process);
    this.appendAudit('seeded', process, {
      source: 'process-registry/definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json',
      reason: 'FlipFlop successful customer journey registry-first draft seed',
      blockers: [
        '[MISSING: approved FlipFlop process-owner role and approval authority]',
        '[MISSING: event payload contracts for customer journey steps]',
        '[MISSING: runtime projection storage decision]',
      ],
    });
    this.persist();
  }

  private loadFromStore(): void {
    const snapshot = this.store.readJson<ProcessStoreSnapshot>(STORE_FILE, {
      schemaVersion: 'bpcp.process-store.v1',
      processes: [],
      auditEvents: [],
    });

    for (const process of snapshot.processes) {
      this.processes.set(this.key(process.processId, process.version), process);
    }
    this.auditEvents.splice(0, this.auditEvents.length, ...snapshot.auditEvents);
  }

  private persist(): void {
    this.store.writeJson<ProcessStoreSnapshot>(STORE_FILE, {
      schemaVersion: 'bpcp.process-store.v1',
      processes: this.listProcesses(),
      auditEvents: this.auditEvents,
    });
  }

  private appendAudit(
    action: ProcessAuditAction,
    process: BusinessProcessDefinition,
    details: Record<string, unknown>,
  ): void {
    this.auditEvents.push({
      schemaVersion: 'bpcp.process-audit.v1',
      id: `${process.processId}:${process.version}:${action}:${this.auditEvents.length + 1}`,
      processId: process.processId,
      version: process.version,
      action,
      actor: 'system',
      createdAt: new Date().toISOString(),
      details,
    });
  }

  private publishProcessEvent(
    action: ProcessAuditAction,
    process: BusinessProcessDefinition,
    details: Record<string, unknown>,
  ): void {
    const type = EVENT_TYPE_BY_AUDIT_ACTION[action];
    if (!type) {
      return;
    }

    this.eventPublisher.publishProcessEvent({
      type,
      process,
      auditAction: action,
      details,
    });
  }

  private key(processId: string, version: number): string {
    return `${processId}:${version}`;
  }
}
