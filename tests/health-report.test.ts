import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'production';
delete process.env.DB_ENGINE;
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM;
delete process.env.OTP_HASH_SECRET;
process.env.EMAIL_FROM = 'Person <person@example.com>';

const { buildHealthReport } = await import('../src/server/health.ts');

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
  assert.equal(body.includes('postgresql://'), false);
  assert.equal(body.includes('person@example.com'), false);
  assert.equal(body.includes('DATABASE_URL'), false);
});
