// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * "When to go", away from the browser: how a place suits a month, today's month in Sri Lanka,
 * migration 0022's reading of `best_time` (the real SQL: known formats parse, unclear text stays
 * empty and can be listed), the API's handling of months and the explainer, and the page's head
 * tags, sitemap entry and llms.txt line.
 *
 * The month picker in the browser is in browser-when-to-go.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

import { Client } from 'pg';

import { DESTINATIONS } from '../../scripts/fixtures/destinations';
import type { SiteContentPayload } from '../../shared/api';
import { explainerParagraphs, monthInColombo, normalizeMonths, suitability, suitabilityPhrase } from '../../shared/best-months';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../shared/page-meta';
import { createApp } from '../src/app';
import { pool } from '../src/db';
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
import { TEST_DATABASE_URL } from './test-db';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const MIGRATION = readFileSync(join(ROOT, 'db', 'migrations', '0022_when_to_go.sql'), 'utf8');
const built = existsSync(join(ROOT, 'dist', 'index.html'));

const JAN_TO_DEC = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('shared/best-months', () => {
  test('great in a best month, OK next to one (across the new year too), else not ideal', () => {
    const decToFeb = [12, 1, 2];
    assert.equal(suitability(decToFeb, 12), 'great');
    assert.equal(suitability(decToFeb, 1), 'great');
    assert.equal(suitability(decToFeb, 3), 'ok');
    assert.equal(suitability(decToFeb, 11), 'ok');
    assert.equal(suitability(decToFeb, 7), 'not-ideal');
    assert.equal(suitability([1], 12), 'ok', 'December is next to January');
    assert.equal(suitability([12], 1), 'ok', 'January is next to December');
    assert.equal(suitability(JAN_TO_DEC, 7), 'great');
  });

  test('no months is "not set", in every month, never "not ideal"', () => {
    for (const month of JAN_TO_DEC) assert.equal(suitability([], month), 'not-set');
    assert.equal(suitabilityPhrase('not-set', 3), 'Not set');
    assert.equal(suitabilityPhrase('great', 3), 'Great in March');
    assert.equal(suitabilityPhrase('not-ideal', 12), 'Not ideal in December');
  });

  test("the month is Sri Lanka's, whatever the clock's own time zone", () => {
    // Colombo is UTC+5:30: 19:00 UTC on 31 October is already 1 November there.
    assert.equal(monthInColombo(new Date('2026-10-31T19:00:00Z')), 11);
    assert.equal(monthInColombo(new Date('2026-10-31T18:00:00Z')), 10);
    assert.equal(monthInColombo(new Date('2026-12-31T18:30:00Z')), 1);
    assert.equal(monthInColombo(new Date('2026-06-15T00:00:00Z')), 6);
  });

  test('months come out sorted, each once; the explainer splits on blank lines', () => {
    assert.deepEqual(normalizeMonths([12, 1, 1, 3]), [1, 3, 12]);
    assert.deepEqual(explainerParagraphs(' One.\nStill one.\n\n  Two. \r\n\r\nThree.\n\n\n'), ['One.\nStill one.', 'Two.', 'Three.']);
    assert.deepEqual(explainerParagraphs(null), []);
    assert.deepEqual(explainerParagraphs('  \n '), []);
  });
});

describe('migration 0022', () => {
  let client: Client;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    client = new Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    // The parser is pg_temp, so it lasts as long as this connection.
    await client.query(MIGRATION);
  }, HOOK_TIMEOUT);

  after(async () => {
    await client?.end();
  }, HOOK_TIMEOUT);

  const parse = async (text: string) =>
    (await client.query<{ months: number[] }>('select pg_temp.best_months_from($1) as months', [text])).rows[0].months;

  const KNOWN: [string, number[]][] = [
    ['December – April', [1, 2, 3, 4, 12]],
    ['Dec – Apr', [1, 2, 3, 4, 12]],
    ['Dec-Apr', [1, 2, 3, 4, 12]],
    ['december to april', [1, 2, 3, 4, 12]],
    ['May – September', [5, 6, 7, 8, 9]],
    ['Sept — Oct', [9, 10]],
    ['March', [3]],
    ['June – September & December – March', [1, 2, 3, 6, 7, 8, 9, 12]],
    ['June – September and December – March', [1, 2, 3, 6, 7, 8, 9, 12]],
    ['January, March, May', [1, 3, 5]],
    ['January – April (Early mornings)', [1, 2, 3, 4]],
    ['Year-round', JAN_TO_DEC],
    ['year round', JAN_TO_DEC],
    ['All year', JAN_TO_DEC],
    ['Year-round (Best Dec – May)', [1, 2, 3, 4, 5, 12]]
  ];
  for (const [text, months] of KNOWN) {
    test(`reads "${text}"`, async () => assert.deepEqual(await parse(text), months));
  }

  const UNCLEAR = [
    '',
    'Dry season',
    'Summer',
    'Late November – April',
    'Mid-December to March',
    'Best after the rains',
    'Year-round except May',
    'December – Smarch',
    'April (or May) – June',
    'January – April (not March)',
    'Sometime in March',
    '2026'
  ];
  for (const text of UNCLEAR) {
    test(`leaves "${text}" empty`, async () => assert.deepEqual(await parse(text), []));
  }

  test("every seeded best_time gives the months in the fixture; nothing in the seed is unclear", async () => {
    for (const destination of DESTINATIONS) {
      assert.deepEqual(await parse(destination.bestTime), destination.bestMonths, destination.id);
      assert.deepEqual(destination.bestMonths, normalizeMonths(destination.bestMonths), `${destination.id}: sorted`);
    }
    const { rows } = await client.query<{ id: string; best_months: number[] }>('select id, best_months from public.destinations');
    assert.equal(rows.length, DESTINATIONS.length);
    for (const row of rows) {
      assert.deepEqual(row.best_months, DESTINATIONS.find((d) => d.id === row.id)!.bestMonths, row.id);
    }
  });

  test('unclear text stays empty and can be listed; months an admin set are left alone; it re-runs', async () => {
    await client.query(`update public.destinations set best_time = 'Late November – April', best_months = '{}' where id = 'galle'`);
    await client.query(`update public.destinations set best_months = '{7}' where id = 'ella'`);
    const before = (await client.query<{ updated_at: Date }>(`select updated_at from public.destinations where id = 'galle'`)).rows[0].updated_at;
    await client.query(MIGRATION);
    await client.query(MIGRATION);
    const unset = await client.query<{ id: string; best_time: string }>(`select id, best_time from public.destinations where best_months = '{}'`);
    assert.deepEqual(unset.rows, [{ id: 'galle', best_time: 'Late November – April' }]);
    assert.deepEqual((await client.query(`select best_months from public.destinations where id = 'ella'`)).rows[0].best_months, [7]);
    assert.deepEqual(
      (await client.query<{ updated_at: Date }>(`select updated_at from public.destinations where id = 'galle'`)).rows[0].updated_at,
      before,
      'a row it can\'t read is not touched'
    );
    await resetContent();
  });

  test('a saved explainer stays; an unset one gets the default, which names no rainfall figures', async () => {
    await client.query(`update public.site_settings set when_to_go_explainer = 'Mine.' where id`);
    await client.query(MIGRATION);
    assert.equal((await client.query(`select when_to_go_explainer as t from public.site_settings where id`)).rows[0].t, 'Mine.');

    await client.query(`update public.site_settings set when_to_go_explainer = null where id`);
    await client.query(MIGRATION);
    const text = (await client.query<{ t: string }>(`select when_to_go_explainer as t from public.site_settings where id`)).rows[0].t;
    assert.equal(explainerParagraphs(text).length, 5);
    for (const needed of ['Southwest monsoon, May to September', 'Northeast monsoon, December to February', 'March to April and October to November', 'Department of Meteorology']) {
      assert.ok(text.includes(needed), needed);
    }
    assert.doesNotMatch(text, /\d\s*mm\b|millimet/i);
  });

  test('the database refuses a month outside 1 to 12', async () => {
    await assert.rejects(client.query(`update public.destinations set best_months = '{13}' where id = 'ella'`), /destinations_best_months_range/);
    await assert.rejects(client.query(`update public.destinations set best_months = '{0}' where id = 'ella'`), /destinations_best_months_range/);
  });
});

describe('best months and the explainer, through the API', () => {
  let app: RunningApp;
  let token: string;

  before(async () => {
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null }));
    token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  }, HOOK_TIMEOUT);

  after(async () => {
    await app?.close();
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  const admin = (path: string, init: RequestInit = {}) =>
    fetch(`${app.baseUrl}/api/admin${path}`, { ...init, headers: { ...browserHeaders(app), ...withSession(token) } });
  const content = async () => (await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload;

  async function saveElla(best_months: unknown): Promise<Response> {
    const row = (await (await admin('/content/destinations/ella')).json()) as Record<string, unknown> & { updated_at: string };
    const { id, created_at, updated_at, sort_order, ...values } = row;
    void id; void created_at; void sort_order;
    return admin('/content/destinations/ella', { method: 'PUT', body: JSON.stringify({ values: { ...values, best_months }, expectedUpdatedAt: updated_at }) });
  }

  test('months are public, seeded from best_time', async () => {
    const ella = (await content()).destinations.find((d) => d.id === 'ella')!;
    assert.equal(ella.best_time, 'December – April');
    assert.deepEqual(ella.best_months, [1, 2, 3, 4, 12]);
  });

  test('a save sorts them and removes repeats; empty is allowed, and is what "not set" reads', async () => {
    let res = await saveElla([12, 1, 1, '3']);
    assert.equal(res.status, 200);
    assert.deepEqual(((await res.json()) as { best_months: number[] }).best_months, [1, 3, 12]);
    assert.deepEqual((await content()).destinations.find((d) => d.id === 'ella')!.best_months, [1, 3, 12]);

    res = await saveElla([]);
    assert.equal(res.status, 200);
    assert.deepEqual((await content()).destinations.find((d) => d.id === 'ella')!.best_months, []);
  });

  test('anything else is refused, and nothing changes', async () => {
    for (const bad of [[13], [0], [1.5], ['May'], 'May', null]) {
      assert.equal((await saveElla(bad)).status, 400, JSON.stringify(bad));
    }
    assert.deepEqual((await content()).destinations.find((d) => d.id === 'ella')!.best_months, [1, 2, 3, 4, 12]);
  });

  test('the explainer is edited in site settings and public; empty is stored as NULL', async () => {
    const save = async (when_to_go_explainer: string) => {
      const row = (await (await admin('/site-settings')).json()) as Record<string, unknown> & { updated_at: string };
      const { id, created_at, updated_at, ...values } = row;
      void id; void created_at;
      return admin('/site-settings', { method: 'PUT', body: JSON.stringify({ values: { ...values, when_to_go_explainer }, expectedUpdatedAt: updated_at }) });
    };
    const original = (await content()).siteSettings.when_to_go_explainer!;
    try {
      assert.equal((await save('  First.\n\nSecond.  ')).status, 200);
      assert.equal((await content()).siteSettings.when_to_go_explainer, 'First.\n\nSecond.');
      assert.equal((await save('   ')).status, 200);
      assert.equal((await content()).siteSettings.when_to_go_explainer, null);
    } finally {
      await pool.query('update public.site_settings set when_to_go_explainer = $1 where id', [original]);
    }
  });
});

describe('the page on the server', { skip: built ? false : 'no build; run `npm run build` first' }, () => {
  const SITE = 'https://travel.example';
  let open: RunningApp;
  let closed: RunningApp;

  before(async () => {
    await resetContent();
    open = await listen(createApp({ media: null, site: { url: SITE, indexable: true } }));
    closed = await listen(createApp({ media: null, site: { url: SITE, indexable: false } }));
  }, HOOK_TIMEOUT);

  after(async () => {
    await open?.close();
    await closed?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('its own title, description, canonical, Open Graph and Twitter tags, and a 200', async () => {
    const res = await fetch(`${open.baseUrl}/when-to-go`);
    assert.equal(res.status, 200);
    const html = await res.text();
    const escaped = (text: string) => text.replace(/'/g, '&#39;');
    assert.ok(html.includes(`<title>${escaped(PAGE_TITLES.whenToGo)}</title>`));
    assert.equal(PAGE_TITLES.whenToGo, 'When to go | Travel Eye');
    assert.ok(html.includes(`<meta name="description" content="${escaped(PAGE_DESCRIPTIONS.whenToGo)}">`));
    assert.ok(html.includes(`<link rel="canonical" href="${SITE}/when-to-go">`));
    assert.ok(html.includes(`<meta property="og:title" content="${escaped(PAGE_TITLES.whenToGo)}">`));
    assert.ok(html.includes(`<meta property="og:url" content="${SITE}/when-to-go">`));
    assert.match(html, /<meta property="og:image" content="https:\/\//);
    assert.match(html, /<meta name="twitter:title" content="When to go/);
    assert.doesNotMatch(html, /name="robots"/, 'open to search engines');
    assert.ok(PAGE_DESCRIPTIONS.whenToGo.length <= 160);
  });

  test('in the sitemap and llms.txt once indexable, and noindex until then', async () => {
    const sitemap = await (await fetch(`${open.baseUrl}/sitemap.xml`)).text();
    assert.ok(sitemap.includes(`<loc>${SITE}/when-to-go</loc>`));
    const llms = await (await fetch(`${open.baseUrl}/llms.txt`)).text();
    assert.ok(llms.includes(`(${SITE}/when-to-go)`));
    assert.match(await (await fetch(`${closed.baseUrl}/when-to-go`)).text(), /<meta name="robots" content="noindex/);
  });
});
