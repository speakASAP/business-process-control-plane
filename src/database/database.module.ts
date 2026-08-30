import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessEventOutboxEntity } from '../events/entities/process-event-outbox.entity';
import { InstanceSignalEntity } from '../instances/entities/instance-signal.entity';
import { InstanceStepEntity } from '../instances/entities/instance-step.entity';
import { WorkflowInstanceEntity } from '../instances/entities/workflow-instance.entity';
import { ProcessAuditEventEntity } from '../processes/entities/process-audit-event.entity';
import { ProcessDefinitionEntity } from '../processes/entities/process-definition.entity';

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
          entities: [
            WorkflowInstanceEntity,
            InstanceStepEntity,
            InstanceSignalEntity,
            ProcessDefinitionEntity,
            ProcessAuditEventEntity,
            ProcessEventOutboxEntity,
          ],
          migrations: [`${__dirname}/migrations/*.js`],
          migrationsRun: true,
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
