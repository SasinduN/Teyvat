/**
 * The wishlist's rules, with no browser (`shared/wishlist.ts`): what a stored list may
 * hold, the limit, and the enquiry it becomes. `browser-wishlist` tests the rest.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseWishlist, toggleItem, WISHLIST_MAX, wishlistMessage, wishlistSubject, type WishlistItem } from '../../shared/wishlist';

const destination = (id: string): WishlistItem => ({ kind: 'destination', id });
const many = (count: number, prefix = 'place') => Array.from({ length: count }, (_, i) => destination(`${prefix}-${i}`));
const allLive = () => true;

test('a stored list: junk, unknown kinds and duplicates are dropped', () => {
  assert.deepEqual(parseWishlist(null), []);
  assert.deepEqual(parseWishlist(''), []);
  assert.deepEqual(parseWishlist('{not json'), []);
  assert.deepEqual(parseWishlist('{"kind":"tour","id":"a"}'), [], 'not an array');
  assert.deepEqual(parseWishlist('null'), []);
  assert.deepEqual(
    parseWishlist(JSON.stringify([
      { kind: 'tour', id: 'a' },
      { kind: 'tour', id: 'a' },
      { kind: 'destination', id: 'a' },
      { kind: 'spaceship', id: 'b' },
      { kind: 'tour' },
      { kind: 'tour', id: '' },
      { kind: 'tour', id: 7 },
      null,
      'tour'
    ])),
    [{ kind: 'tour', id: 'a' }, { kind: 'destination', id: 'a' }]
  );
});

test('a stored list is never longer than the limit', () => {
  assert.equal(WISHLIST_MAX, 30);
  assert.equal(parseWishlist(JSON.stringify(many(45))).length, 30);
});

test('saving adds, saving again removes', () => {
  const added = toggleItem([], destination('ella'), allLive);
  assert.equal(added.result, 'added');
  assert.deepEqual(added.items, [destination('ella')]);
  const removed = toggleItem(added.items, destination('ella'), allLive);
  assert.equal(removed.result, 'removed');
  assert.deepEqual(removed.items, []);
});

test('the 31st item is refused, and unsaving still works at the limit', () => {
  const full = many(30);
  const refused = toggleItem(full, destination('one-more'), allLive);
  assert.equal(refused.result, 'full');
  assert.deepEqual(refused.items, full);
  assert.equal(toggleItem(full, full[0], allLive).result, 'removed');
  assert.equal(toggleItem(many(29), destination('one-more'), allLive).items.length, 30);
});

test('items the site no longer publishes do not count, and go only when their space is needed', () => {
  const gone = many(2, 'gone');
  const isLive = (item: WishlistItem) => !item.id.startsWith('gone');

  // Space left: an unpublished row stays stored, so it returns if it's published again.
  const roomy = toggleItem([...gone, ...many(3)], destination('new'), isLive);
  assert.equal(roomy.result, 'added');
  assert.ok(roomy.items.some((item) => item.id === 'gone-0'));

  // At the limit, but only 28 are live: it fits, and the two gone ones make room.
  const atLimit = toggleItem([...gone, ...many(28)], destination('new'), isLive);
  assert.equal(atLimit.result, 'added');
  assert.equal(atLimit.items.length, 29);
  assert.ok(!atLimit.items.some((item) => item.id.startsWith('gone')));

  // Thirty live ones are full, whatever else is stored.
  assert.equal(toggleItem(many(30), destination('new'), isLive).result, 'full');
});

test('the enquiry: a subject with the count, and the names under their headings', () => {
  assert.equal(wishlistSubject(1), 'Wishlist: 1 saved item');
  assert.equal(wishlistSubject(3), 'Wishlist: 3 saved items');
  assert.equal(
    wishlistMessage([
      { heading: 'Destinations', names: ['Ella', 'Sigiriya'] },
      { heading: 'Experiences', names: [] },
      { heading: 'Tours', names: ['Island in 7 Days'] }
    ]),
    'I would like to ask about these saved items:\n\nDestinations\n- Ella\n- Sigiriya\n\nTours\n- Island in 7 Days'
  );
});

test('the enquiry always fits the form: whole lines, under 5,000 characters', () => {
  const name = 'A very long name '.repeat(30);
  const message = wishlistMessage([{ heading: 'Destinations', names: Array.from({ length: 30 }, (_, i) => `${name}${i}`) }]);
  assert.ok(message.length <= 5000, `${message.length} characters`);
  assert.match(message, /The rest of my list is on my wishlist/);
  for (const line of message.split('\n').filter((l) => l.startsWith('- '))) assert.ok(line.includes(name.trim()), 'no name cut short');
});
