# BPCP Workflow Executor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give BPCP the ability to execute a published workflow as a durable, resumable instance that can pause for days awaiting a human signal.

**Architecture:** Three new concepts on top of the existing registry: a `WorkflowInstance` row in Postgres, a `wait-for-signal` action type that halts execution, and a DAG walker that advances an instance whenever something happens to it (creation, signal arrival, timeout sweep). Definitions keep the existing JSON store; only runtime state goes to Postgres, because the JSON store has no locking and loses concurrent updates.

**Tech Stack:** NestJS 10, TypeORM 0.3.17, pg 8.11.3, Jest 29 (ts-jest), Node 20+.

**Spec:** `docs/specs/2026-08-22-bpcp-workflow-executor-design.md`

## Global Constraints

- **Port:** 3375. Unchanged.
- **Dependency versions must match the ecosystem house standard exactly:** `@nestjs/typeorm ^10.0.0`, `typeorm ^0.3.17`, `pg ^8.11.3` (as used in `catalog-microservice`, `invoices-microservice`, `payments-microservice`).
- **Never regress the registry.** `npm test` chains eight `verify:*` scripts. All must keep passing after every task.
- **The JSON store stays for definitions.** Only `bpcp_workflow_instance`, `bpcp_instance_step`, and `bpcp_instance_signal` move to Postgres.
- **No silent failures** (mandatory, ecosystem-wide): every catch either re-throws or logs at error level with full context (function, URL, params, status, body). An empty result must never stand in for a failure — "no instance" (404) and "lookup failed" (500) must be distinguishable. Never leave an instance in `running` after a failure.
- **Never `prisma migrate dev` / TypeORM `synchronize: true` against production.** `synchronize` must be `false` everywhere. Migrations are generated offline and applied to a scratch DB first.
- **New Vault keys must be named in `k8s/external-secret.yaml`** or they never reach pods while ESO still reports `Synced`.
- **`@Cron` on Node v22+/v24 requires the `reflect-metadata` monkey-patch in `main.ts`** or the job silently never fires.
- **Prefix shell commands with `rtk`.** Use `rg` (a GNU grep shim — use `-E`, or patterns silently fail).
- **Never `npx tsc`** — use `./node_modules/.bin/tsc` or `npm run build`.
- BPCP is **not** deny-listed, so a commit to `main` touching non-doc files auto-deploys it.

## File Structure

**Create:**
- `src/instances/instance.types.ts` — instance/step/signal domain types and status unions
- `src/instances/entities/workflow-instance.entity.ts` — TypeORM entity
- `src/instances/entities/instance-step.entity.ts` — TypeORM entity
- `src/instances/entities/instance-signal.entity.ts` — TypeORM entity
- `src/instances/instance-repository.service.ts` — all DB access, transaction + row-lock boundary
- `src/instances/action-dispatcher.service.ts` — executes one non-wait action; classifies failures
- `src/instances/workflow-executor.service.ts` — the DAG walker (`advance`)
- `src/instances/instance-timeout.service.ts` — `@Cron` sweep for expired waits
- `src/instances/instance.controller.ts` — HTTP surface
- `src/instances/instances.module.ts` — module wiring
- `src/instances/dto/create-instance.dto.ts`, `src/instances/dto/deliver-signal.dto.ts`
- `src/database/database.module.ts` — TypeORM root config
- `src/database/migrations/1756000000000-CreateInstanceTables.ts`
- `scripts/verify-instances.js` — structural verify, joins the existing eight
- Specs: `*.spec.ts` beside each service

**Modify:**
- `src/workflows/workflow.types.ts` — add `wait-for-signal` to `KNOWN_WORKFLOW_ACTION_TYPES`
- `src/events/process-event.types.ts` — add the five `instance.*` event types
- `src/app.module.ts` — import `DatabaseModule`, `InstancesModule`
- `src/main.ts` — `reflect-metadata` monkey-patch for `@Cron`
- `package.json` — deps, `verify:instances`, and a real `jest` run in `test`
- `k8s/configmap.yaml`, `k8s/external-secret.yaml`, `.env.example` — DB config

Boundaries: the repository owns transactions and locking, the dispatcher owns "run one action", the executor owns "what runs next". Splitting these keeps the concurrency logic in one small file that can be reasoned about and tested on its own.

---

### Task 1: Database module and instance tables

**Files:**
- Create: `src/database/database.module.ts`
- Create: `src/database/migrations/1756000000000-CreateInstanceTables.ts`
- Create: `src/instances/entities/workflow-instance.entity.ts`
- Create: `src/instances/entities/instance-step.entity.ts`
- Create: `src/instances/entities/instance-signal.entity.ts`
- Create: `src/instances/instance.types.ts`
- Modify: `package.json`, `src/app.module.ts`, `.env.example`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `WorkflowInstanceEntity`, `InstanceStepEntity`, `InstanceSignalEntity`; type unions `InstanceStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'`, `StepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'`; `DatabaseModule`

- [ ] **Step 1: Install dependencies**

```bash
cd /home/ssf/Documents/Github/business-process-control-plane
npm install --save @nestjs/typeorm@^10.0.0 typeorm@^0.3.17 pg@^8.11.3 @nestjs/schedule@^4.0.0
```

- [ ] **Step 2: Write the domain types**

Create `src/instances/instance.types.ts`:

```ts
export type InstanceStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

/** Populated whenever an instance or step fails. Never left empty on failure. */
export interface InstanceError {
  actionId?: string;
  code: string;
  message: string;
  /** Transient failures are retried up to maxAttempts; permanent ones fail immediately. */
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
```

- [ ] **Step 3: Write the entities**

Create `src/instances/entities/workflow-instance.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { InstanceError, InstanceStatus, WaitDescriptor } from '../instance.types';

@Entity('bpcp_workflow_instance')
@Unique('uq_instance_workflow_correlation', ['workflowId', 'correlationKey'])
export class WorkflowInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  instanceId!: string;

  @Column({ type: 'text' })
  workflowId!: string;

  @Column({ type: 'int' })
  workflowVersion!: number;

  @Index('idx_instance_correlation')
  @Column({ type: 'text' })
  correlationKey!: string;

  @Index('idx_instance_status')
  @Column({ type: 'text' })
  status!: InstanceStatus;

  @Column({ type: 'text', nullable: true })
  currentState!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  context!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  wait!: WaitDescriptor | null;

  @Column({ type: 'jsonb', nullable: true })
  lastError!: InstanceError | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
```

Create `src/instances/entities/instance-step.entity.ts`:

```ts
import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { InstanceError, StepStatus } from '../instance.types';

@Entity('bpcp_instance_step')
@Unique('uq_step_instance_action', ['instanceId', 'actionId'])
export class InstanceStepEntity {
  @PrimaryGeneratedColumn('uuid')
  stepId!: string;

  @Index('idx_step_instance')
  @Column({ type: 'uuid' })
  instanceId!: string;

  @Column({ type: 'text' })
  actionId!: string;

  @Column({ type: 'text' })
  status!: StepStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'jsonb', nullable: true })
  output!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  error!: InstanceError | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;
}
```

Create `src/instances/entities/instance-signal.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bpcp_instance_signal')
export class InstanceSignalEntity {
  @PrimaryGeneratedColumn('uuid')
  signalId!: string;

  @Index('idx_signal_instance')
  @Column({ type: 'uuid' })
  instanceId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt!: Date;

  /** NULL until the walker acts on it. Makes consumption idempotent. */
  @Column({ type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;
}
```

- [ ] **Step 4: Write the migration**

Create `src/database/migrations/1756000000000-CreateInstanceTables.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstanceTables1756000000000 implements MigrationInterface {
  name = 'CreateInstanceTables1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "bpcp_workflow_instance" (
        "instanceId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workflowId" text NOT NULL,
        "workflowVersion" int NOT NULL,
        "correlationKey" text NOT NULL,
        "status" text NOT NULL,
        "currentState" text,
        "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "wait" jsonb,
        "lastError" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_instance_workflow_correlation" UNIQUE ("workflowId", "correlationKey")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_instance_correlation" ON "bpcp_workflow_instance" ("correlationKey")`);
    await queryRunner.query(`CREATE INDEX "idx_instance_status" ON "bpcp_workflow_instance" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "bpcp_instance_step" (
        "stepId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "instanceId" uuid NOT NULL REFERENCES "bpcp_workflow_instance"("instanceId") ON DELETE CASCADE,
        "actionId" text NOT NULL,
        "status" text NOT NULL,
        "attempts" int NOT NULL DEFAULT 0,
        "output" jsonb,
        "error" jsonb,
        "startedAt" timestamptz,
        "finishedAt" timestamptz,
        CONSTRAINT "uq_step_instance_action" UNIQUE ("instanceId", "actionId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_step_instance" ON "bpcp_instance_step" ("instanceId")`);

    await queryRunner.query(`
      CREATE TABLE "bpcp_instance_signal" (
        "signalId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "instanceId" uuid NOT NULL REFERENCES "bpcp_workflow_instance"("instanceId") ON DELETE CASCADE,
        "name" text NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "receivedAt" timestamptz NOT NULL DEFAULT now(),
        "consumedAt" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_signal_instance" ON "bpcp_instance_signal" ("instanceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bpcp_instance_signal"`);
    await queryRunner.query(`DROP TABLE "bpcp_instance_step"`);
    await queryRunner.query(`DROP TABLE "bpcp_workflow_instance"`);
  }
}
```

- [ ] **Step 5: Write the database module**

Create `src/database/database.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstanceSignalEntity } from '../instances/entities/instance-signal.entity';
import { InstanceStepEntity } from '../instances/entities/instance-step.entity';
import { WorkflowInstanceEntity } from '../instances/entities/workflow-instance.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('BPCP_DATABASE_URL');
        if (!url) {
          // Fail fast and loudly: a missing DSN must never degrade to an in-memory store.
          throw new Error('BPCP_DATABASE_URL is not set; refusing to start without a runtime store');
        }
        return {
          type: 'postgres' as const,
          url,
          entities: [WorkflowInstanceEntity, InstanceStepEntity, InstanceSignalEntity],
          migrations: [`${__dirname}/migrations/*.js`],
          migrationsRun: true,
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
```

- [ ] **Step 6: Wire into app.module.ts**

In `src/app.module.ts`, add the import and list `DatabaseModule` first in `imports` (after `ConfigModule.forRoot`):

```ts
import { DatabaseModule } from './database/database.module';
```

- [ ] **Step 7: Document the new env var**

Append to `.env.example`:

```bash
# Runtime store for workflow instances. Required — the service refuses to start without it.
BPCP_DATABASE_URL=postgresql://bpcp:CHANGEME@localhost:5432/bpcp
```

- [ ] **Step 8: Verify the build and that the registry did not regress**

```bash
npm run build
npm test
```

Expected: build succeeds; all eight `verify:*` scripts still pass.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/database src/instances .env.example src/app.module.ts
git commit -m "feat: add Postgres runtime store for workflow instances"
```

---

### Task 2: Instance repository with row locking

The JSON store loses concurrent updates. This task is where that is fixed, so its tests are the most important in the plan.

**Files:**
- Create: `src/instances/instance-repository.service.ts`
- Create: `src/instances/instance-repository.service.spec.ts`

**Interfaces:**
- Consumes: entities and types from Task 1
- Produces: `InstanceRepositoryService` with
  `createIfAbsent(input: CreateInstanceInput): Promise<{ instance: WorkflowInstanceEntity; created: boolean }>`,
  `findById(id: string): Promise<WorkflowInstanceEntity | null>`,
  `findByCorrelation(workflowId: string, correlationKey: string): Promise<WorkflowInstanceEntity | null>`,
  `list(filter: { correlationKey?: string; status?: InstanceStatus }): Promise<WorkflowInstanceEntity[]>`,
  `recordSignal(instanceId: string, name: string, payload: Record<string, unknown>): Promise<InstanceSignalEntity>`,
  `withLockedInstance<T>(instanceId: string, fn: (instance, manager) => Promise<T>): Promise<T>`,
  `findExpiredWaits(now: Date): Promise<WorkflowInstanceEntity[]>`

- [ ] **Step 1: Write the failing tests**

Create `src/instances/instance-repository.service.spec.ts`. These are integration tests against a real Postgres — the lost-update bug is invisible against a mock.

```ts
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InstanceRepositoryService } from './instance-repository.service';
import { InstanceSignalEntity } from './entities/instance-signal.entity';
import { InstanceStepEntity } from './entities/instance-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';

const TEST_DSN = process.env.BPCP_TEST_DATABASE_URL;
const describeDb = TEST_DSN ? describe : describe.skip;

describeDb('InstanceRepositoryService', () => {
  let service: InstanceRepositoryService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: TEST_DSN,
          entities: [WorkflowInstanceEntity, InstanceStepEntity, InstanceSignalEntity],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([WorkflowInstanceEntity, InstanceStepEntity, InstanceSignalEntity]),
      ],
      providers: [InstanceRepositoryService],
    }).compile();

    service = moduleRef.get(InstanceRepositoryService);
    dataSource = moduleRef.get(getDataSourceToken());
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE "bpcp_workflow_instance" CASCADE');
  });

  it('creates an instance', async () => {
    const { instance, created } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-1',
      actionIds: ['step-a'],
    });

    expect(created).toBe(true);
    expect(instance.status).toBe('running');
  });

  it('is idempotent on (workflowId, correlationKey)', async () => {
    const input = { workflowId: 'wf-a', workflowVersion: 1, correlationKey: 'app-1', actionIds: ['step-a'] };
    const first = await service.createIfAbsent(input);
    const second = await service.createIfAbsent(input);

    expect(second.created).toBe(false);
    expect(second.instance.instanceId).toBe(first.instance.instanceId);
  });

  it('does not lose updates when two writers race on one instance', async () => {
    const { instance } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-race',
      actionIds: ['step-a'],
    });

    // Both writers read, increment, and write. Without FOR UPDATE one increment is lost.
    const bump = () =>
      service.withLockedInstance(instance.instanceId, async (locked, manager) => {
        const current = (locked.context.counter as number | undefined) ?? 0;
        await new Promise((resolve) => setTimeout(resolve, 25));
        await manager.update(WorkflowInstanceEntity, { instanceId: locked.instanceId }, {
          context: { ...locked.context, counter: current + 1 },
        });
      });

    await Promise.all([bump(), bump()]);

    const after = await service.findById(instance.instanceId);
    expect(after?.context.counter).toBe(2);
  });

  it('distinguishes a missing instance from a failed lookup', async () => {
    const missing = await service.findById('00000000-0000-0000-0000-000000000000');
    expect(missing).toBeNull();
  });

  it('finds instances whose wait deadline has passed', async () => {
    const { instance } = await service.createIfAbsent({
      workflowId: 'wf-a',
      workflowVersion: 1,
      correlationKey: 'app-timeout',
      actionIds: ['step-a'],
    });

    await dataSource.query(
      `UPDATE "bpcp_workflow_instance" SET status = 'waiting', wait = $2 WHERE "instanceId" = $1`,
      [
        instance.instanceId,
        JSON.stringify({
          actionId: 'step-a',
          signalName: 'approval',
          waitingSince: new Date(Date.now() - 60_000).toISOString(),
          timeoutAt: new Date(Date.now() - 1_000).toISOString(),
          onTimeout: 'fail',
        }),
      ],
    );

    const expired = await service.findExpiredWaits(new Date());
    expect(expired.map((row) => row.instanceId)).toContain(instance.instanceId);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
export BPCP_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bpcp_test
docker run -d --name bpcp-test-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bpcp_test -p 5433:5432 postgres:16-alpine
./node_modules/.bin/jest src/instances/instance-repository.service.spec.ts
```

Expected: FAIL — `Cannot find module './instance-repository.service'`.

Note: `docker run` creates a container, so take the deploy lock first if any deploy may be in flight — `../shared/scripts/with-deploy-lock.sh --status`.

- [ ] **Step 3: Implement the repository**

Create `src/instances/instance-repository.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { InstanceSignalEntity } from './entities/instance-signal.entity';
import { InstanceStepEntity } from './entities/instance-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { InstanceStatus } from './instance.types';

export interface CreateInstanceInput {
  workflowId: string;
  workflowVersion: number;
  correlationKey: string;
  actionIds: string[];
  context?: Record<string, unknown>;
}

@Injectable()
export class InstanceRepositoryService {
  private readonly logger = new Logger(InstanceRepositoryService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createIfAbsent(input: CreateInstanceInput): Promise<{ instance: WorkflowInstanceEntity; created: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(WorkflowInstanceEntity, {
        where: { workflowId: input.workflowId, correlationKey: input.correlationKey },
      });
      if (existing) {
        return { instance: existing, created: false };
      }

      const instance = manager.create(WorkflowInstanceEntity, {
        workflowId: input.workflowId,
        workflowVersion: input.workflowVersion,
        correlationKey: input.correlationKey,
        status: 'running' as InstanceStatus,
        currentState: null,
        context: input.context ?? {},
        wait: null,
        lastError: null,
      });
      const saved = await manager.save(instance);

      await manager.insert(
        InstanceStepEntity,
        input.actionIds.map((actionId) => ({
          instanceId: saved.instanceId,
          actionId,
          status: 'pending' as const,
          attempts: 0,
        })),
      );

      return { instance: saved, created: true };
    });
  }

  async findById(instanceId: string): Promise<WorkflowInstanceEntity | null> {
    return this.dataSource.getRepository(WorkflowInstanceEntity).findOne({ where: { instanceId } });
  }

  async findByCorrelation(workflowId: string, correlationKey: string): Promise<WorkflowInstanceEntity | null> {
    return this.dataSource.getRepository(WorkflowInstanceEntity).findOne({ where: { workflowId, correlationKey } });
  }

  async list(filter: { correlationKey?: string; status?: InstanceStatus }): Promise<WorkflowInstanceEntity[]> {
    const where: Record<string, unknown> = {};
    if (filter.correlationKey) where.correlationKey = filter.correlationKey;
    if (filter.status) where.status = filter.status;
    return this.dataSource.getRepository(WorkflowInstanceEntity).find({ where, order: { createdAt: 'DESC' } });
  }

  async findSteps(instanceId: string): Promise<InstanceStepEntity[]> {
    return this.dataSource.getRepository(InstanceStepEntity).find({ where: { instanceId } });
  }

  async recordSignal(instanceId: string, name: string, payload: Record<string, unknown>): Promise<InstanceSignalEntity> {
    const repo = this.dataSource.getRepository(InstanceSignalEntity);
    return repo.save(repo.create({ instanceId, name, payload, consumedAt: null }));
  }

  /**
   * Runs `fn` with the instance row locked FOR UPDATE. Concurrent callers serialize
   * here; without this two signal deliveries can read the same context and one write
   * silently overwrites the other.
   */
  async withLockedInstance<T>(
    instanceId: string,
    fn: (instance: WorkflowInstanceEntity, manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const instance = await manager.findOne(WorkflowInstanceEntity, {
        where: { instanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instance) {
        // Distinct from a lookup failure: the caller gets a typed miss, not an empty success.
        throw new InstanceNotFoundError(instanceId);
      }
      return fn(instance, manager);
    });
  }

  /** Unconsumed signal matching a name, locked so two walkers cannot both consume it. */
  async claimSignal(manager: EntityManager, instanceId: string, name: string): Promise<InstanceSignalEntity | null> {
    const rows: InstanceSignalEntity[] = await manager.query(
      `UPDATE "bpcp_instance_signal"
          SET "consumedAt" = now()
        WHERE "signalId" = (
          SELECT "signalId" FROM "bpcp_instance_signal"
           WHERE "instanceId" = $1 AND "name" = $2 AND "consumedAt" IS NULL
           ORDER BY "receivedAt" ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
        )
        RETURNING *`,
      [instanceId, name],
    );
    return rows[0] ?? null;
  }

  async findExpiredWaits(now: Date): Promise<WorkflowInstanceEntity[]> {
    return this.dataSource.getRepository(WorkflowInstanceEntity).query(
      `SELECT * FROM "bpcp_workflow_instance"
        WHERE status = 'waiting'
          AND wait->>'timeoutAt' IS NOT NULL
          AND (wait->>'timeoutAt')::timestamptz <= $1`,
      [now.toISOString()],
    );
  }
}

export class InstanceNotFoundError extends Error {
  constructor(public readonly instanceId: string) {
    super(`workflow instance not found: ${instanceId}`);
    this.name = 'InstanceNotFoundError';
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
./node_modules/.bin/jest src/instances/instance-repository.service.spec.ts
```

Expected: PASS, all five.

- [ ] **Step 5: Confirm the race test actually catches the bug**

Temporarily change `lock: { mode: 'pessimistic_write' }` to `lock: undefined` and re-run. The race test MUST fail with `counter` equal to 1. Restore the lock afterwards. A green test that cannot go red is worthless.

- [ ] **Step 6: Commit**

```bash
git add src/instances/instance-repository.service.ts src/instances/instance-repository.service.spec.ts
git commit -m "feat: instance repository with row-level locking"
```

---

### Task 3: `wait-for-signal` action type

**Files:**
- Modify: `src/workflows/workflow.types.ts`
- Create: `src/workflows/workflow-wait-action.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `'wait-for-signal'` in `KNOWN_WORKFLOW_ACTION_TYPES`; `WaitForSignalParameters`; type guard `isWaitForSignalAction(action: WorkflowActionDefinition): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/workflows/workflow-wait-action.spec.ts`:

```ts
import { KNOWN_WORKFLOW_ACTION_TYPES, isWaitForSignalAction, readWaitParameters, WorkflowActionDefinition } from './workflow.types';

describe('wait-for-signal action', () => {
  it('is a known action type', () => {
    expect(KNOWN_WORKFLOW_ACTION_TYPES).toContain('wait-for-signal');
  });

  it('identifies a wait action', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'await-approval',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: { signalName: 'approval', timeoutMs: 604800000, onTimeout: 'fail' },
    };
    expect(isWaitForSignalAction(action)).toBe(true);
  });

  it('reads wait parameters with defaults', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'await-approval',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: { signalName: 'approval' },
    };
    expect(readWaitParameters(action)).toEqual({ signalName: 'approval', timeoutMs: null, onTimeout: 'fail' });
  });

  it('rejects a wait action with no signalName rather than defaulting one', () => {
    const action: WorkflowActionDefinition = {
      actionId: 'bad',
      type: 'wait-for-signal',
      serviceCapabilityRefs: [],
      parameters: {},
    };
    expect(() => readWaitParameters(action)).toThrow(/signalName/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
./node_modules/.bin/jest src/workflows/workflow-wait-action.spec.ts
```

Expected: FAIL — `isWaitForSignalAction is not a function`.

- [ ] **Step 3: Implement**

In `src/workflows/workflow.types.ts`, add `'wait-for-signal'` to `KNOWN_WORKFLOW_ACTION_TYPES` and append:

```ts
export interface WaitForSignalParameters {
  signalName: string;
  /** null means wait indefinitely. */
  timeoutMs: number | null;
  onTimeout: 'fail' | 'continue';
}

export function isWaitForSignalAction(action: WorkflowActionDefinition): boolean {
  return action.type === 'wait-for-signal';
}

export function readWaitParameters(action: WorkflowActionDefinition): WaitForSignalParameters {
  const params = action.parameters ?? {};
  const signalName = params.signalName;
  if (typeof signalName !== 'string' || signalName.length === 0) {
    // A defaulted signal name would make the instance wait for something nobody sends.
    throw new Error(`wait-for-signal action "${action.actionId}" is missing a signalName parameter`);
  }

  const rawTimeout = params.timeoutMs;
  const timeoutMs = typeof rawTimeout === 'number' && rawTimeout > 0 ? rawTimeout : null;
  const onTimeout = params.onTimeout === 'continue' ? 'continue' : 'fail';

  return { signalName, timeoutMs, onTimeout };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
./node_modules/.bin/jest src/workflows/workflow-wait-action.spec.ts
npm test
```

Expected: new tests PASS; all eight `verify:*` scripts still pass.

- [ ] **Step 5: Commit**

```bash
git add src/workflows/workflow.types.ts src/workflows/workflow-wait-action.spec.ts
git commit -m "feat: add wait-for-signal workflow action type"
```

---

### Task 4: Action dispatcher

**Files:**
- Create: `src/instances/action-dispatcher.service.ts`
- Create: `src/instances/action-dispatcher.service.spec.ts`

**Interfaces:**
- Consumes: `InstanceError` (Task 1); `WorkflowActionDefinition` (existing)
- Produces: `ActionDispatcherService.execute(action, context): Promise<ActionResult>` where `ActionResult = { ok: true; output: Record<string, unknown> } | { ok: false; error: InstanceError }`; constant `MAX_ATTEMPTS = 3`

- [ ] **Step 1: Write the failing tests**

Create `src/instances/action-dispatcher.service.spec.ts`:

```ts
import { ActionDispatcherService } from './action-dispatcher.service';
import { WorkflowActionDefinition } from '../workflows/workflow.types';

describe('ActionDispatcherService', () => {
  let service: ActionDispatcherService;
  let fetchMock: jest.Mock;

  const action: WorkflowActionDefinition = {
    actionId: 'call-thing',
    type: 'call-service-capability',
    serviceCapabilityRefs: [{ service: 'cv-microservice', capability: 'generate' } as never],
    parameters: { url: 'http://cv-microservice:3379/api/internal/generate' },
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    service = new ActionDispatcherService(fetchMock as unknown as typeof fetch);
  });

  it('returns the output on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ renderId: 'r1' }) });

    const result = await service.execute(action, {});

    expect(result).toEqual({ ok: true, output: { renderId: 'r1' } });
  });

  it('classifies a 500 as transient', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.permanent).toBe(false);
      expect(result.error.context).toMatchObject({ status: 500, body: 'boom' });
    }
  });

  it('classifies a 400 as permanent', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' });

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.permanent).toBe(true);
  });

  it('never returns an empty success when the call fails', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.execute(action, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.permanent).toBe(false);
      expect(result.error.message).toContain('ECONNREFUSED');
    }
  });

  it('rejects an action with no url parameter rather than silently skipping it', async () => {
    const bad: WorkflowActionDefinition = { ...action, parameters: {} };

    const result = await service.execute(bad, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.permanent).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
./node_modules/.bin/jest src/instances/action-dispatcher.service.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/instances/action-dispatcher.service.ts`:

```ts
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { WorkflowActionDefinition } from '../workflows/workflow.types';
import { InstanceError } from './instance.types';

export const MAX_ATTEMPTS = 3;

export type ActionResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; error: InstanceError };

@Injectable()
export class ActionDispatcherService {
  private readonly logger = new Logger(ActionDispatcherService.name);

  constructor(@Optional() @Inject('FETCH') private readonly fetchImpl: typeof fetch = fetch) {}

  async execute(action: WorkflowActionDefinition, context: Record<string, unknown>): Promise<ActionResult> {
    const url = action.parameters?.url;
    if (typeof url !== 'string' || url.length === 0) {
      return { ok: false, error: this.error(action, 'ACTION_MISCONFIGURED', 'action has no url parameter', true) };
    }

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
        });
        this.logger.error(`${error.code} ${error.message} ${JSON.stringify(error.context)}`);
        return { ok: false, error };
      }

      return { ok: true, output: (await response.json()) as Record<string, unknown> };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const error = this.error(action, 'ACTION_TRANSPORT_ERROR', message, false, { url });
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
    return { actionId: action.actionId, code, message, permanent, context, occurredAt: new Date().toISOString() };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
./node_modules/.bin/jest src/instances/action-dispatcher.service.spec.ts
```

Expected: PASS, all five.

- [ ] **Step 5: Commit**

```bash
git add src/instances/action-dispatcher.service.ts src/instances/action-dispatcher.service.spec.ts
git commit -m "feat: action dispatcher with transient/permanent failure classification"
```

---

### Task 5: The DAG walker

**Files:**
- Create: `src/instances/workflow-executor.service.ts`
- Create: `src/instances/workflow-executor.service.spec.ts`

**Interfaces:**
- Consumes: `InstanceRepositoryService` (2), `readWaitParameters` / `isWaitForSignalAction` (3), `ActionDispatcherService` (4), `WorkflowRegistryService` (existing)
- Produces: `WorkflowExecutorService.advance(instanceId: string): Promise<WorkflowInstanceEntity>`, `.start(input: CreateInstanceInput & { workflowId, workflowVersion, correlationKey }): Promise<WorkflowInstanceEntity>`, `.deliverSignal(instanceId, name, payload): Promise<WorkflowInstanceEntity>`

- [ ] **Step 1: Write the failing tests**

Create `src/instances/workflow-executor.service.spec.ts`:

```ts
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowActionDefinition } from '../workflows/workflow.types';

const actions: WorkflowActionDefinition[] = [
  { actionId: 'generate', type: 'call-service-capability', serviceCapabilityRefs: [], parameters: { url: 'http://x/generate' } },
  { actionId: 'await-approval', type: 'wait-for-signal', dependsOn: ['generate'], serviceCapabilityRefs: [], parameters: { signalName: 'approval' } },
  { actionId: 'export', type: 'call-service-capability', dependsOn: ['await-approval'], serviceCapabilityRefs: [], parameters: { url: 'http://x/export' } },
];

describe('WorkflowExecutorService', () => {
  let executor: WorkflowExecutorService;
  let repo: any;
  let dispatcher: any;
  let workflows: any;
  let state: any;

  beforeEach(() => {
    state = {
      instanceId: 'i1',
      workflowId: 'wf',
      workflowVersion: 1,
      status: 'running',
      context: {},
      wait: null,
      lastError: null,
      steps: [
        { actionId: 'generate', status: 'pending', attempts: 0 },
        { actionId: 'await-approval', status: 'pending', attempts: 0 },
        { actionId: 'export', status: 'pending', attempts: 0 },
      ],
    };

    const manager = {
      update: jest.fn(async (_entity: unknown, _where: unknown, patch: any) => Object.assign(state, patch)),
    };

    repo = {
      withLockedInstance: jest.fn(async (_id: string, fn: any) => fn(state, manager)),
      findSteps: jest.fn(async () => state.steps),
      updateStep: jest.fn(async (_i: string, actionId: string, patch: any) => {
        Object.assign(state.steps.find((s: any) => s.actionId === actionId), patch);
      }),
      claimSignal: jest.fn(async () => null),
      findById: jest.fn(async () => state),
    };

    dispatcher = { execute: jest.fn(async () => ({ ok: true, output: { done: true } })) };
    workflows = { getVersion: jest.fn(() => ({ workflowId: 'wf', version: 1, actions })) };

    executor = new WorkflowExecutorService(repo, dispatcher, workflows, { emit: jest.fn() } as any);
  });

  it('runs the first ready action and halts at the wait', async () => {
    await executor.advance('i1');

    expect(dispatcher.execute).toHaveBeenCalledTimes(1);
    expect(state.status).toBe('waiting');
    expect(state.wait.signalName).toBe('approval');
  });

  it('does not run actions whose dependsOn are unmet', async () => {
    await executor.advance('i1');

    const exportCalls = dispatcher.execute.mock.calls.filter((c: any[]) => c[0].actionId === 'export');
    expect(exportCalls).toHaveLength(0);
  });

  it('resumes and completes when the signal arrives', async () => {
    await executor.advance('i1');
    repo.claimSignal.mockResolvedValueOnce({ signalId: 's1', name: 'approval', payload: { by: 'user' } });

    await executor.advance('i1');

    expect(state.status).toBe('completed');
  });

  it('fails the instance and records the error on a permanent action failure', async () => {
    dispatcher.execute.mockResolvedValueOnce({
      ok: false,
      error: { actionId: 'generate', code: 'ACTION_HTTP_ERROR', message: 'bad', permanent: true, occurredAt: 'now' },
    });

    await executor.advance('i1');

    expect(state.status).toBe('failed');
    expect(state.lastError.code).toBe('ACTION_HTTP_ERROR');
  });

  it('never leaves the instance running after a permanent failure', async () => {
    dispatcher.execute.mockResolvedValueOnce({
      ok: false,
      error: { actionId: 'generate', code: 'X', message: 'x', permanent: true, occurredAt: 'now' },
    });

    await executor.advance('i1');

    expect(state.status).not.toBe('running');
  });

  it('keeps the instance running and increments attempts on a transient failure', async () => {
    dispatcher.execute.mockResolvedValueOnce({
      ok: false,
      error: { actionId: 'generate', code: 'ACTION_TRANSPORT_ERROR', message: 'econn', permanent: false, occurredAt: 'now' },
    });

    await executor.advance('i1');

    const step = state.steps.find((s: any) => s.actionId === 'generate');
    expect(step.attempts).toBe(1);
    expect(step.status).toBe('pending');
    expect(state.status).toBe('running');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
./node_modules/.bin/jest src/instances/workflow-executor.service.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Add `updateStep` to the repository**

In `src/instances/instance-repository.service.ts`:

```ts
  async updateStep(
    instanceId: string,
    actionId: string,
    patch: Partial<InstanceStepEntity>,
    manager?: EntityManager,
  ): Promise<void> {
    const runner = manager ?? this.dataSource.manager;
    await runner.update(InstanceStepEntity, { instanceId, actionId }, patch);
  }
```

- [ ] **Step 4: Implement the executor**

Create `src/instances/workflow-executor.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { EventPublisherService } from '../events/event-publisher.service';
import { WorkflowRegistryService } from '../workflows/workflow-registry.service';
import { WorkflowActionDefinition, isWaitForSignalAction, readWaitParameters } from '../workflows/workflow.types';
import { ActionDispatcherService, MAX_ATTEMPTS } from './action-dispatcher.service';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { CreateInstanceInput, InstanceRepositoryService } from './instance-repository.service';
import { InstanceError } from './instance.types';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly repo: InstanceRepositoryService,
    private readonly dispatcher: ActionDispatcherService,
    private readonly workflows: WorkflowRegistryService,
    private readonly events: EventPublisherService,
  ) {}

  async start(input: CreateInstanceInput): Promise<WorkflowInstanceEntity> {
    const definition = this.workflows.getVersion(input.workflowId, input.workflowVersion);
    if (!definition) {
      throw new Error(`workflow ${input.workflowId} v${input.workflowVersion} not found`);
    }

    const { instance, created } = await this.repo.createIfAbsent({
      ...input,
      actionIds: definition.actions.map((a) => a.actionId),
    });
    if (!created) {
      return instance;
    }

    this.logger.log(`instance.started ${instance.instanceId} workflow=${input.workflowId} corr=${input.correlationKey}`);
    return this.advance(instance.instanceId);
  }

  async deliverSignal(instanceId: string, name: string, payload: Record<string, unknown>): Promise<WorkflowInstanceEntity> {
    await this.repo.recordSignal(instanceId, name, payload);
    return this.advance(instanceId);
  }

  /**
   * Runs every action whose dependencies are satisfied, halting at the first
   * unsatisfied wait. Always called with a cause (start, signal, timeout sweep) —
   * nothing polls running instances.
   */
  async advance(instanceId: string): Promise<WorkflowInstanceEntity> {
    const started = Date.now();

    const result = await this.repo.withLockedInstance(instanceId, async (instance, manager) => {
      if (instance.status === 'completed' || instance.status === 'failed' || instance.status === 'cancelled') {
        return instance;
      }

      const definition = this.workflows.getVersion(instance.workflowId, instance.workflowVersion);
      if (!definition) {
        throw new Error(`workflow ${instance.workflowId} v${instance.workflowVersion} not found`);
      }

      const steps = await this.repo.findSteps(instanceId);
      const statusOf = new Map(steps.map((s) => [s.actionId, s]));

      let progressed = true;
      while (progressed) {
        progressed = false;

        for (const action of definition.actions) {
          const step = statusOf.get(action.actionId);
          if (!step || step.status === 'succeeded' || step.status === 'skipped') continue;
          if (!this.dependenciesMet(action, statusOf)) continue;

          if (isWaitForSignalAction(action)) {
            const params = readWaitParameters(action);
            const signal = await this.repo.claimSignal(manager, instanceId, params.signalName);

            if (!signal) {
              await manager.update(WorkflowInstanceEntity, { instanceId }, {
                status: 'waiting',
                currentState: action.actionId,
                wait: {
                  actionId: action.actionId,
                  signalName: params.signalName,
                  waitingSince: new Date().toISOString(),
                  timeoutAt: params.timeoutMs ? new Date(Date.now() + params.timeoutMs).toISOString() : null,
                  onTimeout: params.onTimeout,
                },
              });
              this.logger.log(`instance.waiting ${instanceId} action=${action.actionId} signal=${params.signalName}`);
              return this.repo.findById(instanceId) as Promise<WorkflowInstanceEntity>;
            }

            step.status = 'succeeded';
            await this.repo.updateStep(instanceId, action.actionId, {
              status: 'succeeded',
              output: { signal: signal.name, payload: signal.payload },
              finishedAt: new Date(),
            }, manager);
            await manager.update(WorkflowInstanceEntity, { instanceId }, { status: 'running', wait: null });
            progressed = true;
            continue;
          }

          const outcome = await this.dispatcher.execute(action, instance.context);

          if (outcome.ok) {
            step.status = 'succeeded';
            await this.repo.updateStep(instanceId, action.actionId, {
              status: 'succeeded',
              output: outcome.output,
              finishedAt: new Date(),
            }, manager);
            progressed = true;
            continue;
          }

          const attempts = step.attempts + 1;
          const exhausted = attempts >= MAX_ATTEMPTS;
          if (outcome.error.permanent || exhausted) {
            await this.failInstance(manager, instanceId, action.actionId, attempts, outcome.error);
            return this.repo.findById(instanceId) as Promise<WorkflowInstanceEntity>;
          }

          // Transient and retries remain: leave pending, let the next advance retry it.
          await this.repo.updateStep(instanceId, action.actionId, { attempts, error: outcome.error }, manager);
          this.logger.warn(`action ${action.actionId} transient failure attempt ${attempts}/${MAX_ATTEMPTS}: ${outcome.error.message}`);
          return this.repo.findById(instanceId) as Promise<WorkflowInstanceEntity>;
        }
      }

      const allDone = definition.actions.every((a) => {
        const s = statusOf.get(a.actionId);
        return s?.status === 'succeeded' || s?.status === 'skipped';
      });
      if (allDone) {
        await manager.update(WorkflowInstanceEntity, { instanceId }, { status: 'completed', currentState: null, wait: null });
        this.logger.log(`instance.completed ${instanceId}`);
      }

      return this.repo.findById(instanceId) as Promise<WorkflowInstanceEntity>;
    });

    this.logger.log(`advance ${instanceId} finished in ${Date.now() - started}ms status=${result.status}`);
    return result;
  }

  private dependenciesMet(action: WorkflowActionDefinition, statusOf: Map<string, { status: string }>): boolean {
    return (action.dependsOn ?? []).every((dep) => statusOf.get(dep)?.status === 'succeeded');
  }

  private async failInstance(
    manager: { update: Function },
    instanceId: string,
    actionId: string,
    attempts: number,
    error: InstanceError,
  ): Promise<void> {
    await this.repo.updateStep(instanceId, actionId, { status: 'failed', attempts, error, finishedAt: new Date() }, manager as never);
    await manager.update(WorkflowInstanceEntity, { instanceId }, { status: 'failed', currentState: actionId, lastError: error, wait: null });
    this.logger.error(`instance.failed ${instanceId} action=${actionId} code=${error.code} ${JSON.stringify(error.context ?? {})}`);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
./node_modules/.bin/jest src/instances/workflow-executor.service.spec.ts
```

Expected: PASS, all six.

- [ ] **Step 6: Commit**

```bash
git add src/instances/workflow-executor.service.ts src/instances/workflow-executor.service.spec.ts src/instances/instance-repository.service.ts
git commit -m "feat: DAG walker with wait-for-signal halt and resume"
```

---

### Task 6: Timeout sweep

**Files:**
- Create: `src/instances/instance-timeout.service.ts`
- Create: `src/instances/instance-timeout.service.spec.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `InstanceRepositoryService.findExpiredWaits` (2), `WorkflowExecutorService` (5)
- Produces: `InstanceTimeoutService.sweep(now?: Date): Promise<{ examined: number; failed: number; continued: number }>`

- [ ] **Step 1: Write the failing tests**

Create `src/instances/instance-timeout.service.spec.ts`:

```ts
import { InstanceTimeoutService } from './instance-timeout.service';

describe('InstanceTimeoutService', () => {
  const waitingInstance = (onTimeout: 'fail' | 'continue') => ({
    instanceId: 'i1',
    wait: { actionId: 'await-approval', signalName: 'approval', waitingSince: 'x', timeoutAt: 'y', onTimeout },
  });

  it('fails an expired wait whose onTimeout is fail', async () => {
    const repo = { findExpiredWaits: jest.fn(async () => [waitingInstance('fail')]), failWaitTimeout: jest.fn() };
    const executor = { deliverSignal: jest.fn() };
    const service = new InstanceTimeoutService(repo as any, executor as any);

    const result = await service.sweep(new Date());

    expect(repo.failWaitTimeout).toHaveBeenCalledWith('i1', 'await-approval');
    expect(result).toEqual({ examined: 1, failed: 1, continued: 0 });
  });

  it('resumes an expired wait whose onTimeout is continue', async () => {
    const repo = { findExpiredWaits: jest.fn(async () => [waitingInstance('continue')]), failWaitTimeout: jest.fn() };
    const executor = { deliverSignal: jest.fn() };
    const service = new InstanceTimeoutService(repo as any, executor as any);

    const result = await service.sweep(new Date());

    expect(executor.deliverSignal).toHaveBeenCalledWith('i1', 'approval', { timedOut: true });
    expect(result).toEqual({ examined: 1, failed: 0, continued: 1 });
  });

  it('keeps sweeping after one instance throws, and reports the failure', async () => {
    const repo = {
      findExpiredWaits: jest.fn(async () => [waitingInstance('continue'), waitingInstance('continue')]),
      failWaitTimeout: jest.fn(),
    };
    const executor = { deliverSignal: jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined) };
    const service = new InstanceTimeoutService(repo as any, executor as any);

    const result = await service.sweep(new Date());

    expect(result.examined).toBe(2);
    expect(result.continued).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
./node_modules/.bin/jest src/instances/instance-timeout.service.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Add `failWaitTimeout` to the repository**

In `src/instances/instance-repository.service.ts`:

```ts
  async failWaitTimeout(instanceId: string, actionId: string): Promise<void> {
    const error = {
      actionId,
      code: 'WAIT_TIMEOUT',
      message: `wait on ${actionId} expired`,
      permanent: true,
      occurredAt: new Date().toISOString(),
    };
    await this.dataSource.transaction(async (manager) => {
      await manager.update(InstanceStepEntity, { instanceId, actionId }, { status: 'failed', error, finishedAt: new Date() });
      await manager.update(WorkflowInstanceEntity, { instanceId }, { status: 'failed', lastError: error, wait: null });
    });
  }
```

- [ ] **Step 4: Implement the sweep**

Create `src/instances/instance-timeout.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InstanceRepositoryService } from './instance-repository.service';
import { WorkflowExecutorService } from './workflow-executor.service';

@Injectable()
export class InstanceTimeoutService {
  private readonly logger = new Logger(InstanceTimeoutService.name);

  constructor(
    private readonly repo: InstanceRepositoryService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledSweep(): Promise<void> {
    const result = await this.sweep(new Date());
    if (result.examined > 0) {
      this.logger.log(`timeout sweep examined=${result.examined} failed=${result.failed} continued=${result.continued}`);
    }
  }

  async sweep(now: Date): Promise<{ examined: number; failed: number; continued: number }> {
    const expired = await this.repo.findExpiredWaits(now);
    let failed = 0;
    let continued = 0;

    for (const instance of expired) {
      const wait = instance.wait;
      if (!wait) continue;

      try {
        if (wait.onTimeout === 'continue') {
          await this.executor.deliverSignal(instance.instanceId, wait.signalName, { timedOut: true });
          continued += 1;
        } else {
          await this.repo.failWaitTimeout(instance.instanceId, wait.actionId);
          failed += 1;
        }
      } catch (cause) {
        // One bad instance must not stop the sweep, but it must be loud.
        const message = cause instanceof Error ? cause.message : String(cause);
        this.logger.error(`timeout sweep failed for instance ${instance.instanceId} action=${wait.actionId}: ${message}`);
      }
    }

    return { examined: expired.length, failed, continued };
  }
}
```

- [ ] **Step 5: Add the `@Cron` monkey-patch to main.ts**

`@Cron` silently never fires on Node v22+/v24 without this. At the very top of `src/main.ts`, **before any other import**:

```ts
import 'reflect-metadata';

// Node v22+/v24: @nestjs/schedule's decorator metadata is dropped without this shim,
// and the job then never fires — with no error anywhere.
const reflectAny = Reflect as unknown as Record<string, unknown>;
if (typeof reflectAny.getMetadata !== 'function') {
  throw new Error('reflect-metadata did not install Reflect.getMetadata; @Cron jobs would silently never fire');
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
./node_modules/.bin/jest src/instances/instance-timeout.service.spec.ts
```

Expected: PASS, all three.

- [ ] **Step 7: Commit**

```bash
git add src/instances/instance-timeout.service.ts src/instances/instance-timeout.service.spec.ts src/instances/instance-repository.service.ts src/main.ts
git commit -m "feat: timeout sweep for expired waits"
```

---

### Task 7: HTTP surface and module wiring

**Files:**
- Create: `src/instances/instance.controller.ts`, `src/instances/instance.controller.spec.ts`
- Create: `src/instances/dto/create-instance.dto.ts`, `src/instances/dto/deliver-signal.dto.ts`
- Create: `src/instances/instances.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `WorkflowExecutorService` (5), `InstanceRepositoryService` (2)
- Produces: `POST /api/instances`, `GET /api/instances/:id`, `GET /api/instances`, `POST /api/instances/:id/signals`, `POST /api/instances/:id/cancel`, `GET /api/instances/:id/audit`

- [ ] **Step 1: Write the failing tests**

Create `src/instances/instance.controller.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { InstanceController } from './instance.controller';

describe('InstanceController', () => {
  let controller: InstanceController;
  let executor: any;
  let repo: any;

  beforeEach(() => {
    executor = {
      start: jest.fn(async () => ({ instanceId: 'i1', status: 'waiting' })),
      deliverSignal: jest.fn(async () => ({ instanceId: 'i1', status: 'running' })),
    };
    repo = {
      findById: jest.fn(async (id: string) => (id === 'i1' ? { instanceId: 'i1', status: 'waiting' } : null)),
      findSteps: jest.fn(async () => [{ actionId: 'generate', status: 'succeeded' }]),
      list: jest.fn(async () => []),
    };
    controller = new InstanceController(executor, repo);
  });

  it('creates an instance', async () => {
    const body = { workflowId: 'wf', workflowVersion: 1, correlationKey: 'app-1', context: {} };
    await expect(controller.create(body as never)).resolves.toMatchObject({ instanceId: 'i1' });
  });

  it('returns 404 for an unknown instance rather than an empty object', async () => {
    await expect(controller.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delivers a signal', async () => {
    await controller.signal('i1', { name: 'approval', payload: { by: 'user' } } as never);
    expect(executor.deliverSignal).toHaveBeenCalledWith('i1', 'approval', { by: 'user' });
  });

  it('returns steps in the audit view', async () => {
    const audit = await controller.audit('i1');
    expect(audit.steps).toHaveLength(1);
  });

  it('404s the audit view for an unknown instance', async () => {
    await expect(controller.audit('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
./node_modules/.bin/jest src/instances/instance.controller.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the DTOs**

Create `src/instances/dto/create-instance.dto.ts`:

```ts
import { IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateInstanceDto {
  @IsString()
  @MinLength(1)
  workflowId!: string;

  @IsInt()
  @Min(1)
  workflowVersion!: number;

  @IsString()
  @MinLength(1)
  correlationKey!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
```

Create `src/instances/dto/deliver-signal.dto.ts`:

```ts
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class DeliverSignalDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
```

- [ ] **Step 4: Implement the controller**

Create `src/instances/instance.controller.ts`:

```ts
import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { DeliverSignalDto } from './dto/deliver-signal.dto';
import { InstanceRepositoryService } from './instance-repository.service';
import { InstanceStatus } from './instance.types';
import { WorkflowExecutorService } from './workflow-executor.service';

@Controller('api/instances')
export class InstanceController {
  constructor(
    private readonly executor: WorkflowExecutorService,
    private readonly repo: InstanceRepositoryService,
  ) {}

  @Post()
  async create(@Body() body: CreateInstanceDto) {
    return this.executor.start({
      workflowId: body.workflowId,
      workflowVersion: body.workflowVersion,
      correlationKey: body.correlationKey,
      context: body.context ?? {},
      actionIds: [],
    });
  }

  @Get()
  async list(@Query('correlationKey') correlationKey?: string, @Query('status') status?: InstanceStatus) {
    return this.repo.list({ correlationKey, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const instance = await this.repo.findById(id);
    if (!instance) {
      // 404 so callers can tell "no such instance" from "the lookup blew up".
      throw new NotFoundException(`workflow instance ${id} not found`);
    }
    return instance;
  }

  @Get(':id/audit')
  async audit(@Param('id') id: string) {
    const instance = await this.repo.findById(id);
    if (!instance) {
      throw new NotFoundException(`workflow instance ${id} not found`);
    }
    return { instance, steps: await this.repo.findSteps(id) };
  }

  @Post(':id/signals')
  async signal(@Param('id') id: string, @Body() body: DeliverSignalDto) {
    return this.executor.deliverSignal(id, body.name, body.payload ?? {});
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.repo.cancel(id);
  }
}
```

- [ ] **Step 5: Add `cancel` to the repository**

```ts
  async cancel(instanceId: string): Promise<WorkflowInstanceEntity> {
    return this.withLockedInstance(instanceId, async (instance, manager) => {
      if (instance.status === 'completed' || instance.status === 'failed') {
        return instance;
      }
      await manager.update(WorkflowInstanceEntity, { instanceId }, { status: 'cancelled', wait: null });
      return this.findById(instanceId) as Promise<WorkflowInstanceEntity>;
    });
  }
```

- [ ] **Step 6: Wire the module**

Create `src/instances/instances.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { WorkflowRegistryModule } from '../workflows/workflow-registry.module';
import { ActionDispatcherService } from './action-dispatcher.service';
import { InstanceSignalEntity } from './entities/instance-signal.entity';
import { InstanceStepEntity } from './entities/instance-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { InstanceController } from './instance.controller';
import { InstanceRepositoryService } from './instance-repository.service';
import { InstanceTimeoutService } from './instance-timeout.service';
import { WorkflowExecutorService } from './workflow-executor.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([WorkflowInstanceEntity, InstanceStepEntity, InstanceSignalEntity]),
    WorkflowRegistryModule,
    EventsModule,
  ],
  controllers: [InstanceController],
  providers: [InstanceRepositoryService, ActionDispatcherService, WorkflowExecutorService, InstanceTimeoutService],
  exports: [WorkflowExecutorService, InstanceRepositoryService],
})
export class InstancesModule {}
```

Add `InstancesModule` to the `imports` array in `src/app.module.ts`.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
./node_modules/.bin/jest src/instances/instance.controller.spec.ts
npm run build
```

Expected: PASS, all five; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/instances src/app.module.ts
git commit -m "feat: instance HTTP API and module wiring"
```

---

### Task 8: Instance lifecycle events

**Files:**
- Modify: `src/events/process-event.types.ts`
- Create: `src/instances/instance-events.spec.ts`

**Interfaces:**
- Consumes: existing `ProcessEventEnvelope`, `EventPublisherService`
- Produces: `InstanceEventType`; routing keys `bpcp.instance.<type>.v1`

- [ ] **Step 1: Write the failing test**

Create `src/instances/instance-events.spec.ts`:

```ts
import { INSTANCE_EVENT_TYPES, instanceRoutingKey } from '../events/process-event.types';

describe('instance events', () => {
  it('declares the five lifecycle types', () => {
    expect(INSTANCE_EVENT_TYPES).toEqual([
      'instance.started',
      'instance.waiting',
      'instance.resumed',
      'instance.completed',
      'instance.failed',
    ]);
  });

  it('builds versioned routing keys', () => {
    expect(instanceRoutingKey('instance.failed')).toBe('bpcp.instance.failed.v1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
./node_modules/.bin/jest src/instances/instance-events.spec.ts
```

Expected: FAIL — `INSTANCE_EVENT_TYPES` is not exported.

- [ ] **Step 3: Implement**

Append to `src/events/process-event.types.ts`:

```ts
export const INSTANCE_EVENT_TYPES = [
  'instance.started',
  'instance.waiting',
  'instance.resumed',
  'instance.completed',
  'instance.failed',
] as const;

export type InstanceEventType = (typeof INSTANCE_EVENT_TYPES)[number];

export function instanceRoutingKey(type: InstanceEventType): string {
  return `bpcp.${type}.v1`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
./node_modules/.bin/jest src/instances/instance-events.spec.ts
npm test
```

Expected: PASS; all eight `verify:*` scripts still pass.

- [ ] **Step 5: Commit**

```bash
git add src/events/process-event.types.ts src/instances/instance-events.spec.ts
git commit -m "feat: instance lifecycle event types and routing keys"
```

---

### Task 9: Wire Jest into `npm test`, add `verify:instances`

`npm test` currently runs only structural `verify:*` scripts — **the Jest suite never runs in CI**. Every spec written above is invisible until this task lands.

**Files:**
- Create: `scripts/verify-instances.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: all prior files
- Produces: `npm run verify:instances`; `npm test` runs Jest

- [ ] **Step 1: Write the structural verify script**

Create `scripts/verify-instances.js`, matching the house style of `verify-policy-workflow.js`:

```js
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'src/instances/instance.types.ts',
  'src/instances/entities/workflow-instance.entity.ts',
  'src/instances/entities/instance-step.entity.ts',
  'src/instances/entities/instance-signal.entity.ts',
  'src/instances/instance-repository.service.ts',
  'src/instances/action-dispatcher.service.ts',
  'src/instances/workflow-executor.service.ts',
  'src/instances/instance-timeout.service.ts',
  'src/instances/instance.controller.ts',
  'src/instances/instances.module.ts',
  'src/database/database.module.ts',
  'docs/specs/2026-08-22-bpcp-workflow-executor-design.md',
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`missing required file: ${file}`);
  }
}

const migrationsDir = path.join(root, 'src/database/migrations');
if (!fs.existsSync(migrationsDir) || fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.ts')).length === 0) {
  failures.push('no migration found in src/database/migrations');
}

// synchronize:true would let TypeORM rewrite production schema on boot.
const dbModule = fs.readFileSync(path.join(root, 'src/database/database.module.ts'), 'utf8');
if (!/synchronize:\s*false/.test(dbModule)) {
  failures.push('database.module.ts must set synchronize: false');
}

const workflowTypes = fs.readFileSync(path.join(root, 'src/workflows/workflow.types.ts'), 'utf8');
if (!workflowTypes.includes("'wait-for-signal'")) {
  failures.push('wait-for-signal is not registered in KNOWN_WORKFLOW_ACTION_TYPES');
}

if (failures.length > 0) {
  console.error('verify:instances FAILED');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('verify:instances PASSED');
```

- [ ] **Step 2: Run it to verify it passes**

```bash
node scripts/verify-instances.js
```

Expected: `verify:instances PASSED`.

- [ ] **Step 3: Confirm it can fail**

```bash
mv src/instances/instances.module.ts /tmp/ && node scripts/verify-instances.js; mv /tmp/instances.module.ts src/instances/
```

Expected: exits non-zero naming the missing file. Restore it.

- [ ] **Step 4: Wire both into package.json**

In `package.json` `scripts`, add `verify:instances` and put Jest into `test`:

```json
    "verify:instances": "node scripts/verify-instances.js",
    "test:unit": "jest",
    "test": "npm run verify:contracts && npm run verify:process-registry && npm run verify:event-publication && npm run verify:event-transport && npm run verify:deployment-wiring && npm run verify:policy-workflow && npm run verify:editor && npm run verify:instances && npm run build && npm run verify:simulation && npm run test:unit"
```

- [ ] **Step 5: Run the full suite**

```bash
export BPCP_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bpcp_test
npm test
```

Expected: nine `verify:*` scripts pass, build succeeds, Jest suite passes.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-instances.js package.json
git commit -m "test: run jest in npm test and add verify:instances"
```

---

### Task 10: Deployment wiring

**Files:**
- Modify: `k8s/configmap.yaml`, `k8s/external-secret.yaml`, `k8s/deployment.yaml`
- Modify: `docs/specs/2026-08-22-bpcp-workflow-executor-design.md` (mark delivered)

**Interfaces:**
- Consumes: everything
- Produces: a deployable service reading `BPCP_DATABASE_URL` from Vault

- [ ] **Step 1: Create the database and role**

Never connect to `db-server-postgres` directly across the pod CIDR — port-forward.

```bash
kubectl port-forward -n statex-apps svc/db-server-postgres 5433:5432 &
psql "postgresql://postgres@localhost:5433/postgres" -c "CREATE DATABASE bpcp;"
psql "postgresql://postgres@localhost:5433/postgres" -c "CREATE ROLE bpcp_app LOGIN PASSWORD '<generated>';"
psql "postgresql://postgres@localhost:5433/postgres" -c "GRANT ALL PRIVILEGES ON DATABASE bpcp TO bpcp_app;"
```

- [ ] **Step 2: Store the DSN in Vault**

```bash
/vault-secret business-process-control-plane set BPCP_DATABASE_URL=postgresql://bpcp_app:<generated>@db-server-postgres:5432/bpcp
```

- [ ] **Step 3: Name the key in external-secret.yaml**

A Vault key absent from this manifest never reaches the pod, and ESO still reports `Synced`. In `k8s/external-secret.yaml`, add under `spec.data`:

```yaml
    - secretKey: BPCP_DATABASE_URL
      remoteRef:
        key: secret/prod/business-process-control-plane
        property: BPCP_DATABASE_URL
```

- [ ] **Step 4: Reference it from the deployment**

In `k8s/deployment.yaml`, in the container's `env`:

```yaml
            - name: BPCP_DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: business-process-control-plane-secrets
                  key: BPCP_DATABASE_URL
```

- [ ] **Step 5: Dry-run the deploy**

```bash
DRY_RUN=1 ./scripts/deploy.sh
```

Expected: validation passes, no build or apply.

- [ ] **Step 6: Verify the migration on a scratch DB first**

Offline-generated migrations are unexecuted code.

```bash
pg_dump --schema-only "postgresql://bpcp_app@localhost:5433/bpcp" > /tmp/bpcp-schema.sql
createdb -h localhost -p 5433 bpcp_scratch && psql -h localhost -p 5433 -d bpcp_scratch -f /tmp/bpcp-schema.sql
BPCP_DATABASE_URL=postgresql://bpcp_app@localhost:5433/bpcp_scratch npm run start:prod
```

Expected: `migrationsRun: true` applies cleanly; the three tables exist. Then drop the scratch DB.

- [ ] **Step 7: Commit and let auto-deploy run**

This commit touches non-doc files, so committing to `main` queues a deploy. Do not also run `deploy.sh`.

```bash
git add k8s/ docs/specs/
git commit -m "feat: deployment wiring for the workflow executor runtime store"
git push
```

- [ ] **Step 8: Verify the deploy landed**

```bash
../shared/scripts/deploy-queue/queuectl.sh status
../shared/scripts/wait-for-rollout.sh -n statex-apps business-process-control-plane
kubectl get pods -n statex-apps -l app=business-process-control-plane -o wide
```

Compare pod age against the commit time — never match log windows. Then reproduce the real scenario:

```bash
kubectl exec -n statex-apps deploy/business-process-control-plane -c app -- \
  curl -sS -XPOST localhost:3375/api/instances \
  -H 'content-type: application/json' \
  -d '{"workflowId":"<published-wf>","workflowVersion":1,"correlationKey":"smoke-1"}'
```

Expected: an instance is returned with a real `instanceId`.

---

## Self-Review

**Spec coverage:** §3.1 instance model → Task 1. §3.2 concurrency → Task 2. §3.3 wait-for-signal → Tasks 3, 6. §3.4 executor loop → Task 5. §3.5 failure semantics → Tasks 4, 5, 7. §3.6 API → Task 7. §3.7 events → Task 8. §4 testing → Tasks 2–9. §5 migration/deployment → Task 10. §2 non-regression → every task re-runs `npm test`.

**Known gap, deliberate:** §3.7 defines the event *types* (Task 8) but does not emit them from the executor. `EventPublisherService` is injected in Task 5 and unused. Emission is deferred until the CV app needs the audit stream — noted here so it is not mistaken for an oversight.

**Type consistency:** `InstanceStatus`, `StepStatus`, `InstanceError`, `WaitDescriptor` defined in Task 1 and used unchanged in 2, 4, 5, 6. `withLockedInstance`, `claimSignal`, `updateStep`, `failWaitTimeout`, `cancel`, `findExpiredWaits` all defined on `InstanceRepositoryService` before use. `MAX_ATTEMPTS` defined in Task 4, consumed in Task 5.
