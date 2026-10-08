import './test-db';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { pool } from '../src/db';
import { assertConnectedToTestDatabase, migrateTestDatabase, resetContent } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';
import photographs from '../../shared/travel-photos.json';
import { PHOTO_CORRECTIONS } from '../../shared/photo-corrections';
import { publicBasemap } from '../../shared/map-tiles';
import { allowedImageOrigins, isAllowedImageUrl } from '../../shared/image-hosts';
import { initialTheme, applyTheme, THEME_KEY } from '../../src/lib/theme';

before(async () => { migrateTestDatabase(); await assertConnectedToTestDatabase(); }, HOOK_TIMEOUT);
after(async () => { await pool.end(); });

test('photo corrections preserve tour data and owner-edited images; repeat application is idempotent', async () => {
  await resetContent();
  const { rows: original } = await pool.query('select * from public.tours order by id');
  await pool.query("update public.destinations set image = 'https://images.unsplash.com/owner-image.jpg' where id = 'kandy'");
  const migration = readFileSync('db/migrations/0010_location_photography.sql', 'utf8');
  await pool.query(migration);
  const { rows: changed } = await pool.query('select * from public.tours order by id');
  for (let i = 0; i < original.length; i++) {
    const { image: _before, updated_at: _revision, ...before } = original[i];
    const { image, updated_at: _nextRevision, ...after } = changed[i];
    assert.deepEqual(after, before, 'all tour names, prices, durations and other data preserved');
    assert.equal(image, photographs.find(photo => photo.key === PHOTO_CORRECTIONS.tours[before.id])!.image);
  }
  assert.equal((await pool.query("select image from public.destinations where id = 'kandy'")).rows[0].image, 'https://images.unsplash.com/owner-image.jpg');
  await pool.query(migration);
  assert.deepEqual((await pool.query('select * from public.tours order by id')).rows, changed);
});

test('every listed destination has a credited location photograph on the exact allowlist', () => {
  const origins = allowedImageOrigins(null);
  for (const key of Object.values(PHOTO_CORRECTIONS.destinations)) {
    const photo = photographs.find(item => item.key === key);
    assert.ok(photo, key); assert.ok(photo.author && photo.source && photo.licenseUrl);
    assert.ok(isAllowedImageUrl(photo.image, origins)); assert.ok(isAllowedImageUrl(photo.original, origins));
  }
  assert.equal(isAllowedImageUrl('https://upload.wikimedia.org.evil.example/photo.jpg', origins), false);
});

test('keyless basemap uses actual OSM tiles and keyed basemap retains CARTO attribution', () => {
  assert.equal(publicBasemap('').url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  assert.match(publicBasemap('').attribution, /OpenStreetMap/);
  assert.match(publicBasemap(' a+b ').url, /key=a%2Bb/);
  assert.match(publicBasemap('key').attribution, /CARTO/);
});

test('theme prefers a saved choice, respects system otherwise and tolerates unavailable storage', () => {
  const descriptors = Object.fromEntries(['localStorage', 'matchMedia', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let saved: string | null = null;
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem(key: string) { assert.equal(key, THEME_KEY); return saved; } } });
    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: root } });
    assert.equal(initialTheme(), 'dark'); saved = 'light'; assert.equal(initialTheme(), 'light');
    saved = 'invalid'; assert.equal(initialTheme(), 'dark');
    applyTheme('light'); assert.equal(root.dataset.theme, 'light'); assert.equal(root.style.colorScheme, 'light');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('storage blocked'); } });
    assert.equal(initialTheme(), 'dark');
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
