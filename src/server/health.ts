import { checkPostgresHealth, checkSchemaReadiness } from './postgres.ts';
import { getSqliteDb, isPostgresAuthoritative, isSqliteExplicit } from './db.ts';
import { paymentsStatus } from './commerce.ts';
import { configuredSmsProviders, emailFromAddress } from './notifications.ts';
import { REQUIRED_TABLES } from './platformSchema.ts';

function configurationFlags(): {
  database: boolean;
  emailProvider: boolean;
  emailSender: boolean;
  otpPepper: boolean;
  sms: boolean;
} {
  return {
    database: Boolean(process.env.DATABASE_URL),
    emailProvider: Boolean(process.env.RESEND_API_KEY),
    emailSender: /@propertystudio\.org\b/i.test(emailFromAddress()),
    otpPepper: Boolean(process.env.OTP_HASH_SECRET),
    sms: configuredSmsProviders().length > 0
  };
}

function databaseCode(configured: boolean, connected: boolean, schemaReady: boolean): string | null {
  if (!configured) return 'DATABASE_NOT_CONFIGURED';
  if (!connected) return 'DATABASE_UNREACHABLE';
  if (!schemaReady) return 'SCHEMA_NOT_READY';
  return null;
}

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
    const driverError = connection.error || schema.error;
    if (driverError) {
      console.error(`[Property Studio] Database health check failed: ${driverError}`);
    }
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
          code: databaseCode(true, connection.connected, schema.ready)
        },
        configuration: configurationFlags(),
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
        database: {
          connected: true,
          schemaReady: schema.ready,
          missingTables: schema.missing,
          code: schema.ready ? null : 'SCHEMA_NOT_READY'
        },
        configuration: configurationFlags(),
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
      database: {
        connected: false,
        schemaReady: false,
        missingTables: [],
        code: 'DATABASE_NOT_CONFIGURED'
      },
      configuration: configurationFlags(),
      payments,
      uptime,
      timestamp
    }
  };
}
