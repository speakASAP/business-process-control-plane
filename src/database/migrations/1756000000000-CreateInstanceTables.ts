import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstanceTables1756000000000 implements MigrationInterface {
  name = 'CreateInstanceTables1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "bpcp_workflow_instance" (
        "instanceId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workflowId" text NOT NULL,
        "workflowVersion" int NOT NULL,
        "correlationKey" text NOT NULL,
        "status" text NOT NULL,
        "currentState" text,
        "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "wait" jsonb,
        "lastError" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_instance_workflow_correlation" UNIQUE ("workflowId", "correlationKey")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_instance_correlation" ON "bpcp_workflow_instance" ("correlationKey")`);
    await queryRunner.query(`CREATE INDEX "idx_instance_status" ON "bpcp_workflow_instance" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "bpcp_instance_step" (
        "stepId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "instanceId" uuid NOT NULL REFERENCES "bpcp_workflow_instance"("instanceId") ON DELETE CASCADE,
        "actionId" text NOT NULL,
        "status" text NOT NULL,
        "attempts" int NOT NULL DEFAULT 0,
        "output" jsonb,
        "error" jsonb,
        "startedAt" timestamptz,
        "finishedAt" timestamptz,
        CONSTRAINT "uq_step_instance_action" UNIQUE ("instanceId", "actionId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_step_instance" ON "bpcp_instance_step" ("instanceId")`);

    await queryRunner.query(`
      CREATE TABLE "bpcp_instance_signal" (
        "signalId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "instanceId" uuid NOT NULL REFERENCES "bpcp_workflow_instance"("instanceId") ON DELETE CASCADE,
        "name" text NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "receivedAt" timestamptz NOT NULL DEFAULT now(),
        "consumedAt" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_signal_instance" ON "bpcp_instance_signal" ("instanceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bpcp_instance_signal"`);
    await queryRunner.query(`DROP TABLE "bpcp_instance_step"`);
    await queryRunner.query(`DROP TABLE "bpcp_workflow_instance"`);
  }
}
