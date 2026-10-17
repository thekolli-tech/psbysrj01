import assert from 'node:assert/strict';
import test from 'node:test';
import { describeDatabaseTarget } from '../src/server/databaseTarget.ts';

test('database target reports the parsed endpoint and DNS result without secrets', async () => {
  const missing = await describeDatabaseTarget('   ');
  assert.deepEqual(missing, { host: null, port: null, database: null, dns: 'NOT_CONFIGURED' });

  const unresolved = await describeDatabaseTarget(
    'postgres://dbuser:secret-value@example.invalid:5432/appdb?sslmode=require&channel_binding=require'
  );
  assert.deepEqual(unresolved, {
    host: 'example.invalid',
    port: 5432,
    database: 'appdb',
    dns: 'NOT_FOUND'
  });

  const overridden = await describeDatabaseTarget(
    'postgres://dbuser:secret-value@pooled.db.prisma.io:5432/postgres?sslmode=require&host=example.invalid'
  );
  assert.equal(overridden.host, 'example.invalid');
  assert.equal(overridden.database, 'postgres');
  assert.equal(overridden.dns, 'NOT_FOUND');

  const quoted = await describeDatabaseTarget(
    'postgres://dbuser:secret-value@"pooled.db.prisma.io":5432/postgres?sslmode=require'
  );
  assert.equal(quoted.host, '"pooled.db.prisma.io"');
  assert.equal(quoted.dns, 'NOT_FOUND');

  const local = await describeDatabaseTarget('postgres://dbuser:secret-value@localhost:5432/postgres?sslmode=require');
  assert.equal(local.host, 'localhost');
  assert.equal(local.port, 5432);
  assert.equal(local.database, 'postgres');
  assert.equal(local.dns, 'RESOLVED');

  const serialized = JSON.stringify({ missing, unresolved, overridden, quoted, local });
  assert.equal(serialized.includes('secret-value'), false);
  assert.equal(serialized.includes('dbuser'), false);
  assert.equal(serialized.includes('sslmode'), false);
  assert.equal(serialized.includes('channel_binding'), false);
  assert.equal(serialized.includes('postgres://'), false);
});
