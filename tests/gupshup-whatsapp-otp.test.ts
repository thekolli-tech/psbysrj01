import assert from 'node:assert/strict';
import test from 'node:test';
import { gupshupSettings, sendWhatsAppOtp, configuredWhatsAppProviders } from '../src/server/whatsappOtp.ts';

const MOCK_API_KEY = 'mock_gupshup_api_key_test_123';
const MOCK_SOURCE_NUMBER = '919014555566';
const MOCK_APP_ID = 'a6c34645-8cbf-4ca8-b6c7-a2d8f5172c25';
const MOCK_TEMPLATE_ID = 'b803ba1e-de34-496c-aa01-71db36cf8343';

const ENV_KEYS = [
  'GUPSHUP_API_KEY',
  'GUPSHUP_WHATSAPP_NUMBER',
  'GUPSHUP_SOURCE_NUMBER',
  'GUPSHUP_APP_ID',
  'GUPSHUP_APP_NAME',
  'GUPSHUP_OTP_TEMPLATE_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_OTP_TEMPLATE_NAME',
  'WHATSAPP_GRAPH_API_VERSION',
  'WHATSAPP_OTP_TEMPLATE_LANGUAGE'
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

function clearAllProviders() {
  for (const k of ENV_KEYS) {
    delete process.env[k];
  }
}

function configureGupshup() {
  clearAllProviders();
  process.env.GUPSHUP_API_KEY = MOCK_API_KEY;
  process.env.GUPSHUP_WHATSAPP_NUMBER = MOCK_SOURCE_NUMBER;
  process.env.GUPSHUP_APP_ID = MOCK_APP_ID;
  process.env.GUPSHUP_APP_NAME = 'propertystudio';
  process.env.GUPSHUP_OTP_TEMPLATE_ID = MOCK_TEMPLATE_ID;
}

test('Gupshup settings detection and parameter extraction', () => {
  const saved = snapshotEnv();
  clearAllProviders();
  try {
    assert.equal(gupshupSettings(), null);
    assert.deepEqual(configuredWhatsAppProviders(), []);

    configureGupshup();
    const settings = gupshupSettings();
    assert.ok(settings);
    assert.equal(settings?.apiKey, MOCK_API_KEY);
    assert.equal(settings?.whatsappNumber, '919014555566');
    assert.equal(settings?.appName, 'propertystudio');
    assert.equal(settings?.templateId, MOCK_TEMPLATE_ID);
    assert.deepEqual(configuredWhatsAppProviders(), ['WhatsApp']);
  } finally {
    restoreEnv(saved);
  }
});

test('Gupshup dispatches approved authentication template with correct headers and payload format', async () => {
  const saved = snapshotEnv();
  configureGupshup();

  try {
    const captured: Array<{ url: string; init: RequestInit }> = [];
    const mockFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      captured.push({ url: String(url), init: init || {} });
      return new Response(JSON.stringify({
        status: 'submitted',
        messageId: 'gupshup_msg_test_abc123'
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await sendWhatsAppOtp('+91 90145-55566', '482910', mockFetch as any);
    assert.equal(result.success, true);
    assert.equal(result.provider, 'whatsapp');
    assert.equal(result.messageId, 'gupshup_msg_test_abc123');

    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, 'https://api.gupshup.io/wa/api/v1/template/msg');

    const headers = captured[0].init.headers as Record<string, string>;
    assert.equal(headers['apikey'], MOCK_API_KEY);
    assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded');

    const bodyParams = new URLSearchParams(String(captured[0].init.body));
    assert.equal(bodyParams.get('channel'), 'whatsapp');
    assert.equal(bodyParams.get('source'), '919014555566');
    assert.equal(bodyParams.get('destination'), '919014555566');
    assert.equal(bodyParams.get('src.name'), 'propertystudio');

    const templateData = JSON.parse(bodyParams.get('template') || '{}');
    assert.equal(templateData.id, MOCK_TEMPLATE_ID);
    assert.deepEqual(templateData.params, ['482910', '482910']);
  } finally {
    restoreEnv(saved);
  }
});

test('Gupshup rejects invalid phone numbers or delivery failures without exposing secret values', async () => {
  const saved = snapshotEnv();
  configureGupshup();

  const logs: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => logs.push(args.map(String).join(' '));

  try {
    // 1. Invalid phone number format
    const invalidPhoneRes = await sendWhatsAppOtp('12345', '123456');
    assert.equal(invalidPhoneRes.success, false);
    assert.equal(invalidPhoneRes.error, 'A valid Indian mobile number is required.');

    // 2. Gupshup provider returns error status
    const mockErrorFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Invalid destination'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const failResult = await sendWhatsAppOtp('+919014555566', '654321', mockErrorFetch as any);
    assert.equal(failResult.success, false);
    assert.equal(failResult.error, 'Invalid destination');

    // 3. Ensure no secrets are leaked in logs
    const joinedLogs = logs.join('\n');
    assert.equal(joinedLogs.includes(MOCK_API_KEY), false);
  } finally {
    console.warn = originalWarn;
    restoreEnv(saved);
  }
});
