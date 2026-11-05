// Must be first: points the server at the test database, or refuses to run.
import './test-db';

/**
 * A failed sign-in's 401 says how many tries are left (`attemptsLeft`), once
 * 3 or fewer remain, for the (email, IP) pair only. The limits themselves are
 * auth.test.ts's; nothing here changes them.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { LIMITS } from '../src/auth/throttle';
import { pool } from '../src/db';
import {
  assertConnectedToTestDatabase,
  createUser,
  listen,
  login,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const EMAIL = 'admin@example.test';
const PLAIN = { error: { code: 'unauthorized', message: 'Incorrect email or password.' } };
const withLeft = (attemptsLeft: number) => ({ error: { ...PLAIN.error, attemptsLeft } });

let app: RunningApp;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp());
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetAuthTables();
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

/** The bodies of `count` wrong sign-ins for `email` from `ip`, in order. */
async function failures(email: string, ip: string, count: number): Promise<unknown[]> {
  const bodies: unknown[] = [];
  for (let i = 0; i < count; i += 1) {
    const res = await login(app, email, 'not the password', ip);
    assert.equal(res.status, 401);
    bodies.push(await res.json());
  }
  return bodies;
}

describe('attempts left', () => {
  test('counts down 4 → 1 (shown from 3), then 0, then 429', async () => {
    assert.equal(LIMITS.perEmailAndIp, 5, 'the per (email, IP) limit is unchanged');
    await createUser();

    // 4 left after the first: the plain 401, exactly as before.
    assert.deepEqual(await failures(EMAIL, '203.0.113.60', 5), [
      PLAIN,
      withLeft(3),
      withLeft(2),
      withLeft(1),
      withLeft(0)
    ]);
    const locked = await login(app, EMAIL, PASSWORD, '203.0.113.60');
    assert.equal(locked.status, 429);
    assert.ok(Number(locked.headers.get('retry-after')) > 0, 'Retry-After is set');
  });

  test('the same bodies for an unknown email as for a real one', async () => {
    await createUser();
    const real = await failures(EMAIL, '203.0.113.61', 5);
    const unknown = await failures('nobody@example.test', '203.0.113.62', 5);
    assert.deepEqual(unknown, real);
  });

  test("only the pair's count: the IP's and the email's totals don't show", async () => {
    await createUser();
    const ip = '203.0.113.63';

    // 19 failures from this IP across other emails: one short of its limit (20).
    for (let i = 0; i < LIMITS.perIp - 1; i += 1) await failures(`guess${i}@example.test`, ip, 1);
    assert.deepEqual(await failures(EMAIL, ip, 1), [PLAIN]);

    // 45 failures for the email from other IPs (under its 50), then a new IP.
    await resetAuthTables();
    await createUser();
    for (let i = 0; i < 45; i += 1) await failures(EMAIL, `10.0.2.${i + 1}`, 1);
    assert.deepEqual(await failures(EMAIL, '198.51.100.63', 1), [PLAIN]);
  });

  test('a successful sign-in resets the count', async () => {
    await createUser();
    const ip = '203.0.113.64';

    assert.deepEqual(await failures(EMAIL, ip, 3), [PLAIN, withLeft(3), withLeft(2)]);
    assert.equal((await login(app, EMAIL, PASSWORD, ip)).status, 200);
    assert.deepEqual(await failures(EMAIL, ip, 2), [PLAIN, withLeft(3)]);
  });
});
