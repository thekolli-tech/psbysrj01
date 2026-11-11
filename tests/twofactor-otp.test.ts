import assert from 'node:assert/strict';
import test from 'node:test';
import {
  twoFactorSettings,
  isTwoFactorConfigured,
  formatPhoneFor2Factor,
  sendTwoFactorOtp,
  verifyTwoFactorOtp,
  checkTwoFactorBalance
} from '../src/server/twoFactorOtp.ts';

const MOCK_API_KEY = 'mock_2factor_api_key_xyz123';
const TEST_PHONE = '+91 70130 10045';
const EXPECTED_2FACTOR_PHONE = '917013010045';

const ENV_KEYS = [
  'TWOFACTOR_API_KEY',
  'TWO_FACTOR_API_KEY',
  'TWOFACTOR_OTP_TEMPLATE',
  'TWOFACTOR_VOICE_ENABLED'
];

function snapshotEnv(): Record<string, string | undefined> {
  const snap: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) {
    snap[k] = process.env[k];
  }
  return snap;
}

function restoreEnv(snap: Record<string, string | undefined>) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = snap[k];
    }
  }
}

function configureMockTwoFactor(apiKey: string = MOCK_API_KEY) {
  process.env.TWOFACTOR_API_KEY = apiKey;
  delete process.env.TWO_FACTOR_API_KEY;
  delete process.env.TWOFACTOR_OTP_TEMPLATE;
  process.env.TWOFACTOR_VOICE_ENABLED = 'true';
}

test('formatPhoneFor2Factor correctly normalizes Indian mobile numbers', () => {
  assert.equal(formatPhoneFor2Factor('+91 70130 10045'), '917013010045');
  assert.equal(formatPhoneFor2Factor('7013010045'), '917013010045');
  assert.equal(formatPhoneFor2Factor('+91-7013010045'), '917013010045');
  assert.equal(formatPhoneFor2Factor('07013010045'), '917013010045');
  assert.equal(formatPhoneFor2Factor('12345'), null);
  assert.equal(formatPhoneFor2Factor('abcdefghij'), null);
});

test('2Factor configuration detection', () => {
  const saved = snapshotEnv();
  try {
    delete process.env.TWOFACTOR_API_KEY;
    delete process.env.TWO_FACTOR_API_KEY;
    assert.equal(isTwoFactorConfigured(), false);
    assert.equal(twoFactorSettings(), null);

    configureMockTwoFactor();
    assert.equal(isTwoFactorConfigured(), true);
    const settings = twoFactorSettings();
    assert.ok(settings);
    assert.equal(settings?.apiKey, MOCK_API_KEY);
    assert.equal(settings?.voiceEnabled, true);
  } finally {
    restoreEnv(saved);
  }
});

test('sendTwoFactorOtp dispatches primary SMS AUTOGEN to 2Factor API', async () => {
  const saved = snapshotEnv();
  configureMockTwoFactor();

  try {
    const captured: Array<{ url: string; method?: string }> = [];
    const mockFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      captured.push({ url: String(url), method: init?.method || 'GET' });
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: 'session-id-sms-test-abc-123'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await sendTwoFactorOtp(TEST_PHONE, 'sms', undefined, mockFetch as any);

    assert.equal(result.success, true);
    assert.equal(result.provider, '2factor');
    assert.equal(result.channel, 'sms');
    assert.equal(result.sessionId, 'session-id-sms-test-abc-123');

    assert.equal(captured.length, 1);
    assert.equal(
      captured[0].url,
      `https://2factor.in/API/V1/${MOCK_API_KEY}/SMS/${EXPECTED_2FACTOR_PHONE}/AUTOGEN`
    );
  } finally {
    restoreEnv(saved);
  }
});

test('sendTwoFactorOtp dispatches fallback Voice AUTOGEN when requested', async () => {
  const saved = snapshotEnv();
  configureMockTwoFactor();

  try {
    const captured: Array<{ url: string; method?: string }> = [];
    const mockFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      captured.push({ url: String(url), method: init?.method || 'GET' });
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: 'session-id-voice-test-def-456'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await sendTwoFactorOtp(TEST_PHONE, 'voice', undefined, mockFetch as any);

    assert.equal(result.success, true);
    assert.equal(result.provider, '2factor');
    assert.equal(result.channel, 'voice');
    assert.equal(result.sessionId, 'session-id-voice-test-def-456');

    assert.equal(captured.length, 1);
    assert.equal(
      captured[0].url,
      `https://2factor.in/API/V1/${MOCK_API_KEY}/VOICE/${EXPECTED_2FACTOR_PHONE}/AUTOGEN`
    );
  } finally {
    restoreEnv(saved);
  }
});

test('verifyTwoFactorOtp correctly validates matching OTP code', async () => {
  const saved = snapshotEnv();
  configureMockTwoFactor();

  try {
    const captured: Array<{ url: string }> = [];
    const mockFetch = async (url: RequestInfo | URL): Promise<Response> => {
      captured.push({ url: String(url) });
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: 'OTP Matched'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await verifyTwoFactorOtp('session-123', '482910', mockFetch as any);

    assert.equal(result.success, true);
    assert.equal(result.status, 'MATCHED');
    assert.equal(result.details, 'OTP Matched');

    assert.equal(captured.length, 1);
    assert.equal(
      captured[0].url,
      `https://2factor.in/API/V1/${MOCK_API_KEY}/SMS/VERIFY/session-123/482910`
    );
  } finally {
    restoreEnv(saved);
  }
});

test('verifyTwoFactorOtp rejects mismatched and expired codes', async () => {
  const saved = snapshotEnv();
  configureMockTwoFactor();

  try {
    // 1. Mismatch
    const mockMismatchFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({
        Status: 'Error',
        Details: 'OTP Mismatch'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const mismatchRes = await verifyTwoFactorOtp('session-123', '000000', mockMismatchFetch as any);
    assert.equal(mismatchRes.success, false);
    assert.equal(mismatchRes.status, 'MISMATCH');
    assert.ok(mismatchRes.error?.includes('Invalid verification code'));

    // 2. Expired
    const mockExpiredFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({
        Status: 'Error',
        Details: 'OTP Expired'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const expiredRes = await verifyTwoFactorOtp('session-123', '123456', mockExpiredFetch as any);
    assert.equal(expiredRes.success, false);
    assert.equal(expiredRes.status, 'EXPIRED');
    assert.ok(expiredRes.error?.includes('expired'));
  } finally {
    restoreEnv(saved);
  }
});

test('checkTwoFactorBalance queries transactional SMS balance', async () => {
  const saved = snapshotEnv();
  configureMockTwoFactor();

  try {
    const mockFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: '450.50'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const balanceRes = await checkTwoFactorBalance(mockFetch as any);
    assert.equal(balanceRes.success, true);
    assert.equal(balanceRes.balance, '450.50');
  } finally {
    restoreEnv(saved);
  }
});
