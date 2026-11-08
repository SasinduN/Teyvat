/**
 * `connectionTargetFor`: the TLS each `sslmode` means (libpq's meanings, see
 * `shared/pg-connection.ts`). `require` must not verify: Railway's public
 * proxy has a self-signed certificate, and the owner's scripts connect
 * through it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { connectionTargetFor, isRailwayInternal } from '../../shared/pg-connection';

const remote = (mode: string) => `postgresql://u:p@example.proxy.rlwy.net:12345/railway?sslmode=${mode}&uselibpqcompat=true`;

test('no sslmode, or disable: no TLS', () => {
  assert.equal(connectionTargetFor('postgresql://u:p@postgres.railway.internal:5432/railway').ssl, false);
  assert.equal(connectionTargetFor('postgresql://localhost:5433/teyvat_test?sslmode=disable').ssl, false);
});

test('allow, prefer and require encrypt without verifying, for any host', () => {
  for (const mode of ['allow', 'prefer', 'require']) {
    assert.deepEqual(connectionTargetFor(remote(mode)).ssl, { rejectUnauthorized: false }, mode);
  }
});

test('verify-ca and verify-full verify the certificate', () => {
  for (const mode of ['verify-ca', 'verify-full']) {
    assert.deepEqual(connectionTargetFor(remote(mode)).ssl, { rejectUnauthorized: true }, mode);
  }
});

test('no-verify encrypts without verifying, remote hosts included', () => {
  assert.deepEqual(connectionTargetFor(remote('no-verify')).ssl, { rejectUnauthorized: false });
  assert.deepEqual(connectionTargetFor('postgresql://localhost/local?sslmode=no-verify').ssl, { rejectUnauthorized: false });
});

test('sslmode and uselibpqcompat are stripped, so pg cannot override the decision', () => {
  for (const mode of ['disable', 'require', 'verify-full', 'no-verify']) {
    const params = new URL(connectionTargetFor(remote(mode)).connectionString).searchParams;
    assert.equal(params.has('sslmode'), false, mode);
    assert.equal(params.has('uselibpqcompat'), false, mode);
  }
});

test('an unknown sslmode throws instead of silently meaning no TLS', () => {
  assert.throws(() => connectionTargetFor(remote('requir')), /Unsupported sslmode/);
  assert.throws(() => connectionTargetFor('postgresql://localhost/local?sslmode=invalid'), /Unsupported sslmode/);
});

test('isRailwayInternal recognises only the private-network host', () => {
  assert.equal(isRailwayInternal('postgresql://u:p@postgres.railway.internal:5432/railway'), true);
  assert.equal(isRailwayInternal(remote('require')), false);
  assert.equal(isRailwayInternal('postgresql://localhost:5433/teyvat_test'), false);
});
