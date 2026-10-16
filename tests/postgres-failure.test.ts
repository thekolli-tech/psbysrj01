import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyDatabaseConnectionFailure, redactDatabaseError } from '../src/server/postgres.ts';

test('database connection failures are classified without retaining credentials', () => {
  assert.equal(classifyDatabaseConnectionFailure({ code: 'ETIMEDOUT', message: 'connect ETIMEDOUT' }), 'CONNECTION_TIMEOUT');
  assert.equal(
    classifyDatabaseConnectionFailure({ message: 'Connection terminated due to connection timeout' }),
    'CONNECTION_TIMEOUT'
  );
  assert.equal(
    classifyDatabaseConnectionFailure({ code: '28P01', message: 'password authentication failed for user "neondb_owner"' }),
    'AUTHENTICATION_FAILED'
  );
  assert.equal(classifyDatabaseConnectionFailure({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' }), 'DNS_FAILURE');
  assert.equal(classifyDatabaseConnectionFailure({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' }), 'NETWORK_FAILURE');
  assert.equal(classifyDatabaseConnectionFailure({ code: 'ENETUNREACH', message: 'connect ENETUNREACH' }), 'NETWORK_FAILURE');
  assert.equal(
    classifyDatabaseConnectionFailure({ code: '3D000', message: 'database "missing" does not exist' }),
    'DATABASE_MISSING'
  );
  assert.equal(
    classifyDatabaseConnectionFailure({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', message: 'unable to verify the first certificate' }),
    'TLS_FAILED'
  );
  assert.equal(classifyDatabaseConnectionFailure({ message: 'something else failed' }), 'UNKNOWN');

  const leaked = 'connect ETIMEDOUT postgresql://neondb_owner:secret-value@ep-example.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const safe = redactDatabaseError(leaked);
  assert.equal(safe.includes('secret-value'), false);
  assert.equal(safe.includes('ep-example'), false);
  assert.equal(safe.includes('postgresql://[redacted]'), true);
});
