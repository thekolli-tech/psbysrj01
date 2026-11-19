import crypto from 'node:crypto';

/**
 * Gupshup Webhook Security Module
 * - Multi-secret rotation support (GUPSHUP_WEBHOOK_SECRETS, GUPSHUP_WEBHOOK_SECRET, GUPSHUP_ACCOUNT_SECRET)
 * - Timing-safe secret token comparison (crypto.timingSafeEqual)
 * - Durable event deduplication (backed by Upstash Redis if configured; bounded local memory fallback)
 * - Timestamp freshness validation (tolerant of carrier DLR delay, rejects clock skew anomalies)
 * - Sanitized telemetry logging (zero phone numbers or private payload data in logs)
 */

interface DedupRecord {
  timestamp: number;
}

const memoryDedupStore = new Map<string, DedupRecord>();
const MAX_DEDUP_KEYS = 5000;
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Prunes expired deduplication entries to prevent memory leaks in fallback mode.
 */
function pruneMemoryDedup(): void {
  const now = Date.now();
  for (const [key, record] of memoryDedupStore.entries()) {
    if (now - record.timestamp > DEDUP_TTL_MS) {
      memoryDedupStore.delete(key);
    }
  }
  if (memoryDedupStore.size > MAX_DEDUP_KEYS) {
    const sorted = Array.from(memoryDedupStore.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, memoryDedupStore.size - MAX_DEDUP_KEYS);
    for (const [k] of toRemove) {
      memoryDedupStore.delete(k);
    }
  }
}

/**
 * Retrieves the list of currently authorized webhook secret tokens.
 * Precedence:
 * 1. GUPSHUP_WEBHOOK_SECRETS (comma-separated for zero-downtime rotation)
 * 2. GUPSHUP_WEBHOOK_SECRET (primary secret)
 * 3. GUPSHUP_ACCOUNT_SECRET (legacy fallback)
 */
export function getWebhookSecrets(): string[] {
  const secrets: string[] = [];

  const rotationList = (process.env.GUPSHUP_WEBHOOK_SECRETS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  secrets.push(...rotationList);

  const primary = (process.env.GUPSHUP_WEBHOOK_SECRET || '').trim();
  if (primary && !secrets.includes(primary)) {
    secrets.push(primary);
  }

  const fallback = (process.env.GUPSHUP_ACCOUNT_SECRET || '').trim();
  if (fallback && !secrets.includes(fallback)) {
    secrets.push(fallback);
  }

  return secrets;
}

/**
 * Performs timing-safe comparison of the provided token against all authorized secrets.
 * Prevents timing side-channel attacks by evaluating full comparisons.
 */
export function verifyWebhookSecret(provided: unknown): boolean {
  const validSecrets = getWebhookSecrets();
  if (validSecrets.length === 0) {
    // If no secret is configured, reject in production; allow in dev/test only
    return process.env.NODE_ENV !== 'production';
  }

  if (typeof provided !== 'string' || !provided) {
    return false;
  }

  const providedBuf = Buffer.from(provided);
  let matched = false;

  for (const secret of validSecrets) {
    const expectedBuf = Buffer.from(secret);
    if (providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      matched = true;
    }
  }

  return matched;
}

/**
 * Validates timestamp freshness according to carrier WhatsApp DLR semantics.
 * Carrier delivery receipts can arrive after delays (e.g. device offline/airplane mode).
 * We accept reports within 48 hours in the past and up to 5 minutes in the future (clock skew).
 */
export function isValidWebhookTimestamp(rawTimestamp: unknown): boolean {
  if (rawTimestamp === undefined || rawTimestamp === null || rawTimestamp === '') {
    return true; // Provider omitted timestamp; do not fail valid webhooks
  }

  let ts = Number(rawTimestamp);
  if (isNaN(ts) || ts <= 0) {
    // If timestamp is an ISO string, attempt date parse
    const parsed = new Date(String(rawTimestamp)).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      ts = parsed;
    } else {
      return false; // Malformed timestamp format rejected safely
    }
  }

  if (ts < 1e11) {
    // Seconds format detected (e.g. 10 digits); convert to ms
    ts *= 1000;
  }

  const now = Date.now();
  const maxPastMs = 48 * 60 * 60 * 1000; // 48 hours
  const maxFutureMs = 5 * 60 * 1000;      // 5 minutes clock skew tolerance

  if (ts < now - maxPastMs || ts > now + maxFutureMs) {
    return false;
  }

  return true;
}

/**
 * Checks if a webhook event has already been processed.
 * Uses atomic Redis SET NX when Upstash is configured; falls back to memory store.
 * Returns `true` if event is a duplicate, `false` if it is novel.
 */
export async function isWebhookEventDuplicate(
  messageId: string | undefined,
  eventType: string | undefined
): Promise<boolean> {
  const cleanId = String(messageId || '').trim();
  const cleanType = String(eventType || '').trim().toLowerCase();

  if (!cleanId || !cleanType) {
    return false; // Insufficient identity to dedup; process safely
  }

  const dedupKey = `ps:wh:dedup:${cleanId}:${cleanType}`;

  // 1. Upstash Redis Atomic SET NX
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (upstashUrl && upstashToken) {
    const cleanUrl = upstashUrl.replace(/\/+$/, '');
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const endpoint = `${cleanUrl}/set/${encodeURIComponent(dedupKey)}/1/ex/86400/nx`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${upstashToken}` },
          signal: controller.signal
        });

        if (res.ok) {
          const data = (await res.json()) as { result?: string | null };
          // If SET ... NX succeeded, result is "OK". If already exists, result is null.
          if (data.result === 'OK') {
            return false; // First time seeing this event
          }
          return true; // Duplicate!
        }
      } catch {
        // Fall through to memory fallback on network error
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  // 2. Bounded Local Memory Fallback
  pruneMemoryDedup();
  if (memoryDedupStore.has(dedupKey)) {
    return true; // Duplicate!
  }

  memoryDedupStore.set(dedupKey, { timestamp: Date.now() });
  return false;
}

/**
 * Resets memory dedup cache (used in automated regression tests).
 */
export function resetWebhookDedupForTesting(): void {
  memoryDedupStore.clear();
}
