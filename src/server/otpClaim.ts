import crypto from 'node:crypto';
import { OTP_MAX_ATTEMPTS, otpMatches } from './otpCrypto.ts';

export interface OtpClaimRow {
  id: string;
  otp_hash: string;
  expires_at: number;
  attempt_count: number;
}

export interface OtpClaimRunner {
  query(sql: string, params: unknown[]): Promise<{ rows: OtpClaimRow[]; changes: number }>;
}

export interface SyncOtpClaimRunner {
  query(sql: string, params: unknown[]): { rows: OtpClaimRow[]; changes: number };
}

export function grantTypeFor(challengeType: string): string | null {
  if (challengeType === 'EMAIL_VERIFICATION') return 'REGISTRATION_GRANT';
  if (challengeType === 'PHONE_VERIFICATION') return 'PHONE_REGISTRATION_GRANT';
  return null;
}

function placeholders(dialect: 'pg' | 'sqlite', count: number): string[] {
  return Array.from({ length: count }, (_value, index) => (dialect === 'pg' ? `$${index + 1}` : '?'));
}

/**
 * Consumes one unconsumed challenge, or the single-use grant issued from it.
 * A consumed challenge is not authorization. The presented code must match,
 * and the winning update must change exactly one row.
 */
export async function claimOtpProof(
  runner: OtpClaimRunner,
  dialect: 'pg' | 'sqlite',
  target: string,
  challengeType: string,
  code: string,
  options: { issueGrant?: boolean; allowGrantFallback?: boolean } = {}
): Promise<boolean> {
  const issueGrant = options.issueGrant !== false;
  const allowGrantFallback = options.allowGrantFallback === true;
  const normalized = target.trim().toLowerCase();
  const challenge = await selectUnconsumed(runner, dialect, normalized, challengeType);
  if (challenge) {
    return consumeRow(runner, dialect, normalized, challenge, code, issueGrant ? grantTypeFor(challengeType) : null);
  }
  if (!allowGrantFallback) return false;
  const grant = grantTypeFor(challengeType);
  if (!grant) return false;
  const grantRow = await selectUnconsumed(runner, dialect, normalized, grant);
  if (!grantRow) return false;
  return consumeRow(runner, dialect, normalized, grantRow, code, null);
}

async function selectUnconsumed(
  runner: OtpClaimRunner,
  dialect: 'pg' | 'sqlite',
  target: string,
  type: string
): Promise<OtpClaimRow | null> {
  const [targetPh, typePh] = placeholders(dialect, 2);
  const lock = dialect === 'pg' ? ' FOR UPDATE' : '';
  const selected = await runner.query(
    `SELECT id, otp_hash, expires_at, attempt_count FROM otps WHERE target = ${targetPh} AND type = ${typePh} AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1${lock}`,
    [target, type]
  );
  const row = selected.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    otp_hash: String(row.otp_hash),
    expires_at: Number(row.expires_at),
    attempt_count: Number(row.attempt_count)
  };
}

async function consumeRow(
  runner: OtpClaimRunner,
  dialect: 'pg' | 'sqlite',
  target: string,
  row: OtpClaimRow,
  code: string,
  grantType: string | null
): Promise<boolean> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const [consumedPh, idPh] = placeholders(dialect, 2);
  if (row.attempt_count >= OTP_MAX_ATTEMPTS || now > row.expires_at) {
    await runner.query(
      `UPDATE otps SET consumed_at = ${consumedPh} WHERE id = ${idPh} AND consumed_at IS NULL`,
      [nowIso, row.id]
    );
    return false;
  }
  if (!otpMatches(row.otp_hash, code)) {
    const attempts = row.attempt_count + 1;
    const [attemptPh, attemptComparePh, maxPh, stampPh, failedIdPh] = placeholders(dialect, 5);
    await runner.query(
      `UPDATE otps SET attempt_count = ${attemptPh}, consumed_at = CASE WHEN ${attemptComparePh} >= ${maxPh} THEN ${stampPh} ELSE consumed_at END WHERE id = ${failedIdPh} AND consumed_at IS NULL`,
      [attempts, attempts, OTP_MAX_ATTEMPTS, nowIso, row.id]
    );
    return false;
  }
  const [verifiedStampPh, verifiedIdPh] = placeholders(dialect, 2);
  const verified = await runner.query(
    `UPDATE otps SET is_verified = 1, consumed_at = ${verifiedStampPh} WHERE id = ${verifiedIdPh} AND consumed_at IS NULL`,
    [nowIso, row.id]
  );
  if (verified.changes !== 1) return false;
  if (!grantType) return true;
  const grantId = `g_${crypto.randomBytes(16).toString('hex')}`;
  const values = placeholders(dialect, 6);
  await runner.query(
    `INSERT INTO otps (id, target, type, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at) VALUES (${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, NULL, ${values[4]}, 0, 0, NULL, ${values[5]})`,
    [grantId, target, grantType, row.otp_hash, row.expires_at, nowIso]
  );
  return true;
}

export function claimOtpProofSync(
  runner: SyncOtpClaimRunner,
  target: string,
  challengeType: string,
  code: string,
  options: { issueGrant?: boolean; allowGrantFallback?: boolean } = {}
): boolean {
  const issueGrant = options.issueGrant !== false;
  const allowGrantFallback = options.allowGrantFallback === true;
  const normalized = target.trim().toLowerCase();
  const challenge = selectUnconsumedSync(runner, normalized, challengeType);
  if (challenge) return consumeRowSync(runner, normalized, challenge, code, issueGrant ? grantTypeFor(challengeType) : null);
  if (!allowGrantFallback) return false;
  const grant = grantTypeFor(challengeType);
  if (!grant) return false;
  const grantRow = selectUnconsumedSync(runner, normalized, grant);
  if (!grantRow) return false;
  return consumeRowSync(runner, normalized, grantRow, code, null);
}

function selectUnconsumedSync(runner: SyncOtpClaimRunner, target: string, type: string): OtpClaimRow | null {
  const selected = runner.query(
    `SELECT id, otp_hash, expires_at, attempt_count FROM otps WHERE target = ? AND type = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [target, type]
  );
  const row = selected.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    otp_hash: String(row.otp_hash),
    expires_at: Number(row.expires_at),
    attempt_count: Number(row.attempt_count)
  };
}

function consumeRowSync(
  runner: SyncOtpClaimRunner,
  target: string,
  row: OtpClaimRow,
  code: string,
  grantType: string | null
): boolean {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  if (row.attempt_count >= OTP_MAX_ATTEMPTS || now > row.expires_at) {
    runner.query(`UPDATE otps SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL`, [nowIso, row.id]);
    return false;
  }
  if (!otpMatches(row.otp_hash, code)) {
    const attempts = row.attempt_count + 1;
    runner.query(
      `UPDATE otps SET attempt_count = ?, consumed_at = CASE WHEN ? >= ? THEN ? ELSE consumed_at END WHERE id = ? AND consumed_at IS NULL`,
      [attempts, attempts, OTP_MAX_ATTEMPTS, nowIso, row.id]
    );
    return false;
  }
  const verified = runner.query(
    `UPDATE otps SET is_verified = 1, consumed_at = ? WHERE id = ? AND consumed_at IS NULL`,
    [nowIso, row.id]
  );
  if (verified.changes !== 1) return false;
  if (!grantType) return true;
  runner.query(
    `INSERT INTO otps (id, target, type, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at) VALUES (?, ?, ?, ?, NULL, ?, 0, 0, NULL, ?)`,
    [`g_${crypto.randomBytes(16).toString('hex')}`, target, grantType, row.otp_hash, row.expires_at, nowIso]
  );
  return true;
}
