import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Vercel invokes one serverless function for every /api path.
 * Some hosts pass the path without the /api prefix. Express routes keep the prefix.
 */
export function expressPathForHostedRequest(url: string | undefined): string {
  const raw = url && url.length > 0 ? url : '/';
  const queryIndex = raw.indexOf('?');
  const path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : raw.slice(queryIndex);
  if (path === '/api' || path.startsWith('/api/')) return raw;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `/api${suffix}${query}`;
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

const DATABASE_UNAVAILABLE = {
  error: 'The registration service is unavailable. No account was created.',
  code: 'SERVICE_UNAVAILABLE'
} as const;

const REQUEST_FAILED = {
  error: 'The server could not complete that request. No account was created.',
  code: 'REQUEST_FAILED'
} as const;

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
        }, () => {
          endJson(res, 503, DATABASE_UNAVAILABLE, isSettled);
        });
    });
  };
}
