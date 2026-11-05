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

/* ------------------------------------------- the move to R2 (photoResolver) */

import { fullSrcSet, registerPhotoSets, usableVariants, withoutFullWidth, type PhotoSets } from '../../shared/photo-assets';
import { photoResolver } from '../../shared/public-photos';

const R2 = 'https://bucket.r2.dev/assets';
const sets: PhotoSets = {
  ella: [480, 768, 1280, 1920].map(width => ({ width, url: `${R2}/${width}-ella.webp` })),
  jaffna: [480, 768, 1280, 1920].map(width => ({ width, url: `${R2}/${width}-jaffna.webp` })),
  train: [480, 768, 1280].map(width => ({ width, url: `${R2}/${width}-train.webp` }))
};

test('a photo in R2 resolves there; one not moved yet keeps its local file', () => {
  const rules = photoResolver(sets);
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  assert.equal(rules.publicPhoto('destinations', 'ella', seed.image), `${R2}/1280-ella.webp`);
  assert.equal(rules.publicPhoto('destinations', 'ella', `${R2}/1280-ella.webp`), `${R2}/1280-ella.webp`);
  assert.equal(rules.publicPhoto('destinations', 'ella', '/assets/ella-1280-0aac7f6297dfbdf1.webp'), `${R2}/1280-ella.webp`);
  assert.match(rules.publicPhoto('destinations', 'mirissa', ''), /^\/assets\/mirissa-1280-/);
  assert.equal(rules.localPhoto('https://images.unsplash.com/custom'), 'https://images.unsplash.com/custom');
  assert.equal(rules.localPhoto('/assets/owner-photo.webp'), '/assets/owner-photo.webp');
});

test('a gallery and a story still recognise their photo on its R2 URL', () => {
  const rules = photoResolver(sets);
  const seeded = ['https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800'];
  assert.deepEqual(rules.publicGallery('ella', seeded), [`${R2}/1280-ella.webp`, `${R2}/1280-train.webp`]);
  assert.equal(rules.photoStoryLocation('p1', `${R2}/1280-train.webp`, 'Ella & Nuwara Eliya'), 'Ella');
  assert.equal(rules.photoStoryLocation('p1', 'https://images.unsplash.com/owner', 'Ella & Nuwara Eliya'), 'Ella & Nuwara Eliya');
  assert.equal(rules.photoStoryCopy('p1', `${R2}/1280-train.webp`, 'Highland Mist & Blue Trains', 'x').title, 'Nine Arch Bridge in Ella');
});

test('1920 px is only for full-width heroes, and never for Jaffna or Udawalawe', () => {
  assert.deepEqual(usableVariants('jaffna', sets.jaffna).map(v => v.width), [480, 768, 1280]);
  assert.deepEqual(usableVariants('udawalawe', sets.ella).map(v => v.width), [480, 768, 1280]);
  assert.deepEqual(usableVariants('ella', sets.ella).map(v => v.width), [480, 768, 1280, 1920]);

  const local = photoAsset(localPhoto(photographs.find(p => p.key === 'ella')!.image))!.srcSet!;
  assert.match(local, /1920w/);
  assert.doesNotMatch(withoutFullWidth(local)!, /1920w/);
  for (const key of ['jaffna', 'udawalawe']) {
    assert.doesNotMatch(photoAsset(localPhoto(photographs.find(p => p.key === key)!.image))!.srcSet!, /1920w/, key);
  }
  assert.equal(withoutFullWidth(undefined), undefined);
});

test('the client learns the R2 URLs; the old paths still answer', () => {
  assert.equal(photoAsset(`${R2}/1280-ella.webp`), undefined);
  registerPhotoSets(sets);
  const asset = photoAsset(`${R2}/1280-ella.webp`)!;
  assert.equal(asset.alt, 'Nine Arch Bridge surrounded by forest in Ella, Sri Lanka');
  assert.equal(asset.srcSet, `${R2}/480-ella.webp 480w, ${R2}/768-ella.webp 768w, ${R2}/1280-ella.webp 1280w, ${R2}/1920-ella.webp 1920w`);
  assert.doesNotMatch(photoAsset(`${R2}/1280-jaffna.webp`)!.srcSet!, /1920w/);
  assert.match(photoAsset('/assets/ella-1280-0aac7f6297dfbdf1.webp')!.srcSet!, /^\/assets\//);
  assert.equal(fullSrcSet(`${R2}/768-train.webp`, sets), `${R2}/480-train.webp 480w, ${R2}/768-train.webp 768w, ${R2}/1280-train.webp 1280w`);
  assert.match(fullSrcSet('/assets/ella-1280-0aac7f6297dfbdf1.webp', {})!, /^\/assets\/ella-480/);
  assert.equal(fullSrcSet('https://images.unsplash.com/custom', sets), undefined);
  registerPhotoSets(undefined);
});
