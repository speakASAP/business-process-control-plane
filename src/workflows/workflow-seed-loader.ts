import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { WorkflowDefinition } from './workflow.types';

const SUFFIX = '.workflow.json';

/** Every field `WorkflowExecutorService` and the validator read before an instance can run. */
const REQUIRED_FIELDS = [
  'workflowId',
  'version',
  'status',
  'description',
  'appliesToProcessRefs',
  'trigger',
  'actions',
  'requiredCapabilities',
  'missingRuntimeFacts',
] as const;

/**
 * Loads workflow definitions authored by other services from a directory mounted into BPCP.
 *
 * The registry is otherwise hardcoded, so a service that owns a workflow (cv-tuning's outcome
 * watch, for example) had no way to register one. Every failure here RAISES at boot: a registry
 * that silently came up empty would 404 every `start()` at runtime, far from the cause.
 */
export function loadWorkflowsFromDirectory(directory: string | undefined): WorkflowDefinition[] {
  if (!directory) {
    return [];
  }
  if (!existsSync(directory)) {
    throw new Error(`workflow seed directory ${directory} does not exist`);
  }

  const loaded: WorkflowDefinition[] = [];
  for (const file of readdirSync(directory).filter((name) => name.endsWith(SUFFIX)).sort()) {
    const path = join(directory, file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`workflow seed ${path} is not valid JSON: ${message}`);
    }

    loaded.push(assertWorkflowDefinition(parsed, path));
  }

  return loaded;
}

function assertWorkflowDefinition(value: unknown, path: string): WorkflowDefinition {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`workflow seed ${path} is not an object`);
  }
  const candidate = value as Record<string, unknown>;

  if (candidate.schemaVersion !== 'bpcp.workflow.v1') {
    throw new Error(
      `workflow seed ${path} has schemaVersion ${JSON.stringify(candidate.schemaVersion)}; expected "bpcp.workflow.v1"`,
    );
  }

  const missing = REQUIRED_FIELDS.filter((field) => candidate[field] === undefined);
  if (missing.length > 0) {
    throw new Error(`workflow seed ${path} is missing required field(s): ${missing.join(', ')}`);
  }
  if (!Array.isArray(candidate.actions) || candidate.actions.length === 0) {
    throw new Error(`workflow seed ${path} defines no actions`);
  }

  return candidate as unknown as WorkflowDefinition;
}
