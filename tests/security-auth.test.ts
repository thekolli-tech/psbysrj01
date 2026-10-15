import test from 'node:test';
import assert from 'node:assert/strict';

test('Security & Lockout Prevention Rules', async (t) => {
  const { canActorModifyRole, canActorDisableOrDeleteUser } = await import('../src/server/db.ts');

  await t.test('Cannot demote the last remaining DEVELOPER', () => {
    // DEVELOPER demoting another DEVELOPER when only 1 active DEVELOPER exists
    const res = canActorModifyRole('DEVELOPER', 'DEVELOPER', 'SUPER_ADMIN', false, 1);
    assert.equal(res.allowed, false);
    assert.match(res.reason || '', /Lockout Prevention/i);
  });

  await t.test('Can demote a DEVELOPER if more than one exists', () => {
    // DEVELOPER demoting another DEVELOPER when 2 active DEVELOPERS exist
    const res = canActorModifyRole('DEVELOPER', 'DEVELOPER', 'SUPER_ADMIN', false, 2);
    assert.equal(res.allowed, true);
  });

  await t.test('SUPER_ADMIN cannot promote user to DEVELOPER', () => {
    const res = canActorModifyRole('SUPER_ADMIN', 'AGENT', 'DEVELOPER', false, 1);
    assert.equal(res.allowed, false);
    assert.match(res.reason || '', /Only platform Developers can grant the Developer role/i);
  });

  await t.test('SUPER_ADMIN cannot demote a DEVELOPER', () => {
    const res = canActorModifyRole('SUPER_ADMIN', 'DEVELOPER', 'AGENT', false, 1);
    assert.equal(res.allowed, false);
    assert.match(res.reason || '', /Super Admins cannot modify, demote, or revoke Developer accounts/i);
  });

  await t.test('Actor cannot delete or disable their own account', () => {
    const res = canActorDisableOrDeleteUser('DEVELOPER', 'DEVELOPER', true, 1);
    assert.equal(res.allowed, false);
    assert.match(res.reason || '', /cannot disable or delete your own/i);
  });

  await t.test('Super Admin cannot delete or disable a DEVELOPER account', () => {
    const res = canActorDisableOrDeleteUser('SUPER_ADMIN', 'DEVELOPER', false, 1);
    assert.equal(res.allowed, false);
    assert.match(res.reason || '', /Super Admins cannot disable/i);
  });
});
