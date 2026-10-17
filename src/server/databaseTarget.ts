import dns from 'node:dns/promises';
import { parse } from 'pg-connection-string';

export type DatabaseDnsResult =
  | 'NOT_CONFIGURED'
  | 'INVALID_URL'
  | 'RESOLVED'
  | 'NOT_FOUND'
  | 'TEMPORARY_FAILURE'
  | 'LOOKUP_FAILED';

/** Hostname, port, and database only. Credentials and query parameters are never copied. */
export interface DatabaseTarget {
  host: string | null;
  port: number | null;
  database: string | null;
  dns: DatabaseDnsResult;
}

function emptyTarget(dnsResult: DatabaseDnsResult): DatabaseTarget {
  return { host: null, port: null, database: null, dns: dnsResult };
}

/**
 * Reports the endpoint `pg` will dial. `pg-connection-string` uses the same
 * URL parser as the driver, including a `host` query parameter overriding the
 * URL hostname.
 */
export async function describeDatabaseTarget(connectionString = process.env.DATABASE_URL): Promise<DatabaseTarget> {
  const raw = typeof connectionString === 'string' ? connectionString.trim() : '';
  if (!raw) return emptyTarget('NOT_CONFIGURED');

  let host: string | null = null;
  let port: number | null = null;
  let database: string | null = null;
  try {
    const parsed = parse(raw);
    host = typeof parsed.host === 'string' && parsed.host.length > 0 ? parsed.host : null;
    const portNumber = parsed.port == null || parsed.port === '' ? NaN : Number(parsed.port);
    port = Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535 ? portNumber : null;
    database = typeof parsed.database === 'string' && parsed.database.length > 0 ? parsed.database : null;
  } catch {
    return emptyTarget('INVALID_URL');
  }

  if (!host) return { host: null, port, database, dns: 'INVALID_URL' };

  try {
    await dns.lookup(host, { all: true });
    return { host, port, database, dns: 'RESOLVED' };
  } catch (err) {
    const code = String((err as { code?: string })?.code || '');
    const dnsResult: DatabaseDnsResult = code === 'ENOTFOUND'
      ? 'NOT_FOUND'
      : code === 'EAI_AGAIN'
        ? 'TEMPORARY_FAILURE'
        : 'LOOKUP_FAILED';
    return { host, port, database, dns: dnsResult };
  }
}
