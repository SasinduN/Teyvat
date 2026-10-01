// Must be first: points the server at the test database and removes every
// R2_* variable, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, mock, test } from 'node:test';

import type { MediaItem, MediaLibraryPayload } from '../../shared/api';
import { sniffImage } from '../../shared/image-sniff';
import { targetSize } from '../../shared/image-size';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { normaliseBaseUrl, readR2Config } from '../src/env';
import { isUnderBase, type MediaConfig } from '../src/media/media';
import { memoryStore, OBJECT_CACHE_CONTROL, r2Store } from '../src/media/store';
import { MAX_UPLOAD_BYTES } from '../src/routes/media';
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

const BASE = 'https://test-bucket.r2.dev';

let store: ReturnType<typeof memoryStore>;
let app: RunningApp;
let offApp: RunningApp;
let token: string;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();

  store = memoryStore();
  const media: MediaConfig = { store, publicBaseUrl: BASE };
  app = await listen(createApp({ media }));
  offApp = await listen(createApp({ media: null }));

  await resetAuthTables();
  await createUser();
  token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  assert.ok(token);
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent();
  await pool.query('truncate public.media');
  store.objects.clear();
  store.failures.put = false;
  store.failures.delete = false;
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await offApp?.close();
  await pool.end();
}, HOOK_TIMEOUT);

/* ------------------------------------------------------------------ bytes */

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const WEBP = [...ascii('RIFF'), 0x24, 0, 0, 0, ...ascii('WEBPVP8 ')];

/** An ISO-BMFF `ftyp` box: size, "ftyp", major brand, minor version, compatible brands. */
function ftyp(major: string, compatible: string[]): number[] {
  const size = 16 + compatible.length * 4;
  return [0, 0, 0, size, ...ascii('ftyp'), ...ascii(major), 0, 0, 0, 0, ...compatible.flatMap(ascii)];
}

function file(header: number[], total = 64): Uint8Array {
  const bytes = new Uint8Array(Math.max(total, header.length));
  bytes.set(header);
  return bytes;
}

/* ------------------------------------------------------------------ calls */

function upload(
  bytes: Uint8Array,
  folder = 'destinations',
  options: { target?: RunningApp; origin?: string; session?: boolean; contentType?: string } = {}
): Promise<Response> {
  const target = options.target ?? app;
  return fetch(`${target.baseUrl}/api/admin/media?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    headers: {
      'Content-Type': options.contentType ?? 'application/octet-stream',
      Origin: options.origin ?? target.baseUrl,
      ...(options.session === false ? {} : withSession(token))
    },
    body: bytes as Uint8Array<ArrayBuffer>
  });
}

async function uploaded(bytes = file(PNG)): Promise<MediaItem> {
  const res = await upload(bytes);
  assert.equal(res.status, 201, await res.clone().text());
  return (await res.json()) as MediaItem;
}

function call(method: string, path: string, body?: unknown, target = app): Promise<Response> {
  return fetch(`${target.baseUrl}/api${path}`, {
    method,
    headers: {
      Origin: target.baseUrl,
      ...withSession(token),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function library(target = app): Promise<MediaLibraryPayload> {
  const res = await call('GET', '/admin/media', undefined, target);
  assert.equal(res.status, 200);
  return (await res.json()) as MediaLibraryPayload;
}

type Row = Record<string, unknown> & { id: string; updated_at: string };

async function getRow(table: string, id: string): Promise<Row> {
  const res = await call('GET', `/admin/content/${table}/${id}`);
  assert.equal(res.status, 200);
  return (await res.json()) as Row;
}

function saveRow(table: string, row: Row, changes: Record<string, unknown>): Promise<Response> {
  const { id: _i, created_at: _c, updated_at: _u, sort_order: _s, ...values } = row;
  return call('PUT', `/admin/content/${table}/${row.id}`, {
    values: { ...values, ...changes },
    expectedUpdatedAt: row.updated_at
  });
}

/* ------------------------------------------------------------------ tests */

describe('sniffing', () => {
  test('the four stored types are recognised from their bytes', () => {
    assert.deepEqual(sniffImage(file(JPEG)), { kind: 'image', type: 'image/jpeg' });
    assert.deepEqual(sniffImage(file(PNG)), { kind: 'image', type: 'image/png' });
    assert.deepEqual(sniffImage(file(WEBP)), { kind: 'image', type: 'image/webp' });
    assert.deepEqual(sniffImage(file(ftyp('avif', ['mif1', 'miaf']))), { kind: 'image', type: 'image/avif' });
    // AVIF declared only as a compatible brand.
    assert.deepEqual(sniffImage(file(ftyp('mif1', ['avif']))), { kind: 'image', type: 'image/avif' });
  });

  test('HEIC, SVG and everything else are told apart', () => {
    assert.deepEqual(sniffImage(file(ftyp('heic', ['mif1', 'heic']))), { kind: 'heic' });
    assert.deepEqual(sniffImage(file(ftyp('mif1', ['heic']))), { kind: 'heic' });
    for (const svg of ['<svg xmlns="http://www.w3.org/2000/svg"/>', '<?xml version="1.0"?><svg/>', '﻿  \n <SVG/>']) {
      assert.deepEqual(sniffImage(new TextEncoder().encode(svg)), { kind: 'svg' }, svg);
    }
    for (const other of [ascii('GIF89a'), ascii('%PDF-1.7'), ascii('hello'), [], [0xff, 0xd8], ftyp('isom', ['mp41'])]) {
      assert.deepEqual(sniffImage(new Uint8Array(other)), { kind: 'unknown' }, JSON.stringify(other));
    }
  });
});

describe('upload', () => {
  test('401 without a session, 403 cross-origin', async () => {
    assert.equal((await upload(file(PNG), 'destinations', { session: false })).status, 401);
    assert.equal((await upload(file(PNG), 'destinations', { origin: 'https://evil.example' })).status, 403);
    assert.equal(store.objects.size, 0);
  });

  test('stores the sniffed type, whatever the request claims, with a year of caching', async () => {
    const res = await upload(file(PNG), 'tours', { contentType: 'image/jpeg' });
    assert.equal(res.status, 201);
    const item = (await res.json()) as MediaItem;

    assert.match(item.key, /^tours\/\d+-[0-9a-f]{16}\.png$/);
    assert.equal(item.url, `${BASE}/${item.key}`);
    assert.equal(item.contentType, 'image/png');
    assert.equal(item.folder, 'tours');

    const stored = store.objects.get(item.key);
    assert.ok(stored);
    assert.equal(stored.contentType, 'image/png');
    assert.equal(stored.cacheControl, 'public, max-age=31536000, immutable');
    assert.equal(OBJECT_CACHE_CONTROL, 'public, max-age=31536000, immutable');

    const { rows } = await pool.query('select url, bytes from public.media');
    assert.deepEqual(rows, [{ url: item.url, bytes: 64 }]);
  });

  test('exactly 10 MB is accepted; one byte more is 413', async () => {
    assert.equal((await upload(file(JPEG, MAX_UPLOAD_BYTES))).status, 201);
    const res = await upload(file(JPEG, MAX_UPLOAD_BYTES + 1));
    assert.equal(res.status, 413);
    assert.equal(store.objects.size, 1);
  });

  test('SVG, HEIC, GIF and empty bodies are refused', async () => {
    let res = await upload(new TextEncoder().encode('<svg onload="alert(1)"/>'));
    assert.equal(res.status, 415);
    assert.match(((await res.json()) as { error: { message: string } }).error.message, /scripts/);

    assert.equal((await upload(file(ftyp('heic', ['mif1'])))).status, 415);
    assert.equal((await upload(new Uint8Array(ascii('GIF89a')))).status, 415);
    assert.equal((await upload(new Uint8Array())).status, 400);
    assert.equal(store.objects.size, 0);
  });

  test('an unknown folder is 400', async () => {
    for (const folder of ['secrets', '../etc', 'tours/x', '']) {
      assert.equal((await upload(file(PNG), folder)).status, 400, folder);
    }
  });

  test('if R2 refuses, the upload is 502 and nothing is recorded', async () => {
    store.failures.put = true;
    assert.equal((await upload(file(PNG))).status, 502);
    assert.equal((await library()).items.length, 0);
  });
});

describe('not configured', () => {
  test('uploads and deletes answer 503; everything else still runs', async () => {
    const res = await upload(file(PNG), 'destinations', { target: offApp });
    assert.equal(res.status, 503);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'not_configured');

    const item = await uploaded(); // via the configured app, so a row exists
    assert.equal((await call('DELETE', `/admin/media/${item.id}`, undefined, offApp)).status, 503);

    const lib = await library(offApp);
    assert.equal(lib.uploadsEnabled, false);
    assert.equal(lib.items.length, 1);

    assert.equal((await fetch(`${offApp.baseUrl}/api/content`)).status, 200);
    const health = (await (await fetch(`${offApp.baseUrl}/api/health`)).json()) as { media: string };
    assert.equal(health.media, 'not_configured');
  });

  test('env: none set is off quietly; some set is off with a warning; never an exit', () => {
    const warn = mock.method(console, 'warn', () => undefined);
    try {
      assert.equal(readR2Config({}), null);
      assert.equal(warn.mock.callCount(), 0);

      assert.equal(readR2Config({ R2_BUCKET: 'b', R2_ACCOUNT_ID: 'a' }), null);
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0].arguments[0]), /R2_ACCESS_KEY_ID/);

      const full = {
        R2_ACCOUNT_ID: 'a',
        R2_ACCESS_KEY_ID: 'k',
        R2_SECRET_ACCESS_KEY: 's',
        R2_BUCKET: 'b'
      };
      assert.equal(readR2Config({ ...full, R2_PUBLIC_BASE_URL: 'http://x.r2.dev' }), null);
      assert.equal(readR2Config({ ...full, R2_PUBLIC_BASE_URL: 'https://x.r2.dev' })?.publicBaseUrl, 'https://x.r2.dev');
    } finally {
      warn.mock.restore();
    }
  });

  test('the tests themselves never see the real R2 credentials', () => {
    assert.deepEqual(Object.keys(process.env).filter((k) => k.startsWith('R2_')), []);
  });
});

describe('base URL and ownership', () => {
  test('a trailing slash or none gives the same base', () => {
    const full = { R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's', R2_BUCKET: 'b' };
    const bare = readR2Config({ ...full, R2_PUBLIC_BASE_URL: 'https://x.r2.dev' });
    const slashed = readR2Config({ ...full, R2_PUBLIC_BASE_URL: 'https://x.r2.dev//' });
    assert.equal(bare?.publicBaseUrl, slashed?.publicBaseUrl);
    assert.equal(normaliseBaseUrl(' https://x.r2.dev/ '), 'https://x.r2.dev');
  });

  test('only URLs under base + "/" count as ours', () => {
    const media = { store, publicBaseUrl: BASE };
    assert.equal(isUnderBase(media, `${BASE}/tours/1-ab.png`), true);
    assert.equal(isUnderBase(media, `${BASE}.evil.com/tours/1-ab.png`), false);
    assert.equal(isUnderBase(media, 'https://images.unsplash.com/photo-1.jpg'), false);
    assert.equal(isUnderBase(null, `${BASE}/tours/1-ab.png`), false);
  });

  test('saving an R2 URL with no library row is refused; the look-alike host is just an external URL', async () => {
    const ella = await getRow('destinations', 'ella');

    let res = await saveRow('destinations', ella, { image: `${BASE}/destinations/1-00.png` });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { fields: Record<string, string> } };
    assert.ok(body.error.fields.image);

    res = await saveRow('destinations', ella, { image: `${BASE}.evil.com/destinations/1-00.png` });
    assert.equal(res.status, 200);
  });
});

describe('no automatic deletion', () => {
  test('a replaced image, and a deleted row’s images, stay in R2 as "Unused"', async () => {
    const cover = await uploaded(file(JPEG));
    const galleryImage = await uploaded(file(WEBP));

    let ella = await getRow('destinations', 'ella');
    let res = await saveRow('destinations', ella, {
      image: cover.url,
      gallery: [galleryImage.url, 'https://images.unsplash.com/photo-1.jpg']
    });
    assert.equal(res.status, 200);

    let lib = await library();
    assert.deepEqual(
      lib.items.map((i) => [i.id, i.usedBy.map((u) => `${u.table}/${u.id}`)]).sort(),
      [
        [cover.id, ['destinations/ella']],
        [galleryImage.id, ['destinations/ella']]
      ].sort()
    );

    // Replace the cover with an external URL: the upload stays, now unused.
    ella = (await res.json()) as Row;
    res = await saveRow('destinations', ella, { image: 'https://images.unsplash.com/photo-2.jpg' });
    assert.equal(res.status, 200);
    assert.ok(store.objects.has(cover.key));

    // Delete the row: its gallery upload stays too.
    assert.equal((await call('DELETE', '/admin/content/destinations/ella')).status, 204);
    assert.ok(store.objects.has(galleryImage.key));

    lib = await library();
    assert.equal(lib.items.length, 2);
    assert.ok(lib.items.every((i) => i.usedBy.length === 0));
  });
});

describe('library delete', () => {
  test('unused: 204 and gone from R2 and the library', async () => {
    const item = await uploaded();
    assert.equal((await call('DELETE', `/admin/media/${item.id}`)).status, 204);
    assert.equal(store.objects.has(item.key), false);
    assert.equal((await library()).items.length, 0);
  });

  test('in use: 409 with the rows, unless forced', async () => {
    const item = await uploaded();
    const ella = await getRow('destinations', 'ella');
    assert.equal((await saveRow('destinations', ella, { image: item.url })).status, 200);

    let res = await call('DELETE', `/admin/media/${item.id}`);
    assert.equal(res.status, 409);
    const body = (await res.json()) as { usedBy: { table: string; id: string; title: string }[] };
    assert.deepEqual(body.usedBy, [{ table: 'destinations', id: 'ella', title: 'Ella' }]);
    assert.ok(store.objects.has(item.key));

    res = await call('DELETE', `/admin/media/${item.id}?force=true`);
    assert.equal(res.status, 204);
    assert.equal(store.objects.has(item.key), false);
  });

  test('if R2 refuses the delete: 502, and the image is still listed', async () => {
    const item = await uploaded();
    store.failures.delete = true;
    assert.equal((await call('DELETE', `/admin/media/${item.id}`)).status, 502);
    assert.equal((await library()).items.length, 1);
    assert.ok(store.objects.has(item.key));
  });

  test('a save using an image deleted a moment ago is refused, on the right field', async () => {
    const item = await uploaded();
    assert.equal((await call('DELETE', `/admin/media/${item.id}`)).status, 204);

    const ella = await getRow('destinations', 'ella');
    const res = await saveRow('destinations', ella, {
      gallery: ['https://images.unsplash.com/photo-1.jpg', item.url]
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { fields: Record<string, string> } };
    assert.deepEqual(Object.keys(body.error.fields), ['gallery.1']);
  });

  test('an unknown id is 404', async () => {
    assert.equal((await call('DELETE', '/admin/media/not-a-uuid')).status, 404);
  });
});

describe('R2 client, against a local stand-in for Cloudflare', () => {
  interface Seen {
    method: string;
    url: string;
    headers: IncomingMessage['headers'];
    body: Buffer;
  }

  async function fakeR2(status: number) {
    const seen: Seen[] = [];
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        seen.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) });
        res.statusCode = status;
        res.end(status >= 400 ? '<Error><Code>AccessDenied</Code></Error>' : '');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const client = r2Store({
      endpoint: `http://127.0.0.1:${port}`,
      bucket: 'fake-test-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      retries: 0
    });
    return { seen, client, close: () => new Promise((r) => server.close(r)) };
  }

  test('PUT is signed and carries the cache and type headers; DELETE works', async () => {
    const r2 = await fakeR2(200);
    try {
      const bytes = file(PNG);
      await r2.client.put('tours/1-ab.png', bytes, 'image/png');
      await r2.client.delete('tours/1-ab.png');

      const [put, del] = r2.seen;
      assert.equal(put.method, 'PUT');
      assert.equal(put.url, '/fake-test-bucket/tours/1-ab.png');
      assert.equal(put.headers['content-type'], 'image/png');
      assert.equal(put.headers['cache-control'], 'public, max-age=31536000, immutable');
      assert.match(String(put.headers.authorization), /^AWS4-HMAC-SHA256 Credential=test-key\/\d{8}\/auto\/s3\/aws4_request/);
      assert.ok(put.headers['x-amz-content-sha256']);
      assert.deepEqual(new Uint8Array(put.body), bytes);

      assert.equal(del.method, 'DELETE');
      assert.equal(del.url, '/fake-test-bucket/tours/1-ab.png');
    } finally {
      await r2.close();
    }
  });

  test('a refusal becomes an error, not a silent success', async () => {
    const r2 = await fakeR2(403);
    try {
      await assert.rejects(r2.client.put('tours/1-ab.png', file(PNG), 'image/png'), /403/);
      assert.equal(await r2.client.ping(), false);
    } finally {
      await r2.close();
    }
  });
});

describe('resize maths', () => {
  test('never wider than 2000, never over the canvas area, never upscaled', () => {
    assert.deepEqual(targetSize({ width: 4000, height: 3000 }), { width: 2000, height: 1500 });
    assert.deepEqual(targetSize({ width: 3000, height: 4000 }), { width: 2000, height: 2666 });
    assert.deepEqual(targetSize({ width: 800, height: 600 }), { width: 800, height: 600 });
    assert.deepEqual(targetSize({ width: 2000, height: 1000 }), { width: 2000, height: 1000 });

    // 48 MP.
    assert.deepEqual(targetSize({ width: 8064, height: 6048 }), { width: 2000, height: 1500 });

    // A tall panorama: 2000 wide would be 2000 × 20000 = 40 MP, over the area limit.
    const tall = targetSize({ width: 4000, height: 40000 });
    assert.ok(tall.width * tall.height <= 16_777_216);
    assert.ok(Math.abs(tall.width / tall.height - 0.1) < 0.001);
  });
});
