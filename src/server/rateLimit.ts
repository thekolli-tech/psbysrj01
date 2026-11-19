import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { normalizeIndianMobile } from '../shared/indianMobile.ts';

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
 * Cryptographic Domain Separation Salt for Rate Limit Key Derivation.
 * Guarantees that derived keys cannot be confused or cross-used with OTP hashing or session encryption.
 */
export const RATE_LIMIT_DERIVATION_DOMAIN = 'PropertyStudio:RateLimitKey:v1';
export const TEST_ONLY_RATE_LIMIT_SEED = 'test-only-isolated-development-seed-not-for-production';

let hasWarnedMissingSecret = false;

/**
 * Consistently normalizes email addresses, phone numbers, and raw identifiers before HMAC hashing.
 * Domain-tags each identifier type (phone:, email:, raw:) to mathematically prevent
 * distinct identities (e.g. invalid phone 'invalid' vs email 'invalid@domain.com')
 * from ever collapsing into the same rate-limit bucket.
 */
export function normalizeRateLimitIdentity(identity: string): string {
  if (!identity || typeof identity !== 'string') return '';
  const trimmed = identity.trim();
  if (!trimmed) return '';

  // 1. Indian mobile phone detection (normalizes to E.164 +91XXXXXXXXXX)
  const indianMobile = normalizeIndianMobile(trimmed);
  if (indianMobile) {
    return `phone:${indianMobile}`;
  }

  // 2. International E.164 phone detection (e.g. +1 555-123-4567, +44 20 7946 0991)
  if (trimmed.startsWith('+')) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return `phone:+${digitsOnly}`;
    }
  }

  // 3. Raw digit-only international phone numbers (at least 10 digits without leading +)
  if (/^\d{10,15}$/.test(trimmed)) {
    return `phone:+${trimmed}`;
  }

  // 4. Email address normalization (lowercase and trim with email: domain prefix)
  if (trimmed.includes('@')) {
    return `email:${trimmed.toLowerCase()}`;
  }

  // 5. Raw/Generic string identifier (e.g. 'invalid', 'anonymous', user IDs)
  return `raw:${trimmed.toLowerCase()}`;
}

/**
 * Retrieves or derives a cryptographically secure key for HMAC-SHA-256 rate-limit key pseudonymization.
 *
 * Precedence:
 * 1. Dedicated secret: process.env.RATE_LIMIT_KEY_SECRET (Preferred in production)
 * 2. Cryptographic domain-separated derivation from OTP_HASH_SECRET or SESSION_SECRET:
 *    HMAC-SHA-256(sourceSecret, 'PropertyStudio:RateLimitKey:v1')
 * 3. In non-production (development/test): isolated fallback seed with loud warning.
 *
 * Production policy:
 * - If RATE_LIMIT_KEY_SECRET is configured: uses it directly.
 * - If unset but OTP_HASH_SECRET or SESSION_SECRET exists: derives a domain-separated key.
 * - If ALL server secrets are missing in production: THROWS a ConfigurationError.
 *   Static development seeds are NEVER used in production.
 */
export function getRateLimitKeySecret(): string {
  const dedicated = process.env.RATE_LIMIT_KEY_SECRET?.trim();
  if (dedicated) {
    return dedicated;
  }

  // Cryptographic domain-separated derivation from existing production secrets
  const sourceFallback = process.env.OTP_HASH_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (sourceFallback) {
    if (!hasWarnedMissingSecret) {
      hasWarnedMissingSecret = true;
      console.warn(
        '[RateLimit Notice] RATE_LIMIT_KEY_SECRET is not set. ' +
        'Derived a domain-separated rate-limit key from existing server secrets. ' +
        'For isolated secret rotation, configure RATE_LIMIT_KEY_SECRET in production.'
      );
    }
    return crypto
      .createHmac('sha256', sourceFallback)
      .update(RATE_LIMIT_DERIVATION_DOMAIN)
      .digest('hex');
  }

  // In production, strictly reject static predictable seeds
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[RateLimit Configuration Error] Missing RATE_LIMIT_KEY_SECRET in production environment. ' +
      'Refusing to generate predictable pseudonymous identifiers with a static seed.'
    );
  }

  return TEST_ONLY_RATE_LIMIT_SEED;
}

/**
 * Generates a deterministic HMAC-SHA-256 pseudonymous identifier for an identity string.
 * Ensures plaintext emails and phone numbers never appear in Redis keys or logs.
 * Produces a 32-character hex digest (128-bit collision resistance).
 */
export function hashRateLimitIdentity(identity: string): string {
  if (!identity || typeof identity !== 'string' || !identity.trim()) {
    return '';
  }
  const normalized = normalizeRateLimitIdentity(identity);
  const secret = getRateLimitKeySecret();
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex').slice(0, 32);
}

/**
 * Formats IP address for rate limit keys.
 * Default in production: IP is pseudonymized with HMAC-SHA-256 (unless explicitly set to false).
 * Default in dev/test: clean sanitized IP is retained for debugging (unless explicitly enabled).
 */
export function formatRateLimitIp(ip: string | undefined): string {
  const cleanIp = (ip || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '').slice(0, 64);
  const shouldPseudonymize =
    process.env.RATE_LIMIT_PSEUDONYMIZE_IP === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.RATE_LIMIT_PSEUDONYMIZE_IP !== 'false');

  if (shouldPseudonymize) {
    const secret = getRateLimitKeySecret();
    return 'ip_' + crypto.createHmac('sha256', secret).update(`ip:${cleanIp}`).digest('hex').slice(0, 16);
  }
  return cleanIp;
}

/**
 * Builds canonical rate limit key with pseudonymous identity hashing.
 * Plaintext emails and phone numbers are NEVER embedded.
 */
export function clientKey(ip: string | undefined, action: string, identity = ''): string {
  const formattedIp = formatRateLimitIp(ip);
  const pseudonymizedId = hashRateLimitIdentity(identity);
  return pseudonymizedId
    ? `ps:rl:${action}:${formattedIp}:id_${pseudonymizedId}`
    : `ps:rl:${action}:${formattedIp}:`;
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
