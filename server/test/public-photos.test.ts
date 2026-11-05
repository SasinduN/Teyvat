import assert from 'node:assert/strict';
import { test } from 'node:test';

import legacy from '../../shared/legacy-photo-references.json';
import { fullSrcSet, photoAsset, registerPhotoSets, usableVariants, withoutFullWidth, type PhotoSets } from '../../shared/photo-assets';
import { PHOTO_CORRECTIONS } from '../../shared/photo-corrections';
import { photoResolver } from '../../shared/public-photos';
import photographs from '../../shared/travel-photos.json';

const PLACEHOLDER = '/images/photo-unavailable.svg';
const R2 = 'https://bucket.r2.dev/assets';

/** Production: every photo in R2. Its own URLs, so registering them here doesn't touch `sets` below. */
const ALL = 'https://bucket.r2.dev/all';
const everySet: PhotoSets = Object.fromEntries(photographs.map(photo => [photo.key, [480, 768, 1280].map(width => ({ width, url: `${ALL}/${width}-${photo.key}.webp` }))]));
const inR2 = photoResolver(everySet);
const primary = (key: string) => `${ALL}/1280-${key}.webp`;

/** A local or CI database: nothing in R2. */
const noR2 = photoResolver();

const sets: PhotoSets = {
  ella: [480, 768, 1280, 1920].map(width => ({ width, url: `${R2}/${width}-ella.webp` })),
  jaffna: [480, 768, 1280, 1920].map(width => ({ width, url: `${R2}/${width}-jaffna.webp` })),
  train: [480, 768, 1280].map(width => ({ width, url: `${R2}/${width}-train.webp` }))
};

const SEEDED_ELLA_GALLERY = ['https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800'];

test('legacy Ella photo resolves to the Sri Lankan bridge in R2', () => {
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  assert.equal(inR2.publicPhoto('destinations', 'ella', seed.image), primary('ella'));
});

test('admin-selected photos and galleries remain intact', () => {
  const image = 'https://images.unsplash.com/custom-admin-photo';
  for (const rules of [inR2, noR2]) {
    assert.equal(rules.publicPhoto('destinations', 'owner-added-place', image), image);
    assert.equal(rules.publicPhoto('articles', 'ultimate-ella-guide', image), image);
    assert.deepEqual(rules.publicGallery('ella', [image]), [image]);
    assert.equal(rules.photoStoryLocation('p6', image, 'Hatton Tea Valleys'), 'Hatton Tea Valleys');
  }
});

test('every existing destination cover matches its place despite stale or unrelated CMS URLs', () => {
  registerPhotoSets(everySet);
  for (const [id, key] of Object.entries(PHOTO_CORRECTIONS.destinations)) {
    const photo = photographs.find(row => row.key === key)!;
    for (const image of ['', 'https://bucket.r2.dev/unrelated-place.jpg', photo.original]) {
      assert.equal(inR2.publicPhoto('destinations', id, image), primary(key), `${id}: ${image}`);
    }
    assert.ok(photoAsset(primary(key))?.alt, `${id} has descriptive metadata`);
  }
  assert.notEqual(inR2.publicPhoto('destinations', 'ella', ''), inR2.publicPhoto('destinations', 'mirissa', ''));
  for (const id of ['owner-added-place', 'constructor', 'toString', '__proto__']) {
    assert.equal(inR2.publicPhoto('destinations', id, 'https://bucket.r2.dev/owner-photo.webp'), 'https://bucket.r2.dev/owner-photo.webp');
  }
});

test('seed corrections use stable identity across URL sizing and query order', () => {
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  const resized = new URL(seed.image); resized.search = '?w=480&q=65&auto=format';
  assert.equal(inR2.publicPhoto('destinations', 'ella', resized.href), inR2.publicPhoto('destinations', 'ella', seed.image));
  assert.notEqual(inR2.publicPhoto('destinations', 'ella', seed.image), inR2.publicPhoto('destinations', 'mirissa', legacy.find(row=>row.table==='destinations'&&row.id==='mirissa')!.image));
});

test('all named destination corrections are in R2, distinct and carry descriptive metadata', () => {
  registerPhotoSets(everySet);
  const destinations = legacy.filter(row => row.table === 'destinations');
  const sources = destinations.map(row => inR2.publicPhoto(row.table, row.id, row.image));
  assert.equal(new Set(sources).size, destinations.length);
  for (const src of sources) { assert.ok(src.startsWith(`${ALL}/`), src); assert.ok(photoAsset(src)?.alt); assert.ok(photoAsset(src)?.srcSet); }
});

test('Belilena uses an honest placeholder only for its unverified seed photo', () => {
  const seed = legacy.find(row=>row.table==='hidden_gems'&&row.id==='belilena')!;
  const owner = 'https://bucket.r2.dev/owner-verified-belilena.webp';
  for (const rules of [inR2, noR2]) {
    assert.equal(rules.publicPhoto(seed.table, seed.id, seed.image), PLACEHOLDER);
    assert.equal(rules.publicPhoto(seed.table, seed.id, owner), owner);
  }
});

test('scene captions correct known mismatches and preserve owner changes', () => {
  const photo = photographs.find(row=>row.key==='yala')!;
  const caption = 'A Sri Lankan leopard resting upon a sun-warmed granite outcrop in Yala.';
  assert.match(inR2.photoStoryCopy('p4',photo.image,'Jungle Monarch',caption).caption,/walking/);
  assert.equal(inR2.photoStoryCopy('p4',photo.image,'Jungle Monarch','Owner caption').caption,'Owner caption');
  assert.equal(inR2.photoStoryCopy('p4','https://bucket.r2.dev/owner-photo.webp','Jungle Monarch',caption).caption,caption);
});

test('Gal Oya replaces only the identified Ekgal Oya regional photograph', () => {
  const before = photographs.find(photo=>photo.key==='gal-oya')!;
  const owner = 'https://bucket.r2.dev/owner-gal-oya.webp';
  assert.equal(inR2.publicPhoto('hidden_gems','gal-oya',before.image), primary('gal-oya-park'));
  assert.equal(inR2.publicPhoto('hidden_gems','gal-oya',owner),owner);
});

/* ---------------------------------------------------- nothing in R2 (fallback) */

test('not in R2: a corrected row shows what it stores', () => {
  for (const row of legacy) {
    if (row.table === 'hidden_gems' && row.id === 'belilena') continue;
    assert.equal(noR2.publicPhoto(row.table, row.id, row.image), row.image, `${row.table}/${row.id}`);
  }
  const before = photographs.find(photo=>photo.key==='gal-oya')!;
  assert.equal(noR2.publicPhoto('hidden_gems', 'gal-oya', before.image), before.image);
});

test('not in R2: a pinned cover shows what its row stores, whatever that is', () => {
  for (const id of Object.keys(PHOTO_CORRECTIONS.destinations)) {
    const stored = `https://images.unsplash.com/${id}-stored`;
    assert.equal(noR2.publicPhoto('destinations', id, stored), stored, id);
  }
});

test('nothing stored and nothing in R2: the placeholder', () => {
  assert.equal(noR2.publicPhoto('destinations', 'ella', ''), PLACEHOLDER);
  assert.equal(noR2.publicPhoto('destinations', 'owner-added-place', ''), PLACEHOLDER);
  assert.equal(noR2.publicPhoto('tours', 'any-tour', ''), PLACEHOLDER);
  assert.equal(inR2.publicPhoto('destinations', 'owner-added-place', ''), PLACEHOLDER);
});

test('not in R2: a seeded gallery stays as stored, and needs all its photos before it changes', () => {
  assert.deepEqual(noR2.publicGallery('ella', SEEDED_ELLA_GALLERY), SEEDED_ELLA_GALLERY);
  const onlyElla = photoResolver({ ella: sets.ella });
  assert.deepEqual(onlyElla.publicGallery('ella', SEEDED_ELLA_GALLERY), SEEDED_ELLA_GALLERY);
});

test('one photo in R2 does not move another: mirissa stays on its row while ella is in R2', () => {
  const rules = photoResolver(sets);
  const seed = legacy.find(row => row.table === 'destinations' && row.id === 'ella')!;
  assert.equal(rules.publicPhoto('destinations', 'ella', seed.image), `${R2}/1280-ella.webp`);
  assert.equal(rules.publicPhoto('destinations', 'ella', `${R2}/1280-ella.webp`), `${R2}/1280-ella.webp`);
  assert.equal(rules.publicPhoto('destinations', 'mirissa', 'https://images.unsplash.com/stored'), 'https://images.unsplash.com/stored');
  assert.equal(rules.resolvedPhoto('https://images.unsplash.com/custom'), 'https://images.unsplash.com/custom');
});

/* ------------------------------------------------------------ photos in R2 */

test('a gallery and a story still recognise their photo on its R2 URL', () => {
  const rules = photoResolver(sets);
  assert.deepEqual(rules.publicGallery('ella', SEEDED_ELLA_GALLERY), [`${R2}/1280-ella.webp`, `${R2}/1280-train.webp`]);
  assert.equal(rules.photoStoryLocation('p1', `${R2}/1280-train.webp`, 'Ella & Nuwara Eliya'), 'Ella');
  assert.equal(rules.photoStoryLocation('p1', 'https://images.unsplash.com/owner', 'Ella & Nuwara Eliya'), 'Ella & Nuwara Eliya');
  assert.equal(rules.photoStoryCopy('p1', `${R2}/1280-train.webp`, 'Highland Mist & Blue Trains', 'x').title, 'Nine Arch Bridge in Ella');
});

test('1920 px is only for full-width heroes, and never for Jaffna or Udawalawe', () => {
  assert.deepEqual(usableVariants('jaffna', sets.jaffna).map(v => v.width), [480, 768, 1280]);
  assert.deepEqual(usableVariants('udawalawe', sets.ella).map(v => v.width), [480, 768, 1280]);
  assert.deepEqual(usableVariants('ella', sets.ella).map(v => v.width), [480, 768, 1280, 1920]);

  const srcSet = fullSrcSet(`${R2}/1280-ella.webp`, sets)!;
  assert.match(srcSet, /1920w/);
  assert.doesNotMatch(withoutFullWidth(srcSet)!, /1920w/);
  assert.doesNotMatch(fullSrcSet(`${R2}/1280-jaffna.webp`, sets)!, /1920w/);
  assert.equal(withoutFullWidth(undefined), undefined);
});

test('the client learns the R2 URLs; a photo not in a set has no srcset', () => {
  assert.equal(photoAsset(`${R2}/1280-ella.webp`), undefined);
  registerPhotoSets(sets);
  const asset = photoAsset(`${R2}/1280-ella.webp`)!;
  assert.equal(asset.alt, 'Nine Arch Bridge surrounded by forest in Ella, Sri Lanka');
  assert.equal(asset.srcSet, `${R2}/480-ella.webp 480w, ${R2}/768-ella.webp 768w, ${R2}/1280-ella.webp 1280w, ${R2}/1920-ella.webp 1920w`);
  assert.doesNotMatch(photoAsset(`${R2}/1280-jaffna.webp`)!.srcSet!, /1920w/);
  assert.equal(fullSrcSet(`${R2}/768-train.webp`, sets), `${R2}/480-train.webp 480w, ${R2}/768-train.webp 768w, ${R2}/1280-train.webp 1280w`);
  assert.equal(fullSrcSet('https://images.unsplash.com/custom', sets), undefined);

  // Its source URLs still identify the photograph, for the alt text and framing.
  const wikimedia = photographs.find(p => p.key === 'mirissa')!;
  assert.equal(photoAsset(wikimedia.image)?.key, 'mirissa');
  assert.equal(photoAsset(wikimedia.image)?.srcSet, undefined);
  assert.equal(fullSrcSet(wikimedia.image, {}), undefined);
  registerPhotoSets(undefined);
});
