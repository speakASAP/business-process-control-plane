import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadWorkflowsFromDirectory } from './workflow-seed-loader';

const validWorkflow = (workflowId: string) => ({
  schemaVersion: 'bpcp.workflow.v1',
  workflowId,
  version: 1,
  status: 'active',
  description: 'test',
  appliesToProcessRefs: [],
  trigger: {
    type: 'cv-application-downloaded',
    sourceService: 'cv-tuning',
    eventRef: 'cv.application.downloaded',
    correlationKeys: ['applicationId'],
  },
  actions: [{ actionId: 'a', type: 'wait-for-signal', serviceCapabilityRefs: [], parameters: {} }],
  requiredCapabilities: [],
  missingRuntimeFacts: [],
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
});

const seedDir = (files: Record<string, string>): string => {
  const dir = mkdtempSync(join(tmpdir(), 'bpcp-seed-'));
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
  return dir;
};

describe('loadWorkflowsFromDirectory', () => {
  it('returns an empty list when no directory is configured', () => {
    expect(loadWorkflowsFromDirectory(undefined)).toEqual([]);
  });

  it('loads every *.workflow.json in the directory', () => {
    const dir = seedDir({
      'a.workflow.json': JSON.stringify(validWorkflow('wf-a')),
      'b.workflow.json': JSON.stringify(validWorkflow('wf-b')),
      'notes.md': 'ignored',
    });

    const loaded = loadWorkflowsFromDirectory(dir);

    expect(loaded.map((w) => w.workflowId).sort()).toEqual(['wf-a', 'wf-b']);
  });

  it('raises on a configured directory that does not exist, rather than starting with no workflows', () => {
    // A silently empty registry means every start() 404s at runtime, far from the cause.
    expect(() => loadWorkflowsFromDirectory('/nonexistent/bpcp-seed')).toThrow(
      /\/nonexistent\/bpcp-seed/,
    );
  });

  it('raises on malformed JSON, naming the file', () => {
    const dir = seedDir({ 'broken.workflow.json': '{ not json' });

    expect(() => loadWorkflowsFromDirectory(dir)).toThrow(/broken\.workflow\.json/);
  });

  it('raises on a document with the wrong schemaVersion', () => {
    const dir = seedDir({
      'wrong.workflow.json': JSON.stringify({ ...validWorkflow('wf-c'), schemaVersion: 'v2' }),
    });

    expect(() => loadWorkflowsFromDirectory(dir)).toThrow(/schemaVersion/);
  });

  it('raises when a required field is missing rather than registering a half-built workflow', () => {
    const partial: Record<string, unknown> = validWorkflow('wf-d');
    delete partial.actions;
    const dir = seedDir({ 'partial.workflow.json': JSON.stringify(partial) });

    expect(() => loadWorkflowsFromDirectory(dir)).toThrow(/actions/);
  });
});
