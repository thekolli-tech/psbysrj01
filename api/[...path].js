import { app, initDatabase, expressPathForHostedRequest, createHostedApiHandler } from '../dist-server/index.mjs';

export default createHostedApiHandler({
  app,
  initDatabase,
  expressPathForHostedRequest
});
