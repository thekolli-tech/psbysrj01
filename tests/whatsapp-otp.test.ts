import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeIndianMobile } from '../src/shared/indianMobile.ts';
import { configuredWhatsAppProviders, sendWhatsAppOtp, whatsAppMessagesUrl, whatsAppSettings } from '../src/server/whatsappOtp.ts';

const TOKEN = 'test-whatsapp-token-not-real';
const PHONE_NUMBER_ID = '105954558954427';
const TEMPLATE = 'verification_code';
const VERSION = 'v26.0';
const LANGUAGE = 'en_US';

function configure(): void {
  process.env.WHATSAPP_ACCESS_TOKEN = TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_NUMBER_ID;
  process.env.WHATSAPP_OTP_TEMPLATE_NAME = TEMPLATE;
  process.env.WHATSAPP_GRAPH_API_VERSION = VERSION;
  process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE = LANGUAGE;
}

function clearWhatsApp(): void {
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_OTP_TEMPLATE_NAME;
  delete process.env.WHATSAPP_GRAPH_API_VERSION;
  delete process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE;
}

test('Indian mobile numbers still canonicalize to E.164', () => {
  assert.equal(normalizeIndianMobile('+91 98000-11199'), '+919800011199');
  assert.equal(normalizeIndianMobile('5800011199'), null);
});

test('WhatsApp Cloud API sends the documented copy-code template only when every setting is valid', async () => {
  const saved = {
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    template: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
    version: process.env.WHATSAPP_GRAPH_API_VERSION,
    language: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE
  };
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  console.warn = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  clearWhatsApp();

  try {
    let calls = 0;
    const unconfigured = await sendWhatsAppOtp('+919800011199', '135790', async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    });
    assert.equal(unconfigured.success, false);
    assert.equal(unconfigured.provider, 'unconfigured');
    assert.equal(calls, 0);
    assert.deepEqual(configuredWhatsAppProviders(), []);

    process.env.WHATSAPP_ACCESS_TOKEN = TOKEN;
    assert.equal(whatsAppSettings(), null);
    const tokenOnly = await sendWhatsAppOtp('9800011199', '135790', async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    });
    assert.equal(tokenOnly.success, false);
    assert.equal(calls, 0);

    configure();
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v26.0/../evil';
    assert.equal(whatsAppSettings(), null);
    process.env.WHATSAPP_GRAPH_API_VERSION = VERSION;
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1059/messages';
    assert.equal(whatsAppSettings(), null);
    process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_NUMBER_ID;
    assert.deepEqual(configuredWhatsAppProviders(), ['WhatsApp']);

    const captured: Array<{ url: string; init: RequestInit }> = [];
    const sent = await sendWhatsAppOtp('+91 98000-11199', '135790', async (url, init) => {
      captured.push({ url: String(url), init: init || {} });
      return new Response(JSON.stringify({
        messaging_product: 'whatsapp',
        contacts: [{ input: '919800011199', wa_id: '919800011199' }],
        messages: [{ id: 'wamid.MOCK' }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    assert.equal(sent.success, true);
    assert.equal(sent.provider, 'whatsapp');
    assert.equal(sent.messageId, 'wamid.MOCK');
    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, whatsAppMessagesUrl(whatsAppSettings()!));
    assert.equal(captured[0].url, `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`);
    const headers = captured[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Bearer ${TOKEN}`);
    const body = JSON.parse(String(captured[0].init.body));
    assert.equal(body.messaging_product, 'whatsapp');
    assert.equal(body.recipient_type, 'individual');
    assert.equal(body.to, '919800011199');
    assert.equal(body.type, 'template');
    assert.equal(body.template.name, TEMPLATE);
    assert.equal(body.template.language.code, LANGUAGE);
    assert.equal(body.template.components[0].parameters[0].text, '135790');
    assert.equal(body.template.components[1].type, 'button');
    assert.equal(body.template.components[1].sub_type, 'url');
    assert.equal(body.template.components[1].index, '0');
    assert.equal(body.template.components[1].parameters[0].text, '135790');
    assert.equal(captured[0].init.redirect, 'manual');

    const rejected = await sendWhatsAppOtp('+919800011199', '135790', async () => (
      new Response(JSON.stringify({ error: { message: 'Invalid OAuth access token.', code: 190 } }), { status: 401 })
    ));
    assert.equal(rejected.success, false);
    assert.equal(JSON.stringify(rejected).includes('135790'), false);
    assert.equal(JSON.stringify(rejected).includes(TOKEN), false);

    const falseSuccess = await sendWhatsAppOtp('+919800011199', '135790', async () => (
      new Response(JSON.stringify({ messaging_product: 'whatsapp' }), { status: 200 })
    ));
    assert.equal(falseSuccess.success, false);

    const redirected = await sendWhatsAppOtp('+919800011199', '135790', async () => (
      new Response(null, { status: 302, headers: { location: 'https://evil.example/collect' } })
    ));
    assert.equal(redirected.success, false);

    const thrown = await sendWhatsAppOtp('+919800011199', '135790', async () => {
      throw new Error(`network down with otp 135790 and token ${TOKEN}`);
    });
    assert.equal(thrown.success, false);
    const joined = logs.join('\n');
    assert.equal(joined.includes('135790'), false);
    assert.equal(joined.includes(TOKEN), false);
    assert.equal(joined.includes('9800011199'), false);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    restore('WHATSAPP_ACCESS_TOKEN', saved.token);
    restore('WHATSAPP_PHONE_NUMBER_ID', saved.phoneNumberId);
    restore('WHATSAPP_OTP_TEMPLATE_NAME', saved.template);
    restore('WHATSAPP_GRAPH_API_VERSION', saved.version);
    restore('WHATSAPP_OTP_TEMPLATE_LANGUAGE', saved.language);
  }
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
