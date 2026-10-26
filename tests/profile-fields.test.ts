import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROFILE_TEXT_MAX, readProfileField, readProfilePatch } from '../src/shared/profileFields.ts';
import { isPlatformAdmin, isProfessionalRole, postLoginDestination } from '../src/shared/policy.ts';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('profile text is optional, normalized, and rejected when invalid', () => {
  assert.deepEqual(readProfileField(undefined, false, 'Town/City'), { omit: true });
  assert.deepEqual(readProfileField(null, true, 'Town/City'), { omit: false, value: null });
  assert.deepEqual(readProfileField('  Hyderabad   ', true, 'Town/City'), { omit: false, value: 'Hyderabad' });
  assert.deepEqual(readProfileField('   ', true, 'Profession'), { omit: false, value: null });
  assert.equal('error' in readProfileField(12, true, 'Profession'), true);
  assert.equal('error' in readProfileField('a'.repeat(PROFILE_TEXT_MAX + 1), true, 'Town/City'), true);
  assert.equal('error' in readProfileField('<b>Agent</b>', true, 'Profession'), true);
  const patch = readProfilePatch({ profession: '  Channel partner  ' });
  assert.deepEqual(patch.townCity, { omit: true });
  assert.deepEqual(patch.profession, { omit: false, value: 'Channel partner' });
});

test('profession does not grant a role or platform access', () => {
  assert.equal(isPlatformAdmin('PROPERTY_SEEKER'), false);
  assert.equal(isProfessionalRole('PROPERTY_SEEKER'), false);
  assert.equal(postLoginDestination('PROPERTY_SEEKER'), 'PROPERTIES');
  assert.equal(isPlatformAdmin('DEVELOPER'), true);
  const source = read('src/server/db.ts');
  assert.match(source, /Updates only town\/city and profession/);
  assert.doesNotMatch(source, /town_city = \?[\s\S]{0,120}role =/);
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS town_city TEXT/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS profession TEXT/);
  assert.doesNotMatch(POSTGRES_ADDITIVE_SQL, /UPDATE\s+users|DROP\s+TABLE|DELETE\s+FROM/i);
});
