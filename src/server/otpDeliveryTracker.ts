import { getPostgresPool } from './postgres.ts';

/**
 * OTP Delivery Status Tracker
 * Tracks the lifecycle of WhatsApp OTP delivery:
 * QUEUED -> SUBMITTED -> SENT -> DELIVERED (or FAILED)
 * Correlates Gupshup webhooks / DLR callbacks with active OTP records.
 * Backed by authoritative PostgreSQL persistence for multi-instance Serverless compatibility.
 */

export type OtpDeliveryStatus = 'QUEUED' | 'SUBMITTED' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface OtpDeliveryRecord {
  targetPhone: string;
  provider: string;
  providerMessageId: string | null;
  status: OtpDeliveryStatus;
  queuedAt: number;
  submittedAt: number | null;
  sentAt: number | null;
  deliveredAt: number | null;
  failureReason: string | null;
  updatedAt: number;
}

// In-memory cache for ultra-fast O(1) status queries and webhook correlation
const deliveryCacheByPhone = new Map<string, OtpDeliveryRecord>();
const deliveryCacheByMsgId = new Map<string, OtpDeliveryRecord>();

const MAX_CACHE_ENTRIES = 2000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function pruneExpiredCache(): void {
  const now = Date.now();
  if (deliveryCacheByPhone.size > MAX_CACHE_ENTRIES) {
    for (const [key, record] of deliveryCacheByPhone.entries()) {
      if (now - record.queuedAt > CACHE_TTL_MS) {
        deliveryCacheByPhone.delete(key);
        if (record.providerMessageId) {
          deliveryCacheByMsgId.delete(record.providerMessageId);
        }
      }
    }
  }
}

/**
 * Normalizes phone keys for lookup (digits only: 919849012345 or +919849012345)
 */
function canonicalPhoneKey(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * 1. Record OTP queued internally before dispatch
 */
export function recordOtpQueued(phone: string, provider: string = 'whatsapp'): OtpDeliveryRecord {
  pruneExpiredCache();
  const key = canonicalPhoneKey(phone);
  const now = Date.now();
  const record: OtpDeliveryRecord = {
    targetPhone: key,
    provider,
    providerMessageId: null,
    status: 'QUEUED',
    queuedAt: now,
    submittedAt: null,
    sentAt: null,
    deliveredAt: null,
    failureReason: null,
    updatedAt: now
  };
  deliveryCacheByPhone.set(key, record);
  return record;
}

/**
 * 2. Record OTP submitted to provider (Gupshup returned HTTP 202)
 */
export function recordOtpSubmitted(
  phone: string,
  providerMessageId: string,
  provider: string = 'whatsapp'
): OtpDeliveryRecord {
  pruneExpiredCache();
  const key = canonicalPhoneKey(phone);
  const now = Date.now();
  const existing = deliveryCacheByPhone.get(key);
  const record: OtpDeliveryRecord = {
    targetPhone: key,
    provider,
    providerMessageId,
    status: 'SUBMITTED',
    queuedAt: existing?.queuedAt || now,
    submittedAt: now,
    sentAt: null,
    deliveredAt: null,
    failureReason: null,
    updatedAt: now
  };
  deliveryCacheByPhone.set(key, record);
  if (providerMessageId) {
    deliveryCacheByMsgId.set(providerMessageId, record);
  }
  // Persist to database asynchronously
  persistOtpDeliveryUpdate(phone, 'SUBMITTED', providerMessageId);
  return record;
}

/**
 * 3. Record OTP sent from provider gateway to WhatsApp network
 */
export function recordOtpSent(messageIdOrPhone: string): OtpDeliveryRecord | null {
  const record = findRecord(messageIdOrPhone);
  if (record && record.status !== 'DELIVERED') {
    const now = Date.now();
    record.status = 'SENT';
    record.sentAt = now;
    record.updatedAt = now;
  }
  persistOtpDeliveryUpdate(messageIdOrPhone, 'SENT');
  return record;
}

/**
 * 4. Record OTP delivered to user's WhatsApp client
 */
export function recordOtpDelivered(messageIdOrPhone: string): OtpDeliveryRecord | null {
  const record = findRecord(messageIdOrPhone);
  if (record) {
    const now = Date.now();
    record.status = 'DELIVERED';
    record.deliveredAt = now;
    record.updatedAt = now;
  }
  persistOtpDeliveryUpdate(messageIdOrPhone, 'DELIVERED');
  return record;
}

/**
 * 5. Record OTP delivery failure
 */
export function recordOtpFailed(messageIdOrPhone: string, reason?: string): OtpDeliveryRecord | null {
  const record = findRecord(messageIdOrPhone);
  if (record) {
    const now = Date.now();
    record.status = 'FAILED';
    record.failureReason = reason || 'Delivery failed at provider';
    record.updatedAt = now;
  }
  persistOtpDeliveryUpdate(messageIdOrPhone, 'FAILED', undefined, reason);
  return record;
}

/**
 * Persists status update to PostgreSQL database if configured.
 * Asynchronous & fire-and-forget safe so API responses are never delayed.
 */
export async function persistOtpDeliveryUpdate(
  phoneOrMsgId: string,
  status: OtpDeliveryStatus,
  providerMessageId?: string | null,
  failureReason?: string | null
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const pool = getPostgresPool();
  if (!pool) return;

  const clean = phoneOrMsgId.trim();
  const digits = clean.replace(/[^0-9]/g, '');
  const canonical = digits.length === 10 ? `+91${digits}` : clean.startsWith('+') ? clean : `+${digits}`;

  try {
    await pool.query(`
      UPDATE otps
      SET delivery_status = $1,
          provider_message_id = COALESCE($2, provider_message_id),
          failure_reason = COALESCE($3, failure_reason),
          delivered_at = CASE WHEN $1 = 'DELIVERED' THEN NOW() ELSE delivered_at END,
          updated_at = NOW()
      WHERE (target = $4 OR target = $5 OR provider_message_id = $6)
        AND consumed_at IS NULL
    `, [
      status,
      providerMessageId || null,
      failureReason || null,
      canonical,
      clean,
      clean
    ]);
  } catch (err: any) {
    console.warn('[Property Studio] Warning persisting OTP delivery update:', err?.message || err);
  }
}

/**
 * Helper to find record by Message ID or Phone
 */
function findRecord(key: string): OtpDeliveryRecord | null {
  if (!key) return null;
  const clean = key.trim();
  if (deliveryCacheByMsgId.has(clean)) {
    return deliveryCacheByMsgId.get(clean)!;
  }
  const phoneKey = canonicalPhoneKey(clean);
  if (deliveryCacheByPhone.has(phoneKey)) {
    return deliveryCacheByPhone.get(phoneKey)!;
  }
  return null;
}

/**
 * Retrieves current OTP delivery status by phone number or provider message ID (synchronous cache)
 */
export function getOtpDeliveryStatus(phoneOrMessageId: string): OtpDeliveryRecord | null {
  return findRecord(phoneOrMessageId);
}

/**
 * Asynchronously retrieves OTP delivery status with PostgreSQL fallback for serverless
 */
export async function getAsyncOtpDeliveryStatus(phoneOrMessageId: string): Promise<OtpDeliveryRecord | null> {
  const cached = findRecord(phoneOrMessageId);
  const now = Date.now();
  if (cached && (cached.status === 'DELIVERED' || cached.status === 'FAILED')) {
    return cached;
  }
  // Return recent in-memory cache (< 3500ms) without repeatedly querying PostgreSQL
  if (cached && (now - cached.updatedAt < 3500)) {
    return cached;
  }

  if (process.env.DATABASE_URL) {
    const pool = getPostgresPool();
    if (pool) {
      try {
        const clean = phoneOrMessageId.trim();
        const digits = clean.replace(/[^0-9]/g, '');
        const canonical = digits.length === 10 ? `+91${digits}` : clean.startsWith('+') ? clean : `+${digits}`;

        const res = await pool.query(`
          SELECT delivery_status, provider_message_id, failure_reason, delivered_at, created_at, updated_at
          FROM otps
          WHERE (target = $1 OR target = $2 OR provider_message_id = $3)
            AND consumed_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
        `, [canonical, clean, clean]);

        if (res.rows.length > 0) {
          const row = res.rows[0];
          const rec: OtpDeliveryRecord = {
            targetPhone: canonical,
            provider: 'whatsapp',
            providerMessageId: row.provider_message_id || null,
            status: (row.delivery_status || 'SUBMITTED') as OtpDeliveryStatus,
            queuedAt: new Date(row.created_at).getTime(),
            submittedAt: new Date(row.created_at).getTime(),
            sentAt: row.delivery_status === 'SENT' || row.delivery_status === 'DELIVERED'
              ? new Date(row.updated_at || row.created_at).getTime()
              : null,
            deliveredAt: row.delivered_at ? new Date(row.delivered_at).getTime() : null,
            failureReason: row.failure_reason || null,
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
          };
          deliveryCacheByPhone.set(canonicalPhoneKey(canonical), rec);
          if (rec.providerMessageId) deliveryCacheByMsgId.set(rec.providerMessageId, rec);
          return rec;
        }
      } catch (err: any) {
        console.warn('[Property Studio] Warning querying DB OTP delivery status:', err?.message || err);
      }
    }
  }

  return cached;
}

/**
 * Parses and processes incoming Gupshup webhook event payload
 * Handles V2 message events: enqueued, sent, delivered, read, failed
 */
export function processGupshupWebhookEvent(rawBody: any): {
  handled: boolean;
  status?: OtpDeliveryStatus;
  messageId?: string;
  phone?: string;
  reason?: string;
} {
  if (!rawBody || typeof rawBody !== 'object') {
    return { handled: false };
  }

  // Gupshup V2 message-event structure
  const type = rawBody.type || rawBody.event;
  const payload = rawBody.payload || {};

  const eventType = String(payload.type || rawBody.status || '').toLowerCase().trim();
  const gsId = String(payload.gsId || payload.id || rawBody.messageId || rawBody.id || '').trim();
  const destination = String(payload.destination || rawBody.destination || rawBody.phone || '').trim();
  const cause = payload.payload?.cause || payload.payload?.reason || rawBody.reason || payload.error;

  if (!gsId && !destination) {
    return { handled: false };
  }

  let status: OtpDeliveryStatus | undefined;
  if (eventType === 'enqueued' || eventType === 'submitted') {
    status = 'SUBMITTED';
    if (destination && gsId) recordOtpSubmitted(destination, gsId);
  } else if (eventType === 'sent') {
    status = 'SENT';
    recordOtpSent(gsId || destination);
  } else if (eventType === 'delivered' || eventType === 'read') {
    status = 'DELIVERED';
    recordOtpDelivered(gsId || destination);
  } else if (eventType === 'failed' || eventType === 'undelivered') {
    status = 'FAILED';
    recordOtpFailed(gsId || destination, typeof cause === 'string' ? cause : JSON.stringify(cause || ''));
  }

  return {
    handled: Boolean(status),
    status,
    messageId: gsId || undefined,
    phone: destination || undefined,
    reason: typeof cause === 'string' ? cause : undefined
  };
}

/**
 * Testing helper: resets the in-memory cache
 */
export function clearDeliveryCacheForTesting(): void {
  deliveryCacheByPhone.clear();
  deliveryCacheByMsgId.clear();
}
