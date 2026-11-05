// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The seeded `rating` columns aren't reviews, so no page may show them while the
 * site has no reviews feature. (There isn't one yet. When there is, this test keeps
 * the off state and gains an on state, showing only real reviews.)
 *
 * Every row gets a rating no other text could match, then Chrome walks each public
 * page type and opens the map's side panel. `/api/content` must not carry them at all,
 * while the database and the admin API keep them, so the column stayed and the values
 * were there to leak. A control proves the page check can fail. The source check covers
 * what the walk doesn't open, such as dialogs.
 *
 * The browser half needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import type { SiteContentPayload } from '../../shared/api';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, createUser, listen, login, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, sessionTokenFrom, withSession, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable ? 'no Chrome found' : !existsSync(join(ROOT, 'dist', 'index.html')) ? 'no build; run `npm run build` first' : false;

const DESTINATION_RATING = '4.37';
const EXPERIENCE_RATING = '4.63';

/** Every public page type. */
const PAGES = [
  '/', '/destinations', '/destinations/ella', '/experiences', '/experiences/sunrise-ella', '/tours', '/tours/island-in-7-days',
  '/explore', '/plan', '/journal', '/journal/ultimate-ella-guide', '/about', '/photo-credits', '/no-such-page'
];

/** What the page shows that looks like a rating, in text, labels or icons. */
const FIND_RATINGS = `(() => {
  const found = [];
  const text = document.body.innerText;
  for (const pattern of [/${DESTINATION_RATING.replace('.', '\\.')}/, /${EXPERIENCE_RATING.replace('.', '\\.')}/, /\\brated\\b/i, /\\brating\\b/i, /★|⭐/]) {
    const match = pattern.exec(text);
    if (match) found.push('text: ' + match[0]);
  }
  for (const el of document.querySelectorAll('[aria-label]')) {
    if (/\\b(rated|rating)\\b/i.test(el.getAttribute('aria-label'))) found.push('label: ' + el.getAttribute('aria-label'));
  }
  const stars = document.querySelectorAll('svg.lucide-star').length;
  if (stars) found.push(stars + ' star icon(s)');
  return found;
})()`;

describe('no ratings on the public site', () => {
  test('no public component or page reads a rating, or writes a star', () => {
    const files = (path: string): string[] => {
      const full = join(ROOT, path);
      return statSync(full).isFile() ? [path] : readdirSync(full).flatMap((name) => files(join(path, name)));
    };
    const found: string[] = [];
    for (const file of [...files('src/components'), ...files('src/pages')].filter((f) => f.endsWith('.tsx'))) {
      readFileSync(join(ROOT, file), 'utf8').split('\n').forEach((line, i) => {
        if (/\.rating\b|\bStar\b|★|⭐|\bRated\b/.test(line)) found.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(found, [], found.join('\n'));
  });

  describe('in Chrome', { skip }, () => {
    let app: RunningApp;
    let chrome: Chrome;

    before(async () => {
      migrateTestDatabase();
      await assertConnectedToTestDatabase();
      await resetContent();
      await pool.query('update public.destinations set rating = $1', [DESTINATION_RATING]);
      await pool.query('update public.featured_experiences set rating = $1', [EXPERIENCE_RATING]);
      app = await listen(createApp({ media: null, bookings: false }));
      chrome = await launchChrome(executable!);
    }, HOOK_TIMEOUT);

    after(async () => {
      await chrome?.close();
      await app?.close();
      await pool.end();
    }, HOOK_TIMEOUT);

    async function open(path: string, width: number): Promise<Page> {
      const page = await chrome.newPage();
      await page.send('Page.enable');
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await page.send('Page.navigate', { url: app.baseUrl + path });
      await waitFor(page, `document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer')`, path);
      await sleep(250);
      return page;
    }

    async function waitFor(page: Page, expression: string, what: string): Promise<void> {
      const until = Date.now() + 20_000;
      for (;;) {
        if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
        if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
        await sleep(60);
      }
    }

    const closeTab = async (page: Page) => {
      const { targetInfo } = (await page.send('Target.getTargetInfo')) as { targetInfo: { targetId: string } };
      await page.send('Target.closeTarget', { targetId: targetInfo.targetId }).catch(() => undefined);
    };

    test('the public API carries no rating, anywhere in its payload', async () => {
      const payload = (await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload;
      assert.ok(payload.destinations.length > 0);
      assert.ok(payload.featuredExperiences.length > 0);
      const found: string[] = [];
      const walk = (value: unknown, path: string): void => {
        if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${path}[${i}]`));
        else if (value && typeof value === 'object') {
          for (const [key, item] of Object.entries(value)) {
            if (/rating/i.test(key)) found.push(`${path}.${key}`);
            walk(item, `${path}.${key}`);
          }
        }
      };
      walk(payload, 'content');
      assert.deepEqual(found, []);
    });

    test('the database and the admin API keep them', async () => {
      const stored = await pool.query<{ rating: string }>('select rating from public.destinations limit 1');
      assert.equal(Number(stored.rows[0].rating), Number(DESTINATION_RATING));

      await resetAuthTables();
      await createUser();
      const token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD));
      assert.ok(token, 'signed in');
      for (const [table, rating] of [['destinations', DESTINATION_RATING], ['featured_experiences', EXPERIENCE_RATING]] as const) {
        const res: Response = await fetch(`${app.baseUrl}/api/admin/content/${table}`, { headers: withSession(token) });
        assert.equal(res.status, 200, table);
        const rows = (await res.json()) as { rating: number }[];
        assert.ok(rows.length > 0, table);
        for (const row of rows) assert.equal(Number(row.rating), Number(rating), table);
      }
    });

    for (const width of [1280, 375]) {
      for (const path of PAGES) {
        test(`${path} at ${width} px shows no rating`, async () => {
          const page = await open(path, width);
          try {
            assert.deepEqual(await page.evaluate<string[]>(FIND_RATINGS), []);
          } finally {
            await closeTab(page);
          }
        });
      }
    }

    test('the map\'s side panel shows no rating', async () => {
      const page = await open('/explore', 1280);
      try {
        await waitFor(page, `document.querySelector('#explore-map .te-quick-jump button')`, 'Quick Jump');
        await page.evaluate(`document.querySelector('#explore-map').scrollIntoView(), true`);
        await page.evaluate(`[...document.querySelectorAll('#explore-map .te-quick-jump button')].find((b) => b.textContent.includes('Ella')).click(), true`);
        await waitFor(page, `/top experiences/i.test(document.body.innerText)`, 'the side panel');
        assert.deepEqual(await page.evaluate<string[]>(FIND_RATINGS), []);
      } finally {
        await closeTab(page);
      }
    });

    test('control: the check does catch a rating', async () => {
      const page = await open('/about', 1280);
      try {
        await page.evaluate(`(() => {
          const el = document.createElement('p');
          el.textContent = 'Rated ${DESTINATION_RATING} ★';
          el.setAttribute('aria-label', 'Rating ${DESTINATION_RATING}');
          document.querySelector('main').append(el);
          return true;
        })()`);
        const found = await page.evaluate<string[]>(FIND_RATINGS);
        for (const expected of [`text: ${DESTINATION_RATING}`, 'text: Rated', 'text: ★', `label: Rating ${DESTINATION_RATING}`]) {
          assert.ok(found.includes(expected), `${expected} in ${JSON.stringify(found)}`);
        }
      } finally {
        await closeTab(page);
      }
    });
  });
});
