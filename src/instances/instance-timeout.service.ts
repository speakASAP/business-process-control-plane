import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InstanceRepositoryService } from './instance-repository.service';
import { WorkflowExecutorService } from './workflow-executor.service';

export interface SweepResult {
  examined: number;
  failed: number;
  continued: number;
}

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
      this.logger.log(
        `timeout sweep examined=${result.examined} failed=${result.failed} continued=${result.continued}`,
      );
    }
  }

  /**
   * Timeouts are polled, not scheduled: one periodic pass over waiting instances past
   * their deadline. No timer infrastructure and no per-instance jobs.
   */
  async sweep(now: Date): Promise<SweepResult> {
    const expired = await this.repo.findExpiredWaits(now);
    let failed = 0;
    let continued = 0;

    for (const instance of expired) {
      const wait = instance.wait;
      if (!wait) {
        // status=waiting with no descriptor is inconsistent state, not a normal skip.
        this.logger.error(`instance ${instance.instanceId} is waiting with no wait descriptor; skipping`);
        continue;
      }

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
        this.logger.error(
          `timeout sweep failed for instance ${instance.instanceId} action=${wait.actionId}: ${message}`,
        );
      }
    }

    return { examined: expired.length, failed, continued };
  }
}
