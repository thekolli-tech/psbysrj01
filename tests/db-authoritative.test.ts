import test from 'node:test';
import assert from 'node:assert/strict';

test('Database Authoritative and Fail-Closed Guardrails', async (t) => {
  await t.test('isPostgresAuthoritative returns true when DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgresql://fake_user:fake_pass@127.0.0.1:54321/neondb';
    const { isPostgresAuthoritative } = await import('../src/server/db.ts');
    assert.equal(isPostgresAuthoritative(), true);
  });

  await t.test('Fails clearly without falling back to SQLite when PostgreSQL is unreachable', async () => {
    // Set unreachable DATABASE_URL pointing to closed port 1
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:1/neondb?sslmode=disable';
    
    const { findUserByEmail } = await import('../src/server/db.ts');
    
    // Attempting query MUST throw, NOT return SQLite data!
    await assert.rejects(
      async () => {
        await findUserByEmail('developer@propertystudio.org');
      },
      (err: any) => {
        return err instanceof Error;
      },
      'Should throw connection error and refuse to fall back to SQLite'
    );
  });

  await t.test('Falls back to SQLite ONLY when DATABASE_URL is completely unset/empty', async () => {
    delete process.env.DATABASE_URL;
    const { isPostgresAuthoritative, findUserByEmail } = await import('../src/server/db.ts');
    assert.equal(isPostgresAuthoritative(), false);

    // In local dev SQLite mode, developer account should exist
    const dev = await findUserByEmail('developer@propertystudio.org');
    assert.ok(dev, 'Should find developer user in local SQLite');
    assert.equal(dev.email, 'developer@propertystudio.org');
  });
});
