export function renderProcessEditor(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BPCP Process Editor</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --surface: #ffffff;
      --surface-soft: #f7f9fc;
      --line: #d7dde8;
      --line-strong: #aeb8c8;
      --text: #111827;
      --muted: #5f6b7a;
      --event: #2563eb;
      --condition: #0891b2;
      --policy: #7c3aed;
      --action: #059669;
      --slot: #c2410c;
      --danger: #b91c1c;
      --warning: #b45309;
      --ok: #047857;
    }

    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: var(--text); }
    button, input, select, textarea { font: inherit; }
    button {
      border: 1px solid var(--line-strong);
      background: #fff;
      border-radius: 6px;
      padding: 7px 10px;
      cursor: pointer;
      color: var(--text);
    }
    button.primary { background: #1f2937; border-color: #1f2937; color: #fff; }
    button.danger { border-color: #fecaca; color: var(--danger); }
    button:disabled { opacity: .46; cursor: not-allowed; }

    .shell { display: grid; grid-template-columns: 292px minmax(620px, 1fr) 380px; min-height: 100vh; }
    aside, .inspector {
      background: var(--surface);
      border-right: 1px solid var(--line);
      padding: 16px;
      min-width: 0;
      overflow: auto;
    }
    .inspector { border-right: 0; border-left: 1px solid var(--line); }
    h1 { font-size: 18px; line-height: 1.2; margin: 0 0 12px; }
    h2 {
      font-size: 12px;
      line-height: 1.2;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: #4b5563;
      margin: 18px 0 8px;
    }
    h3 { font-size: 14px; margin: 0 0 8px; }
    .muted { color: var(--muted); }
    .tight { margin: 0; }
    .small { font-size: 12px; line-height: 1.35; }

    .palette-group { display: grid; gap: 8px; }
    .node-template {
      border: 1px solid var(--line-strong);
      background: #fff;
      border-radius: 8px;
      padding: 10px 11px;
      cursor: grab;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .06);
    }
    .node-template:active { cursor: grabbing; }
    .node-template strong, .canvas-node strong { display: block; font-size: 13px; line-height: 1.25; }
    .node-template span, .canvas-node span { color: var(--muted); font-size: 12px; line-height: 1.35; }
    .event { border-left: 4px solid var(--event); }
    .condition { border-left: 4px solid var(--condition); }
    .policy { border-left: 4px solid var(--policy); }
    .action { border-left: 4px solid var(--action); }
    .slot { border-left: 4px solid var(--slot); }

    main {
      position: relative;
      min-width: 0;
      overflow: hidden;
      background-color: #f8fafc;
      background-image:
        linear-gradient(#e0e6ef 1px, transparent 1px),
        linear-gradient(90deg, #e0e6ef 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .toolbar {
      position: absolute;
      left: 16px;
      top: 16px;
      right: 16px;
      min-height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: rgba(255,255,255,.94);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 12px;
      z-index: 4;
    }
    .toolbar-title { display: grid; gap: 2px; min-width: 220px; }
    .toolbar-title strong { font-size: 14px; }
    .toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .canvas {
      position: absolute;
      inset: 84px 16px 16px;
      border: 1px solid #ccd5e3;
      border-radius: 8px;
      background: rgba(255,255,255,.68);
      overflow: hidden;
    }
    .edge-layer, .node-layer { position: absolute; inset: 0; }
    .edge-layer { z-index: 1; pointer-events: none; }
    .node-layer { z-index: 2; }
    .edge-path {
      fill: none;
      stroke: #64748b;
      stroke-width: 2;
      marker-end: url(#arrow);
    }
    .edge-path.invalid { stroke: var(--danger); stroke-dasharray: 6 4; }
    .edge-label {
      font-size: 11px;
      fill: #334155;
      paint-order: stroke;
      stroke: #fff;
      stroke-width: 4px;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .canvas-node {
      position: absolute;
      width: 208px;
      min-height: 82px;
      background: #fff;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      padding: 9px 10px;
      cursor: grab;
      box-shadow: 0 6px 14px rgba(15, 23, 42, .1);
      user-select: none;
    }
    .canvas-node:active { cursor: grabbing; }
    .canvas-node.selected {
      outline: 3px solid rgba(31, 41, 55, .18);
      border-color: #111827;
    }
    .canvas-node.edge-source {
      outline: 3px solid rgba(5, 150, 105, .22);
      border-color: var(--action);
    }
    .canvas-node.invalid-node {
      box-shadow: 0 0 0 2px rgba(185, 28, 28, .18), 0 6px 14px rgba(15, 23, 42, .1);
    }
    .node-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .type-badge {
      display: inline-flex;
      align-items: center;
      min-height: 20px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 11px;
      color: #334155;
      background: #f8fafc;
      white-space: nowrap;
    }
    .node-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .flag {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 11px;
      background: #f1f5f9;
      color: #334155;
    }
    .flag.error { background: #fee2e2; color: var(--danger); }
    .flag.warning { background: #fef3c7; color: var(--warning); }
    .flag.ok { background: #dcfce7; color: var(--ok); }

    .panel { border-top: 1px solid var(--line); padding-top: 12px; margin-top: 12px; }
    .field { display: grid; gap: 5px; margin-bottom: 10px; }
    .field label { color: #4b5563; font-size: 12px; font-weight: 600; }
    .field input, .field select, .field textarea {
      width: 100%;
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      padding: 8px;
      background: #fff;
      color: var(--text);
    }
    .field textarea { min-height: 72px; resize: vertical; }
    .button-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .status-line {
      min-height: 24px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--surface-soft);
      padding: 6px 8px;
      color: #334155;
    }
    .validation-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px;
      background: var(--surface-soft);
    }
    .metric strong { display: block; font-size: 18px; line-height: 1; }
    .metric span { color: var(--muted); font-size: 11px; }
    .issue-list { display: grid; gap: 7px; max-height: 188px; overflow: auto; padding-right: 2px; }
    .issue {
      border: 1px solid var(--line);
      border-left-width: 4px;
      border-radius: 7px;
      padding: 7px 8px;
      background: #fff;
      font-size: 12px;
      line-height: 1.35;
    }
    .issue.error { border-left-color: var(--danger); }
    .issue.warning { border-left-color: var(--warning); }
    .issue.ok { border-left-color: var(--ok); }
    pre {
      white-space: pre-wrap;
      background: #101827;
      color: #e5e7eb;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.45;
      max-height: 340px;
      overflow: auto;
      margin: 0;
    }

    @media (max-width: 1180px) {
      .shell { grid-template-columns: 250px minmax(560px, 1fr) 330px; }
      .canvas-node { width: 196px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <h1>BPCP Editor</h1>
      <p class="small muted tight">holiday-discount-2026 visual draft</p>

      <h2>Events</h2>
      <div class="palette-group">
        <div class="node-template event" draggable="true" data-type="event" data-label="CartUpdated" data-description="Checkout cart event"><strong>CartUpdated</strong><span>checkout trigger</span></div>
        <div class="node-template event" draggable="true" data-type="event" data-label="OrderPaid" data-description="Post-purchase event"><strong>OrderPaid</strong><span>order trigger</span></div>
      </div>

      <h2>Logic</h2>
      <div class="palette-group">
        <div class="node-template condition" draggable="true" data-type="condition" data-label="Category In" data-description="Catalog category eligibility check"><strong>Category In</strong><span>catalog facts</span></div>
        <div class="node-template condition" draggable="true" data-type="condition" data-label="Date Window" data-description="Holiday activation window"><strong>Date Window</strong><span>schedule facts</span></div>
        <div class="node-template policy" draggable="true" data-type="policy" data-label="10% Holiday Discount" data-description="Exclusive discount policy"><strong>10% Holiday Discount</strong><span>policy decision</span></div>
      </div>

      <h2>Actions</h2>
      <div class="palette-group">
        <div class="node-template action" draggable="true" data-type="action" data-label="Evaluate Discount" data-description="Pricing authority call"><strong>Evaluate Discount</strong><span>pricing authority</span></div>
        <div class="node-template slot" draggable="true" data-type="slot" data-label="Upsell Slot" data-description="Frontend upsell placement"><strong>Upsell Slot</strong><span>experience slot</span></div>
      </div>

      <div class="panel">
        <h2>Canvas</h2>
        <div class="button-row">
          <button id="reset-seed">Reset Seed</button>
          <button id="clear-canvas" class="danger">Clear</button>
        </div>
      </div>
    </aside>

    <main>
      <div class="toolbar">
        <div class="toolbar-title">
          <strong>holiday-discount-2026</strong>
          <span class="small muted">Draft graph: event -> conditions -> policy -> action -> slot</span>
        </div>
        <div class="toolbar-actions">
          <button id="simulate">Run Sample</button>
          <button id="copy-json">Copy JSON</button>
          <button id="download-json" class="primary">Download JSON</button>
        </div>
      </div>
      <div id="canvas" class="canvas" aria-label="Process canvas">
        <svg id="edge-layer" class="edge-layer" aria-hidden="true">
          <defs>
            <marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L9,4.5 L0,9 Z" fill="#64748b"></path>
            </marker>
          </defs>
        </svg>
        <div id="node-layer" class="node-layer"></div>
      </div>
    </main>

    <section class="inspector">
      <h1>Inspector</h1>
      <div id="status" class="status-line small">Select a node to inspect it.</div>
      <div id="inspector-body" class="panel"></div>

      <div class="panel">
        <h2>Validation</h2>
        <div id="validation-summary" class="validation-summary"></div>
        <div id="validation-list" class="issue-list"></div>
      </div>

      <div class="panel">
        <div class="button-row" style="justify-content: space-between; margin-bottom: 8px;">
          <h2 style="margin: 0;">Draft JSON</h2>
          <span id="json-mode" class="small muted">canvas export</span>
        </div>
        <pre id="draft-output"></pre>
      </div>
    </section>
  </div>

  <script>
    const NODE_WIDTH = 208;
    const NODE_HEIGHT = 82;
    const canvas = document.getElementById('canvas');
    const nodeLayer = document.getElementById('node-layer');
    const edgeLayer = document.getElementById('edge-layer');
    const statusLine = document.getElementById('status');
    const inspectorBody = document.getElementById('inspector-body');
    const validationSummary = document.getElementById('validation-summary');
    const validationList = document.getElementById('validation-list');
    const draftOutput = document.getElementById('draft-output');
    const jsonMode = document.getElementById('json-mode');

    const nodeTypes = {
      event: {
        title: 'Event',
        color: '#2563eb',
        requiresIncoming: false,
        requiresOutgoing: true,
        next: ['condition', 'action']
      },
      condition: {
        title: 'Condition',
        color: '#0891b2',
        requiresIncoming: true,
        requiresOutgoing: true,
        next: ['condition', 'policy']
      },
      policy: {
        title: 'Policy',
        color: '#7c3aed',
        requiresIncoming: true,
        requiresOutgoing: true,
        next: ['action']
      },
      action: {
        title: 'Action',
        color: '#059669',
        requiresIncoming: true,
        requiresOutgoing: true,
        next: ['slot']
      },
      slot: {
        title: 'Slot',
        color: '#c2410c',
        requiresIncoming: true,
        requiresOutgoing: false,
        next: []
      }
    };

    const seedDraft = {
      schemaVersion: 'bpcp.canvas.v1',
      processId: 'holiday-discount-2026',
      processVersion: 1,
      nodes: [
        {
          id: 'event-cart-updated',
          type: 'event',
          label: 'CartUpdated',
          description: 'Checkout cart event starts holiday eligibility.',
          x: 32,
          y: 160,
          config: { source: 'checkout', eventName: 'cart.updated' }
        },
        {
          id: 'condition-category-in',
          type: 'condition',
          label: 'Category In',
          description: 'Cart contains a holiday-eligible catalog category.',
          x: 274,
          y: 96,
          config: { fact: 'productCategoryIds', operator: 'contains', value: 'christmas-gifts' }
        },
        {
          id: 'condition-date-window',
          type: 'condition',
          label: 'Date Window',
          description: 'Current date is inside the Holiday Discount campaign window.',
          x: 274,
          y: 224,
          config: { start: '2026-12-01T00:00:00Z', end: '2026-12-31T23:59:59Z' }
        },
        {
          id: 'policy-10-discount',
          type: 'policy',
          label: '10% Holiday Discount',
          description: 'Apply an exclusive 10 percent discount when all checks pass.',
          x: 514,
          y: 160,
          config: { discountPercent: 10, exclusivity: 'exclusive' }
        },
        {
          id: 'action-evaluate-discount',
          type: 'action',
          label: 'Evaluate Discount',
          description: 'Send accepted policy context to pricing authority.',
          x: 274,
          y: 352,
          config: { authority: 'pricing', action: 'evaluate-discount' }
        },
        {
          id: 'slot-upsell',
          type: 'slot',
          label: 'Upsell Slot',
          description: 'Expose the eligible holiday upsell placement to the storefront.',
          x: 514,
          y: 352,
          config: { placement: 'cart-side-panel', channel: 'storefront' }
        }
      ],
      edges: [
        { id: 'edge-cart-category', source: 'event-cart-updated', target: 'condition-category-in', label: 'cart facts' },
        { id: 'edge-cart-date', source: 'event-cart-updated', target: 'condition-date-window', label: 'time facts' },
        { id: 'edge-category-policy', source: 'condition-category-in', target: 'policy-10-discount', label: 'eligible category' },
        { id: 'edge-date-policy', source: 'condition-date-window', target: 'policy-10-discount', label: 'active window' },
        { id: 'edge-policy-action', source: 'policy-10-discount', target: 'action-evaluate-discount', label: 'approved policy' },
        { id: 'edge-action-slot', source: 'action-evaluate-discount', target: 'slot-upsell', label: 'present result' }
      ]
    };

    let state = clone(seedDraft);
    let selectedNodeId = state.nodes[0].id;
    let edgeSourceId = null;
    let lastValidation = null;
    let outputMode = 'canvas export';
    let dragState = null;

    document.querySelectorAll('.node-template').forEach(function(item) {
      item.addEventListener('dragstart', function(event) {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/json', JSON.stringify({
          type: item.dataset.type,
          label: item.dataset.label,
          description: item.dataset.description
        }));
      });
    });

    canvas.addEventListener('dragover', function(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', function(event) {
      event.preventDefault();
      const payload = event.dataTransfer.getData('application/json');
      if (!payload) {
        return;
      }
      const data = JSON.parse(payload);
      const rect = canvas.getBoundingClientRect();
      const node = createNode(data.type, data.label, data.description, event.clientX - rect.left, event.clientY - rect.top);
      state.nodes.push(node);
      selectedNodeId = node.id;
      outputMode = 'canvas export';
      setStatus('Added ' + node.label + '. Missing connector checks updated.');
      render();
    });

    document.getElementById('reset-seed').addEventListener('click', function() {
      state = clone(seedDraft);
      selectedNodeId = state.nodes[0].id;
      edgeSourceId = null;
      outputMode = 'canvas export';
      setStatus('Holiday Discount seed restored.');
      render();
    });

    document.getElementById('clear-canvas').addEventListener('click', function() {
      state.nodes = [];
      state.edges = [];
      selectedNodeId = null;
      edgeSourceId = null;
      outputMode = 'canvas export';
      setStatus('Canvas cleared. Validation is now blocking.');
      render();
    });

    document.getElementById('copy-json').addEventListener('click', function() {
      const payload = JSON.stringify(createExportPayload(), null, 2);
      if (!navigator.clipboard) {
        draftOutput.textContent = payload;
        setStatus('Clipboard unavailable. JSON refreshed in the output panel.');
        return;
      }
      navigator.clipboard.writeText(payload).then(function() {
        setStatus('Draft JSON copied.');
      }).catch(function() {
        draftOutput.textContent = payload;
        setStatus('Clipboard copy failed. JSON refreshed in the output panel.');
      });
    });

    document.getElementById('download-json').addEventListener('click', function() {
      const payload = JSON.stringify(createExportPayload(), null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = state.processId + '-canvas.json';
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus('Draft JSON download prepared.');
    });

    document.getElementById('simulate').addEventListener('click', async function() {
      try {
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            processId: 'holiday-discount-2026',
            processVersion: 1,
            productCategoryIds: ['christmas-gifts'],
            cartSubtotal: 1000,
            currentDate: '2026-12-24T12:00:00Z'
          })
        });
        const body = await response.json();
        outputMode = 'simulation response';
        jsonMode.textContent = outputMode;
        draftOutput.textContent = JSON.stringify(body, null, 2);
        setStatus('Sample simulation completed.');
      } catch (error) {
        outputMode = 'simulation error';
        jsonMode.textContent = outputMode;
        draftOutput.textContent = JSON.stringify({ error: String(error) }, null, 2);
        setStatus('Sample simulation failed.');
      }
    });

    document.addEventListener('pointermove', function(event) {
      if (!dragState) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const node = findNode(dragState.nodeId);
      if (!node) {
        return;
      }
      const nextX = dragState.x + event.clientX - dragState.clientX;
      const nextY = dragState.y + event.clientY - dragState.clientY;
      node.x = clamp(Math.round(nextX), 8, Math.max(8, Math.round(rect.width - NODE_WIDTH - 8)));
      node.y = clamp(Math.round(nextY), 8, Math.max(8, Math.round(rect.height - NODE_HEIGHT - 8)));
      const nodeEl = nodeLayer.querySelector('[data-node-id="' + node.id + '"]');
      if (nodeEl) {
        nodeEl.style.left = node.x + 'px';
        nodeEl.style.top = node.y + 'px';
      }
      renderEdges();
      outputMode = 'canvas export';
      dragState.moved = true;
    });

    document.addEventListener('pointerup', function() {
      if (dragState) {
        dragState = null;
        render();
      }
    });

    function createNode(type, label, description, x, y) {
      const nextNumber = state.nodes.filter(function(node) { return node.type === type; }).length + 1;
      const safeType = nodeTypes[type] ? type : 'condition';
      const id = safeType + '-' + slugify(label || safeType) + '-' + nextNumber;
      const rect = canvas.getBoundingClientRect();
      return {
        id: id,
        type: safeType,
        label: label || nodeTypes[safeType].title,
        description: description || '',
        x: clamp(Math.round(x - NODE_WIDTH / 2), 8, Math.max(8, Math.round(rect.width - NODE_WIDTH - 8))),
        y: clamp(Math.round(y - NODE_HEIGHT / 2), 8, Math.max(8, Math.round(rect.height - NODE_HEIGHT - 8))),
        config: {}
      };
    }

    function render() {
      lastValidation = validateDraft();
      renderNodes();
      renderEdges();
      renderInspector();
      renderValidation();
      if (outputMode === 'canvas export') {
        draftOutput.textContent = JSON.stringify(createExportPayload(), null, 2);
      }
      jsonMode.textContent = outputMode;
    }

    function renderNodes() {
      nodeLayer.innerHTML = '';
      const issueCounts = getNodeIssueCounts(lastValidation);
      state.nodes.forEach(function(node) {
        const type = nodeTypes[node.type];
        const el = document.createElement('div');
        const count = issueCounts[node.id] || { errors: 0, warnings: 0 };
        const selectedClass = selectedNodeId === node.id ? ' selected' : '';
        const edgeSourceClass = edgeSourceId === node.id ? ' edge-source' : '';
        const invalidClass = count.errors > 0 ? ' invalid-node' : '';
        el.className = 'canvas-node ' + node.type + selectedClass + edgeSourceClass + invalidClass;
        el.dataset.nodeId = node.id;
        el.style.left = node.x + 'px';
        el.style.top = node.y + 'px';
        el.innerHTML =
          '<div class="node-row">' +
            '<div><strong>' + escapeHtml(node.label || '[missing label]') + '</strong><span>' + escapeHtml(node.description || node.id) + '</span></div>' +
            '<span class="type-badge">' + escapeHtml(type ? type.title : node.type) + '</span>' +
          '</div>' +
          '<div class="node-meta">' +
            '<span class="flag ' + (count.errors ? 'error' : 'ok') + '">' + count.errors + ' errors</span>' +
            '<span class="flag ' + (count.warnings ? 'warning' : 'ok') + '">' + count.warnings + ' warnings</span>' +
          '</div>';
        el.addEventListener('pointerdown', function(event) {
          if (event.button !== 0) {
            return;
          }
          event.preventDefault();
          if (edgeSourceId && edgeSourceId !== node.id) {
            createEdge(edgeSourceId, node.id);
            return;
          }
          selectedNodeId = node.id;
          dragState = {
            nodeId: node.id,
            x: node.x,
            y: node.y,
            clientX: event.clientX,
            clientY: event.clientY,
            moved: false
          };
          outputMode = 'canvas export';
          render();
        });
        nodeLayer.appendChild(el);
      });
    }

    function renderEdges() {
      const marker = edgeLayer.querySelector('defs');
      edgeLayer.innerHTML = '';
      edgeLayer.appendChild(marker);
      state.edges.forEach(function(edge) {
        const source = findNode(edge.source);
        const target = findNode(edge.target);
        if (!source || !target) {
          return;
        }
        const sourceType = nodeTypes[source.type];
        const invalid = !sourceType || sourceType.next.indexOf(target.type) === -1;
        const forward = target.x >= source.x;
        const start = anchor(source, forward ? 'right' : 'bottom');
        const end = anchor(target, forward ? 'left' : 'top');
        const bend = forward ? Math.max(70, Math.abs(end.x - start.x) / 2) : Math.max(54, Math.abs(end.y - start.y) / 2);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'edge-path' + (invalid ? ' invalid' : ''));
        if (forward) {
          path.setAttribute('d', 'M ' + start.x + ' ' + start.y + ' C ' + (start.x + bend) + ' ' + start.y + ', ' + (end.x - bend) + ' ' + end.y + ', ' + end.x + ' ' + end.y);
        } else {
          path.setAttribute('d', 'M ' + start.x + ' ' + start.y + ' C ' + start.x + ' ' + (start.y + bend) + ', ' + end.x + ' ' + (end.y - bend) + ', ' + end.x + ' ' + end.y);
        }
        edgeLayer.appendChild(path);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'edge-label');
        text.setAttribute('x', String(Math.round((start.x + end.x) / 2)));
        text.setAttribute('y', String(Math.round((start.y + end.y) / 2) - 6));
        text.setAttribute('text-anchor', 'middle');
        text.textContent = edge.label || edge.id;
        edgeLayer.appendChild(text);
      });
    }

    function renderInspector() {
      const node = findNode(selectedNodeId);
      if (!node) {
        inspectorBody.innerHTML = '<p class="small muted tight">No node selected.</p>';
        return;
      }
      const incoming = state.edges.filter(function(edge) { return edge.target === node.id; });
      const outgoing = state.edges.filter(function(edge) { return edge.source === node.id; });
      const typeOptions = Object.keys(nodeTypes).map(function(type) {
        return '<option value="' + type + '"' + (node.type === type ? ' selected' : '') + '>' + nodeTypes[type].title + '</option>';
      }).join('');
      const edgeSource = findNode(edgeSourceId);
      inspectorBody.innerHTML =
        '<div class="field"><label for="node-id">Node key</label><input id="node-id" value="' + escapeHtml(node.id) + '" readonly /></div>' +
        '<div class="field"><label for="node-type">Type</label><select id="node-type">' + typeOptions + '</select></div>' +
        '<div class="field"><label for="node-label">Label</label><input id="node-label" value="' + escapeHtml(node.label) + '" /></div>' +
        '<div class="field"><label for="node-description">Intent</label><textarea id="node-description">' + escapeHtml(node.description || '') + '</textarea></div>' +
        '<div class="panel">' +
          '<h3>Connectors</h3>' +
          '<p class="small muted">Incoming: ' + incoming.length + ' | Outgoing: ' + outgoing.length + '</p>' +
          '<div class="button-row">' +
            '<button id="set-edge-source">' + (edgeSourceId === node.id ? 'Source Armed' : 'Set Source') + '</button>' +
            '<button id="connect-selected" ' + (!edgeSourceId || edgeSourceId === node.id ? 'disabled' : '') + '>Connect Source</button>' +
            '<button id="delete-node" class="danger">Delete Node</button>' +
          '</div>' +
          '<p class="small muted">' + (edgeSource ? 'Source: ' + escapeHtml(edgeSource.label) : 'Source: none') + '</p>' +
        '</div>' +
        '<div class="panel">' +
          '<h3>Edges</h3>' +
          renderEdgeList(node, incoming, outgoing) +
        '</div>';

      document.getElementById('node-type').addEventListener('change', function(event) {
        node.type = event.target.value;
        outputMode = 'canvas export';
        setStatus('Node type updated.');
        render();
      });
      document.getElementById('node-label').addEventListener('change', function(event) {
        node.label = event.target.value;
        outputMode = 'canvas export';
        render();
      });
      document.getElementById('node-description').addEventListener('change', function(event) {
        node.description = event.target.value;
        outputMode = 'canvas export';
        render();
      });
      document.getElementById('set-edge-source').addEventListener('click', function() {
        edgeSourceId = edgeSourceId === node.id ? null : node.id;
        outputMode = 'canvas export';
        setStatus(edgeSourceId ? 'Select a target node to create an edge.' : 'Edge source cleared.');
        render();
      });
      document.getElementById('connect-selected').addEventListener('click', function() {
        createEdge(edgeSourceId, node.id);
      });
      document.getElementById('delete-node').addEventListener('click', function() {
        deleteNode(node.id);
      });
      inspectorBody.querySelectorAll('[data-delete-edge]').forEach(function(button) {
        button.addEventListener('click', function() {
          deleteEdge(button.dataset.deleteEdge);
        });
      });
    }

    function renderEdgeList(node, incoming, outgoing) {
      const rows = [];
      incoming.forEach(function(edge) {
        const source = findNode(edge.source);
        rows.push('<div class="issue"><strong>In</strong> ' + escapeHtml(source ? source.label : edge.source) + ' -> ' + escapeHtml(node.label) + '<div class="button-row" style="margin-top: 6px;"><button data-delete-edge="' + escapeHtml(edge.id) + '" class="danger">Remove</button></div></div>');
      });
      outgoing.forEach(function(edge) {
        const target = findNode(edge.target);
        rows.push('<div class="issue"><strong>Out</strong> ' + escapeHtml(node.label) + ' -> ' + escapeHtml(target ? target.label : edge.target) + '<div class="button-row" style="margin-top: 6px;"><button data-delete-edge="' + escapeHtml(edge.id) + '" class="danger">Remove</button></div></div>');
      });
      return rows.length ? rows.join('') : '<p class="small muted tight">No edges attached.</p>';
    }

    function renderValidation() {
      const validation = lastValidation || validateDraft();
      validationSummary.innerHTML =
        '<div class="metric"><strong>' + validation.errors.length + '</strong><span>errors</span></div>' +
        '<div class="metric"><strong>' + validation.warnings.length + '</strong><span>warnings</span></div>' +
        '<div class="metric"><strong>' + state.edges.length + '</strong><span>edges</span></div>';
      const rows = [];
      validation.errors.forEach(function(issue) { rows.push(renderIssue(issue)); });
      validation.warnings.forEach(function(issue) { rows.push(renderIssue(issue)); });
      if (!rows.length) {
        rows.push('<div class="issue ok"><strong>Valid draft</strong><br />All required connectors are present.</div>');
      }
      validationList.innerHTML = rows.join('');
    }

    function renderIssue(issue) {
      return '<div class="issue ' + issue.severity + '"><strong>' + escapeHtml(issue.title) + '</strong><br />' + escapeHtml(issue.detail) + '</div>';
    }

    function createEdge(sourceId, targetId) {
      const source = findNode(sourceId);
      const target = findNode(targetId);
      if (!source || !target) {
        setStatus('Cannot create edge because one selected node is missing.');
        return;
      }
      if (sourceId === targetId) {
        setStatus('Self edges are blocked by draft validation.');
        return;
      }
      const duplicate = state.edges.some(function(edge) {
        return edge.source === sourceId && edge.target === targetId;
      });
      if (duplicate) {
        edgeSourceId = null;
        setStatus('That connector already exists.');
        render();
        return;
      }
      const sourceType = nodeTypes[source.type];
      const label = sourceType && sourceType.next.indexOf(target.type) !== -1 ? source.type + ' to ' + target.type : 'review connector';
      state.edges.push({
        id: 'edge-' + slugify(source.label) + '-' + slugify(target.label) + '-' + (state.edges.length + 1),
        source: sourceId,
        target: targetId,
        label: label
      });
      selectedNodeId = targetId;
      edgeSourceId = null;
      outputMode = 'canvas export';
      setStatus('Connector created: ' + source.label + ' -> ' + target.label + '.');
      render();
    }

    function deleteNode(nodeId) {
      const node = findNode(nodeId);
      state.nodes = state.nodes.filter(function(item) { return item.id !== nodeId; });
      state.edges = state.edges.filter(function(edge) { return edge.source !== nodeId && edge.target !== nodeId; });
      if (edgeSourceId === nodeId) {
        edgeSourceId = null;
      }
      selectedNodeId = state.nodes.length ? state.nodes[0].id : null;
      outputMode = 'canvas export';
      setStatus(node ? 'Deleted ' + node.label + ' and attached edges.' : 'Node deleted.');
      render();
    }

    function deleteEdge(edgeId) {
      state.edges = state.edges.filter(function(edge) { return edge.id !== edgeId; });
      outputMode = 'canvas export';
      setStatus('Connector removed. Validation updated.');
      render();
    }

    function validateDraft() {
      const errors = [];
      const warnings = [];
      const ids = new Set();
      const incoming = {};
      const outgoing = {};

      state.nodes.forEach(function(node) {
        if (!node.id || ids.has(node.id)) {
          errors.push(issue('error', 'Invalid node id', 'Each node needs a unique id.', node.id));
        }
        ids.add(node.id);
        incoming[node.id] = 0;
        outgoing[node.id] = 0;
        if (!nodeTypes[node.type]) {
          errors.push(issue('error', 'Invalid node type', (node.label || node.id) + ' uses unsupported type ' + node.type + '.', node.id));
        }
        if (!node.label || !node.label.trim()) {
          errors.push(issue('error', 'Missing node label', node.id + ' needs an operator-readable label.', node.id));
        }
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
          errors.push(issue('error', 'Invalid node position', (node.label || node.id) + ' is missing canvas coordinates.', node.id));
        }
      });

      state.edges.forEach(function(edge) {
        const source = findNode(edge.source);
        const target = findNode(edge.target);
        if (!source || !target) {
          errors.push(issue('error', 'Invalid connector', edge.id + ' references a missing source or target.', edge.source || edge.target));
          return;
        }
        if (source.id === target.id) {
          errors.push(issue('error', 'Invalid connector', edge.id + ' connects a node to itself.', source.id));
        }
        incoming[target.id] = (incoming[target.id] || 0) + 1;
        outgoing[source.id] = (outgoing[source.id] || 0) + 1;
        const sourceType = nodeTypes[source.type];
        if (!sourceType || sourceType.next.indexOf(target.type) === -1) {
          errors.push(issue('error', 'Invalid connector order', source.label + ' cannot connect directly to ' + target.label + '.', source.id));
        }
      });

      state.nodes.forEach(function(node) {
        const type = nodeTypes[node.type];
        if (!type) {
          return;
        }
        if (type.requiresIncoming && !incoming[node.id]) {
          errors.push(issue('error', 'Missing incoming connector', node.label + ' needs an upstream connector.', node.id));
        }
        if (type.requiresOutgoing && !outgoing[node.id]) {
          errors.push(issue('error', 'Missing outgoing connector', node.label + ' needs a downstream connector.', node.id));
        }
        if (!incoming[node.id] && !outgoing[node.id]) {
          errors.push(issue('error', 'Disconnected node', node.label + ' is isolated from the process graph.', node.id));
        }
      });

      const reachable = reachableFromEvents();
      state.nodes.forEach(function(node) {
        if (state.nodes.length > 1 && !reachable.has(node.id)) {
          warnings.push(issue('warning', 'Not reachable from event', node.label + ' is not on a path from an event node.', node.id));
        }
      });

      return { errors: errors, warnings: warnings };
    }

    function reachableFromEvents() {
      const reachable = new Set();
      const queue = state.nodes.filter(function(node) { return node.type === 'event'; }).map(function(node) { return node.id; });
      while (queue.length) {
        const nodeId = queue.shift();
        if (reachable.has(nodeId)) {
          continue;
        }
        reachable.add(nodeId);
        state.edges.filter(function(edge) { return edge.source === nodeId; }).forEach(function(edge) {
          if (!reachable.has(edge.target)) {
            queue.push(edge.target);
          }
        });
      }
      return reachable;
    }

    function getNodeIssueCounts(validation) {
      const counts = {};
      function add(issue) {
        if (!issue.nodeId) {
          return;
        }
        if (!counts[issue.nodeId]) {
          counts[issue.nodeId] = { errors: 0, warnings: 0 };
        }
        if (issue.severity === 'error') {
          counts[issue.nodeId].errors += 1;
        } else {
          counts[issue.nodeId].warnings += 1;
        }
      }
      validation.errors.forEach(add);
      validation.warnings.forEach(add);
      return counts;
    }

    function createExportPayload() {
      return {
        schemaVersion: state.schemaVersion,
        processId: state.processId,
        processVersion: state.processVersion,
        updatedAt: new Date().toISOString(),
        nodes: state.nodes.map(function(node) {
          return {
            id: node.id,
            type: node.type,
            label: node.label,
            description: node.description,
            x: node.x,
            y: node.y,
            config: node.config || {}
          };
        }),
        edges: state.edges.map(function(edge) {
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label
          };
        }),
        validation: {
          errors: lastValidation ? lastValidation.errors.length : 0,
          warnings: lastValidation ? lastValidation.warnings.length : 0
        }
      };
    }

    function anchor(node, side) {
      if (side === 'right') {
        return { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 };
      }
      if (side === 'bottom') {
        return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT };
      }
      if (side === 'top') {
        return { x: node.x + NODE_WIDTH / 2, y: node.y };
      }
      return { x: node.x, y: node.y + NODE_HEIGHT / 2 };
    }

    function issue(severity, title, detail, nodeId) {
      return { severity: severity, title: title, detail: detail, nodeId: nodeId || null };
    }

    function findNode(nodeId) {
      return state.nodes.find(function(node) { return node.id === nodeId; }) || null;
    }

    function setStatus(message) {
      statusLine.textContent = message;
    }

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function slugify(value) {
      return String(value || 'node').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'node';
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    render();
  </script>
</body>
</html>`;
}
