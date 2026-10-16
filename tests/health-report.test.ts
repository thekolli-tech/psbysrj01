import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'production';
delete process.env.DB_ENGINE;
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM;
delete process.env.OTP_HASH_SECRET;
process.env.EMAIL_FROM = 'Person <person@example.com>';

const { buildHealthReport, environmentPresence } = await import('../src/server/health.ts');

test('production health reports an unconfigured database without secrets', async () => {
  const report = await buildHealthReport();
  const database = report.body.database as { connected: boolean; schemaReady: boolean; code: string };
  const configuration = report.body.configuration as {
    database: boolean;
    emailProvider: boolean;
    emailSender: boolean;
    otpPepper: boolean;
    sms: boolean;
  };
  const environment = report.body.environment as {
    DATABASE_URL: boolean;
    RESEND_API_KEY: boolean;
    OTP_HASH_SECRET: boolean;
    EMAIL_FROM: boolean;
  };
  const body = JSON.stringify(report.body);
  assert.equal(report.httpStatus, 503);
  assert.equal(report.body.status, 'UNAVAILABLE');
  assert.equal(report.body.authoritativeDatabase, 'unconfigured');
  assert.equal(report.body.sqliteFallback, false);
  assert.equal(database.connected, false);
  assert.equal(database.schemaReady, false);
  assert.equal(database.code, 'DATABASE_NOT_CONFIGURED');
  assert.equal(configuration.database, false);
  assert.equal(configuration.emailProvider, false);
  assert.equal(configuration.emailSender, false);
  assert.equal(configuration.otpPepper, false);
  assert.equal(configuration.sms, false);
  assert.deepEqual(environment, {
    DATABASE_URL: false,
    RESEND_API_KEY: false,
    OTP_HASH_SECRET: false,
    EMAIL_FROM: true
  });
  assert.equal(body.includes('postgresql://'), false);
  assert.equal(body.includes('person@example.com'), false);
  assert.equal(body.includes('postgres'), false);
});

test('the built-in sender fallback is not reported as a configured EMAIL_FROM', async () => {
  const savedFrom = process.env.EMAIL_FROM;
  const savedResendFrom = process.env.RESEND_FROM;
  delete process.env.EMAIL_FROM;
  delete process.env.RESEND_FROM;
  try {
    const report = await buildHealthReport();
    const configuration = report.body.configuration as { emailSender: boolean };
    const environment = report.body.environment as { EMAIL_FROM: boolean };
    const body = JSON.stringify(report.body);
    assert.equal(configuration.emailSender, false);
    assert.equal(environment.EMAIL_FROM, false);
    assert.equal(body.includes('otp@propertystudio.org'), false);
  } finally {
    process.env.EMAIL_FROM = savedFrom;
    if (savedResendFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = savedResendFrom;
  }
});

test('environment presence reports only whether each required name is non-empty', async () => {
  const saved = {
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    OTP_HASH_SECRET: process.env.OTP_HASH_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    commit: process.env.VERCEL_GIT_COMMIT_SHA,
    ref: process.env.VERCEL_GIT_COMMIT_REF,
    target: process.env.VERCEL_ENV
  };
  process.env.DATABASE_URL = 'present-database';
  process.env.RESEND_API_KEY = 'present-resend';
  process.env.OTP_HASH_SECRET = 'present-pepper';
  process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
  process.env.VERCEL_GIT_COMMIT_SHA = '6027bbba537233bfea55608e028f03bccfa68b85';
  process.env.VERCEL_GIT_COMMIT_REF = 'cursor/fix-vercel-registration-otp-c4c9';
  process.env.VERCEL_ENV = 'preview';
  try {
    const presence = environmentPresence();
    assert.deepEqual(presence, {
      DATABASE_URL: true,
      RESEND_API_KEY: true,
      OTP_HASH_SECRET: true,
      EMAIL_FROM: true
    });
    process.env.DATABASE_URL = '   ';
    assert.equal(environmentPresence().DATABASE_URL, false);
    process.env.DATABASE_URL = '';
    const report = await buildHealthReport();
    const body = JSON.stringify(report.body);
    const deployment = report.body.deployment as { commit: string | null; ref: string | null; target: string | null };
    assert.equal(body.includes('present-resend'), false);
    assert.equal(body.includes('present-pepper'), false);
    assert.equal(body.includes('otp@propertystudio.org'), false);
    assert.equal((report.body.configuration as { emailSender: boolean }).emailSender, true);
    assert.deepEqual(deployment, {
      commit: '6027bbba537233bfea55608e028f03bccfa68b85',
      ref: 'cursor/fix-vercel-registration-otp-c4c9',
      target: 'preview'
    });
  } finally {
    process.env.DATABASE_URL = saved.DATABASE_URL;
    if (saved.RESEND_API_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = saved.RESEND_API_KEY;
    if (saved.OTP_HASH_SECRET === undefined) delete process.env.OTP_HASH_SECRET;
    else process.env.OTP_HASH_SECRET = saved.OTP_HASH_SECRET;
    process.env.EMAIL_FROM = saved.EMAIL_FROM;
    if (saved.commit === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = saved.commit;
    if (saved.ref === undefined) delete process.env.VERCEL_GIT_COMMIT_REF;
    else process.env.VERCEL_GIT_COMMIT_REF = saved.ref;
    if (saved.target === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = saved.target;
  }
});
