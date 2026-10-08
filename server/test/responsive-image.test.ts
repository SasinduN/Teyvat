import assert from 'node:assert/strict';
import { test } from 'node:test';
import { responsiveImage } from '../../shared/responsive-image';
import photographs from '../../shared/travel-photos.json';

test('Unsplash candidates preserve photograph and crop, negotiate modern format', () => {
  const candidates = responsiveImage('https://images.unsplash.com/photo-example?fit=crop&crop=faces&w=4000');
  assert.ok(candidates);
  for (const candidate of candidates.split(', ')) {
    const [source, size] = candidate.split(' ');
    const url = new URL(source);
    assert.equal(url.pathname, '/photo-example');
    assert.equal(url.searchParams.get('crop'), 'faces');
    assert.equal(url.searchParams.get('auto'), 'format');
    assert.equal(url.searchParams.get('w'), size.slice(0, -1));
  }
});

test('credited thumbnail and original share candidates, avoiding original-size Jaffna delivery', () => {
  for (const photo of photographs) {
    assert.equal(responsiveImage(photo.image), responsiveImage(photo.original), photo.key);
    if (photo.image.includes('/1280px-')) assert.ok(responsiveImage(photo.image)?.includes('480w'), photo.key);
  }
});

test('unsupported sources and owner-selected local assets remain unchanged', () => {
  for (const src of ['/images/custom.webp', 'https://bucket.example/custom.jpg', 'invalid']) {
    assert.equal(responsiveImage(src), undefined);
  }
});
