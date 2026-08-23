# BPCP Workflow Executor — Design

**Date:** 2026-08-22
**Status:** Approved for planning
**Repo:** `business-process-control-plane` (port 3375)
**Consumer:** `cv-tuning` (port 3379) — first real consumer
**Related spec:** `cv-tuning/docs/specs/2026-08-22-cv-tailoring-platform-design.md`

---

## 1. Why this exists

BPCP today is a **registry**, not an engine. It stores, versions, validates, and publishes
process/policy/workflow definitions, and emits `bpcp.process-event.v1` envelopes to a JSON
outbox. Nothing executes.

Verified against the repo on 2026-08-22:

| Claim | Evidence |
|---|---|
| No instance concept | `src/workflows/workflow.types.ts` defines only `WorkflowDefinition` / `WorkflowActionDefinition`. No instance, run, or execution type exists anywhere. |
| No wait states | `KNOWN_WORKFLOW_ACTION_TYPES` (`workflow.types.ts:9-16`) is six synchronous action types. None suspend. |
| No executor, and simulation is not reusable | `src/simulation/simulation.service.ts` is hardcoded Holiday-Discount fixture math. It computes `subtotal * HOLIDAY_DISCOUNT_PROCESS.discountPercent / 100` inline and never walks `actions[]` or resolves `dependsOn`. Its own warning string admits `'[MISSING: production policy registry; Holiday Discount fixture is embedded in simulation lane]'`. |
| Runtime store unfit for live state | `src/storage/json-file-store.service.ts` is 42 lines of `readFileSync`/`writeFileSync` with tmp+rename. **No locking, no transactions, no concurrency control.** Two concurrent signal deliveries to one instance lose an update. Whole-file rewrite per mutation. |

So this is not "extend the executor". The DAG walker, the instance layer, and the durable
store must all be written. That is the accepted cost of building a reusable ecosystem asset.

**The owner chose to build this first, as its own project, before the CV app.**

## 2. Scope

### In scope (v1)

Three new concepts, deliberately minimal:

1. **`WorkflowInstance`** — a durable row representing one live execution.
2. **`wait-for-signal` action type** — the one genuinely new primitive. Execution halts, the
   instance persists, and resumes when a signal arrives.
3. **Postgres runtime store** — resolves BPCP's own open "final persistence decision".
   Non-negotiable: JSON-on-PVC cannot hold live business state.

Plus the DAG walker that executes `actions[]` honouring `dependsOn`.

### Explicitly out of scope (YAGNI)

Parallel branch/join semantics beyond `dependsOn` fan-out, compensation/saga, cron timers,
sub-workflows, retry policies beyond bounded retry, and a human-task inbox UI. Add only when
a second consumer demands it.

### Non-regression constraint

~2,400 lines of existing BPCP code must not regress. `npm test` chains eight `verify:*`
scripts (`package.json`); all must keep passing. The JSON store stays for **definitions**;
only **runtime instance state** moves to Postgres.

## 3. Design

### 3.1 Instance model

```
bpcp_workflow_instance
  instance_id        uuid pk
  workflow_id        text
  workflow_version   int
  correlation_key    text          -- consumer's own id, e.g. cv_application.id
  status             text          -- running | waiting | completed | failed | cancelled
  current_state      text          -- consumer-meaningful state label
  context            jsonb         -- accumulated action outputs
  last_error         jsonb         -- null unless status=failed; never silently empty
  created_at, updated_at timestamptz
  UNIQUE (workflow_id, correlation_key)   -- idempotent instance creation

bpcp_instance_step
  step_id        uuid pk
  instance_id    uuid fk
  action_id      text
  status         text        -- pending | running | succeeded | failed | skipped
  attempts       int
  input, output  jsonb
  error          jsonb
  started_at, finished_at timestamptz

bpcp_instance_signal
  signal_id      uuid pk
  instance_id    uuid fk
  action_id      text        -- which wait-for-signal action this satisfies
  name           text
  payload        jsonb
  received_at    timestamptz
  consumed_at    timestamptz  -- null until the walker acts on it
```

`UNIQUE (workflow_id, correlation_key)` makes instance creation idempotent — a retried
consumer call returns the existing instance rather than forking a duplicate.

### 3.2 Concurrency

The lost-update flaw in the JSON store is the reason for Postgres. Every state transition
runs inside a transaction with `SELECT ... FOR UPDATE` on the instance row. Two signals
arriving simultaneously serialize; neither is lost. Signal consumption is
`UPDATE ... WHERE consumed_at IS NULL` so replay is safe.

### 3.3 The `wait-for-signal` primitive

```ts
{
  actionId: 'await-human-approval',
  type: 'wait-for-signal',
  dependsOn: ['generate-cv'],
  serviceCapabilityRefs: [],
  parameters: {
    signalName: 'approval',
    timeoutMs: 604800000,          // 7 days
    onTimeout: 'fail'              // fail | continue
  }
}
```

On reaching it the walker sets `status='waiting'`, records which `action_id` is blocking,
and returns. It does nothing further until `POST /api/instances/:id/signals` arrives.

**Timeouts are polled, not scheduled.** A single periodic sweep (`@Cron`) finds waiting
instances past their deadline and applies `onTimeout`. No timer infrastructure, no
per-instance jobs. Note the ecosystem's known NestJS `@Cron` constraint on Node v22+/v24 —
`reflect-metadata` monkey-patch in `main.ts` is required (see ecosystem memory).

### 3.4 Executor loop

```
advance(instance):
  BEGIN; SELECT instance FOR UPDATE
  ready = actions whose dependsOn are all succeeded, status=pending
  for each ready action:
    if type == 'wait-for-signal':
       if unconsumed matching signal exists -> consume, mark succeeded
       else -> status='waiting'; break
    else:
       execute via capability dispatcher (bounded retry)
       on permanent failure -> instance status='failed', last_error populated, emit event
  if all actions succeeded -> status='completed'
  COMMIT; emit bpcp.process-event envelopes
```

Triggered by: instance creation, signal arrival, and the timeout sweep. No background
polling of running instances — every advance has a cause.

### 3.5 Failure semantics (no silent failures)

Per the ecosystem's mandatory rule:

- A failed action **populates `last_error` with full context** (action_id, capability ref,
  status, body) and sets `status='failed'`. It never leaves the instance in `running`.
- Distinguish "no instance" (404) from "lookup failed" (500). An empty result never stands
  in for an error.
- Every phase boundary logs to `logging-microservice` (3367) with timing.
- Bounded retry applies only to transient failures (timeout, 429, 5xx). A 4xx, a schema
  violation, or an auth error fails on the first attempt.

### 3.6 API surface (additive)

```
POST   /api/instances                       create (idempotent on correlation_key)
GET    /api/instances/:id                   full state + steps
GET    /api/instances?correlationKey=&status=   list
POST   /api/instances/:id/signals           deliver a signal, triggers advance
POST   /api/instances/:id/cancel            operator cancel
GET    /api/instances/:id/audit             step history
```

All existing endpoints unchanged.

### 3.7 Event emission

Extend `ProcessEventType` with `instance.started`, `instance.waiting`, `instance.resumed`,
`instance.completed`, `instance.failed`. Reuse the existing outbox and RabbitMQ topic
adapter — routing keys follow the established `bpcp.instance.<type>.v1` shape. Consumers get
audit for free.

## 4. Testing

Follow the house pattern: a `verify:instances` script joins the existing eight in
`npm test`. Coverage must include:

- Concurrent signal delivery to one instance → no lost update (the flaw motivating Postgres)
- Idempotent creation: same `correlation_key` twice → one instance
- `wait-for-signal` halts, persists across a process restart, resumes on signal
- Timeout sweep applies `onTimeout`
- Permanent vs transient failure classification
- All eight existing `verify:*` scripts still pass

Per the ecosystem verification rule: confirm each test *fails* when the behaviour is broken
before trusting a pass.

## 5. Migration and deployment

- Postgres via the ecosystem's per-app role pattern; **never `prisma migrate dev` against
  production**. Generate offline, apply to a scratch DB from a schema-only dump first.
- New Vault keys at `secret/prod/business-process-control-plane` **must be named in
  `k8s/external-secret.yaml`** or they never reach pods while ESO still reports Synced.
- BPCP is not deny-listed, so committing to `main` auto-deploys it.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Executor scope creeps into a general workflow engine | The out-of-scope list in §2 is binding. A second consumer is required before adding primitives. |
| Delays the CV app | Accepted by the owner. §2 keeps v1 minimal to bound it. |
| Regressing 2,400 lines of registry code | Eight `verify:*` scripts gate every commit; runtime state is additive, definitions keep the JSON store. |
| `@Cron` silently not firing on Node v22+/v24 | Known ecosystem trap; apply the `reflect-metadata` monkey-patch and assert the sweep runs in a test. |
