import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';
import test from 'node:test';
import { createHostedApiHandler, type HostedHandlerResult } from '../src/server/hostedApi.ts';

interface RunningServer {
  port: number;
  events: string[];
  started: Promise<void>;
  pending: () => Promise<HostedHandlerResult>;
  close: () => Promise<void>;
}

function openServer(
  app: (req: IncomingMessage, res: ServerResponse) => unknown,
  initDatabase: () => Promise<void>
): Promise<RunningServer> {
  const events: string[] = [];
  let pending: Promise<HostedHandlerResult> | null = null;
  let markStarted: () => void = () => undefined;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const handler = createHostedApiHandler({
    app,
    initDatabase,
    expressPathForHostedRequest: (url) => {
      const raw = url && url.length > 0 ? url : '/';
      if (raw === '/api' || raw.startsWith('/api/')) return raw;
      return `/api${raw.startsWith('/') ? raw : `/${raw}`}`;
    }
  });
  const server = http.createServer((req, res) => {
    const originalEnd = res.end.bind(res);
    res.end = ((...args: Parameters<typeof res.end>) => {
      events.push('end');
      return originalEnd(...args);
    }) as typeof res.end;
    pending = handler(req, res).then((result) => {
      events.push('settled');
      return result;
    });
    markStarted();
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        port: address.port,
        events,
        started,
        pending: () => {
          if (!pending) throw new Error('The handler was not called.');
          return pending;
        },
        close: () => new Promise((done) => {
          server.closeAllConnections();
          server.close(() => done());
        })
      });
    });
  });
}

function get(port: number, path: string): Promise<{ status: number; body: string; type: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
          type: String(res.headers['content-type'] || '')
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} did not settle`)), 1000);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

test('hosted handler stays pending until the response is written', async () => {
  let settled = false;
  let seenUrl = '';
  const server = await openServer((req, res) => {
    setTimeout(() => {
      assert.equal(settled, false);
      seenUrl = req.url || '';
      res.statusCode = 201;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ready: true }));
    }, 40);
  }, async () => undefined);

  try {
    const responsePromise = get(server.port, '/health?ready=1');
    await server.started;
    const pending = server.pending();
    pending.then(() => {
      settled = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(settled, false);

    const response = await responsePromise;
    const result = await withTimeout(pending, 'normal response');
    assert.equal(seenUrl, '/api/health?ready=1');
    assert.equal(response.status, 201);
    assert.match(response.type, /application\/json/);
    assert.deepEqual(JSON.parse(response.body), { ready: true });
    assert.deepEqual(result, { completed: true });
    assert.deepEqual(server.events, ['end', 'settled']);
  } finally {
    await server.close();
  }
});

test('database startup failure returns the JSON contract after the response finishes', async () => {
  let appCalled = false;
  const logged: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args.map((item) => String(item)).join(' '));
  };
  const server = await openServer(() => {
    appCalled = true;
  }, async () => {
    throw new Error('connect ECONNREFUSED postgresql://user:secret@127.0.0.1/neondb');
  });

  try {
    const response = await get(server.port, '/api/auth/register');
    const result = await withTimeout(server.pending(), 'database failure');
    assert.equal(appCalled, false);
    assert.equal(response.status, 503);
    assert.match(response.type, /application\/json/);
    assert.deepEqual(JSON.parse(response.body), {
      error: 'The registration database could not be reached. No account was created.',
      code: 'DATABASE_UNREACHABLE'
    });
    assert.equal(response.body.includes('secret'), false);
    assert.equal(response.body.includes('postgresql://'), false);
    assert.match(logged.join('\n'), /DATABASE_UNREACHABLE/);
    assert.match(logged.join('\n'), /postgresql:\/\/\[redacted\]/);
    assert.equal(logged.join('\n').includes('secret'), false);
    assert.deepEqual(result, { completed: true });
    assert.deepEqual(server.events, ['end', 'settled']);
  } finally {
    console.error = originalError;
    await server.close();
  }
});

test('a missing database configuration blocks registration and still serves health', async () => {
  let seenUrl = '';
  const server = await openServer((req, res) => {
    seenUrl = req.url || '';
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      status: 'UNAVAILABLE',
      database: { connected: false, schemaReady: false, code: 'DATABASE_NOT_CONFIGURED' }
    }));
  }, async () => {
    throw new Error('Production startup requires DATABASE_URL. Refusing to start on SQLite or an unconfigured database.');
  });

  try {
    const response = await get(server.port, '/health');
    const result = await withTimeout(server.pending(), 'health during startup failure');
    assert.equal(seenUrl, '/api/health');
    assert.equal(response.status, 503);
    assert.equal(JSON.parse(response.body).database.code, 'DATABASE_NOT_CONFIGURED');
    assert.equal(response.body.includes('DATABASE_URL'), false);
    assert.deepEqual(result, { completed: true });
  } finally {
    await server.close();
  }
});

test('registration stays closed when startup fails for a reason other than health', async () => {
  let appCalled = false;
  const server = await openServer(() => {
    appCalled = true;
  }, async () => {
    throw new Error('PostgreSQL schema is not ready. Missing: otps. Run npm run db:init.');
  });

  try {
    const response = await get(server.port, '/api/auth/send-email-otp');
    await withTimeout(server.pending(), 'schema startup failure');
    assert.equal(appCalled, false);
    assert.equal(response.status, 503);
    assert.equal(JSON.parse(response.body).code, 'SCHEMA_NOT_READY');
    assert.equal(response.body.includes('otps'), false);
  } finally {
    await server.close();
  }
});

test('a synchronous app failure settles with a safe JSON response', async () => {
  const server = await openServer(() => {
    throw new Error('postgresql://user:secret@127.0.0.1/neondb');
  }, async () => undefined);

  try {
    const response = await get(server.port, '/api/auth/register');
    const result = await withTimeout(server.pending(), 'synchronous failure');
    assert.equal(response.status, 500);
    assert.deepEqual(JSON.parse(response.body), {
      error: 'The server could not complete that request. No account was created.',
      code: 'REQUEST_FAILED'
    });
    assert.equal(response.body.includes('secret'), false);
    assert.deepEqual(result, { completed: true });
    assert.deepEqual(server.events, ['end', 'settled']);
  } finally {
    await server.close();
  }
});

test('premature close settles as an incomplete response and does not start the app', async () => {
  let appCalled = false;
  const server = await openServer(() => {
    appCalled = true;
  }, () => new Promise(() => undefined));

  const request = http.request({ host: '127.0.0.1', port: server.port, path: '/api/health', method: 'GET' });
  request.on('error', () => undefined);
  request.end();
  try {
    await server.started;
    request.destroy();
    const result = await withTimeout(server.pending(), 'premature close');
    assert.deepEqual(result, { completed: false });
    assert.equal(appCalled, false);
    assert.deepEqual(server.events, ['settled']);
  } finally {
    request.destroy();
    await server.close();
  }
});

test('closing the socket after routing starts settles without waiting for a later write', async () => {
  const server = await openServer((req) => {
    req.destroy();
  }, async () => undefined);

  const request = http.request({ host: '127.0.0.1', port: server.port, path: '/api/health', method: 'GET' });
  request.on('error', () => undefined);
  request.end();
  try {
    await server.started;
    const result = await withTimeout(server.pending(), 'closed socket');
    assert.deepEqual(result, { completed: false });
    assert.equal(server.events.includes('settled'), true);
    assert.equal(server.events.includes('end'), false);
  } finally {
    request.destroy();
    await server.close();
  }
});
