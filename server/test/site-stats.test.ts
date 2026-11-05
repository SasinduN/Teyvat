// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The stats strip, from Admin → Settings to the page: the API checks and stores up
 * to four rows, the public payload carries them, and Chrome shows them in order,
 * plainly, with no sideways scroll at 120% text. With none, the strip is gone. Also
 * migration 0021, whose copy changes must leave an admin's own words alone.
 *
 * The browser half needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { SiteContentPayload } from '../../shared/api';
import { formatStat, parseSiteStats, visibleStats, type SiteStat } from '../../shared/site-stats';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import {
  assertConnectedToTestDatabase,
  browserHeaders,
  createUser,
  listen,
  login,
  migrateTestDatabase,
  PASSWORD,
  resetAuthTables,
  sessionTokenFrom,
  withSession,
  type RunningApp
} from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const browserSkip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const stat = (label: string, number: number, suffix: string, order: number): SiteStat => ({ label, number, suffix, order });

describe('shared/site-stats', () => {
  test('an empty row is dropped; a half-filled one is refused, by name', () => {
    assert.deepEqual(parseSiteStats([{ label: ' Sites ', number: '8', suffix: '', order: '2' }, { label: '', number: '', suffix: 'km', order: '' }]), {
      stats: [stat('Sites', 8, '', 2)],
      problems: []
    });
    assert.deepEqual(parseSiteStats([{ label: 'Sites', number: '' }]).problems, ['Stat 1: the number must be a whole number from 0 to 9,999,999.']);
    assert.deepEqual(parseSiteStats([{ label: '', number: '8' }]).problems, ['Stat 1: add a label, or clear its number.']);
    assert.match(parseSiteStats([{ label: 'A', number: '1.5' }]).problems[0], /whole number/);
    assert.match(parseSiteStats([{ label: 'A', number: '1', order: '9' }]).problems[0], /order/);
    assert.match(parseSiteStats([{ label: 'A', number: '1', suffix: 'kilometres' }]).problems[0], /suffix/);
  });

  test('no more than four; no order keeps the row\'s place', () => {
    const five = ['A', 'B', 'C', 'D', 'E'].map((label) => ({ label, number: 1 }));
    assert.deepEqual(parseSiteStats(five).problems, ['Up to 4 stats.']);
    assert.deepEqual(parseSiteStats(five.slice(0, 2)).stats.map((s) => s.order), [1, 2]);
  });

  test('visible stats come in order, and the number reads plainly', () => {
    assert.deepEqual(visibleStats([stat('B', 2, '', 2), stat('A', 1, '', 1), stat(' ', 3, '', 3)]).map((s) => s.label), ['A', 'B']);
    assert.deepEqual(visibleStats(null), []);
    assert.equal(formatStat(stat('x', 1620, 'km', 1)), '1,620 km');
    assert.equal(formatStat(stat('x', 2200, '+', 1)), '2,200+');
    assert.equal(formatStat(stat('x', 8, '', 1)), '8');
  });
});

describe('stats from Admin → Settings', () => {
  let app: RunningApp;
  let chrome: Chrome | undefined;
  let token: string;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null, bookings: false }));
    token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
    if (!browserSkip) chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await pool.query(`update public.site_settings set stats = '[]'::jsonb, text_size = 100 where id`);
  }, HOOK_TIMEOUT);

  const admin = (init: RequestInit = {}) =>
    fetch(`${app.baseUrl}/api/admin/site-settings`, { ...init, headers: { ...browserHeaders(app), ...withSession(token), ...(init.headers as Record<string, string>) } });

  /** A save through the real route, changing only the stats. */
  async function saveStats(stats: unknown): Promise<Response> {
    const current = (await (await admin()).json()) as Record<string, unknown> & { updated_at: string };
    const { id, created_at, updated_at, ...values } = current;
    void id; void created_at;
    return admin({ method: 'PUT', body: JSON.stringify({ values: { ...values, stats }, expectedUpdatedAt: updated_at }) });
  }

  const publicStats = async () => ((await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload).siteSettings.stats;

  test('the API stores them, and the public content carries them', async () => {
    const res = await saveStats([
      { label: 'of coastline', number: '1620', suffix: 'km', order: '2' },
      { label: '', number: '', suffix: '', order: '' },
      { label: 'World Heritage sites', number: '8', suffix: '', order: '1' }
    ]);
    assert.equal(res.status, 200);
    const expected = [stat('of coastline', 1620, 'km', 2), stat('World Heritage sites', 8, '', 1)];
    assert.deepEqual(((await res.json()) as { stats: SiteStat[] }).stats, expected);
    assert.deepEqual(await publicStats(), expected);
  });

  test('a half-filled row or a fifth row is refused, and nothing changes', async () => {
    assert.equal((await saveStats([{ label: 'Only a label', number: '', suffix: '', order: '' }])).status, 400);
    assert.equal((await saveStats(Array.from({ length: 5 }, (_, i) => ({ label: `S${i}`, number: 1 })))).status, 400);
    assert.deepEqual(await publicStats(), []);
  });

  test('saving needs a session', async () => {
    const res = await fetch(`${app.baseUrl}/api/admin/site-settings`, { method: 'PUT', headers: browserHeaders(app), body: '{}' });
    assert.equal(res.status, 401);
  });

  test('the database itself refuses a fifth stat', async () => {
    await assert.rejects(pool.query(`update public.site_settings set stats = '[1,2,3,4,5]'::jsonb where id`), /site_settings_stats_shape/);
  });

  describe('in Chrome', { skip: browserSkip }, () => {
    async function open(path: string, width: number, theme: 'light' | 'dark' = 'light'): Promise<Page> {
      const page = await chrome!.newPage();
      await page.send('Page.enable');
      await saveTheme(page, theme);
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await page.send('Page.navigate', { url: app.baseUrl + path });
      const until = Date.now() + 20_000;
      for (;;) {
        if (await page.evaluate<boolean>(`Boolean(document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer'))`).catch(() => false)) break;
        if (Date.now() > until) throw new Error(`timed out on ${path}`);
        await sleep(50);
      }
      await sleep(200);
      return page;
    }
    const strip = (page: Page) => page.evaluate<{ label: string; value: string }[]>(`[...document.querySelectorAll('[data-stat-strip] .te-stats__item')].map((i) => ({ label: i.querySelector('dt').textContent, value: i.querySelector('dd').textContent }))`);

    for (const path of ['/', '/about']) {
      test(`${path}: in order, as plain type, one h1`, async () => {
        await saveStats([
          { label: 'of coastline', number: '1620', suffix: 'km', order: '2' },
          { label: 'World Heritage sites', number: '8', suffix: '', order: '1' }
        ]);
        const page = await open(path, 1280);
        assert.deepEqual(await strip(page), [
          { label: 'World Heritage sites', value: '8' },
          { label: 'of coastline', value: '1,620 km' }
        ]);
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-stat-strip] svg, [data-stat-strip] img').length`), 0, 'no icons');
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('h1').length`), 1);
      });

      test(`${path}: hidden when there are none`, async () => {
        const page = await open(path, 1280);
        assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-stat-strip]').length`), 0);
      });
    }

    for (const theme of ['light', 'dark'] as const) {
      test(`four long stats at 375 px and 120% text, ${theme}: no sideways scroll`, async () => {
        await saveStats(Array.from({ length: 4 }, (_, i) => ({ label: 'years since a cutting of the sacred fig tree reached Anuradhapura', number: '1234567', suffix: 'km', order: String(i + 1) })));
        await pool.query(`update public.site_settings set text_size = 120 where id`);
        const page = await open('/', 375, theme);
        assert.equal((await strip(page)).length, 4);
        const overflow = await page.evaluate<number>(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
        assert.ok(overflow <= 0, `the page scrolls sideways by ${overflow}px`);
        const outside = await page.evaluate<number>(`[...document.querySelectorAll('[data-stat-strip] dt, [data-stat-strip] dd')].filter((e) => e.getBoundingClientRect().right > innerWidth + .5).length`);
        assert.equal(outside, 0);
      });
    }

    test('the editor in Admin → Settings saves what is typed, and the site shows it', async () => {
      const page = await chrome!.newPage();
      await page.send('Page.enable');
      await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await page.send('Network.enable');
      await page.send('Page.navigate', { url: `${app.baseUrl}/admin/login` });
      const wait = async (expression: string, what: string) => {
        const until = Date.now() + 15_000;
        for (;;) {
          if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
          if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
          await sleep(60);
        }
      };
      await wait(`document.querySelector('#admin-email')`, 'the login page');
      assert.equal(await page.evaluate<number>(`fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} }) }).then((r) => r.status)`), 200);
      await page.send('Page.navigate', { url: `${app.baseUrl}/admin/settings` });
      await wait(`document.querySelectorAll('[data-stat-row]').length === 4`, 'four stat rows');

      const type = (row: number, field: string, value: string) => page.evaluate(`(() => {
        const input = document.querySelectorAll('[data-stat-row]')[${row}].querySelector('[data-stat-field="${field}"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`);
      await type(0, 'label', 'typed in the admin');
      await type(0, 'number', '42');
      await type(0, 'suffix', '+');
      await page.evaluate(`document.querySelector('form button[type=submit]').click(), true`);
      await wait(`document.querySelector('[data-sonner-toast]')`, 'the saved toast');
      assert.deepEqual(await publicStats(), [stat('typed in the admin', 42, '+', 1)]);
    });
  });
});

describe('migration 0021', () => {
  // Runs after the suite above has closed the pool only if ordered so: these use their own connection.
  test('re-runnable, and only replaces text still equal to the seed', async () => {
    const { Client } = await import('pg');
    const { TEST_DATABASE_URL } = await import('./test-db');
    const client = new Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      const sql = readFileSync(join(ROOT, 'db', 'migrations', '0021_site_stats_plain_copy.sql'), 'utf8');
      const seed = (await client.query(`select id, short_description from public.destinations where id = 'dambulla'`)).rows[0];
      await client.query(`update public.destinations set short_description = 'Owner wrote this' where id = 'dambulla'`);
      await client.query(`update public.pillars set title = 'Owner title' where id = 'local-knowledge'`);
      await client.query(sql);
      await client.query(sql);
      assert.equal((await client.query(`select short_description from public.destinations where id = 'dambulla'`)).rows[0].short_description, 'Owner wrote this');
      assert.equal((await client.query(`select title from public.pillars where id = 'local-knowledge'`)).rows[0].title, 'Owner title');
      assert.ok(seed);

      // Seed text is replaced.
      await client.query(`update public.pillars set title = 'Authentic Experiences' where id = 'authentic-experiences'`);
      await client.query(sql);
      assert.equal((await client.query(`select title from public.pillars where id = 'authentic-experiences'`)).rows[0].title, 'Beyond the main stops');

      // An admin's stats are left alone; an empty strip stays seeded once.
      await client.query(`update public.site_settings set stats = '[{"label":"Mine","number":1,"suffix":"","order":1}]'::jsonb where id`);
      await client.query(sql);
      assert.deepEqual((await client.query(`select stats from public.site_settings where id`)).rows[0].stats, [{ label: 'Mine', number: 1, suffix: '', order: 1 }]);
      await client.query(`update public.site_settings set stats = '[]'::jsonb where id`);
      await client.query(sql);
      const seeded = (await client.query<{ stats: SiteStat[] }>(`select stats from public.site_settings where id`)).rows[0].stats;
      assert.deepEqual(seeded.map((s) => [s.number, s.suffix]), [[8, ''], [1620, 'km'], [2200, '+']]);
    } finally {
      await client.end();
    }
  });
});
