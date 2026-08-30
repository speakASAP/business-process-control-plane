import { QueryRunner } from 'typeorm';
import { CreateProcessRegistryOutboxTables1756660000000 } from './1756660000000-CreateProcessRegistryOutboxTables';

describe('CreateProcessRegistryOutboxTables1756660000000', () => {
  it('creates durable process registry and outbox tables', async () => {
    const migration = new CreateProcessRegistryOutboxTables1756660000000();
    const query: jest.Mock<Promise<void>, [string]> = jest.fn(async (_statement: string) => undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await migration.up(queryRunner);

    const sql = query.mock.calls.map((call) => call[0]).join('\n');
    expect(sql).toContain('bpcp_process_definition');
    expect(sql).toContain('bpcp_process_audit_event');
    expect(sql).toContain('bpcp_process_event_outbox');
    expect(sql).toContain('bpcp_process_audit_event_seq');
    expect(sql).toContain('bpcp_process_outbox_event_seq');
  });

  it('drops durable process registry and outbox tables in down migration', async () => {
    const migration = new CreateProcessRegistryOutboxTables1756660000000();
    const query: jest.Mock<Promise<void>, [string]> = jest.fn(async (_statement: string) => undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await migration.down(queryRunner);

    const sql = query.mock.calls.map((call) => call[0]).join('\n');
    expect(sql).toContain('DROP TABLE IF EXISTS "bpcp_process_event_outbox"');
    expect(sql).toContain('DROP TABLE IF EXISTS "bpcp_process_audit_event"');
    expect(sql).toContain('DROP TABLE IF EXISTS "bpcp_process_definition"');
  });
});
