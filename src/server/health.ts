import { describeDatabaseTarget } from './databaseTarget.ts';
import { checkPostgresHealth, checkSchemaReadiness } from './postgres.ts';
import { getSqliteDb, isPostgresAuthoritative, isSqliteExplicit } from './db.ts';
import { paymentsStatus } from './commerce.ts';
import { configuredWhatsAppProviders } from './notifications.ts';
import { REQUIRED_TABLES } from './platformSchema.ts';

function nonEmpty(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

/** Presence only. Names are the keys; values, lengths, and secrets are never copied. */
export function environmentPresence(): {
  DATABASE_URL: boolean;
  RESEND_API_KEY: boolean;
  OTP_HASH_SECRET: boolean;
  EMAIL_FROM: boolean;
  WHATSAPP_ACCESS_TOKEN: boolean;
  WHATSAPP_PHONE_NUMBER_ID: boolean;
  WHATSAPP_OTP_TEMPLATE_NAME: boolean;
  WHATSAPP_GRAPH_API_VERSION: boolean;
  WHATSAPP_OTP_TEMPLATE_LANGUAGE: boolean;
} {
  return {
    DATABASE_URL: nonEmpty('DATABASE_URL'),
    RESEND_API_KEY: nonEmpty('RESEND_API_KEY'),
    OTP_HASH_SECRET: nonEmpty('OTP_HASH_SECRET'),
    EMAIL_FROM: nonEmpty('EMAIL_FROM'),
    WHATSAPP_ACCESS_TOKEN: nonEmpty('WHATSAPP_ACCESS_TOKEN'),
    WHATSAPP_PHONE_NUMBER_ID: nonEmpty('WHATSAPP_PHONE_NUMBER_ID'),
    WHATSAPP_OTP_TEMPLATE_NAME: nonEmpty('WHATSAPP_OTP_TEMPLATE_NAME'),
    WHATSAPP_GRAPH_API_VERSION: nonEmpty('WHATSAPP_GRAPH_API_VERSION'),
    WHATSAPP_OTP_TEMPLATE_LANGUAGE: nonEmpty('WHATSAPP_OTP_TEMPLATE_LANGUAGE')
  };
}

function deploymentIdentity(): { commit: string | null; ref: string | null; target: string | null } {
  return {
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    ref: process.env.VERCEL_GIT_COMMIT_REF?.trim() || null,
    target: process.env.VERCEL_ENV?.trim() || null
  };
}

function configurationFlags(): {
  database: boolean;
  emailProvider: boolean;
  emailSender: boolean;
  otpPepper: boolean;
  whatsapp: boolean;
} {
  const configuredSender = (process.env.EMAIL_FROM || process.env.RESEND_FROM || '').trim();
  return {
    database: nonEmpty('DATABASE_URL'),
    emailProvider: nonEmpty('RESEND_API_KEY'),
    emailSender: configuredSender.length > 0 && /@propertystudio\.org\b/i.test(configuredSender),
    otpPepper: nonEmpty('OTP_HASH_SECRET'),
    whatsapp: configuredWhatsAppProviders().length > 0
  };
}

function publicDiagnostics(): {
  configuration: ReturnType<typeof configurationFlags>;
  environment: ReturnType<typeof environmentPresence>;
  deployment: ReturnType<typeof deploymentIdentity>;
} {
  return {
    configuration: configurationFlags(),
    environment: environmentPresence(),
    deployment: deploymentIdentity()
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
    const target = await describeDatabaseTarget();
    const connection = await checkPostgresHealth();
    const schema = connection.connected
      ? await checkSchemaReadiness()
      : { ready: false, missing: [], connected: false, error: connection.error };
    const driverError = connection.error || schema.error;
    if (driverError) {
      console.error(`[Property Studio] Database health check failed (${connection.failure || 'UNKNOWN'}): ${driverError}`);
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
          code: databaseCode(true, connection.connected, schema.ready),
          failure: connection.connected ? null : (connection.failure || 'UNKNOWN'),
          target
        },
        ...publicDiagnostics(),
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
          code: schema.ready ? null : 'SCHEMA_NOT_READY',
          failure: null
        },
        ...publicDiagnostics(),
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
        code: 'DATABASE_NOT_CONFIGURED',
        failure: null
      },
      ...publicDiagnostics(),
      payments,
      uptime,
      timestamp
    }
  };
}
