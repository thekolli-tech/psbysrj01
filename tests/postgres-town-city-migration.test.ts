import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';
import { ensurePostgresAdditiveSchema } from '../src/server/postgres.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('PostgreSQL additive schema includes town_city reconciliation', () => {
  // 1. Safe non-destructive additive DDL statement
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE users ADD COLUMN IF NOT EXISTS town_city TEXT;/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE users ADD COLUMN IF NOT EXISTS profession TEXT;/);
  assert.doesNotMatch(POSTGRES_ADDITIVE_SQL, /DROP\s+TABLE|DELETE\s+FROM\s+users/i);
});

test('ensurePostgresAdditiveSchema handles offline or unconfigured environment gracefully', async () => {
  delete process.env.DATABASE_URL;
  // Must return cleanly without throwing
  await assert.doesNotReject(async () => {
    await ensurePostgresAdditiveSchema();
  });
});

test('initDatabase and postgresRepo methods invoke ensurePostgresAdditiveSchema', () => {
  const dbSource = read('src/server/db.ts');
  assert.match(dbSource, /ensurePostgresAdditiveSchema/);
  assert.match(dbSource, /await ensurePostgresAdditiveSchema\(\);/);

  const pgRepoSource = read('src/server/postgresRepo.ts');
  assert.match(pgRepoSource, /ensurePostgresAdditiveSchema/);

  // Called in registration and creation lifecycle
  assert.match(pgRepoSource, /export async function pgRegisterVerifiedUser[\s\S]*?await ensurePostgresAdditiveSchema\(\);/);
  assert.match(pgRepoSource, /export async function pgCreateUser[\s\S]*?await ensurePostgresAdditiveSchema\(\);/);
  assert.match(pgRepoSource, /export async function pgGetAllUsers[\s\S]*?await ensurePostgresAdditiveSchema\(\);/);
  assert.match(pgRepoSource, /export async function pgUpdateProfileFields[\s\S]*?await ensurePostgresAdditiveSchema\(\);/);
});

test('insertPgUser includes town_city with default Hyderabad', () => {
  const pgRepoSource = read('src/server/postgresRepo.ts');
  assert.match(pgRepoSource, /INSERT INTO users \([\s\S]*?town_city[\s\S]*?VALUES/);
  assert.match(pgRepoSource, /data\.townCity\?\.trim\(\) \|\| 'Hyderabad, Telangana, India'/);
});
