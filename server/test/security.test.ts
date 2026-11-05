// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { auditImages, rebaseMedia, storedImages } from '../src/media/maintenance';
import { memoryStore } from '../src/media/store';
import { contentSecurityPolicy } from '../src/security-headers';
import { allowedImageOrigins } from '../../shared/image-hosts';
import { CARTO_ATTRIBUTION, cartoVoyagerUrl } from '../../shared/map-tiles';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'https://test-bucket.r2.dev';

let app: RunningApp;

before(async () => {
  migrateTestDatabase();
  await assertConnectedToTestDatabase();
  app = await listen(createApp({ media: { store: memoryStore(), publicBaseUrl: BASE } }));
}, HOOK_TIMEOUT);

beforeEach(async () => {
  await resetContent();
  await pool.query('truncate public.media');
}, HOOK_TIMEOUT);

after(async () => {
  await app?.close();
  await pool.end();
}, HOOK_TIMEOUT);

/* ----------------------------------------------------------------- headers */

describe('security headers', () => {
  test('only the booking document permits user-triggered same-origin geolocation', async () => {
    const ride = await fetch(`${app.baseUrl}/booking`);
    assert.equal(ride.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=(self)');
    const home = await fetch(`${app.baseUrl}/`);
    assert.equal(home.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  });
  const EXPECTED = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'DENY',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin'
  };

  const paths = ['/api/health', '/api/content', '/api/nope'];
  // The page and the admin come from the built client, when there is one.
  if (existsSync(join(REPO_ROOT, 'dist', 'index.html'))) paths.push('/', '/admin', '/admin/login');

  for (const path of paths) {
    test(`on ${path}`, async () => {
      const res = await fetch(`${app.baseUrl}${path}`);
      for (const [name, value] of Object.entries(EXPECTED)) {
        assert.equal(res.headers.get(name), value, `${path} ${name}`);
      }
      const csp = res.headers.get('content-security-policy') ?? '';
      assert.match(csp, /script-src 'self';/);
      assert.match(csp, /frame-ancestors 'none'/);
      // Plain HTTP here, so no HSTS.
      assert.equal(res.headers.get('strict-transport-security'), null);
    });
  }

  test('HSTS only over HTTPS (behind the proxy, from X-Forwarded-Proto)', async () => {
    const res = await fetch(`${app.baseUrl}/api/health`, { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(res.headers.get('strict-transport-security'), 'max-age=86400');
  });

  test('the CSP allows exactly the documented sources', () => {
    const csp = contentSecurityPolicy({ store: memoryStore(), publicBaseUrl: BASE });
    const directives = Object.fromEntries(
      csp.split('; ').map((d) => {
        const [name, ...sources] = d.split(' ');
        return [name, sources];
      })
    );
    assert.deepEqual(directives, {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      'font-src': ["'self'"],
      'img-src': ["'self'", 'https://images.unsplash.com', BASE, 'https://basemaps.cartocdn.com', 'https://tile.openstreetmap.org', 'https://upload.wikimedia.org'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'object-src': ["'none'"]
    });
  });

  test('without R2, the CSP has no bucket origin', () => {
    const csp = contentSecurityPolicy(null);
    assert.ok(!csp.includes('r2.dev'));
    assert.match(csp, /img-src 'self' https:\/\/images\.unsplash\.com https:\/\/basemaps\.cartocdn\.com https:\/\/tile\.openstreetmap\.org https:\/\/upload\.wikimedia\.org;/);
  });
});

/* --------------------------------------------------------------- map tiles */

describe('map tiles', () => {
  test('keyed: the format CARTO gives, retina token kept, key encoded', () => {
    assert.equal(
      cartoVoyagerUrl('abc123'),
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=abc123'
    );
    assert.equal(
      cartoVoyagerUrl(' a+b/c '),
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=a%2Bb%2Fc'
    );
  });

  test('no key: the keyless URL, so the map still renders (watermarked)', () => {
    for (const key of [undefined, null, '', '   ']) {
      assert.equal(cartoVoyagerUrl(key), 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
    }
  });

  test('the tile host is exactly the one the CSP allows', () => {
    const tileOrigin = new URL(cartoVoyagerUrl('k').replace(/\{[a-z]\}/g, '0')).origin;
    const imgSrc = contentSecurityPolicy(null).split('; ').find((d) => d.startsWith('img-src '));
    assert.ok(imgSrc?.split(' ').includes(tileOrigin), `${tileOrigin} in ${imgSrc}`);
  });

  test('the credit names and links OpenStreetMap and CARTO', () => {
    assert.match(CARTO_ATTRIBUTION, /© <a href="https:\/\/www\.openstreetmap\.org\/copyright"[^>]*>OpenStreetMap<\/a> contributors/);
    assert.match(CARTO_ATTRIBUTION, /© <a href="https:\/\/carto\.com\/attributions"[^>]*>CARTO<\/a>/);
  });
});

/* ------------------------------------------------------------- maintenance */

describe('images:audit', () => {
  test('finds the stored images the CSP would block, and only those', async () => {
    await pool.query(
      `update public.destinations set image = 'https://cdn.example.com/a.jpg',
              gallery = array['https://images.unsplash.com/ok.jpg', '${BASE}/destinations/1-ab.png', 'http://insecure.example/b.jpg']
        where id = 'ella'`
    );
    const blocked = await auditImages(pool, allowedImageOrigins(BASE));
    assert.deepEqual(
      blocked.map((b) => `${b.table}/${b.id}/${b.column}: ${b.url}`).sort(),
      [
        'destinations/ella/gallery: http://insecure.example/b.jpg',
        'destinations/ella/image: https://cdn.example.com/a.jpg'
      ]
    );
  });

  test('the seeded content has nothing to block', async () => {
    assert.deepEqual(await auditImages(pool, allowedImageOrigins(null)), []);
    assert.ok((await storedImages(pool)).length > 50);
  });
});

describe('media:rebase', () => {
  const NEW = 'https://media.example.lk';

  async function seedUploads() {
    await pool.query(
      `insert into public.media (key, url, content_type, bytes) values
         ('destinations/1-aa.png', '${BASE}/destinations/1-aa.png', 'image/png', 10),
         ('library/2-bb.webp',     '${BASE}/library/2-bb.webp',     'image/webp', 10)`
    );
    await pool.query(
      `update public.destinations
          set image = '${BASE}/destinations/1-aa.png',
              gallery = array['https://images.unsplash.com/keep.jpg', '${BASE}/library/2-bb.webp', 'https://images.unsplash.com/keep2.jpg']
        where id = 'ella'`
    );
  }

  test('moves media.url and every image column to the new base, in order', async () => {
    await seedUploads();
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await rebaseMedia(client, `${BASE}/`, NEW);
      await client.query('commit');
      assert.equal(result.media, 2);
      assert.equal(result.columns['destinations.image'], 1);
      assert.equal(result.columns['destinations.gallery'], 1);
    } finally {
      client.release();
    }

    const { rows } = await pool.query("select image, gallery from public.destinations where id = 'ella'");
    assert.equal(rows[0].image, `${NEW}/destinations/1-aa.png`);
    assert.deepEqual(rows[0].gallery, [
      'https://images.unsplash.com/keep.jpg',
      `${NEW}/library/2-bb.webp`,
      'https://images.unsplash.com/keep2.jpg'
    ]);
    const media = await pool.query('select url from public.media order by key');
    assert.deepEqual(media.rows.map((r) => r.url), [`${NEW}/destinations/1-aa.png`, `${NEW}/library/2-bb.webp`]);
    // Untouched elsewhere: the other destinations still point at Unsplash.
    assert.deepEqual(await auditImages(pool, allowedImageOrigins(NEW)), []);
  });

  test('a dry run (rollback) changes nothing; bad bases are refused', async () => {
    await seedUploads();
    const client = await pool.connect();
    try {
      await client.query('begin');
      await rebaseMedia(client, BASE, NEW);
      await client.query('rollback');
      await assert.rejects(rebaseMedia(client, 'http://insecure.example', NEW), /https/);
      await assert.rejects(rebaseMedia(client, BASE, `${BASE}/`), /same/);
    } finally {
      client.release();
    }
    const { rows } = await pool.query("select image from public.destinations where id = 'ella'");
    assert.equal(rows[0].image, `${BASE}/destinations/1-aa.png`);
  });
});
