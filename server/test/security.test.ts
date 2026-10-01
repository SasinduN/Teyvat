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
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'https://images.unsplash.com', BASE, 'https://*.basemaps.cartocdn.com'],
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
    assert.match(csp, /img-src 'self' https:\/\/images\.unsplash\.com https:\/\/\*\.basemaps\.cartocdn\.com;/);
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
