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
  assert.equal(publicPhoto('destinations', 'ella', image), image);
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
