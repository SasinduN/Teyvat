/**
 * The redesign's shared surfaces, in Chrome: WCAG AA contrast for the text
 * on the header, the mobile menu, the footer and the scroll-to-top button,
 * and a visible keyboard focus ring (docs/plans/redesign-redo.md, PR 2).
 *
 * Contrast is measured on the colours the browser actually computes. A
 * translucent surface is composited over both a white and a black backdrop
 * (the extremes a photo can put behind glass) and the worse of the two
 * counts: 4.5:1 for text, 3:1 for large text and for icons.
 */
// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

/**
 * In the page: `window.__contrast(root, minimumForText)` → the elements under
 * `root` whose text (or, for an svg icon, its colour) falls short.
 */
const CONTRAST = `(() => {
  const probe = document.createElement('canvas').getContext('2d');
  // Any CSS colour → [r, g, b, a] in 0–255 / 0–1, via the canvas's own parser.
  const rgba = (css) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  // The element's background as the stack of its and its ancestors' colours, over a backdrop.
  const background = (el, backdrop) => {
    const layers = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const c = rgba(getComputedStyle(node).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 1) break;
    }
    return layers.reverse().reduce((under, layer) => over(layer, under), backdrop);
  };
  window.__contrast = (root, minimum) => {
    const failures = [];
    const els = [...root.querySelectorAll('*')].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return false;
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      return ownText || el.tagName === 'svg';
    });
    for (const el of els) {
      const style = getComputedStyle(el);
      const size = parseFloat(style.fontSize), bold = parseInt(style.fontWeight, 10) >= 700;
      const isIcon = el.tagName === 'svg';
      const need = isIcon || size >= 24 || (bold && size >= 18.66) ? 3 : minimum;
      const colour = rgba(isIcon ? style.color : style.color);
      // Text opacity (opacity on the element or its ancestors) fades it into the background.
      let opacity = 1;
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity);
      const worst = Math.min(...[[255, 255, 255, 1], [0, 0, 0, 1]].map((backdrop) => {
        const bg = background(el, backdrop);
        const fg = over([colour[0], colour[1], colour[2], colour[3] * opacity], bg);
        return ratio(fg, bg);
      }));
      if (worst < need) {
        failures.push((el.getAttribute('aria-label') || el.textContent.trim() || el.tagName).slice(0, 40) + ': ' + worst.toFixed(2) + ' < ' + need);
      }
    }
    return failures;
  };
  return true;
})()`;

describe('glass surfaces: contrast and focus, in Chrome', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 10_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  async function openPage(path: string, mobile: boolean): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1280, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await poll(page, `document.querySelector('main h1') && document.querySelector('footer')`, 'the page', 20_000);
    await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', true`);
    await page.evaluate(CONTRAST);
    return page;
  }

  /** Waits until transitions on `selector` have finished (no running animations). */
  const settled = (selector: string) =>
    `document.querySelector(${JSON.stringify(selector)}).getAnimations({ subtree: true }).every((a) => a.playState !== 'running')`;

  test('desktop: the scrolled header and the footer meet AA, on any backdrop', async () => {
    const page = await openPage('/tours', false);
    await page.evaluate(`window.scrollTo(0, 600), true`);
    await poll(page, `document.querySelector('header').dataset.scrolled === 'true'`, 'the scrolled header');
    await poll(page, settled('header'), 'the header to settle');
    assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('header'), 4.5)`), [], 'header');

    await page.evaluate(`document.querySelector('footer').scrollIntoView(), true`);
    await poll(page, settled('footer'), 'the footer to settle');
    assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('footer'), 4.5)`), [], 'footer');
  });

  test('phone: the mobile menu and the scroll-to-top button meet AA, on any backdrop', async () => {
    const page = await openPage('/tours', true);
    await page.evaluate(`document.querySelector('[aria-label="Open menu"]').click(), true`);
    await poll(page, `document.querySelector('#mobile-navigation')`, 'the menu');
    await poll(page, settled('#mobile-navigation'), 'the menu to settle');
    assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('#mobile-navigation'), 4.5)`), [], 'mobile menu');
    await page.evaluate(`document.querySelector('#mobile-navigation [aria-label="Close menu"]').click(), true`);
    await poll(page, `!document.querySelector('#mobile-navigation')`, 'the menu closed');

    await page.evaluate(`window.scrollTo(0, innerHeight * 1.5), true`);
    await poll(page, `document.querySelector('[data-scroll-top]').dataset.visible === 'true'`, 'the scroll-to-top button');
    await poll(page, settled('[data-scroll-top]'), 'the button to settle');
    assert.deepEqual(await page.evaluate<string[]>(`__contrast(document.querySelector('[data-scroll-top]'), 4.5)`), [], 'scroll-to-top');
  });

  test('with reduced transparency the glass is solid', async () => {
    const page = await openPage('/tours', false);
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    await page.evaluate(`window.scrollTo(0, 600), true`);
    await poll(page, `document.querySelector('header').dataset.scrolled === 'true'`, 'the scrolled header');
    // The background fades in over 220 ms: read it once the transition has finished.
    await poll(page, settled('header'), 'the header to settle');
    const header = await page.evaluate<{ alpha: number; background: string; filter: string; media: boolean }>(`(() => {
      const s = getComputedStyle(document.querySelector('header'));
      const m = s.backgroundColor.match(/[\\d.]+/g).map(Number);
      return { alpha: m.length > 3 ? m[3] : 1, background: s.backgroundColor, filter: s.backdropFilter, media: matchMedia('(prefers-reduced-transparency: reduce)').matches };
    })()`);
    assert.ok(header.media, 'precondition: reduced transparency is on');
    assert.equal(header.alpha, 1, `an opaque background (${header.background})`);
    assert.equal(header.filter, 'none', 'no backdrop blur');
  });

  for (const mobile of [false, true]) {
    test(`${mobile ? 'phone' : 'desktop'}: the first five Tab stops show the focus ring`, async () => {
      const page = await openPage('/', mobile);
      for (let i = 1; i <= 5; i += 1) {
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await poll(page, `document.activeElement && document.activeElement !== document.body`, `tab stop ${i}`);
        const ring = await page.evaluate<{ what: string; outline: string; width: number }>(`(() => {
          const el = document.activeElement, s = getComputedStyle(el);
          return { what: (el.getAttribute('aria-label') || el.textContent.trim() || el.tagName).slice(0, 30), outline: s.outlineStyle, width: parseFloat(s.outlineWidth) };
        })()`);
        assert.ok(ring.outline !== 'none' && ring.width >= 2, `tab stop ${i} (${ring.what}): outline ${ring.outline} ${ring.width}px`);
      }
    });
  }
});
