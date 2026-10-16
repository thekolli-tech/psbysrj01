import { app, initDatabase, expressPathForHostedRequest } from '../dist-server/index.mjs';

let ready = null;

function ensureDatabase() {
  if (!ready) {
    ready = initDatabase().catch(err => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export default async function handler(req, res) {
  try {
    await ensureDatabase();
  } catch {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'The registration service is unavailable. No account was created.',
      code: 'SERVICE_UNAVAILABLE'
    }));
    return;
  }
  req.url = expressPathForHostedRequest(req.url);
  return app(req, res);
}
