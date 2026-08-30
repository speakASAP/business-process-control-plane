import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ProcessStatus, ProcessValidationResult } from '../process.types';

@Entity('bpcp_process_definition')
@Unique('uq_bpcp_process_definition', ['processId', 'version'])
export class ProcessDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  processDefinitionId!: string;

  @Column({ type: 'text' })
  schemaVersion!: 'bpcp.process.v1';

  @Column({ type: 'text' })
  processId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'text' })
  status!: ProcessStatus;

  @Column({ type: 'text', nullable: true })
  activeFrom!: string | null;

  @Column({ type: 'text', nullable: true })
  activeTo!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  policyRefs!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  workflowRefs!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  campaignRefs!: string[];

  @Column({ type: 'boolean', default: true })
  killSwitch!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  lastValidation!: ProcessValidationResult | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
