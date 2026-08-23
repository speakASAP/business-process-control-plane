export type InstanceStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

/** Populated whenever an instance or step fails. Never left empty on failure. */
export interface InstanceError {
  actionId?: string;
  code: string;
  message: string;
  /** Transient failures are retried up to MAX_ATTEMPTS; permanent ones fail immediately. */
  permanent: boolean;
  context?: Record<string, unknown>;
  occurredAt: string;
}

export interface WaitDescriptor {
  actionId: string;
  signalName: string;
  waitingSince: string;
  timeoutAt: string | null;
  onTimeout: 'fail' | 'continue';
}
