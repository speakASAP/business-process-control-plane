import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { WorkflowRegistryService } from '../workflows/workflow-registry.service';
import {
  WorkflowActionDefinition,
  isWaitForSignalAction,
  readWaitParameters,
} from '../workflows/workflow.types';
import { ActionDispatcherService, MAX_ATTEMPTS } from './action-dispatcher.service';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { CreateInstanceInput, InstanceRepositoryService } from './instance-repository.service';
import { InstanceError, StepStatus } from './instance.types';

interface StepView {
  actionId: string;
  status: StepStatus;
  attempts: number;
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly repo: InstanceRepositoryService,
    private readonly dispatcher: ActionDispatcherService,
    private readonly workflows: WorkflowRegistryService,
  ) {}

  /**
   * Creates an instance if one does not already exist for this correlation key, then
   * advances it. Re-running with the same key returns the existing instance untouched.
   */
  async start(input: Omit<CreateInstanceInput, 'actionIds'>): Promise<WorkflowInstanceEntity> {
    // Throws NotFoundException if the workflow version is not registered.
    const definition = this.workflows.getWorkflow(input.workflowId, input.workflowVersion);

    const { instance, created } = await this.repo.createIfAbsent({
      ...input,
      actionIds: definition.actions.map((action) => action.actionId),
    });

    if (!created) {
      this.logger.log(
        `instance.exists ${instance.instanceId} workflow=${input.workflowId} corr=${input.correlationKey}`,
      );
      return instance;
    }

    this.logger.log(
      `instance.started ${instance.instanceId} workflow=${input.workflowId} corr=${input.correlationKey}`,
    );
    return this.advance(instance.instanceId);
  }

  async deliverSignal(
    instanceId: string,
    name: string,
    payload: Record<string, unknown>,
  ): Promise<WorkflowInstanceEntity> {
    await this.repo.recordSignal(instanceId, name, payload);
    this.logger.log(`instance.signal ${instanceId} name=${name}`);
    return this.advance(instanceId);
  }

  /**
   * Runs every action whose dependencies are satisfied, halting at the first
   * unsatisfied wait. Always called with a cause (start, signal, timeout sweep) —
   * nothing polls running instances.
   */
  async advance(instanceId: string): Promise<WorkflowInstanceEntity> {
    const startedAt = Date.now();

    const result = await this.repo.withLockedInstance(instanceId, async (instance, manager) => {
      if (instance.status === 'completed' || instance.status === 'failed' || instance.status === 'cancelled') {
        return instance;
      }

      const definition = this.workflows.getWorkflow(instance.workflowId, instance.workflowVersion);
      const steps = (await this.repo.findSteps(instanceId, manager)) as unknown as StepView[];
      const stepOf = new Map(steps.map((step) => [step.actionId, step]));

      let progressed = true;

      while (progressed) {
        progressed = false;

        for (const action of definition.actions) {
          const step = stepOf.get(action.actionId);
          if (!step || step.status === 'succeeded' || step.status === 'skipped') continue;
          if (!this.dependenciesMet(action, stepOf)) continue;

          if (isWaitForSignalAction(action)) {
            const params = readWaitParameters(action);
            const signal = await this.repo.claimSignal(manager, instanceId, params.signalName);

            if (!signal) {
              await manager.update(
                WorkflowInstanceEntity,
                { instanceId },
                {
                  status: 'waiting',
                  currentState: action.actionId,
                  wait: {
                    actionId: action.actionId,
                    signalName: params.signalName,
                    waitingSince: new Date().toISOString(),
                    timeoutAt: params.timeoutMs ? new Date(Date.now() + params.timeoutMs).toISOString() : null,
                    onTimeout: params.onTimeout,
                  } as never,
                },
              );
              this.logger.log(
                `instance.waiting ${instanceId} action=${action.actionId} signal=${params.signalName}`,
              );
              return (await this.repo.findById(instanceId, manager)) as WorkflowInstanceEntity;
            }

            step.status = 'succeeded';
            await this.repo.updateStep(
              instanceId,
              action.actionId,
              { status: 'succeeded', output: { signal: signal.name, payload: signal.payload }, finishedAt: new Date() },
              manager,
            );
            await manager.update(WorkflowInstanceEntity, { instanceId }, { status: 'running', wait: null });
            this.logger.log(`instance.resumed ${instanceId} action=${action.actionId}`);
            progressed = true;
            continue;
          }

          const outcome = await this.dispatcher.execute(action, instance.context);

          if (outcome.ok) {
            step.status = 'succeeded';
            await this.repo.updateStep(
              instanceId,
              action.actionId,
              { status: 'succeeded', output: outcome.output, finishedAt: new Date() },
              manager,
            );
            progressed = true;
            continue;
          }

          const attempts = step.attempts + 1;
          const exhausted = attempts >= MAX_ATTEMPTS;

          if (outcome.error.permanent || exhausted) {
            await this.failInstance(manager, instanceId, action.actionId, attempts, outcome.error);
            return (await this.repo.findById(instanceId, manager)) as WorkflowInstanceEntity;
          }

          // Transient with retries left: stay pending so the next advance retries it.
          step.attempts = attempts;
          await this.repo.updateStep(
            instanceId,
            action.actionId,
            { attempts, error: outcome.error },
            manager,
          );
          this.logger.warn(
            `action ${action.actionId} transient failure attempt ${attempts}/${MAX_ATTEMPTS}: ${outcome.error.message}`,
          );
          return (await this.repo.findById(instanceId, manager)) as WorkflowInstanceEntity;
        }
      }

      const allDone = definition.actions.every((action) => {
        const status = stepOf.get(action.actionId)?.status;
        return status === 'succeeded' || status === 'skipped';
      });

      if (allDone) {
        await manager.update(
          WorkflowInstanceEntity,
          { instanceId },
          { status: 'completed', currentState: null, wait: null },
        );
        this.logger.log(`instance.completed ${instanceId}`);
      }

      return (await this.repo.findById(instanceId, manager)) as WorkflowInstanceEntity;
    });

    this.logger.log(`advance ${instanceId} finished in ${Date.now() - startedAt}ms status=${result.status}`);
    return result;
  }

  private dependenciesMet(action: WorkflowActionDefinition, stepOf: Map<string, StepView>): boolean {
    return (action.dependsOn ?? []).every((dep) => stepOf.get(dep)?.status === 'succeeded');
  }

  private async failInstance(
    manager: EntityManager,
    instanceId: string,
    actionId: string,
    attempts: number,
    error: InstanceError,
  ): Promise<void> {
    await this.repo.updateStep(
      instanceId,
      actionId,
      { status: 'failed', attempts, error, finishedAt: new Date() },
      manager,
    );
    await manager.update(
      WorkflowInstanceEntity,
      { instanceId },
      { status: 'failed', currentState: actionId, lastError: error as never, wait: null },
    );
    this.logger.error(
      `instance.failed ${instanceId} action=${actionId} code=${error.code} ${JSON.stringify(error.context ?? {})}`,
    );
  }
}
