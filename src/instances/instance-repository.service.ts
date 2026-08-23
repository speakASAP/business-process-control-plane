import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { InstanceSignalEntity } from './entities/instance-signal.entity';
import { InstanceStepEntity } from './entities/instance-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { InstanceError, InstanceStatus } from './instance.types';

export interface CreateInstanceInput {
  workflowId: string;
  workflowVersion: number;
  correlationKey: string;
  actionIds: string[];
  context?: Record<string, unknown>;
}

export class InstanceNotFoundError extends Error {
  constructor(public readonly instanceId: string) {
    super(`workflow instance not found: ${instanceId}`);
    this.name = 'InstanceNotFoundError';
  }
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

      if (input.actionIds.length > 0) {
        await manager.insert(
          InstanceStepEntity,
          input.actionIds.map((actionId) => ({
            instanceId: saved.instanceId,
            actionId,
            status: 'pending' as const,
            attempts: 0,
          })),
        );
      }

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

  async findSteps(instanceId: string, manager?: EntityManager): Promise<InstanceStepEntity[]> {
    const runner = manager ?? this.dataSource.manager;
    return runner.find(InstanceStepEntity, { where: { instanceId } });
  }

  async updateStep(
    instanceId: string,
    actionId: string,
    patch: Partial<InstanceStepEntity>,
    manager?: EntityManager,
  ): Promise<void> {
    const runner = manager ?? this.dataSource.manager;
    // TypeORM's DeepPartial cannot express the nested index signatures on output/error.
    await runner.update(InstanceStepEntity, { instanceId, actionId }, patch as never);
  }

  async recordSignal(
    instanceId: string,
    name: string,
    payload: Record<string, unknown>,
  ): Promise<InstanceSignalEntity> {
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

  /**
   * Claims one unconsumed signal by name. SKIP LOCKED plus the consumedAt guard means
   * two concurrent walkers can never consume the same signal twice.
   */
  async claimSignal(
    manager: EntityManager,
    instanceId: string,
    name: string,
  ): Promise<InstanceSignalEntity | null> {
    // TypeORM returns [rows, affectedCount] for a RETURNING update, so unwrap before
    // indexing — rows[0] on the raw result is the row array itself, which is truthy
    // even when nothing matched, and the walker would re-consume a spent signal.
    const raw = await manager.query(
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
    const rows: InstanceSignalEntity[] = Array.isArray(raw[0]) ? raw[0] : raw;
    return rows[0] ?? null;
  }

  async findExpiredWaits(now: Date): Promise<WorkflowInstanceEntity[]> {
    return this.dataSource.query(
      `SELECT * FROM "bpcp_workflow_instance"
        WHERE status = 'waiting'
          AND wait->>'timeoutAt' IS NOT NULL
          AND (wait->>'timeoutAt')::timestamptz <= $1`,
      [now.toISOString()],
    );
  }

  async failWaitTimeout(instanceId: string, actionId: string): Promise<void> {
    const error: InstanceError = {
      actionId,
      code: 'WAIT_TIMEOUT',
      message: `wait on ${actionId} expired`,
      permanent: true,
      occurredAt: new Date().toISOString(),
    };
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        InstanceStepEntity,
        { instanceId, actionId },
        // TypeORM's DeepPartial cannot express InstanceError's nested index signature.
        { status: 'failed', error: error as never, finishedAt: new Date() },
      );
      await manager.update(
        WorkflowInstanceEntity,
        { instanceId },
        { status: 'failed', lastError: error as never, wait: null },
      );
    });
    this.logger.error(`instance.failed ${instanceId} action=${actionId} code=WAIT_TIMEOUT`);
  }

  async cancel(instanceId: string): Promise<WorkflowInstanceEntity> {
    return this.withLockedInstance(instanceId, async (instance, manager) => {
      if (instance.status === 'completed' || instance.status === 'failed') {
        return instance;
      }
      await manager.update(WorkflowInstanceEntity, { instanceId }, { status: 'cancelled', wait: null });
      return (await this.findById(instanceId)) as WorkflowInstanceEntity;
    });
  }
}
