import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProcessAuditAction } from '../process.types';

@Entity('bpcp_process_audit_event')
@Unique('uq_bpcp_process_audit_event_id', ['id'])
export class ProcessAuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  auditEventId!: string;

  @Index('idx_bpcp_audit_process_version')
  @Column({ type: 'text' })
  processId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Index('idx_bpcp_audit_sequence')
  @Column({ type: 'bigint' })
  sequenceNumber!: string;

  @Column({ type: 'text' })
  schemaVersion!: 'bpcp.process-audit.v1';

  @Column({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  action!: ProcessAuditAction;

  @Column({ type: 'text' })
  actor!: string;

  @Column({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  details!: Record<string, unknown>;
}
