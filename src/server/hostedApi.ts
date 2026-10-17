import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vercel invokes one serverless function for every /api path.
 * Some hosts pass the path without the /api prefix. Express routes keep the prefix.
 */
const ROUTE_MARKER = '__ps_path';

function isCollapsedFunctionPath(path: string): boolean {
  return path === '/api' || path === '/api/' || path === '/api/index' || path === '/api/index/';
}

/**
 * Restores the public /api path after Vercel rewrites a nested route to the
 * single function. A host query marker is accepted only on that function path.
 */
export function expressPathForHostedRequest(url: string | undefined): string {
  const raw = url && url.length > 0 ? url : '/';
  let parsed: URL;
  try {
    parsed = new URL(raw, 'http://localhost');
  } catch {
    return '/api';
  }
  const path = parsed.pathname || '/';
  const marker = parsed.searchParams.get(ROUTE_MARKER);
  if (marker && isCollapsedFunctionPath(path)) {
    parsed.searchParams.delete(ROUTE_MARKER);
    let normalized = marker;
    try {
      normalized = decodeURIComponent(marker);
    } catch {
      return '/api';
    }
    normalized = normalized.replace(/^\/+/, '');
    if (!/^[A-Za-z0-9/_-]{1,200}$/.test(normalized) || normalized.includes('..')) return '/api';
    const suffix = normalized.startsWith('api/') ? `/${normalized}` : `/api/${normalized}`;
    const query = parsed.searchParams.toString();
    return query ? `${suffix}?${query}` : suffix;
  }
  if (path === '/api' || path.startsWith('/api/')) return `${path}${parsed.search}`;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `/api${suffix}${parsed.search}`;
}

export function registrationFailureMessage(status: number): string {
  if (status === 404) {
    return 'The registration service is not available on this site yet. No account was created.';
  }
  return 'The server could not complete that request. No account was created.';
}

export interface HostedHandlerResult {
  completed: boolean;
}

interface HostedApp {
  (req: IncomingMessage, res: ServerResponse): unknown;
}

const REQUEST_FAILED = {
  error: 'The server could not complete that request. No account was created.',
  code: 'REQUEST_FAILED'
} as const;

export type DatabaseStartupCode =
  | 'DATABASE_NOT_CONFIGURED'
  | 'DATABASE_UNREACHABLE'
  | 'SCHEMA_NOT_READY'
  | 'DATABASE_STARTUP_FAILED';

export interface DatabaseStartupFailure {
  error: string;
  code: DatabaseStartupCode;
  logDetail: string;
}

/** Maps a startup exception to a public code. The log detail never keeps a connection string. */
export function classifyDatabaseStartupFailure(error: unknown): DatabaseStartupFailure {
  const raw = error instanceof Error ? error.message : String(error || 'Database startup failed');
  const logDetail = raw
    .replace(/postgres(?:ql)?:\/\/[^\s'")]+/gi, 'postgresql://[redacted]')
    .slice(0, 300);
  if (/DATABASE_URL|No authoritative database configured/i.test(raw)) {
    return {
      code: 'DATABASE_NOT_CONFIGURED',
      error: 'Registration is not configured for this deployment. No account was created.',
      logDetail
    };
  }
  if (/schema is not ready/i.test(raw)) {
    return {
      code: 'SCHEMA_NOT_READY',
      error: 'The registration database schema is not ready. No account was created.',
      logDetail
    };
  }
  if (/PostgreSQL is unavailable|connection failed|ECONN|ETIMEDOUT|timeout/i.test(raw)) {
    return {
      code: 'DATABASE_UNREACHABLE',
      error: 'The registration database could not be reached. No account was created.',
      logDetail
    };
  }
  return {
    code: 'DATABASE_STARTUP_FAILED',
    error: 'The registration service is unavailable. No account was created.',
    logDetail
  };
}

function requestPath(url: string | undefined, rewrite: (value: string | undefined) => string): string {
  const rewritten = rewrite(url);
  const queryIndex = rewritten.indexOf('?');
  return queryIndex === -1 ? rewritten : rewritten.slice(0, queryIndex);
}

function isReadOnlyHealth(req: IncomingMessage, rewrite: (value: string | undefined) => string): boolean {
  const method = (req.method || 'GET').toUpperCase();
  return (method === 'GET' || method === 'HEAD') && requestPath(req.url, rewrite) === '/api/health';
}

function endJson(res: ServerResponse, statusCode: number, payload: { error: string; code: string }, settled: () => boolean): void {
  if (settled() || res.writableEnded || res.destroyed) return;
  try {
    res.statusCode = statusCode;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  } catch {
    // The socket is already gone. The close listener settles the handler.
  }
}

/**
 * Keeps the Vercel function promise pending until the Node response finishes
 * or the connection closes. Express returns before async routes write the body.
 */
export function createHostedApiHandler(deps: {
  app: HostedApp;
  initDatabase: () => Promise<void>;
  expressPathForHostedRequest: (url: string | undefined) => string;
}): (req: IncomingMessage, res: ServerResponse) => Promise<HostedHandlerResult> {
  return function hostedApiHandler(req, res) {
    return new Promise((resolve) => {
      let settled = false;
      const isSettled = () => settled;
      const settle = (completed: boolean) => {
        if (settled) return;
        settled = true;
        res.removeListener('finish', onFinish);
        res.removeListener('close', onClose);
        resolve({ completed });
      };
      const onFinish = () => settle(true);
      const onClose = () => settle(res.writableFinished === true);

      res.once('finish', onFinish);
      res.once('close', onClose);
      if (res.writableFinished) {
        settle(true);
        return;
      }

      Promise.resolve()
        .then(() => deps.initDatabase())
        .then(() => {
          if (settled || res.writableEnded || res.destroyed) return;
          try {
            req.url = deps.expressPathForHostedRequest(req.url);
            deps.app(req, res);
          } catch {
            endJson(res, 500, REQUEST_FAILED, isSettled);
          }
        }, (error: unknown) => {
          const failure = classifyDatabaseStartupFailure(error);
          console.error(`[Property Studio] Database startup failed (${failure.code}): ${failure.logDetail}`);
          if (settled || res.writableEnded || res.destroyed) return;
          if (isReadOnlyHealth(req, deps.expressPathForHostedRequest)) {
            try {
              req.url = deps.expressPathForHostedRequest(req.url);
              deps.app(req, res);
            } catch {
              endJson(res, 500, REQUEST_FAILED, isSettled);
            }
            return;
          }
          endJson(res, 503, { error: failure.error, code: failure.code }, isSettled);
        });
    });
  };
}
