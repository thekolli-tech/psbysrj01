import test from 'node:test';
import assert from 'node:assert/strict';

test('Repository CRUD and Authentication Flow', async (t) => {
  // Ensure local mode for repository tests
  delete process.env.DATABASE_URL;

  const {
    findUserByEmail,
    verifyPassword,
    getAllUsers,
    getAllCommunities,
    getAllPosts,
    getAllLeads,
    createLead,
    deleteLead,
    getUserNotifications,
    createNotification,
    markNotificationRead,
    getConferenceDetails
  } = await import('../src/server/db.ts');

  await t.test('Find developer user by email (case-insensitive)', async () => {
    const userUpper = await findUserByEmail('DEVELOPER@PROPERTYSTUDIO.ORG');
    const userLower = await findUserByEmail('developer@propertystudio.org');

    assert.ok(userUpper);
    assert.ok(userLower);
    assert.equal(userUpper.id, userLower.id);
    assert.equal(userUpper.role, 'DEVELOPER');
  });

  await t.test('Verify user password with salt and hash', async () => {
    const user = await findUserByEmail('developer@propertystudio.org');
    assert.ok(user);
    // Invalid password should return false
    const invalidCheck = verifyPassword('WrongPassword123!', user.password_hash, user.salt);
    assert.equal(invalidCheck, false);
  });

  await t.test('Fetch all communities and posts', async () => {
    const communities = await getAllCommunities();
    assert.ok(Array.isArray(communities));
    assert.ok(communities.length > 0);

    const posts = await getAllPosts();
    assert.ok(Array.isArray(posts));
  });

  await t.test('Conference details retrieval', async () => {
    const details = await getConferenceDetails();
    assert.ok(details);
    assert.match(details.title, /Summit/i);
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
      message: 'Testing PostgreSQL migration readiness'
    });

    assert.ok(notif.id);
    assert.equal(notif.user_id, dev.id);

    const notifs = await getUserNotifications(dev.id, 5);
    const found = notifs.find(n => n.id === notif.id);
    assert.ok(found);

    const markRes = await markNotificationRead(notif.id, dev.id);
    assert.equal(markRes, true);
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

    assert.ok(leadId);

    const leads = await getAllLeads();
    const found = leads.find(l => l.id === leadId);
    assert.ok(found);
    assert.equal(found.name, 'Test Buyer');

    const deleted = await deleteLead(leadId);
    assert.equal(deleted, true);
  });
});
