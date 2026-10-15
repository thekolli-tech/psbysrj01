import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Migration Utility and Backup Safety', async (t) => {
  delete process.env.DATABASE_URL;
  delete process.env.NODE_ENV;
  process.env.DB_ENGINE = 'sqlite';
  const { initDatabase } = await import('../src/server/db.ts');
  await initDatabase();

  const {
    backupSqliteDatabase,
    migrateSqliteToPostgres,
    reconcileSqliteAndPostgres
  } = await import('../src/server/postgresMigration.ts');

  await t.test('backupSqliteDatabase creates timestamped .bak.db and JSON snapshot', () => {
    const backupRes = backupSqliteDatabase();
    assert.equal(backupRes.success, true);
    assert.ok(backupRes.backupPath, 'Must have backupPath');
    assert.ok(backupRes.jsonSnapshotPath, 'Must have jsonSnapshotPath');

    assert.ok(fs.existsSync(backupRes.backupPath!), 'Backup DB file must exist on disk');
    assert.ok(fs.existsSync(backupRes.jsonSnapshotPath!), 'JSON snapshot must exist on disk');

    const jsonContent = JSON.parse(fs.readFileSync(backupRes.jsonSnapshotPath!, 'utf8'));
    assert.ok(Array.isArray(jsonContent.users), 'Users array must exist in snapshot');
    assert.ok(Array.isArray(jsonContent.communities), 'Communities array must exist in snapshot');
    assert.ok(Array.isArray(jsonContent.community_posts), 'Posts array must exist in snapshot');
  });

  await t.test('migrateSqliteToPostgres fails safely when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;
    const result = await migrateSqliteToPostgres();
    assert.equal(result.success, false);
    assert.match(result.error || '', /DATABASE_URL is not configured/i);
  });

  await t.test('reconcileSqliteAndPostgres fails safely when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;
    const report = await reconcileSqliteAndPostgres();
    assert.equal(report.reconciled, false);
    assert.match(report.error || '', /DATABASE_URL is not configured/i);
  });
});
