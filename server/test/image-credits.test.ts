/**
 * Photo credits (`public.image_credits`, migration 0011): which credits the
 * public content carries, the admin endpoints, and the migration itself.
 */
import './test-db';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { ImageCreditItem, SiteContentPayload } from '../../shared/api';
import type { ImageCreditRow } from '../../shared/image-credits';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { memoryStore } from '../src/media/store';
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

const BASE = 'https://test-bucket.r2.dev';
const migration = (name: string) =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db/migrations', name), 'utf8');

let app: RunningApp;
let token: string;
/** Ella's seeded photo, and one in Ella's gallery, both from 0002. */
let ellaImage: string;
let galleryImage: string;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp({ media: { store: memoryStore(), publicBaseUrl: BASE } }));
  await resetAuthTables();
  await createUser();
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent();
  await pool.query('truncate public.image_credits');
  const { rows } = await pool.query<{ image: string; gallery: string[] }>(
    `select image, gallery from public.destinations where id = 'ella'`
  );
  ellaImage = rows[0].image;
  galleryImage = rows[0].gallery.find((g) => g !== ellaImage)!;
  assert.ok(galleryImage, 'precondition: Ella has a gallery photo of its own');
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

const credit = (url: string, author = 'A. Photographer') =>
  pool.query(
    `insert into public.image_credits (url, author, license, license_url, source_url)
     values ($1, $2, 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:X.jpg')`,
    [url, author]
  );

const content = async () =>
  ((await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload).imageCredits;

const adminFetch = (path: string, init: RequestInit = {}) =>
  fetch(`${app.baseUrl}/api/admin/image-credits${path}`, {
    ...init,
    headers: { ...browserHeaders(app), ...withSession(token), ...(init.headers as Record<string, string>) }
  });

describe('GET /api/content: imageCredits', () => {
  test('only credits for photos a published row uses, plain and gallery columns alike', async () => {
    await credit(ellaImage, 'Ella Photographer');
    await credit(galleryImage, 'Gallery Photographer');
    await credit('https://images.unsplash.com/not-used-anywhere.jpg', 'Nobody');

    const credits = await content();
    assert.deepEqual(credits.map((c) => c.author).sort(), ['Ella Photographer', 'Gallery Photographer']);
    assert.deepEqual(Object.keys(credits[0]).sort(), ['author', 'license', 'license_url', 'source_url', 'url']);
  });

  test('a photo only an unpublished row uses drops out', async () => {
    await pool.query(`update public.destinations set image = 'https://images.unsplash.com/only-galle.jpg' where id = 'galle'`);
    await credit('https://images.unsplash.com/only-galle.jpg');
    assert.equal((await content()).length, 1);
    await pool.query(`update public.destinations set published = false where id = 'galle'`);
    assert.equal((await content()).length, 0);
  });
});

describe('/api/admin/image-credits', () => {
  test('needs a session, and a same-origin write', async () => {
    assert.equal((await fetch(`${app.baseUrl}/api/admin/image-credits`)).status, 401);
    const foreign = await fetch(`${app.baseUrl}/api/admin/image-credits`, {
      method: 'POST',
      headers: { ...browserHeaders(app), ...withSession(token), Origin: 'https://evil.example' },
      body: JSON.stringify({ url: ellaImage, author: 'x', license: 'y' })
    });
    assert.equal(foreign.status, 403);
  });

  test('create, list with usage, update, refuse a stale save, delete', async () => {
    let res = await adminFetch('', {
      method: 'POST',
      body: JSON.stringify({ url: ellaImage, author: '  Kasun  ', license: 'CC BY-SA 4.0', license_url: '', source_url: '' })
    });
    assert.equal(res.status, 201);
    const created = (await res.json()) as ImageCreditRow;
    assert.equal(created.author, 'Kasun');
    assert.equal(created.license_url, null, 'an empty link is stored as NULL');
    assert.match(created.updated_at, /\.\d{6}Z$/);

    res = await adminFetch('', { method: 'POST', body: JSON.stringify({ url: ellaImage, author: 'x', license: 'y' }) });
    assert.equal(res.status, 409, 'one credit per photo');

    const list = (await (await adminFetch('')).json()) as ImageCreditItem[];
    assert.equal(list.length, 1);
    assert.ok(list[0].usedBy.some((u) => u.table === 'destinations' && u.id === 'ella'));

    const path = `?url=${encodeURIComponent(ellaImage)}`;
    const values = { author: 'Kasun Perera', license: 'CC BY 4.0', license_url: 'https://creativecommons.org/licenses/by/4.0/', source_url: '' };
    res = await adminFetch(path, { method: 'PUT', body: JSON.stringify({ values, expectedUpdatedAt: created.updated_at }) });
    assert.equal(res.status, 200);
    const saved = (await res.json()) as ImageCreditRow;
    assert.equal(saved.author, 'Kasun Perera');
    assert.notEqual(saved.updated_at, created.updated_at);

    res = await adminFetch(path, { method: 'PUT', body: JSON.stringify({ values, expectedUpdatedAt: created.updated_at }) });
    assert.equal(res.status, 409, 'a save over a newer one is refused');

    assert.equal((await adminFetch(path, { method: 'DELETE' })).status, 204);
    assert.equal((await adminFetch(path, { method: 'DELETE' })).status, 404);
    res = await adminFetch(path, { method: 'PUT', body: JSON.stringify({ values, expectedUpdatedAt: saved.updated_at }) });
    assert.equal(res.status, 404);
  });

  test('field errors: missing author, an http link, a photo the site could never show', async () => {
    let res = await adminFetch('', {
      method: 'POST',
      body: JSON.stringify({ url: ellaImage, author: ' ', license: 'CC0', source_url: 'http://example.com' })
    });
    assert.equal(res.status, 400);
    const fields = ((await res.json()) as { error: { fields: Record<string, string> } }).error.fields;
    assert.ok(fields.author);
    assert.ok(fields.source_url);

    res = await adminFetch('', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/photo.jpg', author: 'x', license: 'y' })
    });
    assert.equal(res.status, 400);
    assert.ok(((await res.json()) as { error: { fields: Record<string, string> } }).error.fields.url);
  });
});

describe('migration 0011', () => {
  test('re-runnable, seeding the 32 credits for 0010’s photos once', async () => {
    await pool.query(migration('0011_image_credits.sql'));
    await pool.query(migration('0011_image_credits.sql'));
    const { rows } = await pool.query<{ n: number; wikimedia: number }>(
      `select count(*)::int as n, count(*) filter (where url like 'https://upload.wikimedia.org/%')::int as wikimedia
         from public.image_credits`
    );
    assert.deepEqual(rows[0], { n: 32, wikimedia: 32 });
  });

  test('a caption changes only where both it and 0010’s photo are untouched', async () => {
    const tea = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nuwara_Eliya_Tea.jpg/1280px-Nuwara_Eliya_Tea.jpg';
    const location = async () =>
      (await pool.query<{ location: string }>(`select location from public.photo_stories where id = 'p6'`)).rows[0].location;

    // The seed photo (0010 never ran on this row): unchanged.
    await pool.query(migration('0011_image_credits.sql'));
    assert.equal(await location(), 'Hatton Tea Valleys');

    // An admin's own caption on 0010's photo: unchanged.
    await pool.query(`update public.photo_stories set image = $1, location = 'Our tea estate' where id = 'p6'`, [tea]);
    await pool.query(migration('0011_image_credits.sql'));
    assert.equal(await location(), 'Our tea estate');

    // The seed caption on 0010's photo: corrected.
    await pool.query(`update public.photo_stories set location = 'Hatton Tea Valleys' where id = 'p6'`);
    await pool.query(migration('0011_image_credits.sql'));
    assert.equal(await location(), 'Nuwara Eliya');
  });
});

describe('migration 0013', () => {
  test('rows still on a 0010 Wikimedia photo go back to their seed photo; admin choices stay', async () => {
    const seed = (await pool.query<{ image: string }>(`select image from public.destinations where id = 'ella'`)).rows[0].image;
    await pool.query(migration('0010_location_photography.sql'));
    await pool.query(migration('0011_image_credits.sql'));
    await pool.query(`update public.destinations set image = 'https://images.unsplash.com/owner-choice.jpg' where id = 'galle'`);
    assert.match((await pool.query(`select image from public.destinations where id = 'ella'`)).rows[0].image, /^https:\/\/upload\.wikimedia\.org\//);
    assert.equal((await pool.query(`select location from public.photo_stories where id = 'p6'`)).rows[0].location, 'Nuwara Eliya');

    await pool.query(migration('0013_wikimedia_fallback.sql'));
    await pool.query(migration('0013_wikimedia_fallback.sql'));

    assert.equal((await pool.query(`select image from public.destinations where id = 'ella'`)).rows[0].image, seed);
    assert.equal((await pool.query(`select image from public.destinations where id = 'galle'`)).rows[0].image, 'https://images.unsplash.com/owner-choice.jpg');
    assert.equal((await pool.query(`select location from public.photo_stories where id = 'p6'`)).rows[0].location, 'Hatton Tea Valleys');
    const left = await pool.query(
      `select 1 from public.destinations where image like 'https://upload.wikimedia.org/%' or array_to_string(gallery, ' ') like '%upload.wikimedia.org%'
       union all select 1 from public.photo_stories where image like 'https://upload.wikimedia.org/%'
       union all select 1 from public.hero_slides where image like 'https://upload.wikimedia.org/%'`
    );
    assert.equal(left.rowCount, 0, 'no Wikimedia photo left in use');
    const credits = await pool.query(`select 1 from public.image_credits where url like 'https://upload.wikimedia.org/%'`);
    assert.equal(credits.rowCount, 0, 'nor a credit the admin page would fail to preview');
  });
});
