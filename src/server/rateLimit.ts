import type { Request, Response, NextFunction } from 'express';

/**
 * Distributed Rate Limiting System for Property Studio
 * - Backed by Upstash Redis (Serverless HTTP REST API) for multi-instance Vercel edge/lambdas.
 * - Fails safe to bounded, self-cleaning local memory if Upstash is unconfigured or unreachable.
 * - Prevents shared-IP collisions by binding authenticated users to user.id.
 * - Supplies standard `Retry-After` headers on HTTP 429 rejections.
 */

interface MemoryRecord {
  timestamps: number[];
  lastSeen: number;
}

const memoryStore = new Map<string, MemoryRecord>();
const MAX_MEMORY_KEYS = 5000;
const PRUNE_INTERVAL_MS = 60 * 1000;
let lastPrune = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  totalHits: number;
  engine: 'upstash_redis' | 'memory_fallback';
}

/**
 * Prunes expired keys from the fallback memory store to prevent memory leaks.
 */
function pruneMemoryStore(windowMs: number): void {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS && memoryStore.size < MAX_MEMORY_KEYS) {
    return;
  }
  lastPrune = now;
  for (const [key, record] of memoryStore.entries()) {
    const valid = record.timestamps.filter(stamp => now - stamp < windowMs);
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      record.timestamps = valid;
    }
  }
  if (memoryStore.size > MAX_MEMORY_KEYS) {
    const entries = Array.from(memoryStore.entries())
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    const toRemove = entries.slice(0, memoryStore.size - MAX_MEMORY_KEYS);
    for (const [k] of toRemove) {
      memoryStore.delete(k);
    }
  }
}

/**
 * Synchronous local memory rate check (fallback and sync compatibility).
 */
export function allowMemoryRequest(key: string, limit: number, windowMs: number): RateLimitResult {
  pruneMemoryStore(windowMs);
  const now = Date.now();
  const record = memoryStore.get(key) || { timestamps: [], lastSeen: now };
  const recent = record.timestamps.filter(stamp => now - stamp < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0] || now;
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    record.timestamps = recent;
    record.lastSeen = now;
    memoryStore.set(key, record);
    return {
      allowed: false,
      retryAfterSeconds: retryAfter,
      remaining: 0,
      totalHits: recent.length,
      engine: 'memory_fallback'
    };
  }

  recent.push(now);
  record.timestamps = recent;
  record.lastSeen = now;
  memoryStore.set(key, record);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, limit - recent.length),
    totalHits: recent.length,
    engine: 'memory_fallback'
  };
}

/**
 * Distributed rate check using Upstash Redis REST API.
 * Uses atomic pipeline execution without persistent TCP connection overhead.
 */
async function checkUpstashRedis(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const cleanUrl = url.replace(/\/+$/, '');
  const pipelineEndpoint = `${cleanUrl}/pipeline`;

  // Atomic pipeline: Increment key, set expiration if new, and query remaining TTL
  const commands = [
    ['INCR', key],
    ['PEXPIRE', key, String(windowMs), 'NX'],
    ['PTTL', key]
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800); // 1.8s timeout

  try {
    const response = await fetch(pipelineEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upstash HTTP ${response.status}: ${await response.text()}`);
    }

    const results = (await response.json()) as Array<{ result?: any; error?: string }>;
    const hits = Number(results[0]?.result || 1);
    const rawPttl = Number(results[2]?.result ?? results[1]?.result ?? windowMs);
    const pttl = rawPttl > 0 ? rawPttl : windowMs;

    if (hits > limit) {
      const retryAfter = Math.max(1, Math.ceil(pttl / 1000));
      return {
        allowed: false,
        retryAfterSeconds: retryAfter,
        remaining: 0,
        totalHits: hits,
        engine: 'upstash_redis'
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, limit - hits),
      totalHits: hits,
      engine: 'upstash_redis'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[RateLimit] Upstash Redis check failed, falling back to local memory:', err instanceof Error ? err.message : String(err));
    // Fail secure: fall back to bounded in-memory rate limiter so protections are never dropped
    return allowMemoryRequest(key, limit, windowMs);
  }
}

/**
 * Core rate check function.
 * Evaluates Upstash Redis if configured; falls back safely to memory limiter.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    return checkUpstashRedis(upstashUrl, upstashToken, key, limit, windowMs);
  }

  return allowMemoryRequest(key, limit, windowMs);
}

/**
 * Legacy synchronous compatibility export.
 */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  return allowMemoryRequest(key, limit, windowMs).allowed;
}

/**
 * Builds canonical rate limit key.
 * Backwards compatible with legacy 3-param calls.
 */
export function clientKey(ip: string | undefined, action: string, identity = ''): string {
  const cleanIp = (ip || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '').slice(0, 64);
  const cleanIdentity = identity.trim().toLowerCase().slice(0, 128);
  return `ps:rl:${action}:${cleanIp}:${cleanIdentity}`;
}

/**
 * Resolves context-aware rate limit key:
 * - If user is authenticated, uses user ID to prevent office/shared IP collisions.
 * - If unauthenticated, uses IP and identity (email/phone).
 */
export function resolveRateKey(req: Request, action: string, identity = ''): string {
  const user = (req as any).user;
  if (user && user.id) {
    return `ps:rl:${action}:user:${user.id}`;
  }
  const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ip = String(Array.isArray(rawIp) ? rawIp[0] : rawIp).split(',')[0].trim();
  return clientKey(ip, action, identity);
}

/**
 * Predefined rate limit tiers.
 */
export const RATE_LIMIT_TIERS = {
  AUTH: { limit: 5, windowMs: 60 * 1000 },          // 5 attempts per min
  OTP_DISPATCH: { limit: 3, windowMs: 5 * 60 * 1000 }, // 3 requests per 5 min
  MUTATION: { limit: 30, windowMs: 60 * 1000 },      // 30 state-changing mutations per min
  PUBLIC_READ: { limit: 120, windowMs: 60 * 1000 }   // 120 public queries per min
} as const;

/**
 * Helper to reject a request with 429 and Retry-After header.
 */
export async function rejectIfRateLimitedAsync(
  req: Request,
  res: Response,
  action: string,
  identity = '',
  tier?: { limit: number; windowMs: number }
): Promise<boolean> {
  const effectiveTier = tier || (
    action.includes('otp') ? RATE_LIMIT_TIERS.OTP_DISPATCH :
    action === 'login' || action === 'register' ? RATE_LIMIT_TIERS.AUTH :
    { limit: 20, windowMs: 60 * 1000 }
  );

  const key = resolveRateKey(req, action, identity);
  const result = await checkRateLimit(key, effectiveTier.limit, effectiveTier.windowMs);

  res.setHeader('X-RateLimit-Engine', result.engine);

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));
    res.setHeader('X-RateLimit-Limit', String(effectiveTier.limit));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.status(429).json({
      error: `Too many requests for ${action}. Please wait ${result.retryAfterSeconds} seconds and try again.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfterSeconds
    });
    return true;
  }

  res.setHeader('X-RateLimit-Limit', String(effectiveTier.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  return false;
}

/**
 * Reports current rate limiting operational mode for telemetry and diagnostic health.
 */
export function getRateLimiterStatus(): { isDistributed: boolean; provider: 'upstash_redis' | 'memory_fallback' } {
  const isDistributed = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  return {
    isDistributed,
    provider: isDistributed ? 'upstash_redis' : 'memory_fallback'
  };
}
