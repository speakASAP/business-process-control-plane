#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const editorUiPath = path.join(root, 'src', 'editor', 'editor-ui.ts');
const controllerPath = path.join(root, 'src', 'editor', 'editor.controller.ts');
const handoffPath = path.join(root, 'docs', 'orchestrator', 'EDITOR_HANDOFF.md');

const editorUi = fs.readFileSync(editorUiPath, 'utf8');
const controller = fs.readFileSync(controllerPath, 'utf8');
const handoff = fs.readFileSync(handoffPath, 'utf8');
const scriptMatch = editorUi.match(/<script>([\s\S]*)<\/script>/);
let clientScriptParses = false;

if (scriptMatch) {
  try {
    // Parse only; the browser APIs referenced in the editor are not executed here.
    new Function(scriptMatch[1]);
    clientScriptParses = true;
  } catch (error) {
    console.error('client script parse error: ' + error.message);
  }
}

const checks = [
  {
    name: 'root route renders editor',
    pass: /@Get\(\)\s+[\s\S]*renderProcessEditor\(\)/.test(controller),
  },
  {
    name: 'editor route preserved',
    pass: /@Get\('editor'\)\s+[\s\S]*renderProcessEditor\(\)/.test(controller),
  },
  {
    name: 'holiday discount draft seeded',
    pass: editorUi.includes("processId: 'holiday-discount-2026'") && editorUi.includes('10% Holiday Discount'),
  },
  {
    name: 'typed nodes configured',
    pass: ['event', 'condition', 'policy', 'action', 'slot'].every((type) => editorUi.includes(type + ': {')),
  },
  {
    name: 'edge creation controls present',
    pass: editorUi.includes('set-edge-source') && editorUi.includes('connect-selected') && editorUi.includes('function createEdge'),
  },
  {
    name: 'export controls present',
    pass: editorUi.includes('copy-json') && editorUi.includes('download-json') && editorUi.includes('function createExportPayload'),
  },
  {
    name: 'validation panel present',
    pass: editorUi.includes('validation-list') && editorUi.includes('function validateDraft') && editorUi.includes('Missing incoming connector') && editorUi.includes('Disconnected node'),
  },
  {
    name: 'client script parses',
    pass: clientScriptParses,
  },
  {
    name: 'handoff records validation and blockers',
    pass: handoff.includes('Validation Commands') && handoff.includes('[MISSING:') && handoff.includes('Parallel Execution Notes'),
  },
];

const failed = checks.filter((check) => !check.pass);

checks.forEach((check) => {
  console.log((check.pass ? 'PASS' : 'FAIL') + ' ' + check.name);
});

if (failed.length) {
  console.error('verify-editor-ui: failed ' + failed.length + ' check(s)');
  process.exit(1);
}

console.log('verify-editor-ui: passed ' + checks.length + ' checks');
