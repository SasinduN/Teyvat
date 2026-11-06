// Must be first: points the server at the test database, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import { schemaForTable } from '../../shared/content-schema';
import { CONTENT_TABLE_NAMES, type ContentTableName } from '../../shared/database.types';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import {
  assertConnectedToTestDatabase,
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

type Row = Record<string, unknown> & { id: string; updated_at: string };

let app: RunningApp;
let token: string;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp());

  await resetAuthTables();
  await createUser();
  const res = await login(app, 'admin@example.test', PASSWORD);
  token = sessionTokenFrom(res)!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent({ whatsappNumber: null });
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

interface CallOptions {
  body?: unknown;
  session?: boolean;
  origin?: string | null;
}

/** A same-origin, signed-in admin request unless told otherwise. */
function call(method: string, path: string, options: CallOptions = {}): Promise<Response> {
  const { body, session = true, origin = app.baseUrl } = options;
  const headers: Record<string, string> = {
    ...(session ? withSession(token) : {}),
    ...(origin ? { Origin: origin } : {}),
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
  };
  return fetch(`${app.baseUrl}/api/admin${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function json<T = Row>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function list(table: ContentTableName): Promise<Row[]> {
  const res = await call('GET', `/content/${table}`);
  assert.equal(res.status, 200);
  return json<Row[]>(res);
}

async function get(table: ContentTableName, id: string): Promise<Row> {
  const res = await call('GET', `/content/${table}/${id}`);
  assert.equal(res.status, 200);
  return json(res);
}

/** The editable part of a row, as the admin form would send it. */
function valuesOf(row: Row): Record<string, unknown> {
  const { id: _id, created_at: _c, updated_at: _u, sort_order: _s, ...values } = row;
  return values;
}

function put(table: ContentTableName, row: Row, changes: Record<string, unknown> = {}) {
  return call('PUT', `/content/${table}/${row.id}`, {
    body: { values: { ...valuesOf(row), ...changes }, expectedUpdatedAt: row.updated_at }
  });
}

async function errorFields(res: Response): Promise<Record<string, string>> {
  const body = await json<{ error: { fields?: Record<string, string> } }>(res);
  return body.error.fields ?? {};
}

/* -------------------------------------------------------- authorisation */

const T = 'destinations';

/** Every admin route, with a body a real client would send. */
function everyRoute(table: ContentTableName): Array<[string, string, unknown?]> {
  return [
    ['GET', `/content/${table}`],
    ['GET', `/content/${table}/count`],
    ['GET', `/content/${table}/some-id`],
    ['POST', `/content/${table}`, {}],
    ['PUT', `/content/${table}/some-id`, { values: {}, expectedUpdatedAt: new Date().toISOString() }],
    ['PATCH', `/content/${table}/some-id/published`, { published: false }],
    ['DELETE', `/content/${table}/some-id`],
    ['PUT', `/content/${table}/order`, { ids: [] }]
  ];
}

const SETTINGS_ROUTES: Array<[string, string, unknown?]> = [
  ['GET', '/site-settings'],
  ['PUT', '/site-settings', { values: {}, expectedUpdatedAt: new Date().toISOString() }]
];

describe('authorisation', () => {
  test('every admin route returns 401 without a session', async () => {
    for (const table of CONTENT_TABLE_NAMES) {
      for (const [method, path, body] of [...everyRoute(table), ...SETTINGS_ROUTES]) {
        const res = await call(method, path, { body, session: false });
        assert.equal(res.status, 401, `${method} ${path}`);
      }
    }
  });

  test('every admin write returns 403 cross-origin, even with a session', async () => {
    for (const table of CONTENT_TABLE_NAMES) {
      for (const [method, path, body] of [...everyRoute(table), ...SETTINGS_ROUTES]) {
        if (method === 'GET') continue;
        const res = await call(method, path, { body, origin: 'https://evil.example' });
        assert.equal(res.status, 403, `${method} ${path}`);
      }
    }
    // And nothing was changed by any of them.
    assert.equal((await list('destinations')).length, 20);
  });

  test('responses are never cached', async () => {
    const res = await call('GET', `/content/${T}`);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  test('an unknown table is 404', async () => {
    assert.equal((await call('GET', '/content/users')).status, 404);
  });
});

/* ------------------------------------------------------------- the seed */

// Rows are read one at a time, as the editor reads them: a tour's single
// row carries its route stops, which the list leaves out.
describe('seeded content', () => {
  test('every seeded row passes its table schema', async () => {
    for (const table of CONTENT_TABLE_NAMES) {
      const schema = schemaForTable(table, 'create');
      for (const { id } of await list(table)) {
        const row = await get(table, id);
        const result = schema.safeParse(row);
        assert.ok(
          result.success,
          `${table}/${row.id}: ${result.success ? '' : JSON.stringify(result.error.issues)}`
        );
      }
    }
  });

  test('every table: a seeded row saves unchanged through the API', async () => {
    for (const table of CONTENT_TABLE_NAMES) {
      const row = await get(table, (await list(table))[0].id);
      const res = await put(table, row);
      assert.equal(res.status, 200, `${table}/${row.id}: ${await res.clone().text()}`);

      // Saving again with the version the save returned also works.
      const saved = await json(res);
      assert.equal((await put(table, saved)).status, 200, `${table}/${row.id} second save`);
    }
  });

  test('the tour itinerary round-trips as {day, title, description, location}[]', async () => {
    // One row, not the list: the row carries its route stops, which a save sends back.
    const tour = await get('tours', (await list('tours'))[0].id);
    const itinerary = [
      { day: 9, title: 'Arrive', description: 'Airport pickup', location: 'Colombo' },
      { day: 3, title: 'Tea country', description: '', location: 'Ella' }
    ];
    const res = await put('tours', tour, { itinerary });
    assert.equal(res.status, 200);
    assert.deepEqual((await json(res)).itinerary, [
      { day: 1, title: 'Arrive', description: 'Airport pickup', location: 'Colombo' },
      { day: 2, title: 'Tea country', description: '', location: 'Ella' }
    ]);
  });
});

/* ------------------------------------------------------------ validation */

describe('validation', () => {
  test('400 with field-level errors', async () => {
    const tour = await get('tours', (await list('tours'))[0].id);
    let res = await put('tours', tour, {
      itinerary: [{ day: 1, title: '', description: '', location: '' }]
    });
    assert.equal(res.status, 400);
    assert.equal((await errorFields(res))['itinerary.0.title'], 'Each day needs a title.');

    const ella = await get('destinations', 'ella');
    res = await put('destinations', ella, { rating: 7 });
    assert.equal(res.status, 400);
    assert.equal((await errorFields(res)).rating, 'Maximum is 5.');

    const [pillar] = await list('pillars');
    res = await put('pillars', pillar, { icon: 'Rocket' });
    assert.equal(res.status, 400);
    assert.ok((await errorFields(res)).icon);
  });

  test('bad and reserved slugs are refused on create', async () => {
    const [pillar] = await list('pillars');
    for (const id of ['Bad Slug', 'count', 'order']) {
      const res = await call('POST', '/content/pillars', { body: { ...valuesOf(pillar), id } });
      assert.equal(res.status, 400, id);
      assert.ok((await errorFields(res)).id, id);
    }
  });

  test("a slug can't be changed after creation", async () => {
    const ella = await get('destinations', 'ella');
    const res = await put('destinations', ella, { id: 'ella-2' });
    assert.equal(res.status, 400);
    assert.ok((await errorFields(res)).id);
    assert.ok(await get('destinations', 'ella'));
  });

  test('creating a taken slug is 409 on the id field', async () => {
    const ella = await get('destinations', 'ella');
    const res = await call('POST', '/content/destinations', {
      body: { ...valuesOf(ella), id: 'ella' }
    });
    assert.equal(res.status, 409);
    assert.ok((await errorFields(res)).id);
  });

  test('a new row is created at the end of the list', async () => {
    const pillars = await list('pillars');
    const res = await call('POST', '/content/pillars', {
      body: { ...valuesOf(pillars[0]), id: 'new-pillar', title: 'New pillar' }
    });
    assert.equal(res.status, 201);
    const created = await json(res);
    assert.equal(created.sort_order, Math.max(...pillars.map((p) => Number(p.sort_order))) + 1);
    assert.equal((await list('pillars')).at(-1)?.id, 'new-pillar');
  });
});

/* ------------------------------------------------- admin vs public view */

describe('admin and public views', () => {
  test('the admin list includes unpublished rows; /api/content does not', async () => {
    const res = await call('PATCH', '/content/destinations/ella/published', {
      body: { published: false }
    });
    assert.equal(res.status, 200);

    const admin = await list('destinations');
    assert.equal(admin.find((r) => r.id === 'ella')?.published, false);

    const publicContent = await (await fetch(`${app.baseUrl}/api/content`)).json();
    assert.ok(!publicContent.destinations.some((d: Row) => d.id === 'ella'));
  });

  test('a save shows on the next GET /api/content, which is not cached', async () => {
    const [gem] = await list('hidden_gems');
    assert.equal((await put('hidden_gems', gem, { name: 'Renamed gem' })).status, 200);

    const res = await fetch(`${app.baseUrl}/api/content`);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    const content = await res.json();
    assert.equal(content.hiddenGems.find((g: Row) => g.id === gem.id)?.name, 'Renamed gem');
  });

  test('count matches the rows, drafts included', async () => {
    const res = await call('GET', '/content/destinations/count');
    assert.deepEqual(await res.json(), { count: 20 });
  });
});

/* ---------------------------------------------------------------- reorder */

describe('reorder', () => {
  const ids = async (table: ContentTableName) => (await list(table)).map((r) => r.id);

  test('a valid reorder applies, and rows that did not move keep their version', async () => {
    const before = await list('pillars');
    const order = before.map((r) => r.id);
    [order[0], order[1]] = [order[1], order[0]];

    const res = await call('PUT', '/content/pillars/order', { body: { ids: order } });
    assert.equal(res.status, 204);

    const after = await list('pillars');
    assert.deepEqual(after.map((r) => r.id), order);
    // The untouched rows were not written, so an open editor on them won't 409.
    for (const row of after.slice(2)) {
      assert.equal(row.updated_at, before.find((b) => b.id === row.id)?.updated_at);
    }
  });

  test('a missing, extra or duplicated id changes nothing', async () => {
    const original = await ids('pillars');

    const missing = await call('PUT', '/content/pillars/order', {
      body: { ids: original.slice(1) }
    });
    assert.equal(missing.status, 409);

    const extra = await call('PUT', '/content/pillars/order', {
      body: { ids: [...original, 'not-a-row'] }
    });
    assert.equal(extra.status, 409);

    const duplicated = await call('PUT', '/content/pillars/order', {
      body: { ids: [original[0], ...original] }
    });
    assert.equal(duplicated.status, 400);

    assert.deepEqual(await ids('pillars'), original);
  });

  test('a failure partway through rolls back every row', async () => {
    const before = await list('photo_stories');
    const reversed = before.map((r) => r.id).reverse();

    // Fails the fourth update of the reversed order, after three have run.
    await pool.query(`
      create or replace function pg_temp_fail_on_p5() returns trigger language plpgsql as $$
      begin
        if new.id = 'p5' then raise exception 'test: forced failure'; end if;
        return new;
      end $$;
      create trigger test_fail_on_p5 before update on public.photo_stories
        for each row execute function pg_temp_fail_on_p5();
    `);

    try {
      const res = await call('PUT', '/content/photo_stories/order', { body: { ids: reversed } });
      assert.equal(res.status, 500);
    } finally {
      await pool.query(`
        drop trigger if exists test_fail_on_p5 on public.photo_stories;
        drop function if exists pg_temp_fail_on_p5();
      `);
    }

    const after = await list('photo_stories');
    assert.deepEqual(
      after.map((r) => [r.id, r.sort_order]),
      before.map((r) => [r.id, r.sort_order])
    );
  });
});

/* -------------------------------------------------------- last hero slide */

describe('last published hero slide', () => {
  const LAST = 'The hero needs at least one published slide.';

  test('unpublishing and deleting are refused for the last one only', async () => {
    const slides = await list('hero_slides');
    assert.equal(slides.filter((s) => s.published).length, 3);
    const [a, b, c] = slides;

    // Allowed while another slide stays published.
    let res = await call('PATCH', `/content/hero_slides/${a.id}/published`, {
      body: { published: false }
    });
    assert.equal(res.status, 200);
    res = await put('hero_slides', await get('hero_slides', b.id), { published: false });
    assert.equal(res.status, 200);

    // c is now the last one: PATCH, PUT and DELETE are all refused.
    res = await call('PATCH', `/content/hero_slides/${c.id}/published`, {
      body: { published: false }
    });
    assert.equal(res.status, 409);
    assert.equal((await json<{ error: { message: string } }>(res)).error.message, LAST);

    res = await put('hero_slides', await get('hero_slides', c.id), { published: false });
    assert.equal(res.status, 409);

    res = await call('DELETE', `/content/hero_slides/${c.id}`);
    assert.equal(res.status, 409);

    // An unpublished slide can still be deleted.
    res = await call('DELETE', `/content/hero_slides/${a.id}`);
    assert.equal(res.status, 204);

    assert.equal((await get('hero_slides', c.id)).published, true);
  });
});

/* ------------------------------------------------------------- 409 edits */

describe('concurrent edits', () => {
  test('the second save of the same version gets 409 and changes nothing', async () => {
    const first = await get('destinations', 'ella');
    const second = await get('destinations', 'ella');

    assert.equal((await put('destinations', first, { name: 'Ella (first)' })).status, 200);

    const res = await put('destinations', second, { name: 'Ella (second)' });
    assert.equal(res.status, 409);

    assert.equal((await get('destinations', 'ella')).name, 'Ella (first)');
  });

  test('saving a deleted row is 404', async () => {
    // Jaffna: on no tour's route, so it can be deleted.
    const row = await get('destinations', 'jaffna');
    assert.equal((await call('DELETE', '/content/destinations/jaffna')).status, 204);
    assert.equal((await put('destinations', row)).status, 404);
  });
});

/* ----------------------------------------------------------- site settings */

describe('site settings', () => {
  const LINKS = [
    'instagram_url',
    'facebook_url',
    'tiktok_url',
    'youtube_url',
    'privacy_url',
    'terms_url',
    'sustainability_url'
  ];

  async function settings(): Promise<Row> {
    const res = await call('GET', '/site-settings');
    assert.equal(res.status, 200);
    return json(res);
  }

  function save(row: Row, changes: Record<string, unknown>) {
    const { id: _id, created_at: _c, updated_at: _u, ...values } = row;
    return call('PUT', '/site-settings', {
      body: { values: { ...values, ...changes }, expectedUpdatedAt: row.updated_at }
    });
  }

  test('after 0004 the placeholder links are NULL', async () => {
    const row = await settings();
    for (const link of LINKS) assert.equal(row[link], null, link);
  });

  test('links must be https:// or empty; the email must be an email', async () => {
    const row = await settings();
    for (const bad of ['http://example.com', '#instagram', '/privacy', 'javascript:alert(1)']) {
      const res = await save(row, { instagram_url: bad });
      assert.equal(res.status, 400, bad);
      assert.ok((await errorFields(res)).instagram_url, bad);
    }

    const res = await save(row, { contact_email: 'not an email' });
    assert.equal(res.status, 400);
    assert.ok((await errorFields(res)).contact_email);
  });

  test('https:// saves, empty saves as NULL, and /api/content returns null', async () => {
    const all = Object.fromEntries(LINKS.map((l) => [l, `https://example.com/${l}`]));
    let res = await save(await settings(), all);
    assert.equal(res.status, 200);
    const saved = await json(res);
    for (const link of LINKS) assert.equal(saved[link], `https://example.com/${link}`);

    res = await save(saved, { tiktok_url: '', youtube_url: '   ' });
    assert.equal(res.status, 200);
    const cleared = await json(res);
    assert.equal(cleared.tiktok_url, null);
    assert.equal(cleared.youtube_url, null);

    const content = await (await fetch(`${app.baseUrl}/api/content`)).json();
    assert.equal(content.siteSettings.tiktok_url, null);
    assert.equal(content.siteSettings.instagram_url, 'https://example.com/instagram_url');
  });

  test('the database refuses a non-https link written directly', async () => {
    await assert.rejects(
      pool.query("update public.site_settings set instagram_url = 'http://example.com' where id"),
      (error: { code?: string }) => error.code === '23514'
    );
  });

  test('the WhatsApp number starts empty, and /api/content returns null', async () => {
    assert.equal((await settings()).whatsapp_number, null);
    const content = await (await fetch(`${app.baseUrl}/api/content`)).json();
    assert.equal(content.siteSettings.whatsapp_number, null);
  });

  test('a WhatsApp number is stored as digits only, and empty saves as NULL', async () => {
    let res = await save(await settings(), { whatsapp_number: ' +94 (77) 123-6478 ' });
    assert.equal(res.status, 200);
    const saved = await json(res);
    assert.equal(saved.whatsapp_number, '94771236478');

    const content = await (await fetch(`${app.baseUrl}/api/content`)).json();
    assert.equal(content.siteSettings.whatsapp_number, '94771236478');

    res = await save(saved, { whatsapp_number: '' });
    assert.equal(res.status, 200);
    assert.equal((await json(res)).whatsapp_number, null);
  });

  test('a bad WhatsApp number gets a field error that says why', async () => {
    const row = await settings();
    const cases: [string, RegExp][] = [
      ['0771234567', /country code \(94 for Sri Lanka\), not 0/],
      ['940771234567', /^Remove the 0 after 94\.$/],
      ['94abc12345', /digits only/],
      ['9477123', /8 to 15 digits/],
      ['9477123456789012', /8 to 15 digits/]
    ];
    for (const [bad, message] of cases) {
      const res = await save(row, { whatsapp_number: bad });
      assert.equal(res.status, 400, bad);
      assert.match((await errorFields(res)).whatsapp_number ?? '', message, bad);
    }
  });

  test('the database refuses a bad WhatsApp number written directly', async () => {
    for (const bad of ['0771234567', '940771234567', '+94771236478', '9477123']) {
      await assert.rejects(
        pool.query('update public.site_settings set whatsapp_number = $1 where id', [bad]),
        (error: { code?: string }) => error.code === '23514',
        bad
      );
    }
    await pool.query("update public.site_settings set whatsapp_number = '94771236478' where id");
  });

  test('the text size saves, and the next page is served with it', async () => {
    assert.equal((await settings()).text_size, 100);
    const page = () => fetch(`${app.baseUrl}/destinations`).then((r) => r.text());
    assert.match(await page(), /<html[^>]* data-text-size="100"/);

    const res = await save(await settings(), { text_size: 120 });
    assert.equal(res.status, 200);
    assert.equal((await json(res)).text_size, 120);
    assert.equal((await settings()).text_size, 120);
    assert.match(await page(), /<html[^>]* data-text-size="120"/);
    // An attribute the stylesheet reads: never an inline style, which is what the CSP is about.
    assert.doesNotMatch(await page(), /<html[^>]* style=/);
  });

  test('any other text size gets a field error and changes nothing', async () => {
    const row = await settings();
    for (const bad of [0, 80, 90, 95, 100.5, 130, -100, '110', '120%', '', null, true, [120], { size: 120 }]) {
      const res = await save(row, { text_size: bad });
      assert.equal(res.status, 400, JSON.stringify(bad));
      assert.match((await errorFields(res)).text_size ?? '', /Choose 100%, 110%, 120%/, JSON.stringify(bad));
    }
    assert.equal((await settings()).text_size, 100);
  });

  test('the text size is required on a save', async () => {
    const row = await settings();
    const { text_size: _omitted, ...rest } = row;
    const res = await save(rest as typeof row, {});
    assert.equal(res.status, 400);
    assert.match((await errorFields(res)).text_size ?? '', /Choose/);
  });

  test('the database refuses any other text size written directly', async () => {
    for (const bad of [0, 90, 95, 130]) {
      await assert.rejects(
        pool.query('update public.site_settings set text_size = $1 where id', [bad]),
        (error: { code?: string }) => error.code === '23514',
        String(bad)
      );
    }
  });

  test('the text size stays out of the public content API', async () => {
    const content = await (await fetch(`${app.baseUrl}/api/content`)).json();
    assert.equal(content.siteSettings.text_size, undefined);
  });

  test('a stale settings save is 409', async () => {
    const row = await settings();
    assert.equal((await save(row, { phone: '+94 11 000 0000' })).status, 200);
    assert.equal((await save(row, { phone: '+94 11 999 9999' })).status, 409);
    assert.equal((await settings()).phone, '+94 11 000 0000');
  });
});
