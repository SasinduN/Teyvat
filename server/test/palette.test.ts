// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The site's colour theme (docs/plans/brand-themes.md, PR B), without a browser:
 *
 *   - migration 0032: `site_settings.palette`, default `sunset`, only the three themes;
 *   - the admin API takes a theme and refuses anything else;
 *   - the server writes the saved theme on <html> (`data-palette`) in every page it sends:
 *     public pages, a 404, the admin; Sunset when nothing else is saved;
 *   - nothing in a request can change it: no query parameter, cookie, header or path;
 *   - the manifest's colour follows it.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { injectPalette } from '../src/pages/head';
import { webManifest } from '../src/pages/pages';
import { BRAND } from '../../shared/brand';
import { DEFAULT_PALETTE, isPalette, PALETTE_THEME_COLOR, PALETTES } from '../../shared/palette';
import { siteSettingsSchema } from '../../shared/content-schema';
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
  await pool.query(`update public.site_settings set palette = 'sunset' where id`);
}, HOOK_TIMEOUT);

after(async () => {
  await resetContent();
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

const paletteOf = (html: string) => [...html.matchAll(/<html[^>]*?\sdata-palette="([^"]*)"/g)].map((m) => m[1]);

describe('migration 0032: site_settings.palette', () => {
  test('a text column, Sunset by default, only the three themes', async () => {
    const { rows } = await pool.query(
      `select data_type, column_default, is_nullable from information_schema.columns
        where table_schema = 'public' and table_name = 'site_settings' and column_name = 'palette'`
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].data_type, 'text');
    assert.match(rows[0].column_default, /'sunset'/);
    assert.equal(rows[0].is_nullable, 'NO');
    for (const palette of PALETTES) {
      await pool.query('update public.site_settings set palette = $1 where id', [palette]);
    }
    await assert.rejects(pool.query(`update public.site_settings set palette = 'pink' where id`), /site_settings_palette_allowed/);
    await assert.rejects(pool.query(`update public.site_settings set palette = null where id`), /null/i);
  });

  test('shared/palette.ts agrees: the same three, Sunset the default', () => {
    assert.deepEqual([...PALETTES], ['sunset', 'emerald', 'ocean']);
    assert.equal(DEFAULT_PALETTE, 'sunset');
    for (const bad of ['pink', 'Sunset', '', null, undefined, 1, 'sunset ']) assert.equal(isPalette(bad), false, String(bad));
  });
});

describe('the admin API', () => {
  const settings = () => fetch(`${app.baseUrl}/api/admin/site-settings`, { headers: withSession(token) }).then((r) => r.json());
  const save = async (changes: Record<string, unknown>) => {
    const current = await settings();
    const { id: _id, created_at: _c, updated_at, ...values } = current;
    return fetch(`${app.baseUrl}/api/admin/site-settings`, {
      method: 'PUT',
      headers: { ...browserHeaders(app), ...withSession(token) },
      body: JSON.stringify({ values: { ...values, ...changes }, expectedUpdatedAt: updated_at })
    });
  };

  test('saves a theme', async () => {
    for (const palette of ['ocean', 'emerald', 'sunset']) {
      const res = await save({ palette });
      assert.equal(res.status, 200, palette);
      assert.equal((await res.json()).palette, palette);
      assert.equal((await settings()).palette, palette);
    }
  });

  test('refuses anything else, naming the field', async () => {
    for (const palette of ['pink', 'OCEAN', '', null, 3]) {
      const res = await save({ palette });
      assert.equal(res.status, 400, String(palette));
      const body = await res.json();
      assert.equal(body.error?.fields?.palette, 'Choose Sunset, Emerald or Ocean.', `${String(palette)}: ${JSON.stringify(body)}`);
    }
    assert.equal((await settings()).palette, 'sunset', 'nothing was saved');
    assert.equal(siteSettingsSchema.safeParse({}).success, false);
  });

  test('needs an admin', async () => {
    const res = await fetch(`${app.baseUrl}/api/admin/site-settings`, {
      method: 'PUT',
      headers: browserHeaders(app),
      body: JSON.stringify({ values: { palette: 'ocean' }, expectedUpdatedAt: new Date().toISOString() })
    });
    assert.equal(res.status, 401);
  });
});

describe('the attribute on every page', { skip: built ? false : 'no build; run `npm run build` first' }, () => {
  const page = (path: string, init: RequestInit = {}) => fetch(`${app.baseUrl}${path}`, { redirect: 'manual', ...init }).then((r) => r.text());

  test('Sunset when nothing else is saved', async () => {
    assert.deepEqual(paletteOf(await page('/')), ['sunset']);
  });

  test('the saved theme on public pages, a 404 and the admin, once each, next to the text size', async () => {
    for (const palette of PALETTES) {
      await pool.query('update public.site_settings set palette = $1 where id', [palette]);
      for (const path of ['/', '/tours', '/destinations/ella', '/no-such-page', '/admin', '/admin/login']) {
        const html = await page(path);
        assert.deepEqual(paletteOf(html), [palette], `${palette} ${path}`);
        assert.match(html, /<html[^>]*\sdata-text-size="\d+"/, `${path}: the text size too`);
      }
    }
  });

  test('nothing in the request changes it: query, cookie, headers, storage-like names', async () => {
    await pool.query(`update public.site_settings set palette = 'ocean' where id`);
    const attempts: [string, RequestInit][] = [
      ['/?palette=emerald', {}],
      ['/?data-palette=sunset&theme=emerald', {}],
      ['/tours?palette=sunset', {}],
      ['/', { headers: { Cookie: 'palette=emerald; site:palette=sunset; data-palette=emerald' } }],
      ['/', { headers: { 'X-Palette': 'emerald', 'Sec-CH-Prefers-Color-Scheme': 'dark', 'Accept-Language': 'emerald' } }],
      ['/', { headers: { Referer: `${app.baseUrl}/?palette=emerald` } }]
    ];
    for (const [path, init] of attempts) {
      assert.deepEqual(paletteOf(await page(path, init)), ['ocean'], `${path} ${JSON.stringify(init)}`);
    }
  });

  test('the manifest’s colour follows the theme', async () => {
    for (const palette of PALETTES) {
      await pool.query('update public.site_settings set palette = $1 where id', [palette]);
      const manifest = await (await fetch(`${app.baseUrl}/site.webmanifest`)).json();
      assert.equal(manifest.theme_color, PALETTE_THEME_COLOR[palette]);
    }
    assert.equal(webManifest(BRAND).theme_color, PALETTE_THEME_COLOR.sunset, 'the default');
  });
});

test('injectPalette writes only a theme, and refuses anything else', () => {
  assert.equal(injectPalette('<html lang="en">', 'ocean'), '<html data-palette="ocean" lang="en">');
  assert.throws(() => injectPalette('<html>', '"><script>' as never), /Not a colour theme/);
});
