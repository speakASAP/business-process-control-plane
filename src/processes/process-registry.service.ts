import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProcessDto } from './dto/create-process.dto';
import {
  BusinessProcessDefinition,
  ProcessStatus,
  ProcessValidationResult,
  ValidationFinding,
} from './process.types';

@Injectable()
export class ProcessRegistryService {
  private readonly processes = new Map<string, BusinessProcessDefinition>();

  constructor() {
    this.createProcess({
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
    });
  }

  listProcesses(): BusinessProcessDefinition[] {
    return Array.from(this.processes.values()).sort((a, b) =>
      `${a.processId}:${a.version}`.localeCompare(`${b.processId}:${b.version}`),
    );
  }

  createProcess(dto: CreateProcessDto): BusinessProcessDefinition {
    const now = new Date().toISOString();
    const process: BusinessProcessDefinition = {
      schemaVersion: 'bpcp.process.v1',
      processId: dto.processId,
      version: dto.version ?? 1,
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

    this.processes.set(this.key(process.processId, process.version), process);
    return process;
  }

  getProcess(processId: string, version: number): BusinessProcessDefinition {
    const process = this.processes.get(this.key(processId, version));
    if (!process) {
      throw new NotFoundException(`Process ${processId}:${version} was not found`);
    }
    return process;
  }

  validateProcess(processId: string, version: number): ProcessValidationResult {
    const process = this.getProcess(processId, version);
    const findings: ValidationFinding[] = [];

    findings.push({
      code: 'PROCESS_ID_PRESENT',
      severity: process.processId ? 'pass' : 'fail',
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
      code: 'PERSISTENCE_MISSING',
      severity: 'warning',
      message: '[MISSING: persistent process store is not implemented in skeleton]',
    });
    findings.push({
      code: 'EVENT_BUS_MISSING',
      severity: 'warning',
      message: '[MISSING: event bus publication is not implemented in skeleton]',
    });

    return {
      processId,
      version,
      valid: findings.every((finding) => finding.severity !== 'fail'),
      findings,
    };
  }

  transition(processId: string, version: number, status: ProcessStatus): BusinessProcessDefinition {
    const process = this.getProcess(processId, version);
    const updated = {
      ...process,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.processes.set(this.key(processId, version), updated);
    return updated;
  }

  private key(processId: string, version: number): string {
    return `${processId}:${version}`;
  }
}
