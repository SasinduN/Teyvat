/**
 * `npm run images:import` (server/src/media/import.ts): copies the Wikimedia
 * photos the content uses into R2 and repoints the rows and credits. A local
 * HTTP server stands in for upload.wikimedia.org, and `memoryStore()` for R2.
 */
import './test-db';

import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';

import type { PoolClient } from 'pg';

import { pool } from '../src/db';
import { importWikimediaImages, IMPORT_USER_AGENT, wikimediaImagesInUse } from '../src/media/import';
import type { MediaConfig } from '../src/media/media';
import { memoryStore } from '../src/media/store';
import { assertConnectedToTestDatabase, migrateTestDatabase, resetAuthTables, resetContent } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const BASE = 'https://test-bucket.r2.dev';
const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
const PHOTO_A = `${W}/a/aa/A.jpg/1280px-A.jpg`;
const PHOTO_B = `${W}/b/bb/B.jpg/1280px-B.jpg`;
const MISSING = `${W}/c/cc/C.jpg/1280px-C.jpg`;
const NOT_AN_IMAGE = `${W}/d/dd/D.jpg/1280px-D.jpg`;

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(60).fill(1)]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(60).fill(2)]);

let server: Server;
let local: string;
let client: PoolClient;
const requests: { path: string; userAgent: string | undefined }[] = [];
/** Answer 429 to this many requests for B before serving it. */
let throttleB = 0;

/** Every upload.wikimedia.org request goes to the local server instead. */
const fakeFetch: typeof fetch = (input, init) =>
  fetch(String(input).replace('https://upload.wikimedia.org', local), init);

const quick = { fetch: fakeFetch, sleep: async () => undefined, minIntervalMs: 0, backoffMs: 0 };

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  server = createServer((req, res) => {
    requests.push({ path: req.url ?? '', userAgent: req.headers['user-agent'] });
    const path = req.url ?? '';
    if (path.endsWith('1280px-A.jpg')) return void res.writeHead(200, { 'Content-Type': 'image/jpeg' }).end(JPEG);
    if (path.endsWith('1280px-B.jpg')) {
      if (throttleB > 0) {
        throttleB -= 1;
        return void res.writeHead(429, { 'Retry-After': '0' }).end();
      }
      return void res.writeHead(200, { 'Content-Type': 'image/png' }).end(PNG);
    }
    if (path.endsWith('1280px-D.jpg')) return void res.writeHead(200, { 'Content-Type': 'image/jpeg' }).end('<svg></svg>');
    res.writeHead(404).end();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  local = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  client = await pool.connect();
}, HOOK_TIMEOUT);

let store: ReturnType<typeof memoryStore>;
let media: MediaConfig;

beforeEach(async () => {
  await resetContent();
  await resetAuthTables();
  await pool.query('truncate public.image_credits');
  requests.length = 0;
  throttleB = 0;
  store = memoryStore();
  media = { store, publicBaseUrl: BASE };

  // A on two rows and inside a gallery; B in the same gallery; one missing, one not an image.
  await pool.query(`update public.destinations set image = $1 where id = 'ella'`, [PHOTO_A]);
  await pool.query(`update public.hero_slides set image = $1 where id = 'ella-highlands'`, [PHOTO_A]);
  await pool.query(`update public.destinations set gallery = array['https://images.unsplash.com/keep.jpg', $1, $2] where id = 'sigiriya'`, [PHOTO_A, PHOTO_B]);
  await pool.query(`update public.tours set image = $1 where id = 'wild-sri-lanka'`, [MISSING]);
  await pool.query(`update public.articles set image = $1 where id = 'ultimate-ella-guide'`, [NOT_AN_IMAGE]);
  await pool.query(
    `insert into public.image_credits (url, author, license) values ($1, 'Author A', 'CC BY-SA 4.0'), ($2, 'Author B', 'CC BY-SA 4.0')`,
    [PHOTO_A, PHOTO_B]
  );
}, HOOK_TIMEOUT);

after(async () => {
  client?.release();
  await pool.end();
  await new Promise<void>((done) => server.close(() => done()));
}, HOOK_TIMEOUT);

const value = async (sql: string) => (await pool.query(sql)).rows[0];

test('finds each Wikimedia photo once, with every row and column that uses it', async () => {
  const inUse = await wikimediaImagesInUse(client);
  assert.deepEqual([...inUse.keys()].sort(), [PHOTO_A, PHOTO_B, MISSING, NOT_AN_IMAGE].sort());
  assert.equal(inUse.get(PHOTO_A)!.length, 3);
});

test('copies into R2 and repoints rows, galleries and credits; failures change nothing', async () => {
  throttleB = 2;
  const outcomes = await importWikimediaImages(client, media, quick);

  const byUrl = new Map(outcomes.map((o) => [o.url, o]));
  const a = byUrl.get(PHOTO_A)!;
  const b = byUrl.get(PHOTO_B)!;
  assert.equal(a.status, 'moved');
  assert.equal(b.status, 'moved', 'retried after two 429s');
  assert.deepEqual(byUrl.get(MISSING), { url: MISSING, status: 'failed', reason: 'HTTP 404' });
  assert.equal(byUrl.get(NOT_AN_IMAGE)!.status, 'failed');
  if (a.status !== 'moved' || b.status !== 'moved') return;

  assert.equal(a.rows, 3);
  assert.match(a.to, /^https:\/\/test-bucket\.r2\.dev\/library\/\d+-[0-9a-f]+\.jpg$/);
  assert.match(b.to, /\.png$/);

  assert.equal((await value(`select image from public.destinations where id = 'ella'`)).image, a.to);
  assert.equal((await value(`select image from public.hero_slides where id = 'ella-highlands'`)).image, a.to);
  assert.deepEqual(
    (await value(`select gallery from public.destinations where id = 'sigiriya'`)).gallery,
    ['https://images.unsplash.com/keep.jpg', a.to, b.to],
    'in place, order kept, other photos untouched'
  );
  assert.equal((await value(`select image from public.tours where id = 'wild-sri-lanka'`)).image, MISSING);

  // In the media library, in R2, credits moved.
  const media_ = (await pool.query(`select url, content_type, bytes, uploaded_by from public.media order by url`)).rows;
  assert.equal(media_.length, 2);
  assert.ok(media_.every((m) => m.uploaded_by === null));
  assert.equal(store.objects.size, 2);
  const credits = (await pool.query(`select url, author from public.image_credits order by author`)).rows;
  assert.deepEqual(credits, [
    { url: a.to, author: 'Author A' },
    { url: b.to, author: 'Author B' }
  ]);

  // Polite: our User-Agent on every request.
  assert.ok(requests.length >= 6);
  assert.ok(requests.every((r) => r.userAgent === IMPORT_USER_AGENT));
});

test('re-running only retries what is left', async () => {
  await importWikimediaImages(client, media, quick);
  requests.length = 0;
  const outcomes = await importWikimediaImages(client, media, quick);
  assert.deepEqual(outcomes.map((o) => o.url).sort(), [MISSING, NOT_AN_IMAGE].sort());
  assert.ok(requests.every((r) => !r.path.endsWith('A.jpg') && !r.path.endsWith('B.jpg')));
});

test('gives up after the set number of tries', async () => {
  throttleB = 99;
  const outcomes = await importWikimediaImages(client, media, { ...quick, maxTries: 3 });
  const b = outcomes.find((o) => o.url === PHOTO_B)!;
  assert.deepEqual(b, { url: PHOTO_B, status: 'failed', reason: 'gave up after 3 tries (HTTP 429)' });
  assert.ok((await value(`select gallery from public.destinations where id = 'sigiriya'`)).gallery.includes(PHOTO_B));
});

test('a failed database update takes its R2 object back out and changes no row', async () => {
  const failing = {
    query: (sql: string, params?: unknown[]) =>
      /insert into public\.media/.test(sql) ? Promise.reject(new Error('refused')) : client.query(sql, params)
  } as unknown as PoolClient;

  const outcomes = await importWikimediaImages(failing, media, quick);
  assert.ok(outcomes.every((o) => o.status === 'failed'));
  assert.equal(store.objects.size, 0, 'no orphaned objects');
  assert.equal((await value(`select image from public.destinations where id = 'ella'`)).image, PHOTO_A);
  assert.equal((await value(`select count(*)::int as n from public.media`)).n, 0);
});
