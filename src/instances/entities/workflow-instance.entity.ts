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
