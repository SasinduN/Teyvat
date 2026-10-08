import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectionTargetFor } from '../../shared/pg-connection';

test('remote SSL modes verify certificates and strip parser override flags', () => {
  for (const mode of ['require', 'prefer', 'allow', 'verify-ca', 'verify-full']) {
    const result = connectionTargetFor(`postgresql://example.invalid/db?sslmode=${mode}&uselibpqcompat=true`);
    assert.deepEqual(result.ssl, { rejectUnauthorized: true });
    assert.equal(new URL(result.connectionString).searchParams.has('sslmode'), false);
    assert.equal(new URL(result.connectionString).searchParams.has('uselibpqcompat'), false);
  }
});
test('plain local setup stays valid; unverified exception never accepts a remote host', () => {
  assert.equal(connectionTargetFor('postgresql://localhost/local').ssl, false);
  assert.equal(connectionTargetFor('postgresql://localhost/local?sslmode=disable').ssl, false);
  assert.deepEqual(connectionTargetFor('postgresql://localhost/local?sslmode=no-verify').ssl, { rejectUnauthorized: false });
  assert.throws(() => connectionTargetFor('postgresql://example.invalid/db?sslmode=no-verify'));
  assert.throws(() => connectionTargetFor('postgresql://localhost/local?sslmode=invalid'));
});
