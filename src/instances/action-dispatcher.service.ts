import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { WorkflowActionDefinition } from '../workflows/workflow.types';
import { InstanceError } from './instance.types';

export const MAX_ATTEMPTS = 3;

export const FETCH_TOKEN = 'BPCP_FETCH';

export type ActionResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; error: InstanceError };

@Injectable()
export class ActionDispatcherService {
  private readonly logger = new Logger(ActionDispatcherService.name);

  constructor(@Optional() @Inject(FETCH_TOKEN) private readonly fetchImpl: typeof fetch = fetch) {}

  async execute(action: WorkflowActionDefinition, context: Record<string, unknown>): Promise<ActionResult> {
    const url = action.parameters?.url;
    if (typeof url !== 'string' || url.length === 0) {
      const error = this.error(action, 'ACTION_MISCONFIGURED', 'action has no url parameter', true);
      this.logger.error(`${error.code} ${error.message} actionId=${action.actionId}`);
      return { ok: false, error };
    }

    const startedAt = Date.now();

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actionId: action.actionId, parameters: action.parameters, context }),
      });

      if (!response.ok) {
        const body = await response.text();
        // 4xx is the caller's fault and will not fix itself; 5xx and 429 may.
        const permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
        const error = this.error(action, 'ACTION_HTTP_ERROR', `action ${action.actionId} failed`, permanent, {
          url,
          status: response.status,
          body,
          durationMs: Date.now() - startedAt,
        });
        this.logger.error(`${error.code} ${error.message} ${JSON.stringify(error.context)}`);
        return { ok: false, error };
      }

      const output = (await response.json()) as Record<string, unknown>;
      this.logger.log(`action ${action.actionId} ok in ${Date.now() - startedAt}ms`);
      return { ok: true, output };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const error = this.error(action, 'ACTION_TRANSPORT_ERROR', message, false, {
        url,
        durationMs: Date.now() - startedAt,
      });
      this.logger.error(`${error.code} ${error.message} ${JSON.stringify(error.context)}`);
      return { ok: false, error };
    }
  }

  private error(
    action: WorkflowActionDefinition,
    code: string,
    message: string,
    permanent: boolean,
    context?: Record<string, unknown>,
  ): InstanceError {
    return {
      actionId: action.actionId,
      code,
      message,
      permanent,
      context,
      occurredAt: new Date().toISOString(),
    };
  }
}
