import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import {
  checkRateLimit,
  rejectIfRateLimitedAsync,
  allowMemoryRequest,
  clientKey,
  resolveRateKey,
  getRateLimiterStatus,
  RATE_LIMIT_TIERS
} from '../src/server/rateLimit.ts';
import {
  isWebhookEventDuplicate,
  resetWebhookDedupForTesting
} from '../src/server/webhookSecurity.ts';

test('Phase 4B.1: Upstash Redis Rate-Limiting & Webhook Deduplication Integration Suite', async (t) => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    resetWebhookDedupForTesting();
  });

  const MOCK_REDIS_URL = 'https://mock-redis.upstash.io';
  const MOCK_REDIS_TOKEN = 'test-token-valid-mock-12345';

  // Helper to create mock Express request and response
  function createMockContext(ip = '198.51.100.25', user?: { id: string }) {
    const headers: Record<string, string> = { 'x-forwarded-for': ip };
    const resHeaders: Record<string, string> = {};
    let statusCode = 200;
    let jsonBody: any = null;

    const req = {
      ip,
      headers,
      socket: { remoteAddress: ip },
      user
    } as unknown as Request;

    const res = {
      setHeader: (name: string, value: string) => {
        resHeaders[name.toLowerCase()] = value;
        return res;
      },
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        jsonBody = body;
        return res;
      }
    } as unknown as Response;

    return {
      req,
      res,
      getHeaders: () => resHeaders,
      getStatus: () => statusCode,
      getBody: () => jsonBody
    };
  }

  // ============================================================================
  // 1. REDIS-BACKED RATE-LIMIT SUCCESS & PIPELINE VERIFICATION
  // ============================================================================
  await t.test('1. Redis-backed rate-limit success under threshold reports upstash_redis', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;
    process.env.RATE_LIMIT_KEY_SECRET = 'test-salt-secret';

    let capturedEndpoint = '';
    let capturedAuth = '';
    let capturedCommands: any[] = [];

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedEndpoint = String(url);
      capturedAuth = String((init?.headers as any)?.Authorization || '');
      capturedCommands = JSON.parse(String(init?.body || '[]'));

      // Upstash pipeline response: INCR -> 1, PEXPIRE NX -> 1, PTTL -> 59000
      return new Response(JSON.stringify([
        { result: 1 },
        { result: 1 },
        { result: 59000 }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const key = 'test_redis_success_key';
    const result = await checkRateLimit(key, 5, 60000);

    assert.equal(result.allowed, true);
    assert.equal(result.engine, 'upstash_redis');
    assert.equal(result.totalHits, 1);
    assert.equal(result.remaining, 4);
    assert.equal(result.retryAfterSeconds, 0);

    assert.equal(capturedEndpoint, `${MOCK_REDIS_URL}/pipeline`);
    assert.equal(capturedAuth, `Bearer ${MOCK_REDIS_TOKEN}`);
    assert.equal(capturedCommands.length, 3);
    assert.deepEqual(capturedCommands[0], ['INCR', key]);
    assert.deepEqual(capturedCommands[1], ['PEXPIRE', key, '60000', 'NX']);
    assert.deepEqual(capturedCommands[2], ['PTTL', key]);
  });

  // ============================================================================
  // 2. REDIS-BACKED REJECTION AFTER CONFIGURED THRESHOLD
  // ============================================================================
  await t.test('2. Rate-limit rejection after threshold returns 429 with Retry-After and upstash_redis', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;
    process.env.RATE_LIMIT_KEY_SECRET = 'test-salt-secret';

    globalThis.fetch = (async () => {
      // Upstash pipeline response: hits exceed limit (6 > 5), pttl is 42000 ms
      return new Response(JSON.stringify([
        { result: 6 },
        { result: 0 },
        { result: 42000 }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const ctx = createMockContext();
    const rejected = await rejectIfRateLimitedAsync(ctx.req, ctx.res, 'login', 'test@example.com');

    assert.equal(rejected, true);
    assert.equal(ctx.getStatus(), 429);
    assert.equal(ctx.getHeaders()['x-ratelimit-engine'], 'upstash_redis');
    assert.equal(ctx.getHeaders()['x-ratelimit-limit'], '5');
    assert.equal(ctx.getHeaders()['x-ratelimit-remaining'], '0');
    assert.equal(ctx.getHeaders()['retry-after'], '42');
    assert.equal(ctx.getBody().code, 'RATE_LIMIT_EXCEEDED');
    assert.match(ctx.getBody().error, /Too many attempts for login/);
    assert.equal(ctx.getBody().retryAfter, 42);
  });

  // ============================================================================
  // 3. CORRECT COUNTER EXPIRATION (PEXPIRE NX AND PTTL)
  // ============================================================================
  await t.test('3. Redis commands enforce atomic PEXPIRE NX and read PTTL correctly', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;

    let executedCommands: any[] = [];
    globalThis.fetch = (async (_url: any, init: any) => {
      executedCommands = JSON.parse(init.body);
      return new Response(JSON.stringify([
        { result: 3 },
        { result: 0 },
        { result: 15400 }
      ]), { status: 200 });
    }) as typeof fetch;

    const result = await checkRateLimit('key_ttl_check', 10, 300000);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 7);
    assert.deepEqual(executedCommands[1], ['PEXPIRE', 'key_ttl_check', '300000', 'NX']);
    assert.deepEqual(executedCommands[2], ['PTTL', 'key_ttl_check']);
  });

  // ============================================================================
  // 4. CONCURRENT REQUESTS UNDER REDIS
  // ============================================================================
  await t.test('4. Concurrent requests are processed atomically through Redis pipelines', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;

    let counter = 0;
    globalThis.fetch = (async () => {
      counter += 1;
      const current = counter;
      return new Response(JSON.stringify([
        { result: current },
        { result: 1 },
        { result: 60000 }
      ]), { status: 200 });
    }) as typeof fetch;

    const promises = Array.from({ length: 5 }, () => checkRateLimit('concurrent_key', 10, 60000));
    const results = await Promise.all(promises);

    assert.equal(results.length, 5);
    for (const r of results) {
      assert.equal(r.allowed, true);
      assert.equal(r.engine, 'upstash_redis');
    }
    // Final counter must have reached 5
    assert.equal(counter, 5);
  });

  // ============================================================================
  // 5. REDIS TIMEOUT & CONNECTION FAILURE FALLBACK
  // ============================================================================
  await t.test('5. Redis HTTP 500 or network timeout safely falls back to local memory store', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;

    // Simulate network error
    globalThis.fetch = (async () => {
      throw new Error('ETIMEDOUT connection failed');
    }) as typeof fetch;

    const ctx = createMockContext();
    const rejected = await rejectIfRateLimitedAsync(ctx.req, ctx.res, 'login', 'failover@example.com');

    // First request should be allowed by memory fallback
    assert.equal(rejected, false);
    assert.equal(ctx.getHeaders()['x-ratelimit-engine'], 'memory_fallback');
  });

  // ============================================================================
  // 6. MEMORY FALLBACK BOUNDED ENFORCEMENT
  // ============================================================================
  await t.test('6. Memory fallback enforces strict limits and prunes expired records', () => {
    const key = `test_memory_enforce_${Date.now()}`;
    const limit = 2;
    const windowMs = 5000;

    const r1 = allowMemoryRequest(key, limit, windowMs);
    assert.equal(r1.allowed, true);
    assert.equal(r1.engine, 'memory_fallback');
    assert.equal(r1.remaining, 1);

    const r2 = allowMemoryRequest(key, limit, windowMs);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 0);

    const r3 = allowMemoryRequest(key, limit, windowMs);
    assert.equal(r3.allowed, false);
    assert.equal(r3.engine, 'memory_fallback');
    assert.ok(r3.retryAfterSeconds > 0 && r3.retryAfterSeconds <= 5);
  });

  // ============================================================================
  // 7. REDIS RECOVERY AFTER FAILURE
  // ============================================================================
  await t.test('7. Redis recovery immediately restores upstash_redis engine after outage', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;

    let shouldFail = true;
    globalThis.fetch = (async () => {
      if (shouldFail) {
        throw new Error('Upstash unreachable');
      }
      return new Response(JSON.stringify([
        { result: 1 },
        { result: 1 },
        { result: 58000 }
      ]), { status: 200 });
    }) as typeof fetch;

    // Outage phase
    const failResult = await checkRateLimit('recovery_key', 5, 60000);
    assert.equal(failResult.engine, 'memory_fallback');

    // Recovery phase
    shouldFail = false;
    const recoverResult = await checkRateLimit('recovery_key', 5, 60000);
    assert.equal(recoverResult.engine, 'upstash_redis');
  });

  // ============================================================================
  // 8. ACCURATE RATE-LIMIT ENGINE HEADERS
  // ============================================================================
  await t.test('8. X-RateLimit-Engine accurately distinguishes upstash_redis from memory_fallback', async () => {
    // Mode A: Redis enabled
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify([{ result: 1 }, { result: 1 }, { result: 60000 }]), { status: 200 });
    }) as typeof fetch;

    const ctxRedis = createMockContext();
    await rejectIfRateLimitedAsync(ctxRedis.req, ctxRedis.res, 'google-auth');
    assert.equal(ctxRedis.getHeaders()['x-ratelimit-engine'], 'upstash_redis');

    // Mode B: Redis unconfigured
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const ctxMemory = createMockContext();
    await rejectIfRateLimitedAsync(ctxMemory.req, ctxMemory.res, 'google-auth');
    assert.equal(ctxMemory.getHeaders()['x-ratelimit-engine'], 'memory_fallback');
  });

  // ============================================================================
  // 9. HMAC IDENTITY PSEUDONYMIZATION IN RATE-LIMIT KEYS
  // ============================================================================
  await t.test('9. HMAC pseudonymization completely masks raw emails and phones in Redis keys', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'super-secret-salt-alpha';
    const emailKey = clientKey('198.51.100.1', 'login', 'executive@propertystudio.org');
    const phoneKey = clientKey('198.51.100.1', 'phone-otp', '+91 98765 43210');

    assert.equal(emailKey.includes('executive'), false);
    assert.equal(emailKey.includes('propertystudio.org'), false);
    assert.match(emailKey, /^ps:rl:login:198\.51\.100\.1:id_[a-f0-9]{32}$/);

    assert.equal(phoneKey.includes('9876543210'), false);
    assert.equal(phoneKey.includes('+91'), false);
    assert.match(phoneKey, /^ps:rl:phone-otp:198\.51\.100\.1:id_[a-f0-9]{32}$/);
  });

  // ============================================================================
  // 10. EVERY MIGRATED ROUTE PRESERVES RATE-LIMIT CHECK AND TIERS
  // ============================================================================
  await t.test('10. Predefined tiers match intended policies across login, google, otp, and register', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;

    let checkedLimit = 0;
    let checkedWindow = 0;

    globalThis.fetch = (async (_url: any, init: any) => {
      const cmds = JSON.parse(init.body);
      checkedWindow = Number(cmds[1][2]);
      return new Response(JSON.stringify([{ result: 1 }, { result: 1 }, { result: checkedWindow }]), { status: 200 });
    }) as typeof fetch;

    // Login: limit 5, window 60s
    const ctxLogin = createMockContext();
    await rejectIfRateLimitedAsync(ctxLogin.req, ctxLogin.res, 'login', 'test@test.com');
    assert.equal(ctxLogin.getHeaders()['x-ratelimit-limit'], '5');
    assert.equal(checkedWindow, 60000);

    // Google Auth: limit 20, window 60s
    const ctxGoogle = createMockContext();
    await rejectIfRateLimitedAsync(ctxGoogle.req, ctxGoogle.res, 'google-auth');
    assert.equal(ctxGoogle.getHeaders()['x-ratelimit-limit'], '20');
    assert.equal(checkedWindow, 60000);

    // Phone OTP: limit 3, window 300s
    const ctxOtp = createMockContext();
    await rejectIfRateLimitedAsync(ctxOtp.req, ctxOtp.res, 'phone-otp', '+919876543210');
    assert.equal(ctxOtp.getHeaders()['x-ratelimit-limit'], '3');
    assert.equal(checkedWindow, 300000);

    // Register: limit 10, window 60s
    const ctxReg = createMockContext();
    await rejectIfRateLimitedAsync(ctxReg.req, ctxReg.res, 'register', 'new@test.com');
    assert.equal(ctxReg.getHeaders()['x-ratelimit-limit'], '10');
    assert.equal(checkedWindow, 60000);
  });

  // ============================================================================
  // 11. NO ROUTE BYPASSES INTENDED RATE-LIMIT PROTECTION
  // ============================================================================
  await t.test('11. rejectIfRateLimitedAsync returns true on limit violation to prevent route execution', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;

    globalThis.fetch = (async () => {
      // Simulate over-limit response from Redis (11th attempt exceeds limit of 10)
      return new Response(JSON.stringify([
        { result: 11 },
        { result: 0 },
        { result: 25000 }
      ]), { status: 200 });
    }) as typeof fetch;

    const ctx = createMockContext();
    let protectedActionExecuted = false;

    if (await rejectIfRateLimitedAsync(ctx.req, ctx.res, 'reset-password', 'user@example.com')) {
      // Correct: handler returned early and aborted action
    } else {
      protectedActionExecuted = true;
    }

    assert.equal(protectedActionExecuted, false, 'Route must not execute when rate limiter returns true');
    assert.equal(ctx.getStatus(), 429);
  });

  // ============================================================================
  // 12. WEBHOOK DEDUPLICATION ATOMIC SET NX AND DUPLICATE DETECTION
  // ============================================================================
  await t.test('12. Webhook deduplication uses atomic SET NX: novel events pass, duplicates are flagged', async () => {
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;

    let callCount = 0;
    globalThis.fetch = (async (url: any) => {
      callCount += 1;
      assert.match(String(url), /\/set\/ps%3Awh%3Adedup%3Amsg_001%3Adelivered\/1\/ex\/86400\/nx/);

      if (callCount === 1) {
        // First delivery: SET NX succeeds -> result: "OK"
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }
      // Replay: Key exists -> result: null
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    }) as typeof fetch;

    const isDup1 = await isWebhookEventDuplicate('msg_001', 'delivered');
    assert.equal(isDup1, false, 'First receipt must not be marked duplicate');

    const isDup2 = await isWebhookEventDuplicate('msg_001', 'delivered');
    assert.equal(isDup2, true, 'Second receipt must be marked duplicate');
  });
});
