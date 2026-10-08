import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imageRetries } from '../../src/lib/image-retries';
import { destinationPhoto } from '../../src/lib/destination-photo';

test('responsive failure retries the saved source even without a credited original', () => {
  assert.deepEqual(imageRetries('https://images.unsplash.com/photo.jpg?w=1200', 'photo.jpg?w=480 480w', undefined), ['https://images.unsplash.com/photo.jpg?w=1200']);
});

test('credited photos try the saved source before the full original without duplicate requests', () => {
  assert.deepEqual(imageRetries('thumb.jpg', 'small.jpg 480w', 'original.jpg'), ['thumb.jpg', 'original.jpg']);
  assert.deepEqual(imageRetries('original.jpg', 'small.jpg 480w', 'original.jpg'), ['original.jpg']);
  assert.deepEqual(imageRetries('thumb.jpg', undefined, 'original.jpg'), ['original.jpg']);
});

test('an ordinary broken source goes straight to the placeholder without retrying itself indefinitely', () => {
  assert.deepEqual(imageRetries('/missing.jpg', undefined, undefined), []);
  assert.deepEqual(imageRetries(undefined, undefined, undefined), []);
});

test('Jaffna legacy seed uses the credited original and preserves admin edits and other records', () => {
  const legacy = 'https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=1200';
  assert.equal(destinationPhoto('jaffna', legacy), 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Full_view_of_nallur_front.JPG');
  assert.equal(destinationPhoto('jaffna', 'https://images.unsplash.com/owner.jpg'), 'https://images.unsplash.com/owner.jpg');
  assert.equal(destinationPhoto('delft-island', legacy), legacy);
});
