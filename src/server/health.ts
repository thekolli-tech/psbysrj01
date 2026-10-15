import { checkPostgresHealth, checkSchemaReadiness } from './postgres.ts';
import { getSqliteDb, isPostgresAuthoritative, isSqliteExplicit } from './db.ts';
import { paymentsStatus } from './commerce.ts';
import { REQUIRED_TABLES } from './platformSchema.ts';

function sqliteSchemaStatus(): { ready: boolean; missing: string[] } {
  const rows = getSqliteDb().prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as { name: string }[];
  const names = new Set(rows.map(row => row.name));
  const missing = REQUIRED_TABLES.filter(table => !names.has(table));
  return { ready: missing.length === 0, missing: [...missing] };
}

export async function buildHealthReport(): Promise<{ httpStatus: number; body: Record<string, unknown> }> {
  const payments = paymentsStatus();
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  if (isPostgresAuthoritative()) {
    const connection = await checkPostgresHealth();
    const schema = connection.connected
      ? await checkSchemaReadiness()
      : { ready: false, missing: [], connected: false, error: connection.error };
    const ok = connection.connected && schema.ready;
    return {
      httpStatus: ok ? 200 : 503,
      body: {
        status: ok ? 'OK' : 'UNAVAILABLE',
        authoritativeDatabase: 'postgresql',
        sqliteFallback: false,
        database: {
          connected: connection.connected,
          schemaReady: schema.ready,
          missingTables: schema.missing,
          latencyMs: connection.latencyMs,
          error: connection.error || schema.error || null
        },
        payments,
        uptime,
        timestamp
      }
    };
  }

  if (isSqliteExplicit() && process.env.NODE_ENV !== 'production') {
    const schema = sqliteSchemaStatus();
    return {
      httpStatus: schema.ready ? 200 : 503,
      body: {
        status: schema.ready ? 'OK' : 'UNAVAILABLE',
        authoritativeDatabase: 'sqlite',
        sqliteFallback: false,
        explicitLocalSqlite: true,
        database: { connected: true, schemaReady: schema.ready, missingTables: schema.missing },
        payments,
        uptime,
        timestamp
      }
    };
  }

  return {
    httpStatus: 503,
    body: {
      status: 'UNAVAILABLE',
      authoritativeDatabase: 'unconfigured',
      sqliteFallback: false,
      database: { connected: false, schemaReady: false, missingTables: [] },
      payments,
      uptime,
      timestamp,
      error: 'Set DATABASE_URL for Neon PostgreSQL. SQLite is available only when DB_ENGINE=sqlite and NODE_ENV is not production.'
    }
  };
}
