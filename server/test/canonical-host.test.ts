// Must be first: points the server at the test database and removes every
// R2_* and Resend variable (and PUBLIC_SITE_URL), or refuses to run.
import './test-db';

/**
 * The canonical host (`server/src/canonical-host.ts`): with PUBLIC_SITE_URL set,
 * a page asked for on www or Railway's own host gets a 301 to the same path and
 * query on PUBLIC_SITE_URL. The canonical host itself (any case, port or trailing
 * dot) is served; `/api/*` (the healthcheck above all) never redirects; without
 * PUBLIC_SITE_URL nothing changes. Over real HTTP, so the Host header is exactly
 * what a proxy would forward.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { request } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { canonicalHost, hostnameOf } from '../src/canonical-host';
import { pool } from '../src/db';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const SITE = 'https://tours.example';
const WWW = 'www.tours.example';
const RAILWAY = 'site-production.up.railway.app';
const built = existsSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/index.html'));

interface Answer {
  status: number;
  location: string | undefined;
}

/** One request with exactly this Host header (fetch won't send a custom one). */
function ask(app: RunningApp, host: string, path: string, method = 'GET', headers: Record<string, string> = {}): Promise<Answer> {
  const { port } = new URL(app.baseUrl);
  return new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers: { ...headers, Host: host } }, (res) => {
      res.resume();
      res.on('end', () => done({ status: res.statusCode ?? 0, location: res.headers.location }));
    });
    req.on('error', fail);
    req.end();
  });
}

let on: RunningApp; // PUBLIC_SITE_URL set
let off: RunningApp; // PUBLIC_SITE_URL unset: the default, from the environment (test-db removes it)

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  on = await listen(createApp({ media: null, site: { url: SITE, indexable: false }, canonicalOrigin: SITE }));
  off = await listen(createApp({ media: null }));
}, HOOK_TIMEOUT);

after(async () => {
  await Promise.all([on?.close(), off?.close()]);
  await pool.end();
}, HOOK_TIMEOUT);

describe('the canonical host', () => {
  test('www: a 301 to the same path and query on PUBLIC_SITE_URL, for GET and HEAD', async () => {
    const path = '/tours/category/wildlife?utm_source=chat&b=1%202';
    assert.deepEqual(await ask(on, WWW, path), { status: 301, location: `${SITE}${path}` });
    assert.deepEqual(await ask(on, WWW, path, 'HEAD'), { status: 301, location: `${SITE}${path}` });
    assert.deepEqual(await ask(on, WWW, '/'), { status: 301, location: `${SITE}/` });
  });

  test("Railway's own host: a 301 too", async () => {
    assert.deepEqual(await ask(on, RAILWAY, '/destinations/ella'), { status: 301, location: `${SITE}/destinations/ella` });
    assert.deepEqual(await ask(on, `${RAILWAY}:443`, '/sitemap.xml'), { status: 301, location: `${SITE}/sitemap.xml` });
  });

  test('the canonical host is served, whatever its case, port or trailing dot: no loop', async () => {
    for (const host of ['tours.example', 'TOURS.Example', 'tours.example.', 'tours.example:443', 'tours.example.:8081']) {
      const { status } = await ask(on, host, '/robots.txt');
      assert.notEqual(status, 301, host);
      if (built) assert.equal(status, 200, host);
    }
    if (built) assert.equal((await ask(on, 'tours.example', '/tours')).status, 200);
  });

  test("/api/* never redirects: Railway's healthcheck and open tabs keep working", async () => {
    const health = await ask(on, RAILWAY, '/api/health');
    assert.equal(health.status, 200, 'the healthcheck answers on the Railway host');
    assert.equal(health.location, undefined);
    assert.equal((await ask(on, RAILWAY, '/API/health')).status, 200, 'Express routes without case');
    assert.equal((await ask(on, WWW, '/api/content')).status, 200);
    assert.notEqual((await ask(on, WWW, '/api/no-such-endpoint')).status, 301);
    assert.notEqual((await ask(on, WWW, '/api')).status, 301);
  });

  test('only GET and HEAD for pages redirect', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      assert.notEqual((await ask(on, WWW, '/tours', method)).status, 301, method);
    }
  });

  test('X-Forwarded-Host is ignored: the Host header decides', async () => {
    assert.notEqual((await ask(on, 'tours.example', '/robots.txt', 'GET', { 'X-Forwarded-Host': WWW })).status, 301);
    assert.equal((await ask(on, WWW, '/robots.txt', 'GET', { 'X-Forwarded-Host': 'tours.example' })).status, 301);
  });

  test('never an open redirect: "//evil.example" stays a path on our host', async () => {
    const { status, location } = await ask(on, WWW, '//evil.example/x');
    assert.equal(status, 301);
    assert.equal(location, `${SITE}//evil.example/x`);
    assert.equal(new URL(location!).host, 'tours.example');
  });

  test('without PUBLIC_SITE_URL nothing redirects (local runs and the other tests)', async () => {
    for (const host of [WWW, RAILWAY, 'localhost:8081']) {
      assert.notEqual((await ask(off, host, '/robots.txt')).status, 301, host);
    }
    assert.notEqual((await ask(off, WWW, '/api/health')).status, 301);
  });

  test('no Host header: passed on, never redirected', () => {
    let passed = false;
    const res = { redirect: () => assert.fail('redirected') };
    canonicalHost(SITE)({ method: 'GET', path: '/', originalUrl: '/', headers: {} } as never, res as never, () => {
      passed = true;
    });
    assert.ok(passed);
  });

  test('hostnameOf: no case, port or trailing dot', () => {
    assert.equal(hostnameOf('Tours.Example.:443'), 'tours.example');
    assert.equal(hostnameOf('tours.example'), 'tours.example');
    assert.equal(hostnameOf('[::1]:8081'), '[::1]');
    assert.equal(hostnameOf(' WWW.tours.example '), 'www.tours.example');
  });
});
