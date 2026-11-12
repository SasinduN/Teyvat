// Must be first: points the server at the test database, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, mock, test } from 'node:test';

import express from 'express';

import { createApp } from '../src/app';
import { createOrResetAdmin, isPublicContactEmail } from '../src/auth/accounts';
import { requireAdmin } from '../src/auth/middleware';
import { passwords } from '../src/auth/passwords';
import { emailHash } from '../src/auth/throttle';
import { pool } from '../src/db';
import { errorHandler } from '../src/http';
import {
  assertConnectedToTestDatabase,
  browserHeaders,
  createUser,
  listen,
  login,
  median,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  sessionTokenFrom,
  withSession,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const EMAIL = 'admin@example.test';
const BAD_CREDENTIALS = { error: { code: 'unauthorized', message: 'Incorrect email or password.' } };

let app: RunningApp;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp());
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetAuthTables();
  mock.restoreAll();
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

function me(token: string): Promise<Response> {
  return fetch(`${app.baseUrl}/api/auth/me`, { headers: withSession(token) });
}

function post(path: string, token: string): Promise<Response> {
  return fetch(`${app.baseUrl}${path}`, {
    method: 'POST',
    headers: { ...browserHeaders(app), ...withSession(token) }
  });
}

async function signIn(ip?: string): Promise<string> {
  const res = await login(app, EMAIL, PASSWORD, ip);
  assert.equal(res.status, 200);
  const token = sessionTokenFrom(res);
  assert.ok(token, 'login set no session cookie');
  return token;
}

/* ------------------------------------------------------------------ login */

describe('login', () => {
  test('ok: sets the cookie, then /me returns the user', async () => {
    const id = await createUser();

    const res = await login(app, '  Admin@Example.TEST ', PASSWORD);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await res.json(), { user: { id, email: EMAIL, fullName: 'Test Admin' } });

    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('__Host-session='));
    assert.ok(cookie);
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=604800']) {
      assert.ok(cookie.includes(attribute), `cookie is missing ${attribute}: ${cookie}`);
    }
    assert.ok(!/Domain=/i.test(cookie), '__Host- cookies must not set Domain');

    const token = sessionTokenFrom(res)!;
    const who = await me(token);
    assert.equal(who.status, 200);
    assert.deepEqual(await who.json(), { user: { id, email: EMAIL, fullName: 'Test Admin' } });

    const { rows } = await pool.query(
      `select s.ip::text as ip, s.user_agent, u.last_login_at,
              s.expires_at - s.created_at = interval '7 days' as seven_days
         from public.sessions s join public.users u on u.id = s.user_id`
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ip, '203.0.113.1/32');
    assert.ok(rows[0].user_agent);
    assert.ok(rows[0].last_login_at);
    assert.equal(rows[0].seven_days, true);
  });

  test('wrong password: 401', async () => {
    await createUser();
    const res = await login(app, EMAIL, 'not the password');
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), BAD_CREDENTIALS);
    assert.equal(sessionTokenFrom(res), null);
  });

  test('unknown email: the same 401, and exactly one argon2 verify on each path', async () => {
    await createUser();
    const verify = mock.method(passwords, 'verify');

    const wrong = await login(app, EMAIL, 'not the password', '198.51.100.1');
    assert.equal(verify.mock.callCount(), 1);

    const unknown = await login(app, 'nobody@example.test', 'not the password', '198.51.100.2');
    assert.equal(verify.mock.callCount(), 2);

    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(await unknown.json(), await wrong.json());
  });

  /**
   * Backs up the test above (exactly one argon2 verify on each path), which
   * is the real guarantee. Timing on a shared CI machine is noisy, so: a few
   * untimed calls on each path first, then 30 timed calls per path in
   * strict alternation (wrong, unknown, wrong, unknown, …) so a slow patch
   * of the machine lands on both alike, and medians, which ignore the odd
   * outlier. The 25% limit is unchanged. Each call uses its own IP, and the
   * known email's 33 failures stay under the per-email lockout (50).
   */
  test('unknown email: median time within 25% of a wrong password', async (t) => {
    await createUser();
    const time = async (email: string, ip: string) => {
      const started = performance.now();
      const res = await login(app, email, 'not the password', ip);
      assert.equal(res.status, 401);
      return performance.now() - started;
    };

    // Untimed warm-up, alternating, so neither side pays first-use costs the other skips.
    for (let i = 0; i < 3; i += 1) {
      await time(EMAIL, `192.0.2.${200 + i}`);
      await time(`warmup${i}@example.test`, `192.0.2.${210 + i}`);
    }

    const SAMPLES = 30;
    const wrong: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1) {
      wrong.push(await time(EMAIL, `192.0.2.${i}`));
      unknown.push(await time(`nobody${i}@example.test`, `192.0.2.${100 + i}`));
    }

    const [a, b] = [median(wrong), median(unknown)];
    const ratio = Math.max(a, b) / Math.min(a, b);
    t.diagnostic(`median: wrong password ${a.toFixed(1)}ms, unknown email ${b.toFixed(1)}ms, ratio ${ratio.toFixed(3)}`);
    assert.ok(
      ratio <= 1.25,
      `medians differ by ${((ratio - 1) * 100).toFixed(0)}%: ` +
        `wrong password ${a.toFixed(1)}ms, unknown email ${b.toFixed(1)}ms`
    );
  });

  test('malformed body: 400 without touching argon2', async () => {
    const verify = mock.method(passwords, 'verify');
    const res = await fetch(`${app.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: browserHeaders(app),
      body: JSON.stringify({ email: 'x@example.test', password: '' })
    });
    assert.equal(res.status, 400);
    assert.equal(verify.mock.callCount(), 0);
  });
});

/* ------------------------------------------------------------- rate limit */

describe('rate limit', () => {
  test('same email and IP: the 6th attempt gets 429 with Retry-After, even with the right password', async () => {
    await createUser();
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await login(app, EMAIL, 'wrong')).status, 401);
    }

    const verify = mock.method(passwords, 'verify');
    const res = await login(app, EMAIL, PASSWORD);

    assert.equal(res.status, 429);
    const retryAfter = Number(res.headers.get('retry-after'));
    assert.ok(retryAfter > 0 && retryAfter <= 15 * 60, `Retry-After was ${retryAfter}`);
    assert.deepEqual(await res.json(), {
      error: {
        code: 'too_many_requests',
        message: 'Too many sign-in attempts. Try again in 15 minutes.'
      }
    });
    assert.equal(sessionTokenFrom(res), null);
    assert.equal(verify.mock.callCount(), 0, 'a locked-out attempt must not run argon2');
  });

  test('IP A vs IP B: failures from A do not lock the same email out on B', async () => {
    await createUser();
    const A = '203.0.113.10';
    const B = '198.51.100.20';

    for (let i = 0; i < 5; i += 1) {
      assert.equal((await login(app, EMAIL, 'wrong', A)).status, 401);
    }
    assert.equal((await login(app, EMAIL, PASSWORD, A)).status, 429);

    const fromB = await login(app, EMAIL, PASSWORD, B);
    assert.equal(fromB.status, 200);
    assert.ok(sessionTokenFrom(fromB));
  });

  test('per IP: the 21st failure from one IP across different emails gets 429', async () => {
    const ip = '203.0.113.30';
    for (let i = 0; i < 20; i += 1) {
      assert.equal((await login(app, `guess${i}@example.test`, 'wrong', ip)).status, 401);
    }
    assert.equal((await login(app, 'guess20@example.test', 'wrong', ip)).status, 429);
  });

  test('per email: the 51st failure for one email across many IPs gets 429', async () => {
    await createUser();
    for (let i = 0; i < 50; i += 1) {
      assert.equal((await login(app, EMAIL, 'wrong', `10.0.0.${i + 1}`)).status, 401);
    }
    assert.equal((await login(app, EMAIL, 'wrong', '10.0.1.1')).status, 429);
  });

  test("a successful login clears that email's failures, not the IP's", async () => {
    await createUser();
    const ip = '203.0.113.40';

    for (let i = 0; i < 4; i += 1) await login(app, EMAIL, 'wrong', ip);
    await login(app, 'other@example.test', 'wrong', ip);
    assert.equal((await login(app, EMAIL, PASSWORD, ip)).status, 200);

    const { rows } = await pool.query<{ email_hash: string }>(
      'select email_hash from public.login_attempts where not succeeded'
    );
    assert.deepEqual(
      rows.map((r) => r.email_hash),
      [emailHash('other@example.test')]
    );
  });
});

/* --------------------------------------------------------------- sessions */

describe('sessions', () => {
  test('expired session: /me returns 401', async () => {
    await createUser();
    const token = await signIn();

    await pool.query(
      `update public.sessions
          set created_at = now() - interval '8 days', expires_at = now() - interval '1 day'`
    );

    const res = await me(token);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  test('revoked session: logout ends this one; logout-all ends both', async () => {
    await createUser();

    const single = await signIn();
    const out = await post('/api/auth/logout', single);
    assert.equal(out.status, 204);
    assert.equal((await me(single)).status, 401);

    const first = await signIn('203.0.113.50');
    const second = await signIn('198.51.100.50');
    assert.equal((await me(first)).status, 200);
    assert.equal((await me(second)).status, 200);

    assert.equal((await post('/api/auth/logout-all', first)).status, 204);
    assert.equal((await me(first)).status, 401);
    assert.equal((await me(second)).status, 401);
  });
});

/* ------------------------------------------------------------ same origin */

describe('cross-origin POST', () => {
  test('Origin https://evil.example gets 403', async () => {
    await createUser();
    const res = await fetch(`${app.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    assert.equal(res.status, 403);
    assert.equal(sessionTokenFrom(res), null);
  });

  test('no Origin and no Sec-Fetch-Site gets 403', async () => {
    const res = await fetch(`${app.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    assert.equal(res.status, 403);
  });

  test('no Origin but Sec-Fetch-Site: same-origin is accepted', async () => {
    await createUser();
    const res = await fetch(`${app.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    assert.equal(res.status, 200);
  });
});

/* ------------------------------------------------------------ requireAdmin */

describe('requireAdmin', () => {
  let guarded: RunningApp;

  before(async () => {
    const throwaway = express();
    throwaway.get('/guarded', requireAdmin, (req, res) => {
      res.json({ userId: req.auth?.user.id });
    });
    throwaway.use(errorHandler);
    guarded = await listen(throwaway);
  }, HOOK_TIMEOUT);

  after(async () => {
    await guarded?.close();
  }, HOOK_TIMEOUT);

  const get = (headers: Record<string, string> = {}) =>
    fetch(`${guarded.baseUrl}/guarded`, { headers });

  test('no cookie: 401', async () => {
    assert.equal((await get()).status, 401);
  });

  test('a made-up token: 401', async () => {
    assert.equal((await get(withSession('bm90LWEtcmVhbC1zZXNzaW9uLXRva2VuLWF0LWFsbC0xMjM'))).status, 401);
  });

  test("a session whose user was deleted: 401", async () => {
    const id = await createUser();
    const token = await signIn();
    assert.equal((await get(withSession(token))).status, 200);

    await pool.query('delete from public.users where id = $1', [id]);
    assert.equal((await get(withSession(token))).status, 401);
  });
});

/* ----------------------------------------------------------- create-admin */

describe('create-admin', () => {
  test('creates, refuses a duplicate, and --reset-password ends sessions and clears failures', async () => {
    const newPassword = 'a brand new password';
    assert.equal(
      await createOrResetAdmin({
        email: ' Admin@Example.TEST ',
        fullName: 'Test Admin',
        password: PASSWORD,
        resetPassword: false
      }),
      'created'
    );

    await assert.rejects(
      createOrResetAdmin({ email: EMAIL, fullName: null, password: PASSWORD, resetPassword: false }),
      /already exists/
    );

    const token = await signIn();
    for (let i = 0; i < 3; i += 1) await login(app, EMAIL, 'wrong');

    assert.equal(
      await createOrResetAdmin({
        email: EMAIL,
        fullName: null,
        password: newPassword,
        resetPassword: true
      }),
      'password_reset'
    );

    assert.equal((await me(token)).status, 401, 'reset must end existing sessions');
    const { rows } = await pool.query(
      'select count(*)::int as n from public.login_attempts where not succeeded'
    );
    assert.equal(rows[0].n, 0, 'reset must clear the failures');

    const { rows: users } = await pool.query('select full_name from public.users');
    assert.equal(users[0].full_name, 'Test Admin', 'reset without --name keeps the name');

    assert.equal((await login(app, EMAIL, PASSWORD)).status, 401);
    assert.equal((await login(app, EMAIL, newPassword)).status, 200);
  });

  test('rejects a password shorter than 12 characters', async () => {
    await assert.rejects(
      createOrResetAdmin({ email: EMAIL, fullName: null, password: 'short', resetPassword: false }),
      /12/
    );
  });

  test('recognises site_settings.contact_email', async () => {
    const { rows } = await pool.query<{ contact_email: string }>(
      'select contact_email from public.site_settings'
    );
    assert.equal(await isPublicContactEmail(rows[0].contact_email.toUpperCase()), true);
    assert.equal(await isPublicContactEmail('private@example.test'), false);
  });
});
