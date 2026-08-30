import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProcessRegistryOutboxTables1756660000000 implements MigrationInterface {
  name = 'CreateProcessRegistryOutboxTables1756660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "bpcp_process_audit_event_seq" START 1`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "bpcp_process_outbox_event_seq" START 1`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bpcp_process_definition" (
        "processDefinitionId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "schemaVersion" text NOT NULL,
        "processId" text NOT NULL,
        "version" int NOT NULL,
        "status" text NOT NULL,
        "activeFrom" text,
        "activeTo" text,
        "policyRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "workflowRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "campaignRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "killSwitch" boolean NOT NULL DEFAULT true,
        "lastValidation" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_bpcp_process_definition" UNIQUE ("processId", "version")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bpcp_process_status" ON "bpcp_process_definition" ("status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bpcp_process_audit_event" (
        "auditEventId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "processId" text NOT NULL,
        "version" int NOT NULL,
        "sequenceNumber" bigint NOT NULL DEFAULT nextval('bpcp_process_audit_event_seq'),
        "schemaVersion" text NOT NULL,
        "id" text NOT NULL,
        "action" text NOT NULL,
        "actor" text NOT NULL,
        "createdAt" timestamptz NOT NULL,
        "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "uq_bpcp_process_audit_event_id" UNIQUE ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bpcp_audit_process_version" ON "bpcp_process_audit_event" ("processId", "version")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bpcp_audit_sequence" ON "bpcp_process_audit_event" ("sequenceNumber")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bpcp_process_event_outbox" (
        "outboxEventId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sequenceNumber" bigint NOT NULL DEFAULT nextval('bpcp_process_outbox_event_seq'),
        "schemaVersion" text NOT NULL,
        "eventId" text NOT NULL,
        "type" text NOT NULL,
        "processId" text NOT NULL,
        "version" int NOT NULL,
        "status" text NOT NULL,
        "policyRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "workflowRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "campaignRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "occurredAt" timestamptz NOT NULL,
        "payload" jsonb NOT NULL,
        "delivery" jsonb NOT NULL,
        "deliveryState" text NOT NULL,
        "dispatching" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_bpcp_process_event_outbox_id" UNIQUE ("eventId")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bpcp_outbox_sequence" ON "bpcp_process_event_outbox" ("sequenceNumber")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bpcp_outbox_process" ON "bpcp_process_event_outbox" ("processId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bpcp_outbox_occurred_at" ON "bpcp_process_event_outbox" ("occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bpcp_outbox_delivery_state" ON "bpcp_process_event_outbox" ("deliveryState")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bpcp_outbox_dispatching" ON "bpcp_process_event_outbox" ("dispatching")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bpcp_process_event_outbox"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bpcp_process_audit_event"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bpcp_process_definition"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "bpcp_process_outbox_event_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "bpcp_process_audit_event_seq"`);
  }
}
