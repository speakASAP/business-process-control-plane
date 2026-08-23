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
