// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * A first visit's light or dark (handoff Task 7, Admin → Appearance), without a browser:
 *
 *   - migration 0033: `site_settings.default_mode`, default `light`, only light, dark, auto;
 *   - the admin API takes a mode and refuses anything else, and a save of one setting keeps it;
 *   - the server writes the saved mode on <html> (`data-default-mode`) in every page type it
 *     sends, public and admin, next to the palette; light when nothing else is saved;
 *   - nothing in a request can change it: no query parameter, cookie, header or path;
 *   - `resolveTheme`: the visitor's choice, else the mode (Auto by the device), else light.
 *
 * The browser half (theme-init.js before the first paint, the panel) is browser-appearance.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { injectDefaultMode } from '../src/pages/head';
import { DEFAULT_DEFAULT_MODE, DEFAULT_MODES, isDefaultMode, resolveTheme } from '../../shared/default-mode';
import { SITE_SETTINGS_COLUMNS, siteSettingsSchema } from '../../shared/content-schema';
import { PUBLIC_SITE_SETTINGS_COLUMNS } from '../../shared/api';
import {
  assertConnectedToTestDatabase,
  browserHeaders,
  createUser,
  listen,
  login,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  resetContent,
  sessionTokenFrom,
  withSession,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const built = existsSync(join(ROOT, 'dist', 'index.html'));

/** Every page type (browser-contrast's list), the admin's, and a 404. */
const PAGES = [
  '/', '/explore', '/plan', '/when-to-go', '/journal', '/destinations', '/destinations/ella', '/experiences',
  '/experiences/safari-yala', '/tours', '/tours/island-in-7-days', '/tours/category/cultural', '/journal/ultimate-ella-guide',
  '/about', '/photo-credits', '/wishlist', '/unsubscribe', '/no-such-page', '/admin', '/admin/login', '/admin/settings'
];

let app: RunningApp;
let token: string;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  await resetContent();
  await resetAuthTables();
  await createUser();
  app = await listen(createApp({ media: null }));
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await pool.query(`update public.site_settings set default_mode = 'light', palette = 'sunset' where id`);
}, HOOK_TIMEOUT);

after(async () => {
  await resetContent();
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

const modeOf = (html: string) => [...html.matchAll(/<html[^>]*?\sdata-default-mode="([^"]*)"/g)].map((m) => m[1]);
const setMode = (mode: string) => pool.query('update public.site_settings set default_mode = $1 where id', [mode]);

describe('migration 0033: site_settings.default_mode', () => {
  test('a text column, light by default, only light, dark and auto', async () => {
    const { rows } = await pool.query(
      `select data_type, column_default, is_nullable from information_schema.columns
        where table_schema = 'public' and table_name = 'site_settings' and column_name = 'default_mode'`
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].data_type, 'text');
    assert.match(rows[0].column_default, /'light'/);
    assert.equal(rows[0].is_nullable, 'NO');
    for (const mode of DEFAULT_MODES) await setMode(mode);
    for (const bad of ['system', 'Dark', '', ' light']) {
      await assert.rejects(setMode(bad), /site_settings_default_mode_allowed/, bad);
    }
    await assert.rejects(pool.query(`update public.site_settings set default_mode = null where id`), /null/i);
  });

  test('shared/default-mode.ts agrees: the same three, light the default', () => {
    assert.deepEqual([...DEFAULT_MODES], ['light', 'dark', 'auto']);
    assert.equal(DEFAULT_DEFAULT_MODE, 'light');
    for (const bad of ['system', 'Light', '', null, undefined, 0, 'dark ']) assert.equal(isDefaultMode(bad), false, String(bad));
  });

  test('an admin setting only: not in /api/content', async () => {
    assert.ok(SITE_SETTINGS_COLUMNS.includes('default_mode'));
    assert.ok(!(PUBLIC_SITE_SETTINGS_COLUMNS as readonly string[]).includes('default_mode'));
    await setMode('dark');
    const content = await (await fetch(`${app.baseUrl}/api/content`)).json();
    assert.equal(JSON.stringify(content).includes('default_mode'), false);
  });
});

describe('the admin API', () => {
  const settings = () => fetch(`${app.baseUrl}/api/admin/site-settings`, { headers: withSession(token) }).then((r) => r.json());
  const save = async (changes: Record<string, unknown>, expected?: string) => {
    const current = await settings();
    const { id: _id, created_at: _c, updated_at, ...values } = current;
    return fetch(`${app.baseUrl}/api/admin/site-settings`, {
      method: 'PUT',
      headers: { ...browserHeaders(app), ...withSession(token) },
      body: JSON.stringify({ values: { ...values, ...changes }, expectedUpdatedAt: expected ?? updated_at })
    });
  };

  test('saves a mode, with the palette in the same save', async () => {
    for (const [mode, palette] of [['dark', 'ocean'], ['auto', 'emerald'], ['light', 'sunset']]) {
      const res = await save({ default_mode: mode, palette });
      assert.equal(res.status, 200, mode);
      const body = await res.json();
      assert.deepEqual([body.default_mode, body.palette], [mode, palette]);
      const saved = await settings();
      assert.deepEqual([saved.default_mode, saved.palette], [mode, palette]);
    }
  });

  test('refuses anything else, naming the field', async () => {
    for (const mode of ['system', 'DARK', '', null, 1]) {
      const res = await save({ default_mode: mode });
      assert.equal(res.status, 400, String(mode));
      const body = await res.json();
      assert.equal(body.error?.fields?.default_mode, 'Choose Light, Dark or Auto.', `${String(mode)}: ${JSON.stringify(body)}`);
    }
    assert.equal((await settings()).default_mode, 'light', 'nothing was saved');
    assert.equal(siteSettingsSchema.safeParse({}).success, false);
  });

  test('the conflict check: a save from an older copy is refused', async () => {
    const stale = (await settings()).updated_at;
    assert.equal((await save({ default_mode: 'dark' })).status, 200);
    const res = await save({ default_mode: 'auto' }, stale);
    assert.equal(res.status, 409);
    assert.equal((await settings()).default_mode, 'dark');
  });

  test('saving the rest of the settings keeps it', async () => {
    assert.equal((await save({ default_mode: 'auto' })).status, 200);
    assert.equal((await save({ phone: '+94 11 000 0000' })).status, 200);
    assert.equal((await settings()).default_mode, 'auto');
  });

  test('needs an admin', async () => {
    const res = await fetch(`${app.baseUrl}/api/admin/site-settings`, {
      method: 'PUT',
      headers: browserHeaders(app),
      body: JSON.stringify({ values: { default_mode: 'dark' }, expectedUpdatedAt: new Date().toISOString() })
    });
    assert.equal(res.status, 401);
  });
});

describe('the attribute on every page', { skip: built ? false : 'no build; run `npm run build` first' }, () => {
  const page = (path: string, init: RequestInit = {}) => fetch(`${app.baseUrl}${path}`, { redirect: 'manual', ...init }).then((r) => r.text());

  test('light when nothing else is saved', async () => {
    assert.deepEqual(modeOf(await page('/')), ['light']);
  });

  test('the saved mode on every page type, the admin and a 404, once each, next to the palette', async () => {
    for (const mode of DEFAULT_MODES) {
      await setMode(mode);
      for (const path of PAGES) {
        const html = await page(path);
        assert.deepEqual(modeOf(html), [mode], `${mode} ${path}`);
        assert.match(html, /<html[^>]*\sdata-palette="sunset"/, `${path}: the palette too`);
      }
    }
  });

  test('theme-init.js is still the first script, a file (no inline script)', async () => {
    const html = await page('/');
    const head = html.slice(0, html.indexOf('</head>'));
    const scripts = [...head.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    assert.match(scripts[0] ?? '', /src="\/theme-init\.js"/);
    // JSON-LD is data, not script.
    assert.deepEqual(scripts.filter((s) => !/\ssrc=/.test(s) && !/type="application\/ld\+json"/.test(s)), []);
  });

  test('nothing in the request changes it: query, cookie, headers', async () => {
    await setMode('auto');
    const attempts: [string, RequestInit][] = [
      ['/?default_mode=dark', {}],
      ['/?default-mode=light&mode=dark&theme=dark', {}],
      ['/tours?data-default-mode=dark', {}],
      ['/', { headers: { Cookie: 'default_mode=dark; site:default-mode=light; site:theme=dark; theme=dark' } }],
      ['/', { headers: { 'Sec-CH-Prefers-Color-Scheme': 'dark', 'X-Default-Mode': 'light', 'X-Theme': 'dark' } }],
      ['/', { headers: { Referer: `${app.baseUrl}/?default_mode=dark` } }]
    ];
    for (const [path, init] of attempts) {
      assert.deepEqual(modeOf(await page(path, init)), ['auto'], `${path} ${JSON.stringify(init)}`);
    }
  });
});

test('injectDefaultMode writes only a mode, and refuses anything else', () => {
  assert.equal(injectDefaultMode('<html lang="en">', 'dark'), '<html data-default-mode="dark" lang="en">');
  assert.throws(() => injectDefaultMode('<html>', '"><script>' as never), /Not a default mode/);
});

test('resolveTheme: the visitor’s choice, else the mode (Auto by the device), else light', () => {
  for (const device of [false, true]) {
    assert.equal(resolveTheme('light', 'dark', device), 'light');
    assert.equal(resolveTheme('dark', 'light', device), 'dark');
    assert.equal(resolveTheme(null, 'light', device), 'light');
    assert.equal(resolveTheme(null, 'dark', device), 'dark');
    assert.equal(resolveTheme(null, 'auto', device), device ? 'dark' : 'light');
    assert.equal(resolveTheme(null, undefined, device), 'light');
    assert.equal(resolveTheme(null, 'nonsense', device), 'light');
  }
});
