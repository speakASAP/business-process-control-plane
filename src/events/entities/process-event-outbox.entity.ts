import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ProcessStatus } from '../../processes/process.types';
import { ProcessEventDelivery, ProcessEventDeliveryState, ProcessEventPayload, ProcessEventType } from '../process-event.types';

@Entity('bpcp_process_event_outbox')
@Unique('uq_bpcp_process_event_outbox_id', ['eventId'])
export class ProcessEventOutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  outboxEventId!: string;

  @Index('idx_bpcp_outbox_sequence')
  @Column({ type: 'bigint' })
  sequenceNumber!: string;

  @Column({ type: 'text' })
  schemaVersion!: 'bpcp.process-event.v1';

  @Column({ type: 'text' })
  eventId!: string;

  @Column({ type: 'text' })
  type!: ProcessEventType;

  @Index('idx_bpcp_outbox_process')
  @Column({ type: 'text' })
  processId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'text' })
  status!: ProcessStatus;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  policyRefs!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  workflowRefs!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  campaignRefs!: string[];

  @Index('idx_bpcp_outbox_occurred_at')
  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'jsonb' })
  payload!: ProcessEventPayload;

  @Column({ type: 'jsonb' })
  delivery!: ProcessEventDelivery;

  @Index('idx_bpcp_outbox_delivery_state')
  @Column({ type: 'text' })
  deliveryState!: ProcessEventDeliveryState;

  @Index('idx_bpcp_outbox_dispatching')
  @Column({ type: 'boolean', default: false })
  dispatching!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
