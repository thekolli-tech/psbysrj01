import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeIndianMobile, storedPhoneMatches } from '../src/shared/indianMobile.ts';
import { FAST2SMS_OTP_URL, configuredSmsProviders, sendFast2SmsOtp } from '../src/server/smsOtp.ts';

test('Indian mobile numbers canonicalize to E.164 and reject everything else', () => {
  assert.equal(normalizeIndianMobile('9800011199'), '+919800011199');
  assert.equal(normalizeIndianMobile('09800011199'), '+919800011199');
  assert.equal(normalizeIndianMobile('919800011199'), '+919800011199');
  assert.equal(normalizeIndianMobile('+91 98000-11199'), '+919800011199');
  assert.equal(normalizeIndianMobile('+91 (98000) 11199'), '+919800011199');
  assert.equal(normalizeIndianMobile('  +919800011199  '), '+919800011199');
  assert.equal(normalizeIndianMobile('5800011199'), null);
  assert.equal(normalizeIndianMobile('980001119'), null);
  assert.equal(normalizeIndianMobile('123456789012'), null);
  assert.equal(normalizeIndianMobile('+14155550199'), null);
  assert.equal(normalizeIndianMobile('00919800011199'), null);
  assert.equal(normalizeIndianMobile('+91 09800011199'), null);
  assert.equal(normalizeIndianMobile(''), null);
  assert.equal(normalizeIndianMobile(9800011199), null);
  assert.equal(storedPhoneMatches('09800011199', '+919800011199'), true);
  assert.equal(storedPhoneMatches('919800011199', '+919800011199'), true);
  assert.equal(storedPhoneMatches('+91 98000-11199', '+919800011199'), true);
  assert.equal(storedPhoneMatches('+14155550199', '+919800011199'), false);
  assert.equal(storedPhoneMatches('9800011100', '+919800011199'), false);
});

test('Fast2SMS sends the documented OTP request only when the key and template id are both set', async () => {
  const saved = {
    key: process.env.FAST2SMS_API_KEY,
    otpId: process.env.FAST2SMS_OTP_ID,
    variables: process.env.FAST2SMS_OTP_VARIABLES,
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_NUMBER
  };
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  console.warn = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  delete process.env.FAST2SMS_API_KEY;
  delete process.env.FAST2SMS_OTP_ID;
  delete process.env.FAST2SMS_OTP_VARIABLES;
  process.env.TWILIO_ACCOUNT_SID = 'AC_not_used';
  process.env.TWILIO_AUTH_TOKEN = 'twilio-token-not-used';
  process.env.TWILIO_PHONE_NUMBER = '+15550001111';

  try {
    let calls = 0;
    const unconfigured = await sendFast2SmsOtp('+919800011199', '135790', async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    });
    assert.equal(unconfigured.success, false);
    assert.equal(unconfigured.provider, 'unconfigured');
    assert.equal(calls, 0);
    assert.deepEqual(configuredSmsProviders(), []);

    process.env.FAST2SMS_API_KEY = 'test-sms-key-not-real';
    assert.deepEqual(configuredSmsProviders(), []);
    const keyOnly = await sendFast2SmsOtp('9800011199', '135790', async () => {
      calls += 1;
      return new Response(JSON.stringify({ return: true }), { status: 200 });
    });
    assert.equal(keyOnly.success, false);
    assert.equal(calls, 0);

    process.env.FAST2SMS_OTP_ID = 'otp-template-test';
    assert.deepEqual(configuredSmsProviders(), ['Fast2SMS']);

    const captured: Array<{ url: string; init: RequestInit }> = [];
    const sent = await sendFast2SmsOtp('+91 98000-11199', '135790', async (url, init) => {
      captured.push({ url: String(url), init: init || {} });
      return new Response(JSON.stringify({ return: true, status_code: 200, request_id: 'req_mock', message: 'OTP sent successfully' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });
    assert.equal(sent.success, true);
    assert.equal(sent.provider, 'fast2sms');
    assert.equal(sent.messageId, 'req_mock');
    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, FAST2SMS_OTP_URL);
    const headers = captured[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'test-sms-key-not-real');
    assert.equal(headers.Authorization.includes('Bearer '), false);
    const body = JSON.parse(String(captured[0].init.body));
    assert.deepEqual(body, {
      mobile: '9800011199',
      otp_id: 'otp-template-test',
      otp: '135790',
      otp_expiry: 10,
      otp_length: 6
    });
    assert.equal(captured[0].init.redirect, 'manual');

    process.env.FAST2SMS_OTP_VARIABLES = '{otp}|Property';
    captured.length = 0;
    await sendFast2SmsOtp('+919800011199', '135790', async (url, init) => {
      captured.push({ url: String(url), init: init || {} });
      return new Response(JSON.stringify({ return: true, status_code: 200 }), { status: 200 });
    });
    assert.equal(JSON.parse(String(captured[0].init.body)).variables_values, '{otp}|Property');

    const rejected = await sendFast2SmsOtp('+919800011199', '135790', async () => (
      new Response(JSON.stringify({ return: false, status_code: 400, message: 'Invalid OTP ID' }), { status: 400 })
    ));
    assert.equal(rejected.success, false);
    assert.equal(JSON.stringify(rejected).includes('135790'), false);
    assert.equal(JSON.stringify(rejected).includes('test-sms-key-not-real'), false);

    const falseSuccess = await sendFast2SmsOtp('+919800011199', '135790', async () => (
      new Response(JSON.stringify({ return: true, status_code: 400 }), { status: 200 })
    ));
    assert.equal(falseSuccess.success, false);

    const redirected = await sendFast2SmsOtp('+919800011199', '135790', async () => (
      new Response(null, { status: 302, headers: { location: 'https://evil.example/collect' } })
    ));
    assert.equal(redirected.success, false);

    const thrown = await sendFast2SmsOtp('+919800011199', '135790', async () => {
      throw new Error('network down with otp 135790 and key test-sms-key-not-real');
    });
    assert.equal(thrown.success, false);
    assert.equal(logs.join('\n').includes('135790'), false);
    assert.equal(logs.join('\n').includes('test-sms-key-not-real'), false);
    assert.equal(logs.join('\n').includes('9800011199'), false);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    restore('FAST2SMS_API_KEY', saved.key);
    restore('FAST2SMS_OTP_ID', saved.otpId);
    restore('FAST2SMS_OTP_VARIABLES', saved.variables);
    restore('TWILIO_ACCOUNT_SID', saved.sid);
    restore('TWILIO_AUTH_TOKEN', saved.token);
    restore('TWILIO_PHONE_NUMBER', saved.from);
  }
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
