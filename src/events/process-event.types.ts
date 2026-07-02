import { ProcessStatus } from '../processes/process.types';

export type ProcessEventType =
  | 'process.created'
  | 'process.validated'
  | 'process.scheduled'
  | 'process.published'
  | 'process.paused'
  | 'process.retired';

export type ProcessEventDeliveryState = 'pending' | 'dispatched' | 'failed';
export type ProcessEventDeliveryTransport = 'local-json-outbox' | 'rabbitmq-topic';

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
  transport: ProcessEventDeliveryTransport;
  attempts: number;
  exchange?: string;
  routingKey?: string;
  lastAttemptAt?: string;
  dispatchedAt?: string;
  error?: string;
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

export interface ProcessEventTransportInfo {
  schemaVersion: 'bpcp.process-event-transport-info.v1';
  enabled: boolean;
  transport: 'rabbitmq-topic';
  exchange: string;
  routingKeyPrefix: string;
  urlConfigured: boolean;
  signingSecretConfigured: boolean;
  publishTimeoutMs: number;
  readyForDispatch: boolean;
  blockers: string[];
  routingKeys: Record<ProcessEventType, string>;
}

export interface ProcessEventDispatchResult {
  schemaVersion: 'bpcp.process-event-dispatch-result.v1';
  eventId: string;
  state: 'dispatched' | 'failed' | 'skipped';
  transport: 'rabbitmq-topic';
  exchange: string;
  routingKey: string;
  attemptedAt: string;
  error?: string;
  blockers: string[];
}

export interface ProcessEventDispatchSummary {
  schemaVersion: 'bpcp.process-event-dispatch-summary.v1' | 'bpcp.process-event-replay-summary.v1';
  attempted: number;
  dispatched: number;
  failed: number;
  skipped: number;
  blockers: string[];
  results: ProcessEventDispatchResult[];
}
