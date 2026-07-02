export function renderProcessEditor(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BPCP Process Editor</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f5f7fb; color: #111827; }
    .shell { display: grid; grid-template-columns: 280px 1fr 340px; min-height: 100vh; }
    aside, .inspector { background: #fff; border-right: 1px solid #d9dee8; padding: 18px; }
    .inspector { border-right: 0; border-left: 1px solid #d9dee8; }
    h1 { font-size: 18px; margin: 0 0 14px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #556070; margin: 18px 0 10px; }
    .node-template, .node { border: 1px solid #bac4d3; background: #fff; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; cursor: grab; box-shadow: 0 1px 2px rgba(15, 23, 42, .08); }
    .node-template strong, .node strong { display: block; font-size: 13px; }
    .node-template span, .node span { color: #5f6b7a; font-size: 12px; }
    main { position: relative; overflow: hidden; background-image: linear-gradient(#e7ebf2 1px, transparent 1px), linear-gradient(90deg, #e7ebf2 1px, transparent 1px); background-size: 24px 24px; }
    .toolbar { position: absolute; left: 16px; top: 16px; right: 16px; height: 48px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,.92); border: 1px solid #d9dee8; border-radius: 8px; padding: 0 12px; z-index: 3; }
    .canvas { position: absolute; inset: 80px 16px 16px; border: 1px solid #d2d9e5; border-radius: 8px; background: rgba(255,255,255,.58); }
    .node { position: absolute; min-width: 180px; cursor: pointer; }
    .event { border-color: #2563eb; }
    .condition { border-color: #0891b2; }
    .policy { border-color: #7c3aed; }
    .action { border-color: #059669; }
    .slot { border-color: #c2410c; }
    button { border: 1px solid #adb8c8; background: #fff; border-radius: 6px; padding: 8px 10px; cursor: pointer; }
    button.primary { background: #1f2937; color: #fff; border-color: #1f2937; }
    pre { white-space: pre-wrap; background: #101827; color: #e5e7eb; padding: 12px; border-radius: 8px; font-size: 12px; max-height: 320px; overflow: auto; }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <h1>BPCP Editor</h1>
      <p>Drag blocks to the canvas. This skeleton saves a visual draft model only.</p>
      <h2>Events</h2>
      <div class="node-template event" draggable="true" data-type="event" data-label="CartUpdated"><strong>CartUpdated</strong><span>checkout trigger</span></div>
      <div class="node-template event" draggable="true" data-type="event" data-label="OrderPaid"><strong>OrderPaid</strong><span>post-purchase trigger</span></div>
      <h2>Logic</h2>
      <div class="node-template condition" draggable="true" data-type="condition" data-label="Category In"><strong>Category In</strong><span>catalog facts</span></div>
      <div class="node-template policy" draggable="true" data-type="policy" data-label="10% Discount"><strong>10% Discount</strong><span>exclusive policy</span></div>
      <h2>Actions</h2>
      <div class="node-template action" draggable="true" data-type="action" data-label="Evaluate Discount"><strong>Evaluate Discount</strong><span>pricing authority</span></div>
      <div class="node-template slot" draggable="true" data-type="slot" data-label="Upsell Slot"><strong>Upsell Slot</strong><span>frontend experience</span></div>
    </aside>
    <main>
      <div class="toolbar">
        <strong>holiday-discount-2026 draft</strong>
        <div>
          <button id="simulate">Simulate</button>
          <button class="primary" id="export">Export Draft</button>
        </div>
      </div>
      <div id="canvas" class="canvas" aria-label="Process canvas"></div>
    </main>
    <section class="inspector">
      <h1>Inspector</h1>
      <p id="selection">Select a node to inspect it.</p>
      <h2>Draft JSON</h2>
      <pre id="draft">{ "nodes": [], "edges": [] }</pre>
    </section>
  </div>
  <script>
    const canvas = document.getElementById('canvas');
    const draft = document.getElementById('draft');
    const selection = document.getElementById('selection');
    const nodes = [];

    document.querySelectorAll('.node-template').forEach((item) => {
      item.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/json', JSON.stringify({
          type: item.dataset.type,
          label: item.dataset.label
        }));
      });
    });

    canvas.addEventListener('dragover', (event) => event.preventDefault());
    canvas.addEventListener('drop', (event) => {
      event.preventDefault();
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      const rect = canvas.getBoundingClientRect();
      const node = {
        id: data.type + '-' + (nodes.length + 1),
        type: data.type,
        label: data.label,
        x: Math.round(event.clientX - rect.left),
        y: Math.round(event.clientY - rect.top)
      };
      nodes.push(node);
      renderNode(node);
      renderDraft();
    });

    function renderNode(node) {
      const el = document.createElement('div');
      el.className = 'node ' + node.type;
      el.style.left = node.x + 'px';
      el.style.top = node.y + 'px';
      el.innerHTML = '<strong>' + node.label + '</strong><span>' + node.type + '</span>';
      el.addEventListener('click', () => {
        selection.textContent = node.id + ' | ' + node.type + ' | ' + node.label;
      });
      canvas.appendChild(el);
    }

    function renderDraft() {
      draft.textContent = JSON.stringify({
        schemaVersion: 'bpcp.canvas.v1',
        processId: 'holiday-discount-2026',
        nodes,
        edges: []
      }, null, 2);
    }

    document.getElementById('export').addEventListener('click', renderDraft);
    document.getElementById('simulate').addEventListener('click', async () => {
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
      draft.textContent = JSON.stringify(await response.json(), null, 2);
    });
  </script>
</body>
</html>`;
}
