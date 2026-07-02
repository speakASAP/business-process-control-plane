import { ProcessStatus } from '../processes/process.types';

export type ProcessEventType =
  | 'process.created'
  | 'process.validated'
  | 'process.scheduled'
  | 'process.published'
  | 'process.paused'
  | 'process.retired';

export type ProcessEventDeliveryState = 'pending' | 'dispatched' | 'failed';

export interface ProcessEventLifecyclePayload {
  auditAction: string;
  details: Record<string, unknown>;
}

export interface ProcessEventValidationPayload {
  valid: boolean;
  validatedAt: string;
  failCount: number;
  warningCount: number;
}

export interface ProcessEventPayload {
  activeFrom?: string;
  activeTo?: string;
  lifecycle: ProcessEventLifecyclePayload;
  validation?: ProcessEventValidationPayload;
}

export interface ProcessEventDelivery {
  state: ProcessEventDeliveryState;
  transport: 'local-json-outbox';
  missing: string[];
}

export interface ProcessEventEnvelope {
  schemaVersion: 'bpcp.process-event.v1';
  id: string;
  type: ProcessEventType;
  processId: string;
  version: number;
  status: ProcessStatus;
  policyRefs: string[];
  workflowRefs: string[];
  campaignRefs: string[];
  occurredAt: string;
  payload: ProcessEventPayload;
  delivery: ProcessEventDelivery;
}

export interface ProcessEventOutboxSnapshot {
  schemaVersion: 'bpcp.process-event-outbox.v1';
  events: ProcessEventEnvelope[];
}
