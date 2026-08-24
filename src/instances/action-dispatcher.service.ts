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
    const rawUrl = action.parameters?.url;
    if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
      const error = this.error(action, 'ACTION_MISCONFIGURED', 'action has no url parameter', true);
      this.logger.error(`${error.code} ${error.message} actionId=${action.actionId}`);
      return { ok: false, error };
    }

    let url: string;
    let headers: Record<string, string>;
    try {
      // Resolved BEFORE the request is built: an unresolved `${env:...}` reaching the wire would
      // look like a wrong credential and be diagnosed as an auth bug rather than a config one.
      url = resolveEnvReferences(rawUrl);
      headers = { 'content-type': 'application/json', ...this.resolveHeaders(action) };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const error = this.error(action, 'ACTION_MISCONFIGURED', message, true);
      this.logger.error(`${error.code} ${error.message} actionId=${action.actionId}`);
      return { ok: false, error };
    }

    const startedAt = Date.now();

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        // `headers` is stripped from the echoed parameters: a resolved secret in the body would
        // be written to the log of every receiver that logs its request body.
        body: JSON.stringify({
          actionId: action.actionId,
          parameters: bodyParameters(action),
          context,
        }),
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

  /**
   * Reads the optional `headers` parameter, resolving `${env:VAR}` in each value. Raises on an
   * unset reference rather than sending an empty header — a silently blank credential is
   * indistinguishable from a wrong one at the receiver.
   */
  private resolveHeaders(action: WorkflowActionDefinition): Record<string, string> {
    const raw = action.parameters?.headers;
    if (raw === undefined) {
      return {};
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error(`action "${action.actionId}" has a headers parameter that is not an object`);
    }

    const resolved: Record<string, string> = {};
    for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        throw new Error(`action "${action.actionId}" header "${name}" is not a string`);
      }
      resolved[name] = resolveEnvReferences(value);
    }
    return resolved;
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

const ENV_REFERENCE = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Substitutes `${env:VAR}` with the dispatcher process's own environment. This is what keeps a
 * shared secret out of the workflow document, which is stored, listed over the API, and
 * committed to git. An unset variable RAISES: substituting an empty string would send a blank
 * credential that the receiver reports as an auth failure, hiding the real cause.
 */
export function resolveEnvReferences(value: string): string {
  return value.replace(ENV_REFERENCE, (_match, name: string) => {
    const resolved = process.env[name];
    if (resolved === undefined || resolved === '') {
      throw new Error(`workflow parameter references environment variable ${name}, which is not set`);
    }
    return resolved;
  });
}

/** The parameters echoed into the request body, with `headers` removed. See `execute`. */
function bodyParameters(
  action: WorkflowActionDefinition,
): WorkflowActionDefinition['parameters'] {
  if (!action.parameters) {
    return action.parameters;
  }
  const { headers: _headers, ...rest } = action.parameters;
  return rest;
}
