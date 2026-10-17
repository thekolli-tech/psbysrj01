import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { AVATARS, DEFAULT_AVATAR_ID, isAllowedAvatar, resolveAvatarId } from '../src/shared/avatars.ts';
import { normalizeE164, whatsAppRecipient } from '../src/shared/phone.ts';
import { canReadFullPhone, paidContactAccessGranted, presentPhone, scrubPhoneFields } from '../src/shared/phonePrivacy.ts';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-whatsapp-privacy-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
process.env.RESEND_API_KEY = 're_test_mock_key';
process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;
delete process.env.PAYMENT_API_KEY;
delete process.env.WHATSAPP_ACCESS_TOKEN;
delete process.env.WHATSAPP_PHONE_NUMBER_ID;
delete process.env.WHATSAPP_OTP_TEMPLATE_NAME;
delete process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE;
delete process.env.WHATSAPP_GRAPH_API_VERSION;

const SECRET_PHONE = '+14155552671';
const TOKEN = 'EAAG-test-token-not-real';

test('E.164, avatar allowlist, and phone privacy helpers', () => {
  assert.equal(normalizeE164('+1 (415) 555-2671'), SECRET_PHONE);
  assert.equal(normalizeE164('0044 20 7946 0958'), '+442079460958');
  assert.equal(normalizeE164('9800011199'), null);
  assert.equal(normalizeE164('+012345678'), null);
  assert.equal(whatsAppRecipient(SECRET_PHONE), '14155552671');
  assert.equal(AVATARS.length >= 24, true);
  assert.equal(new Set(AVATARS.map(avatar => avatar.id)).size, AVATARS.length);
  assert.equal(isAllowedAvatar('avatar-24'), true);
  assert.equal(isAllowedAvatar('https://example.com/a.png'), false);
  assert.equal(isAllowedAvatar('data:image/png;base64,aaaa'), false);
  assert.equal(resolveAvatarId('not-a-real-avatar'), DEFAULT_AVATAR_ID);
  assert.equal(resolveAvatarId('avatar-12'), 'avatar-12');
  const presentations = new Set(AVATARS.map(avatar => avatar.presentation));
  assert.equal(presentations.has('masculine') && presentations.has('feminine') && presentations.has('neutral'), true);
  assert.equal(paidContactAccessGranted({ wallet: 5000, unlocked: true }), false);
  assert.equal(canReadFullPhone('SUPER_ADMIN'), true);
  assert.equal(canReadFullPhone('DEVELOPER'), true);
  assert.equal(canReadFullPhone('CHANNEL_PARTNER'), false);
  assert.equal(presentPhone(SECRET_PHONE, { id: 'other', role: 'AGENT' }, 'owner'), '******2671');
  assert.equal(presentPhone(SECRET_PHONE, { id: 'owner', role: 'PROPERTY_SEEKER' }, 'owner'), SECRET_PHONE);
  assert.equal(presentPhone(SECRET_PHONE, { id: 'admin', role: 'SUPER_ADMIN' }, 'owner'), SECRET_PHONE);
  const scrubbed = scrubPhoneFields({ phone: SECRET_PHONE, nested: { mobile: SECRET_PHONE, title: 'kept' } }) as { title?: string; nested: { title: string } };
  assert.equal(JSON.stringify(scrubbed).includes('4155552671'), false);
  assert.equal(scrubbed.nested.title, 'kept');
});

test('WhatsApp OTP, phone privacy, avatars, and deferred payments', async () => {
  const { initDatabase, createUser, findUserByEmail, findUserByPhone, getSqliteDb } = await import('../src/server/db.ts');
  const { sendWhatsAppOtp, whatsAppSettings } = await import('../src/server/whatsappOtp.ts');
  await initDatabase();
  assert.equal(whatsAppSettings(), null);
  const unconfigured = await sendWhatsAppOtp(SECRET_PHONE, '123456', async () => {
    throw new Error('network must not be called');
  });
  assert.equal(unconfigured.success, false);
  assert.equal(unconfigured.provider, 'unconfigured');

  process.env.WHATSAPP_ACCESS_TOKEN = TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = '109876543210';
  process.env.WHATSAPP_OTP_TEMPLATE_NAME = 'property_studio_otp';
  process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE = 'en';
  process.env.WHATSAPP_GRAPH_API_VERSION = 'v26';
  assert.equal(whatsAppSettings(), null);
  process.env.WHATSAPP_GRAPH_API_VERSION = 'v26.0';
  assert.ok(whatsAppSettings());

  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  console.warn = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  const whatsappBodies: any[] = [];
  const emailBodies: any[] = [];
  let whatsappStatus = 200;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url);
    if (href === 'https://api.resend.com/emails') {
      emailBodies.push(JSON.parse(String(init?.body || '{}')));
      return new Response(JSON.stringify({ id: 'email_mock_http' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (href.startsWith('https://graph.facebook.com/') && href.endsWith('/messages')) {
      whatsappBodies.push({ href, headers: init?.headers, body: JSON.parse(String(init?.body || '{}')) });
      if (whatsappStatus >= 300 && whatsappStatus < 400) return new Response(null, { status: whatsappStatus });
      if (whatsappStatus !== 200) return new Response(JSON.stringify({ error: { message: 'rejected' } }), { status: whatsappStatus });
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.TEST' }] }), { status: 200 });
    }
    return originalFetch(url, init);
  }) as typeof fetch;

  if (process.env.DATABASE_URL) throw new Error('Refusing to attach this test to a live database.');
  const { app } = await import('../server.ts');
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  async function api(method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) {
    const response = await originalFetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', accept: 'application/json', ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    const setCookie = response.headers.get('set-cookie') || '';
    const session = setCookie.split(';').find(part => part.trim().startsWith('ps_session=')) || cookie || '';
    return { status: response.status, json, raw: text, cookie: session.trim() };
  }

  async function login(email: string, password = 'Longpassword1!'): Promise<string> {
    const result = await api('POST', '/api/auth/login', { email, password });
    assert.equal(result.status, 200, result.raw);
    assert.equal(result.json.token, undefined);
    assert.equal(result.raw.includes('password_hash'), false);
    return result.cookie;
  }

  function emailCode(): string {
    return String(emailBodies.at(-1)?.html || '').match(/>(\d{6})</)?.[1] || '';
  }

  function phoneCode(): string {
    return String(whatsappBodies.at(-1)?.body?.template?.components?.[0]?.parameters?.[0]?.text || '');
  }

  try {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_OTP_TEMPLATE_NAME;
    delete process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    const missing = await api('POST', '/api/auth/send-phone-otp', { phone: '9800011199' });
    assert.equal(missing.status, 400);

    const closed = await api('POST', '/api/auth/send-phone-otp', { phone: '+14155550100' });
    assert.equal(closed.status, 503);
    assert.equal(closed.json.code, 'WHATSAPP_NOT_CONFIGURED');
    assert.equal(closed.json.success, undefined);

    process.env.WHATSAPP_ACCESS_TOKEN = TOKEN;
    process.env.WHATSAPP_PHONE_NUMBER_ID = '109876543210';
    process.env.WHATSAPP_OTP_TEMPLATE_NAME = 'property_studio_otp';
    process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE = 'en';
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v26.0';

    whatsappStatus = 400;
    const rejected = await api('POST', '/api/auth/send-phone-otp', { phone: '+14155550101' });
    assert.equal(rejected.status, 502);
    assert.equal(rejected.json.code, 'WHATSAPP_DELIVERY_FAILED');
    const rejectedRows = getSqliteDb().prepare(`SELECT COUNT(*) AS count FROM otps WHERE target = ? AND consumed_at IS NULL`).get('+14155550101') as { count: number };
    assert.equal(Number(rejectedRows.count), 0);

    whatsappStatus = 302;
    const redirected = await api('POST', '/api/auth/send-phone-otp', { phone: '+14155550102' });
    assert.equal(redirected.status, 502);
    whatsappStatus = 200;

    const seekerEmail = 'seeker.whatsapp@example.com';
    assert.equal((await api('POST', '/api/auth/send-email-otp', { email: seekerEmail })).status, 200);
    const seekerEmailCode = emailCode();
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: SECRET_PHONE })).status, 200);
    const sentBody = whatsappBodies.at(-1);
    assert.equal(sentBody.href, 'https://graph.facebook.com/v26.0/109876543210/messages');
    assert.equal(sentBody.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(sentBody.body.to, '14155552671');
    assert.equal(sentBody.body.template.name, 'property_studio_otp');
    assert.equal(sentBody.body.template.components[1].sub_type, 'url');
    assert.equal(sentBody.body.template.components[1].parameters[0].text, phoneCode());
    assert.equal(logs.some(line => line.includes(TOKEN) || line.includes(phoneCode()) || line.includes(SECRET_PHONE)), false);
    const acknowledgement = (await api('POST', '/api/auth/send-phone-otp', { phone: '+14155550103' })).json;
    const duplicateAck = await api('POST', '/api/auth/send-phone-otp', { phone: SECRET_PHONE });
    assert.equal(duplicateAck.status, 429);

    const cooledPhone = '+14155550104';
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: cooledPhone })).status, 200);
    const cooledFirst = phoneCode();
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: cooledPhone })).status, 429);
    getSqliteDb().prepare(`UPDATE otps SET created_at = ? WHERE target = ?`).run(new Date(Date.now() - 120_000).toISOString(), cooledPhone);
    const resent = await api('POST', '/api/auth/send-phone-otp', { phone: cooledPhone });
    assert.equal(resent.status, 200, resent.raw);
    assert.notEqual(phoneCode(), cooledFirst);
    const activeCooled = getSqliteDb().prepare(`SELECT COUNT(*) AS count FROM otps WHERE target = ? AND consumed_at IS NULL`).get(cooledPhone) as { count: number };
    assert.equal(Number(activeCooled.count), 1);

    const expiredPhone = '+14155550105';
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: expiredPhone })).status, 200);
    const expiredCode = phoneCode();
    getSqliteDb().prepare(`UPDATE otps SET expires_at = ? WHERE target = ? AND consumed_at IS NULL`).run(Date.now() - 1000, expiredPhone);
    assert.equal((await api('POST', '/api/auth/verify-phone-otp', { phone: expiredPhone, otp: expiredCode })).status, 400);

    const limitedPhone = '+14155550106';
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: limitedPhone })).status, 200);
    const limitedCode = phoneCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal((await api('POST', '/api/auth/verify-phone-otp', { phone: limitedPhone, otp: '000000' })).status, 400);
    }
    assert.equal((await api('POST', '/api/auth/verify-phone-otp', { phone: limitedPhone, otp: limitedCode })).status, 400);

    const replayPhone = '+14155550107';
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: replayPhone })).status, 200);
    const replayCode = phoneCode();
    assert.equal((await api('POST', '/api/auth/verify-phone-otp', { phone: replayPhone, otp: replayCode })).status, 200);
    assert.equal((await api('POST', '/api/auth/verify-phone-otp', { phone: replayPhone, otp: replayCode })).status, 400);

    const bypass = await api('POST', '/api/auth/register', {
      name: 'Bypass Seeker',
      email: seekerEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: SECRET_PHONE,
      otp: seekerEmailCode,
      phoneVerified: true,
      phoneOtp: '000000',
      acceptLegal: true
    });
    assert.equal(bypass.status, 400, bypass.raw);
    assert.equal(await findUserByEmail(seekerEmail), null);

    getSqliteDb().prepare(`UPDATE otps SET created_at = ? WHERE target = ?`).run(new Date(Date.now() - 120_000).toISOString(), SECRET_PHONE);
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: SECRET_PHONE })).status, 200);
    const registered = await api('POST', '/api/auth/register', {
      name: 'WhatsApp Seeker',
      email: seekerEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '+1 415 555 2671',
      otp: seekerEmailCode,
      phoneOtp: phoneCode(),
      phoneVerified: false,
      acceptLegal: true
    });
    assert.equal(registered.status, 200, registered.raw);
    assert.equal(registered.json.token, undefined);
    assert.equal(registered.json.user.phone, SECRET_PHONE);
    assert.equal(registered.json.user.avatar, DEFAULT_AVATAR_ID);
    assert.equal(registered.json.user.phone_verified, 1);
    assert.equal(registered.raw.includes('password_hash'), false);
    const seeker = await findUserByEmail(seekerEmail);
    assert.equal(Number(seeker?.phone_verified), 1);
    assert.equal((await api('POST', '/api/auth/register', {
      name: 'WhatsApp Seeker',
      email: seekerEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: SECRET_PHONE,
      otp: seekerEmailCode,
      phoneOtp: phoneCode(),
      acceptLegal: true
    })).status, 400);

    const takenEmail = 'second.seeker@example.com';
    assert.equal((await api('POST', '/api/auth/send-email-otp', { email: takenEmail })).status, 200);
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const hiddenWhenUnconfigured = await api('POST', '/api/auth/send-phone-otp', { phone: SECRET_PHONE });
    assert.equal(hiddenWhenUnconfigured.status, 503);
    assert.equal(hiddenWhenUnconfigured.json.code, 'WHATSAPP_NOT_CONFIGURED');
    assert.equal(hiddenWhenUnconfigured.raw.includes(SECRET_PHONE), false);
    process.env.WHATSAPP_ACCESS_TOKEN = TOKEN;
    const takenAck = await api('POST', '/api/auth/send-phone-otp', { phone: SECRET_PHONE });
    assert.equal(takenAck.status, 200);
    assert.deepEqual(takenAck.json, { success: true, message: 'If this mobile number can be verified, a WhatsApp code has been sent.', deliveredVia: 'whatsapp' });
    assert.deepEqual(takenAck.json, acknowledgement);
    const taken = await api('POST', '/api/auth/register', {
      name: 'Second Seeker',
      email: takenEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: SECRET_PHONE,
      otp: emailCode(),
      phoneOtp: '000000',
      acceptLegal: true
    });
    assert.equal(taken.status, 400);
    assert.equal(taken.json.error, 'Registration could not be completed.');
    assert.equal(await findUserByEmail(takenEmail), null);

    const ownerEmail = 'landowner.whatsapp@example.com';
    assert.equal((await api('POST', '/api/auth/send-email-otp', { email: ownerEmail })).status, 200);
    const owner = await api('POST', '/api/auth/register', {
      name: 'Land Owner',
      email: ownerEmail,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: emailCode(),
      phoneVerified: true,
      acceptLegal: true
    });
    assert.equal(owner.status, 200, owner.raw);
    assert.equal(Number((await findUserByEmail(ownerEmail))?.phone_verified || 0), 0);
    assert.equal(owner.json.user.avatar, DEFAULT_AVATAR_ID);

    const password = 'RolePass123!';
    const roleEmails: Array<[string, string]> = [
      ['SUPER_ADMIN', 'admin.privacy@example.com'],
      ['DEVELOPER', 'dev.privacy@example.com'],
      ['PROPERTY_ADMIN', 'pmo.privacy@example.com'],
      ['AGENT', 'agent.privacy@example.com'],
      ['CHANNEL_PARTNER', 'partner.privacy@example.com'],
      ['RESELLER', 'reseller.privacy@example.com'],
      ['RERA_AGENT', 'rera.privacy@example.com'],
      ['LANDOWNER', 'owner.privacy@example.com'],
      ['REAL_ESTATE_MEDIA', 'media.privacy@example.com'],
      ['COMMUNITY_MODERATOR', 'mod.privacy@example.com'],
      ['PROPERTY_SEEKER', 'other.seeker@example.com']
    ];
    for (const [role, email] of roleEmails) {
      await createUser({ name: role, email, role: role as any, password, isVerified: true, phone: '+19995550000' });
    }
    const cookies: Record<string, string> = {};
    for (const [role, email] of roleEmails) cookies[role] = await login(email, password);
    const seekerCookie = await login(seekerEmail);

    const unverified = await createUser({ name: 'Unverified', email: 'unverified.seeker@example.com', role: 'PROPERTY_SEEKER', password, isVerified: true });
    const unverifiedCookie = await login(unverified.email, password);
    const blockedLead = await api('POST', '/api/leads', {
      name: 'Unverified',
      phone: '+14155550999',
      budget: '50 lakhs',
      consentGranted: true
    }, unverifiedCookie);
    assert.equal(blockedLead.status, 403);
    assert.equal(blockedLead.json.code, 'PHONE_NOT_VERIFIED');

    const enquiry = await api('POST', '/api/leads', {
      name: 'WhatsApp Seeker',
      phone: '+19995550000',
      email: seekerEmail,
      budget: '80 lakhs',
      property_type: 'Plot',
      micro_market: 'Kokapet',
      consentGranted: true,
      consentVersion: '2026-10-15',
      consentPurpose: 'enquiry response'
    }, seekerCookie);
    assert.equal(enquiry.status, 201, enquiry.raw);
    const stored = getSqliteDb().prepare('SELECT phone FROM buyer_leads WHERE id = ?').get(enquiry.json.leadId) as { phone: string };
    assert.equal(stored.phone, SECRET_PHONE);

    const authorized = new Set(['SUPER_ADMIN', 'DEVELOPER']);
    for (const [role] of roleEmails) {
      const users = await api('GET', '/api/admin/users', undefined, cookies[role]);
      const leads = await api('GET', '/api/leads', undefined, cookies[role]);
      if (authorized.has(role)) {
        assert.equal(users.status, 200, role);
        assert.equal(users.raw.includes(SECRET_PHONE), true, role);
        assert.equal(leads.status, 200, role);
        assert.equal(leads.raw.includes(SECRET_PHONE), true, role);
        assert.equal(users.raw.includes('password_hash'), false);
      } else {
        assert.equal(users.raw.includes(SECRET_PHONE), false, role);
        assert.equal(leads.raw.includes('4155552671'), false, role);
        if (leads.status === 200) {
          const lead = leads.json.leads.find((item: any) => item.id === enquiry.json.leadId);
          if (lead) assert.equal(lead.seekerPhone.includes('415555'), false);
        }
      }
    }
    const anonymousUsers = await api('GET', '/api/admin/users');
    const anonymousLeads = await api('GET', '/api/leads');
    assert.equal(anonymousUsers.status, 403);
    assert.equal(anonymousLeads.status, 401);
    assert.equal(anonymousUsers.raw.includes(SECRET_PHONE), false);
    assert.equal(anonymousLeads.raw.includes(SECRET_PHONE), false);
    const spoofed = await api('GET', '/api/admin/users', undefined, cookies.AGENT, { 'x-user-role': 'SUPER_ADMIN', 'x-user-id': 'admin' });
    assert.equal(spoofed.status, 403);
    assert.equal(spoofed.raw.includes(SECRET_PHONE), false);

    const own = await api('GET', '/api/auth/me', undefined, seekerCookie);
    assert.equal(own.json.user.phone, SECRET_PHONE);
    assert.equal(own.raw.includes('password_hash'), false);
    const partnerMe = await api('GET', '/api/auth/me', undefined, cookies.CHANNEL_PARTNER);
    assert.equal(partnerMe.json.user.phone, '+19995550000');
    assert.equal(partnerMe.raw.includes(SECRET_PHONE), false);

    process.env.PAYMENT_PROVIDER = 'test-provider';
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret';
    const profile = await api('POST', '/api/professional/profile', { reraNumber: 'A00000000000', organization: 'Studio' }, cookies.CHANNEL_PARTNER);
    assert.equal((await api('PATCH', `/api/admin/professionals/${profile.json.profile.user_id}/verification`, { status: 'VERIFIED' }, cookies.SUPER_ADMIN)).status, 200);
    const credit = await api('POST', '/api/admin/finance/adjustment', {
      userId: partnerMe.json.user.id,
      amount: 1000,
      direction: 'CREDIT',
      reason: 'Privacy test credit',
      idempotencyKey: 'privacy-credit'
    }, cookies.SUPER_ADMIN);
    assert.equal(credit.status, 200, credit.raw);
    const unlocked = await api('POST', `/api/leads/${enquiry.json.leadId}/unlock`, {}, cookies.CHANNEL_PARTNER, { 'Idempotency-Key': 'privacy-unlock' });
    assert.equal(unlocked.status, 200, unlocked.raw);
    assert.equal(unlocked.raw.includes('4155552671'), false);
    assert.equal(unlocked.json.lead.seekerPhone, '******2671');
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    const retained = await api('POST', `/api/leads/${enquiry.json.leadId}/unlock`, {}, cookies.CHANNEL_PARTNER, { 'Idempotency-Key': 'privacy-retained' });
    assert.equal(retained.status, 200, retained.raw);
    assert.equal(retained.json.lead.seekerPhone, '******2671');
    assert.equal(retained.raw.includes('4155552671'), false);
    const checkout = await api('POST', '/api/billing/checkout', { amount: 500, purpose: 'WALLET_TOPUP' }, cookies.CHANNEL_PARTNER);
    assert.equal(checkout.status, 503);
    assert.equal(checkout.json.code, 'NOT_CONFIGURED');
    const finance = await api('GET', '/api/admin/finance', undefined, cookies.DEVELOPER);
    assert.equal(finance.raw.includes(SECRET_PHONE), false);
    const unlockHistory = await api('GET', '/api/me/unlocks', undefined, cookies.CHANNEL_PARTNER);
    assert.equal(unlockHistory.raw.includes('4155552671'), false);

    const post = await api('POST', '/api/community/posts', {
      title: 'Public road question',
      content: 'No contact details belong in this post.',
      topic: 'LEGAL'
    }, cookies.CHANNEL_PARTNER);
    assert.equal((await api('PATCH', `/api/admin/posts/${post.json.post.id}/moderation`, { status: 'APPROVED' }, cookies.SUPER_ADMIN)).status, 200);
    const publicPosts = await api('GET', '/api/community/posts');
    assert.equal(publicPosts.raw.includes('4155552671'), false);
    assert.equal(publicPosts.raw.includes('9995550000'), false);
    assert.match(publicPosts.raw, /avatar-\d{2}/);
    const comment = await api('POST', `/api/community/posts/${post.json.post.id}/comments`, { content: 'A public comment.' }, seekerCookie);
    assert.equal(comment.status, 200, comment.raw);
    const comments = await api('GET', `/api/community/posts/${post.json.post.id}/comments`);
    assert.equal(comments.raw.includes(SECRET_PHONE), false);

    getSqliteDb().prepare(
      `INSERT INTO community_events (id, event_type, payload, target_user_id, created_at) VALUES (?, 'NOTE', ?, NULL, ?)`
    ).run('evt_phone_leak', JSON.stringify({ phone: SECRET_PHONE, mobile: SECRET_PHONE, note: 'visible-note' }), '2020-01-01T00:00:00.000Z');
    const controller = new AbortController();
    const replayResponse = await originalFetch(`${base}/api/community/events`, {
      headers: { accept: 'text/event-stream', 'last-event-id': '1970-01-01T00:00:00.000Z' },
      signal: controller.signal
    });
    const reader = replayResponse.body?.getReader();
    let replay = '';
    const started = Date.now();
    while (reader && Date.now() - started < 800) {
      const next = await Promise.race([
        reader.read(),
        new Promise<{ done: true; value?: Uint8Array }>(resolve => setTimeout(() => resolve({ done: true }), 200))
      ]);
      if (next.done || !next.value) break;
      replay += new TextDecoder().decode(next.value);
      if (replay.includes('visible-note')) break;
    }
    controller.abort();
    assert.equal(replay.includes('visible-note'), true);
    assert.equal(replay.includes('4155552671'), false);

    const notifications = await api('GET', '/api/notifications', undefined, seekerCookie);
    assert.equal(notifications.raw.includes('password_hash'), false);
    const audit = await api('GET', '/api/admin/audit-logs?action=PHONE_ACCESS', undefined, cookies.DEVELOPER);
    assert.equal(audit.status, 200, audit.raw);
    assert.equal(audit.raw.includes('PHONE_ACCESS'), true);
    assert.equal(audit.raw.includes(SECRET_PHONE), false);
    assert.equal(audit.raw.includes(TOKEN), false);

    const newPhone = '+442079460958';
    getSqliteDb().prepare(`UPDATE otps SET created_at = ? WHERE target = ?`).run(new Date(Date.now() - 120_000).toISOString(), newPhone);
    assert.equal((await api('POST', '/api/auth/send-phone-otp', { phone: newPhone }, seekerCookie)).status, 200);
    const changed = await api('POST', '/api/auth/change-phone', { phone: '0044 20 7946 0958', otp: phoneCode() }, seekerCookie);
    assert.equal(changed.status, 200, changed.raw);
    assert.equal(changed.json.user.phone, newPhone);
    assert.equal(changed.json.user.phone_verified, 1);
    assert.equal(changed.json.user.role, 'PROPERTY_SEEKER');
    assert.equal((await findUserByPhone(SECRET_PHONE)), null);
    assert.equal((await findUserByPhone(newPhone))?.id, seeker?.id);
    const changedAudit = await api('GET', '/api/admin/audit-logs?action=PHONE_CHANGED', undefined, cookies.DEVELOPER);
    assert.equal(changedAudit.raw.includes(newPhone), false);
    assert.equal(changedAudit.raw.includes(phoneCode()), false);

    const badAvatar = await api('PATCH', '/api/me/avatar', { avatarId: 'https://example.com/a.png' }, seekerCookie);
    assert.equal(badAvatar.status, 400);
    const base64Avatar = await api('PATCH', '/api/me/avatar', { avatarId: 'data:image/png;base64,aaaa' }, seekerCookie);
    assert.equal(base64Avatar.status, 400);
    const savedAvatar = await api('PATCH', '/api/me/avatar', { avatarId: 'avatar-18' }, seekerCookie);
    assert.equal(savedAvatar.status, 200, savedAvatar.raw);
    assert.equal(savedAvatar.json.user.avatar, 'avatar-18');
    assert.equal(savedAvatar.json.user.role, 'PROPERTY_SEEKER');
    assert.equal(savedAvatar.json.user.phone_verified, 1);
    assert.equal(savedAvatar.json.user.email_verified, 1);
    const persisted = await findUserByEmail(seekerEmail);
    assert.equal(persisted?.avatar, 'avatar-18');
    assert.equal(Number(persisted?.phone_verified), 1);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
    await new Promise<void>(resolve => (server as Server).close(() => resolve()));
  }
});
