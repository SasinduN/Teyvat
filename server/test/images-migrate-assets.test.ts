/**
 * `npm run images:migrate-assets` (server/src/media/migrate-assets.ts): moves the
 * photos in public/assets/ into R2 and points the rows at them. Against the test
 * database, with the real files and `memoryStore()` for R2.
 */
import './test-db';

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';

import type { PoolClient } from 'pg';

import type { SiteContentPayload } from '../../shared/api';
import { photoAsset, type PhotoSets } from '../../shared/photo-assets';
import { PHOTO_CORRECTIONS } from '../../shared/photo-corrections';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import type { MediaConfig } from '../src/media/media';
import { auditAssets, migrateAssets, objectKeyFor, planAssetMigration } from '../src/media/migrate-assets';
import { loadPhotoSets } from '../src/media/photo-sets';
import { memoryStore } from '../src/media/store';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetAuthTables, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const BASE = 'https://test-bucket.r2.dev';
const ROOT = resolve(import.meta.dirname, '..', '..');

let client: PoolClient;
let store: ReturnType<typeof memoryStore>;
let media: MediaConfig;
let puts: string[];

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  client = await pool.connect();
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent();
  await resetAuthTables();
  store = memoryStore();
  puts = [];
  const put = store.put.bind(store);
  store.put = async (key, bytes, type) => {
    puts.push(key);
    await put(key, bytes, type);
  };
  media = { store, publicBaseUrl: BASE };
}, HOOK_TIMEOUT);

after(async () => {
  client?.release();
  await pool.end();
}, HOOK_TIMEOUT);

const count = async (sql: string) => Number((await pool.query<{ n: string }>(`select count(*) as n from ${sql}`)).rows[0].n);
const cell = async <T = string>(sql: string) => (await pool.query(sql)).rows[0].value as T;

/** Everything the run could touch. */
async function snapshot() {
  return {
    media: await count('public.media'),
    credits: (await pool.query('select url from public.image_credits order by url')).rows,
    destinations: (await pool.query('select id, image, gallery from public.destinations order by id')).rows,
    stories: (await pool.query('select id, image from public.photo_stories order by id')).rows,
    objects: store.objects.size
  };
}

test('the plan: every photo, its widths, credit and use; what is skipped and why', async () => {
  const plan = await planAssetMigration(client, { publicBaseUrl: BASE });
  assert.equal(plan.photos.length, 33);

  // Nothing but the replaced Ekgal Oya photo is unused, and every photo is licensed.
  assert.deepEqual(plan.photos.filter((p) => p.skip).map((p) => [p.key, p.skip]), [['gal-oya', 'not referenced']]);

  // Upscaled, so left out; the others with a 1920 px file keep it.
  for (const key of ['jaffna', 'udawalawe']) {
    const photo = plan.photos.find((p) => p.key === key)!;
    assert.deepEqual(photo.leftOut, [1920], key);
    assert.deepEqual(photo.files.map((f) => f.width), [480, 768, 1280], key);
  }
  assert.deepEqual(plan.photos.find((p) => p.key === 'ella')!.files.map((f) => f.width), [480, 768, 1280, 1920]);

  const file = plan.photos.find((p) => p.key === 'ella')!.files.find((f) => f.width === 1280)!;
  assert.equal(file.objectKey, 'assets/1280-0aac7f6297dfbdf1.webp');
  assert.equal(file.url, `${BASE}/assets/1280-0aac7f6297dfbdf1.webp`);
  assert.ok(plan.rows.some((row) => row.table === 'destinations' && row.id === 'ella' && row.column === 'image' && row.to === file.url));
});

test('a stable key fits the check on media.key', async () => {
  assert.equal(objectKeyFor('gal-oya-park-768-1234567890abcdef.webp'), 'assets/768-1234567890abcdef.webp');
  assert.throws(() => objectKeyFor('ella.webp'));
  await pool.query(
    `insert into public.media (key, url, content_type, bytes, photo_key, width) values ($1, $2, 'image/webp', 1, 'ella', 480)`,
    ['assets/480-d8f17e14559c5e03.webp', `${BASE}/assets/480-d8f17e14559c5e03.webp`]
  );
});

test('planning changes nothing, in the database or in R2', async () => {
  const before = await snapshot();
  await planAssetMigration(client, { publicBaseUrl: BASE });
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(puts, []);
});

test('--dry-run through the script, read-only; --prod refuses without its URL and an answer', () => {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '', R2_BUCKET: '', R2_PUBLIC_BASE_URL: ''
  };
  const run = (args: string[], extra: NodeJS.ProcessEnv = {}) =>
    spawnSync(process.execPath, ['--import', 'tsx', 'scripts/images-migrate-assets.ts', ...args], { cwd: ROOT, env: { ...env, ...extra }, encoding: 'utf8', input: '' });

  const dry = run(['--dry-run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /dry run: read-only/);
  assert.match(dry.stdout, /Photos in public\/assets\/: 33/);
  assert.match(dry.stdout, /Not referenced, skipped: gal-oya/);
  assert.match(dry.stdout, /No clear reusable licence, skipped: none/);
  assert.match(dry.stdout, /Nothing was uploaded or changed/);

  const noR2 = run([]);
  assert.equal(noR2.status, 1);
  assert.match(noR2.stderr, /R2 is not configured/);

  const noUrl = run(['--prod'], { PROD_DATABASE_URL: '' });
  assert.equal(noUrl.status, 1);
  assert.match(noUrl.stderr, /--prod needs PROD_DATABASE_URL/);

  const noAnswer = run(['--prod'], { PROD_DATABASE_URL: 'postgresql://user:pw@prod.example.test:5432/railway' });
  assert.equal(noAnswer.status, 1);
  assert.match(noAnswer.stderr, /only in an interactive terminal/);
});

test('uploads the widths, records them, credits the main file, and repoints the rows', async () => {
  await pool.query(`update public.tours set image = 'https://images.unsplash.com/owner-choice.jpg' where id = 'wild-sri-lanka'`);
  await pool.query(`update public.hidden_gems set image = $1 where id = 'madulsima'`, [`${BASE}/library/1-abc.jpg`]);

  const result = await migrateAssets(client, media);
  assert.deepEqual(result.rowsFailed, []);
  assert.equal(result.photos.filter((p) => p.status === 'failed').length, 0);
  assert.equal(result.photos.filter((p) => p.status === 'moved').length, 32);

  // The real bytes, as WebP, under stable keys; the unused photo and the upscaled widths left out.
  const ella = store.objects.get('assets/1920-0ed67d661f593795.webp')!;
  assert.deepEqual(Buffer.from(ella.bytes), readFileSync(resolve(ROOT, 'public/assets/ella-1920-0ed67d661f593795.webp')));
  assert.equal(ella.contentType, 'image/webp');
  assert.equal(ella.cacheControl, 'public, max-age=31536000, immutable');
  for (const key of store.objects.keys()) assert.match(key, /^assets\/(480|768|1280|1920)-[0-9a-f]{16}\.webp$/);

  const sets = await loadPhotoSets(pool);
  assert.equal(sets['gal-oya'], undefined);
  assert.deepEqual(sets.jaffna.map((v) => v.width), [480, 768, 1280]);
  assert.deepEqual(sets.udawalawe.map((v) => v.width), [480, 768, 1280]);
  assert.deepEqual(sets.ella.map((v) => v.width), [480, 768, 1280, 1920]);
  assert.equal(await count('public.media'), store.objects.size);
  assert.equal(await count(`public.media where uploaded_by is null and photo_key is not null and url like '${BASE}/assets/%'`), store.objects.size);

  // Rows now say what the site shows.
  assert.equal(await cell(`select image as value from public.destinations where id = 'ella'`), sets.ella.find((v) => v.width === 1280)!.url);
  assert.equal(await cell(`select image as value from public.hero_slides where id = 'mirissa-shoreline'`), sets['mirissa-sunset'].find((v) => v.width === 1280)!.url);
  assert.deepEqual(
    await cell(`select gallery as value from public.destinations where id = 'ella'`),
    [sets.ella, sets.train].map((set) => set.find((v) => v.width === 1280)!.url)
  );

  // Every main file has its credit, word for word.
  for (const key of new Set(Object.values(PHOTO_CORRECTIONS).flatMap((byId) => Object.values(byId)))) {
    const url = sets[key].find((v) => v.width === 1280)!.url;
    assert.equal(await count(`public.image_credits where url = '${url}'`), 1, key);
  }
  const { rows } = await pool.query(`select author, license, license_url, source_url from public.image_credits where url = $1`, [sets.ella.find((v) => v.width === 1280)!.url]);
  assert.deepEqual(rows[0], {
    author: 'MichaelJames2468',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source_url: 'https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg'
  });

  // Owner choices and the honest placeholder stay as they are.
  assert.equal(await cell(`select image as value from public.tours where id = 'wild-sri-lanka'`), 'https://images.unsplash.com/owner-choice.jpg');
  assert.equal(await cell(`select image as value from public.hidden_gems where id = 'madulsima'`), `${BASE}/library/1-abc.jpg`);
  assert.match(await cell(`select image as value from public.hidden_gems where id = 'belilena'`), /^https:\/\/images\.unsplash\.com\//);
  assert.equal(await count(`public.destinations where image like '/assets/%'`), 0);
});

test('running it twice uploads nothing more and changes nothing', async () => {
  await migrateAssets(client, media);
  const first = await snapshot();
  const uploaded = puts.length;
  assert.ok(uploaded > 90);

  const stamps = async () => (await pool.query('select id, updated_at from public.destinations order by id')).rows;
  const stamped = await stamps();
  const second = await migrateAssets(client, media);
  assert.equal(puts.length, uploaded, 'no second upload');
  assert.equal(second.rowsChanged, 0);
  assert.ok(second.photos.every((p) => p.status === 'skipped' || (p.status === 'moved' && p.uploaded === 0 && !p.creditAdded)));
  assert.deepEqual(await snapshot(), first);
  assert.deepEqual(await stamps(), stamped, 'no row was even touched');
  assert.deepEqual((await planAssetMigration(client, { publicBaseUrl: BASE })).rows, []);
});

test('a photo images:import already copied keeps that file; only its other widths go up', async () => {
  const copy = `${BASE}/library/1700000000000-abcdef0123456789.jpg`;
  await pool.query(
    `insert into public.media (key, url, content_type, bytes) values ('library/1700000000000-abcdef0123456789.jpg', $1, 'image/jpeg', 1000)`,
    [copy]
  );
  await pool.query(
    `insert into public.image_credits (url, author, license, license_url, source_url)
     values ($1, 'MichaelJames2468', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:The_Nine_Arches_Bridge.jpg')`,
    [copy]
  );
  await pool.query(`update public.hero_slides set image = $1 where id = 'ella-highlands'`, [copy]);
  const bridge = (await pool.query(`select updated_at from public.hero_slides where id = 'ella-highlands'`)).rows[0];

  const plan = await planAssetMigration(client, { publicBaseUrl: BASE });
  const planned = plan.photos.find((p) => p.key === 'ella')!;
  assert.equal(planned.copyInR2, copy);
  assert.deepEqual(planned.files.map((f) => f.action), ['upload', 'upload', 'reuse', 'upload']);

  await migrateAssets(client, media);

  assert.ok(!store.objects.has('assets/1280-0aac7f6297dfbdf1.webp'), 'not uploaded twice');
  assert.ok(store.objects.has('assets/480-d8f17e14559c5e03.webp'));
  const sets = await loadPhotoSets(pool);
  assert.equal(sets.ella.find((v) => v.width === 1280)!.url, copy);
  assert.equal(await cell(`select image as value from public.destinations where id = 'ella'`), copy);
  assert.equal(await count(`public.image_credits where url = '${copy}'`), 1);
  assert.equal(await count(`public.media where url = '${copy}' and photo_key = 'ella' and width = 1280`), 1);

  // A row already on the copy isn't touched.
  assert.deepEqual((await pool.query(`select updated_at from public.hero_slides where id = 'ella-highlands'`)).rows[0], bridge);

  const uploaded = puts.length;
  const again = await migrateAssets(client, media);
  assert.equal(puts.length, uploaded);
  assert.equal(again.rowsChanged, 0);
  assert.equal((await loadPhotoSets(pool)).ella.find((v) => v.width === 1280)!.url, copy);
});

test('if R2 refuses, nothing is recorded and no row moves; a re-run finishes the job', async () => {
  const before = await snapshot();
  store.failures.put = true;
  const failed = await migrateAssets(client, media);
  assert.equal(failed.photos.filter((p) => p.status === 'moved').length, 0);
  assert.equal(failed.photos.filter((p) => p.status === 'failed').length, 32);
  assert.equal(failed.rowsChanged, 0);
  assert.deepEqual(await snapshot(), before);

  store.failures.put = false;
  const retried = await migrateAssets(client, media);
  assert.equal(retried.photos.filter((p) => p.status === 'moved').length, 32);
  assert.ok(retried.rowsChanged > 0);
});

test('stopping part-way leaves the moved photos in R2 and the rest on their local files', async () => {
  const put = store.put;
  store.put = async (key, bytes, type) => {
    if (key === 'assets/480-5a009e22b7dc99b1.webp') throw new Error('network down');
    await put(key, bytes, type);
  };
  const result = await migrateAssets(client, media);
  assert.deepEqual(result.photos.filter((p) => p.status === 'failed').map((p) => p.key), ['sigiriya']);

  const sets = await loadPhotoSets(pool);
  assert.equal(sets.sigiriya, undefined);
  assert.ok(sets.ella);
  assert.doesNotMatch(await cell(`select image as value from public.destinations where id = 'sigiriya'`), /test-bucket/);
  assert.match(await cell(`select image as value from public.destinations where id = 'ella'`), /test-bucket/);

  const audit = await auditAssets(client);
  assert.deepEqual(audit.photosNotInR2, ['sigiriya']);
  assert.ok(audit.rowsShowingAssets.every((row) => /^\/assets\/sigiriya-/.test(row.url)));
});

test('the audit sees what the rows alone would hide', async () => {
  const before = await auditAssets(client);
  assert.deepEqual(before.rowsHoldingAssets, [], 'no row names a committed file');
  assert.ok(before.rowsShowingAssets.length > 30, 'but the site shows them');
  assert.equal(before.photosNotInR2.length, 32);

  await migrateAssets(client, media);
  assert.deepEqual(await auditAssets(client), { rowsHoldingAssets: [], rowsShowingAssets: [], photosNotInR2: [] });

  await pool.query(`update public.tours set image = '/assets/owner-photo.webp' where id = 'wild-sri-lanka'`);
  const after = await auditAssets(client);
  assert.deepEqual(after.rowsHoldingAssets, [{ table: 'tours', id: 'wild-sri-lanka', column: 'image', url: '/assets/owner-photo.webp' }]);
});

test('a row holding an old local path is repointed too', async () => {
  await pool.query(`update public.tours set image = '/assets/ella-768-6e3093a93e5187cd.webp' where id = 'southern-escape'`);
  await migrateAssets(client, media);
  const sets = await loadPhotoSets(pool);
  assert.equal(await cell(`select image as value from public.tours where id = 'southern-escape'`), sets.ella.find((v) => v.width === 1280)!.url);
});

/** The site's content with each known photo named by its photograph, whichever URL it has. */
async function publicContent(app: RunningApp, sets: PhotoSets) {
  const payload = (await (await fetch(`${app.baseUrl}/api/content`)).json()) as SiteContentPayload;
  const byUrl = new Map(Object.entries(sets).flatMap(([key, variants]) => variants.map((v) => [v.url, key] as const)));
  const named = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(named);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'updated_at' && k !== 'photoSets').map(([k, v]) => [k, named(v)]));
    }
    return typeof value === 'string' ? (byUrl.get(value) ?? photoAsset(value)?.key ?? value) : value;
  };
  const { imageCredits, ...rest } = payload;
  const credits = (named(imageCredits) as { url: string }[]).sort((a, b) => a.url.localeCompare(b.url));
  return { rest: named(rest), credits, payload };
}

test('the public site shows the same photos, words and credits after the move', async () => {
  const app = await listen(createApp({ media, bookings: false }));
  try {
    const before = await publicContent(app, {});
    assert.deepEqual(before.payload.photoSets, {}, 'nothing in R2 yet');
    assert.match(before.payload.destinations.find((d) => d.id === 'ella')!.image, /^\/assets\/ella-1280-/);

    await migrateAssets(client, media);
    const sets = await loadPhotoSets(pool);
    const after = await publicContent(app, sets);

    assert.deepEqual(after.rest, before.rest);
    assert.deepEqual(after.credits, before.credits);

    // The corrected captions depend on recognising the photo, which now has an R2 URL.
    const story = after.payload.photoStories.find((s) => s.id === 'p1')!;
    assert.equal(story.location, 'Ella');
    assert.equal(story.title, 'Nine Arch Bridge in Ella');

    assert.deepEqual(after.payload.photoSets, sets);
    assert.equal(after.payload.destinations.find((d) => d.id === 'ella')!.image, sets.ella.find((v) => v.width === 1280)!.url);
    assert.doesNotMatch(JSON.stringify(after.payload), /"\/assets\//, 'nothing public names a local file');
  } finally {
    await app.close();
  }
});
