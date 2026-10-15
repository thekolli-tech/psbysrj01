import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Repository CRUD and Authentication Flow', async (t) => {
  const dbPath = '/tmp/propertystudio-repository-test.db';
  fs.rmSync(dbPath, { force: true });
  delete process.env.DATABASE_URL;
  delete process.env.NODE_ENV;
  process.env.DB_ENGINE = 'sqlite';
  process.env.SQLITE_PATH = dbPath;

  const {
    initDatabase,
    createUser,
    findUserByEmail,
    verifyPassword,
    getAllCommunities,
    getAllPosts,
    createLead,
    deleteLead,
    getAllLeads,
    getUserNotifications,
    createNotification,
    markNotificationRead,
    getConferenceDetails,
    hashPassword
  } = await import('../src/server/db.ts');

  await initDatabase();
  const password = 'TestPassword123!';
  await createUser({
    name: 'Repository Developer',
    email: 'developer@propertystudio.org',
    role: 'DEVELOPER',
    password
  });

  await t.test('Find developer user by email (case-insensitive)', async () => {
    const userUpper = await findUserByEmail('DEVELOPER@PROPERTYSTUDIO.ORG');
    const userLower = await findUserByEmail('developer@propertystudio.org');
    assert.ok(userUpper);
    assert.ok(userLower);
    assert.equal(userUpper.id, userLower.id);
    assert.equal(userUpper.role, 'DEVELOPER');
    const { salt, hash } = hashPassword(password);
    assert.equal(typeof salt, 'string');
    assert.equal(typeof hash, 'string');
  });

  await t.test('Verify user password with salt and hash', async () => {
    const user = await findUserByEmail('developer@propertystudio.org');
    assert.ok(user);
    assert.equal(verifyPassword(password, user.password_hash, user.salt), true);
    assert.equal(verifyPassword('WrongPassword123!', user.password_hash, user.salt), false);
  });

  await t.test('Fetch communities and posts without demo seed', async () => {
    const communities = await getAllCommunities();
    assert.ok(Array.isArray(communities));
    assert.equal(communities.length, 0);
    const posts = await getAllPosts();
    assert.ok(Array.isArray(posts));
  });

  await t.test('Conference details are empty until an administrator publishes one', async () => {
    const details = await getConferenceDetails();
    assert.equal(details.status, 'UNSCHEDULED');
    assert.equal(details.title, '');
  });

  await t.test('Notification workflow', async () => {
    const dev = await findUserByEmail('developer@propertystudio.org');
    assert.ok(dev);
    const notif = await createNotification({
      userId: dev.id,
      actorId: 'test_actor',
      actorName: 'Test Suite',
      type: 'SYSTEM',
      title: 'Automated Test Notification',
      message: 'Testing notification persistence'
    });
    assert.equal(notif.user_id, dev.id);
    const notifs = await getUserNotifications(dev.id, 5);
    assert.ok(notifs.find(n => n.id === notif.id));
    assert.equal(await markNotificationRead(notif.id, dev.id), true);
  });

  await t.test('Buyer lead lifecycle', async () => {
    const leadId = await createLead({
      name: 'Test Buyer',
      phone: '+91 99999 88888',
      email: 'buyer.test@example.com',
      budget: '₹2.5 Cr - ₹4 Cr',
      property_type: 'Luxury Villa',
      micro_market: 'Financial District',
      price: 0
    });
    const leads = await getAllLeads();
    const found = leads.find(l => l.id === leadId);
    assert.ok(found);
    assert.equal(found.name, 'Test Buyer');
    assert.equal(await deleteLead(leadId), true);
  });
});
