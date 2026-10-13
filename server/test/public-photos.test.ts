import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import legacy from '../../shared/legacy-photo-references.json';
import optimized from '../../shared/optimized-photos.json';
import { publicPhoto, publicGallery, photoStoryLocation } from '../../shared/public-photos';

test('Discover and map panel read the shared destination image record', () => {
  const home = readFileSync(resolve('src/components/IntroSection.tsx'), 'utf8');
  const map = readFileSync(resolve('src/components/InteractiveMapSection.tsx'), 'utf8');
  assert.match(home, /const destinations = useDestinations\(\)/);
  assert.match(home, /destinations\.find\(destination => destination\.id === 'ella'\)\?\.image/);
  assert.match(map, /const DESTINATIONS = useDestinations\(\)/);
  assert.match(map, /src=\{activeDest\.image\}/);
});

test('legacy Ella photo resolves to the existing Sri Lankan bridge asset', () => {
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  assert.match(publicPhoto('destinations', 'ella', seed.image), /^\/assets\/ella-1280-/);
});
test('Ella always resolves to its designated local bridge photo, including after stored URL changes', () => {
  const image = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format';
  const ella = publicPhoto('destinations', 'ella', image);
  assert.match(ella, /^\/assets\/ella-1280-/);
  assert.notEqual(ella, publicPhoto('destinations', 'mirissa', image));
  assert.ok(existsSync(resolve('public', ella.slice(1))));
  assert.equal(photoAsset(ella)?.alt, 'Nine Arch Bridge surrounded by forest in Ella, Sri Lanka');
});
test('Ella image mapping is independent of stale, coastal, or admin-edited database URLs', () => {
  const coastal = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format';
  const ella = publicPhoto('destinations', 'ella', coastal);
  const mirissa = publicPhoto('destinations', 'mirissa', coastal);
  assert.match(ella, /^\/assets\/ella-1280-/);
  assert.notEqual(ella, mirissa);
  assert.equal(publicPhoto('destinations', 'ella', '/assets/custom-admin-beach.webp'), ella);
  assert.ok(existsSync(resolve('public', ella.slice(1))));
  assert.equal(photoAsset(ella)?.alt, 'Nine Arch Bridge surrounded by forest in Ella, Sri Lanka');
});

test('admin-selected galleries remain intact', () => {
  const image = 'https://images.unsplash.com/custom-admin-photo';
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
import { photoAsset } from '../../shared/photo-assets';
import { PHOTO_CORRECTIONS } from '../../shared/photo-corrections';
import { photoStoryCopy } from '../../shared/public-photos';

test('seed corrections use stable identity across URL sizing and query order', () => {
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  const resized = new URL(seed.image); resized.search = '?w=480&q=65&auto=format';
  assert.equal(publicPhoto('destinations', 'ella', resized.href), publicPhoto('destinations', 'ella', seed.image));
  assert.notEqual(publicPhoto('destinations', 'ella', seed.image), publicPhoto('destinations', 'mirissa', legacy.find(row=>row.table==='destinations'&&row.id==='mirissa')!.image));
});
test('all named destination corrections are local, distinct and carry descriptive metadata', () => {
  const destinations = legacy.filter(row => row.table === 'destinations');
  const ids = destinations.map(row => row.id);
  assert.equal(new Set(ids).size, ids.length, 'destination IDs are unique and stable');
  for (const row of destinations) assert.equal(PHOTO_CORRECTIONS.destinations[row.id], row.id, `${row.id} resolves through its own image mapping`);
  const sources = destinations.map(row => publicPhoto(row.table, row.id, row.image));
  assert.equal(new Set(sources).size, destinations.length, 'primary destination images are distinct');
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
