import test from 'node:test';
import assert from 'node:assert/strict';

test('Database Authoritative and Fail-Closed Guardrails', async (t) => {
  await t.test('isPostgresAuthoritative returns true when DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgresql://fake_user:fake_pass@127.0.0.1:54321/neondb';
    process.env.DB_ENGINE = 'sqlite';
    const { isPostgresAuthoritative, isSqliteExplicit } = await import('../src/server/db.ts');
    assert.equal(isPostgresAuthoritative(), true);
    assert.equal(isSqliteExplicit(), false);
  });

  await t.test('Fails clearly without falling back to SQLite when PostgreSQL is unreachable', async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:1/neondb?sslmode=disable';
    process.env.DB_ENGINE = 'sqlite';
    const { findUserByEmail } = await import('../src/server/db.ts');
    await assert.rejects(
      async () => {
        await findUserByEmail('developer@propertystudio.org');
      },
      (err: any) => err instanceof Error && !/sqlite/i.test(String(err.message)),
      'Should throw a PostgreSQL connection error and refuse SQLite'
    );
  });

  await t.test('Does not open SQLite when DATABASE_URL is unset unless DB_ENGINE=sqlite', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DB_ENGINE;
    const { isPostgresAuthoritative, findUserByEmail } = await import('../src/server/db.ts');
    assert.equal(isPostgresAuthoritative(), false);
    await assert.rejects(
      () => findUserByEmail('developer@propertystudio.org'),
      /SQLite is disabled|No authoritative database/i
    );
  });

  await t.test('Production startup refuses SQLite even when DB_ENGINE=sqlite', async () => {
    delete process.env.DATABASE_URL;
    process.env.DB_ENGINE = 'sqlite';
    process.env.NODE_ENV = 'production';
    const { initDatabase } = await import('../src/server/db.ts');
    await assert.rejects(() => initDatabase(), /Production startup requires DATABASE_URL/i);
    delete process.env.NODE_ENV;
  });
});
