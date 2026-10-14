import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import legacy from '../../shared/legacy-photo-references.json';
import optimized from '../../shared/optimized-photos.json';
import { publicPhoto, publicGallery, photoStoryLocation } from '../../shared/public-photos';

test('legacy Ella photo resolves to the existing Sri Lankan bridge asset', () => {
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  assert.match(publicPhoto('destinations', 'ella', seed.image), /^\/assets\/ella-1280-/);
});
test('admin-selected photos and galleries remain intact', () => {
  const image = 'https://images.unsplash.com/custom-admin-photo';
  assert.equal(publicPhoto('destinations', 'owner-added-place', image), image);
  assert.equal(publicPhoto('articles', 'ultimate-ella-guide', image), image);
  assert.deepEqual(publicGallery('ella', [image]), [image]);
  assert.equal(photoStoryLocation('p6', image, 'Hatton Tea Valleys'), 'Hatton Tea Valleys');
});
test('every copied image variant exists and contains WebP bytes', () => {
  for (const variants of Object.values(optimized)) for (const candidate of variants.split(',')) {
    const path = resolve('public', candidate.trim().split(/\s+/)[0].slice(1));
    assert.ok(existsSync(path), path);
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

import photographs from '../../shared/travel-photos.json';
import { PHOTO_CORRECTIONS } from '../../shared/photo-corrections';
import { localPhoto } from '../../shared/public-photos';
import { photoAsset } from '../../shared/photo-assets';
import { photoStoryCopy } from '../../shared/public-photos';

test('every existing destination cover matches its place despite stale or unrelated CMS URLs', () => {
  for (const [id, key] of Object.entries(PHOTO_CORRECTIONS.destinations)) {
    const photo = photographs.find(row => row.key === key)!;
    const expected = localPhoto(photo.image);
    for (const image of ['', '/assets/mirissa-1280-unrelated.webp', 'https://bucket.r2.dev/unrelated-place.jpg', photo.original]) {
      assert.equal(publicPhoto('destinations', id, image), expected, `${id}: ${image}`);
    }
    assert.ok(photoAsset(expected)?.alt, `${id} has descriptive metadata`);
    assert.ok(existsSync(resolve('public', expected.slice(1))), `${id} has a bundled photograph`);
  }
  assert.notEqual(publicPhoto('destinations', 'ella', ''), publicPhoto('destinations', 'mirissa', ''));
  for (const id of ['owner-added-place', 'constructor', 'toString', '__proto__']) {
    assert.equal(publicPhoto('destinations', id, '/assets/owner-photo.webp'), '/assets/owner-photo.webp');
  }
});

test('seed corrections use stable identity across URL sizing and query order', () => {
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  const resized = new URL(seed.image); resized.search = '?w=480&q=65&auto=format';
  assert.equal(publicPhoto('destinations', 'ella', resized.href), publicPhoto('destinations', 'ella', seed.image));
  assert.notEqual(publicPhoto('destinations', 'ella', seed.image), publicPhoto('destinations', 'mirissa', legacy.find(row=>row.table==='destinations'&&row.id==='mirissa')!.image));
});
test('all named destination corrections are local, distinct and carry descriptive metadata', () => {
  const destinations = legacy.filter(row => row.table === 'destinations');
  const sources = destinations.map(row => publicPhoto(row.table, row.id, row.image));
  assert.equal(new Set(sources).size, destinations.length);
  for (const src of sources) { assert.match(src, /^\/assets\//); assert.ok(photoAsset(src)?.alt); assert.ok(photoAsset(src)?.srcSet); }
});
test('Belilena uses an honest placeholder only for its unverified seed photo', () => {
  const seed = legacy.find(row=>row.table==='hidden_gems'&&row.id==='belilena')!;
  assert.equal(publicPhoto(seed.table, seed.id, seed.image), '/images/photo-unavailable.svg');
  assert.equal(publicPhoto(seed.table, seed.id, '/assets/owner-verified-belilena.webp'), '/assets/owner-verified-belilena.webp');
});
test('scene captions correct known mismatches and preserve owner changes', () => {
  const photo = photographs.find(row=>row.key==='yala')!;
  const caption = 'A Sri Lankan leopard resting upon a sun-warmed granite outcrop in Yala.';
  assert.match(photoStoryCopy('p4',photo.image,'Jungle Monarch',caption).caption,/walking/);
  assert.equal(photoStoryCopy('p4',photo.image,'Jungle Monarch','Owner caption').caption,'Owner caption');
  assert.equal(photoStoryCopy('p4','/assets/owner-photo.webp','Jungle Monarch',caption).caption,caption);
});

test('Gal Oya replaces only the identified Ekgal Oya regional photograph', () => {
  const before = photographs.find(photo=>photo.key==='gal-oya')!;
  assert.match(publicPhoto('hidden_gems','gal-oya',before.image), /^\/assets\/gal-oya-park-/);
  assert.equal(publicPhoto('hidden_gems','gal-oya','/assets/owner-gal-oya.webp'),'/assets/owner-gal-oya.webp');
});
