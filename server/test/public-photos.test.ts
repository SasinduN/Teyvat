import assert from 'node:assert/strict';
import { test } from 'node:test';
import photos from '../../shared/travel-photos.json';
import legacy from '../../shared/legacy-photo-references.json';
import { PHOTO_CORRECTIONS } from '../../shared/photo-corrections';
import { publicGallery, publicPhoto, photoStoryLocation } from '../../shared/public-photos';

test('all mapped legacy photos have attribution and preserve admin replacements', () => {
  let corrected = 0;
  for (const row of legacy) {
    const key = PHOTO_CORRECTIONS[row.table]?.[row.id];
    if (!key) continue;
    const credit = photos.find(photo => photo.key === key);
    assert.ok(credit, `${row.table}/${row.id}`);
    assert.ok(credit.author && credit.source && credit.license && credit.licenseUrl);
    assert.equal(publicPhoto(row.table, row.id, row.image), row.table === 'destinations' && row.id === 'jaffna' ? credit.original : credit.image);
    assert.equal(publicPhoto(row.table, row.id, '/uploads/owner-photo.jpg'), '/uploads/owner-photo.jpg');
    corrected++;
  }
  assert.equal(corrected, 58);
  assert.equal(publicPhoto('destinations', 'unknown', '/uploads/other.jpg'), '/uploads/other.jpg');
});

test('only exact seeded galleries are corrected and curated galleries survive', () => {
  const before = ['https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800'];
  assert.deepEqual(publicGallery('sigiriya', before), [photos.find(photo => photo.key === 'sigiriya')!.image]);
  const custom = ['/uploads/my-sigiriya.jpg'];
  assert.equal(publicGallery('sigiriya', custom), custom);
  assert.equal(publicGallery('unknown', before), before);
});

test('story locations match credited subjects without overwriting owner edits', () => {
  for (const [id, before, after] of [['p6', 'Hatton Tea Valleys', 'Nuwara Eliya'], ['p7', 'Koggala & Weligama', 'Ahangama']]) {
    const row = legacy.find(row => row.table === 'photo_stories' && row.id === id)!;
    assert.equal(photoStoryLocation(id, row.image, before), after);
    assert.equal(photoStoryLocation(id, '/uploads/custom.jpg', before), before);
    assert.equal(photoStoryLocation(id, row.image, 'Owner curated location'), 'Owner curated location');
  }
});
