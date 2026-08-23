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
