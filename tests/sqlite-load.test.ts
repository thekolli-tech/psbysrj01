import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('database module does not load node:sqlite until SQLite is permitted', () => {
  const source = fs.readFileSync(new URL('../src/server/db.ts', import.meta.url), 'utf8');
  assert.equal(/^\s*import\s+[^;]*from\s+['"]node:sqlite['"]/m.test(source), false);
  assert.match(source, /getBuiltinModule\('node:' \+ 'sqlite'\)/);

  const child = spawnSync(process.execPath, [
    '--import', 'tsx',
    '--input-type=module',
    '-e',
    `process.env.NODE_ENV = 'production';
     process.env.DB_ENGINE = 'sqlite';
     process.env.DATABASE_URL = '';
     const db = await import('./src/server/db.ts');
     try {
       db.getSqliteDb();
       console.log('OPENED');
     } catch {
       console.log('REFUSED');
     }`
  ], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DB_ENGINE: 'sqlite',
      DATABASE_URL: ''
    }
  });

  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /REFUSED/);
  assert.equal(child.stdout.includes('OPENED'), false);
  assert.equal(child.stderr.includes('SQLite is an experimental feature'), false);
  assert.equal(child.stderr.includes('postgresql://'), false);
});
