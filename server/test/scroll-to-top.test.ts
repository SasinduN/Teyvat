import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scrollToTop } from '../../src/lib/scrollToTop';

function check(reduced: boolean, withHeading: boolean) {
  const descriptors = Object.fromEntries(['window', 'document', 'matchMedia'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let options: ScrollToOptions | undefined;
  let focused = false;
  let tabindex: string | undefined;
  const heading = {
    dataset: {}, hasAttribute: () => false,
    setAttribute: (name: string, value: string) => { assert.equal(name, 'tabindex'); tabindex = value; },
    focus: (value: FocusOptions) => { assert.equal(value.preventScroll, true); focused = true; }
  };
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { scrollTo: (value: ScrollToOptions) => { options = value; } } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { querySelector: () => withHeading ? heading : null } });
    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: (query: string) => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return { matches: reduced }; } });
    scrollToTop();
    assert.deepEqual(options, { top: 0, behavior: reduced ? 'instant' : 'smooth' });
    assert.equal(focused, withHeading);
    if (withHeading) assert.equal(tabindex, '-1');
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test('scroll-to-top moves focus to the heading without a competing focus scroll', () => check(false, true));
test('reduced motion uses instant native scrolling', () => check(true, true));
test('scrolling still works when a page has no heading', () => check(false, false));
