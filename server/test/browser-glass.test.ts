/**
 * The redesign's shared surfaces, in Chrome: WCAG AA contrast for the text
 * on the header, the mobile menu, the footer and the scroll-to-top button,
 * and a visible keyboard focus ring (docs/plans/redesign-redo.md, PR 2).
 *
 * Contrast is measured on the colours the browser actually computes. A
 * translucent surface is composited over both a white and a black backdrop
 * (the extremes a photo can put behind glass) and the worse of the two
 * counts: 4.5:1 for text, 3:1 for large text and for icons.
 *
 * In the dark theme the scrolled header is also measured on what Chrome
 * paints with light text scrolled under it: what shows through must be a
 * soft blur, and its own text must keep AA over it.
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
import { CONTRAST } from './contrast';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

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

  /**
   * In the decoder page (the site's CSP rightly refuses data: images), from
   * a viewport PNG: in the header's band (rows `top`..`bottom`, columns up to
   * `right`, clear of the page's scrollbar), the sharpest edge (`edge`: the
   * strongest contrast between pixels 2 px apart; sharp edges are what make
   * text readable, and a blur takes them away); and the worst ratio of each
   * text target against the pixels behind it.
   */
  const MEASURE_BAND = `(async (png, top, bottom, right, targets) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + png;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, img.width, img.height).data;
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    let edge = 1;
    const at = (x, y) => { const i = (y * img.width + x) * 4; return lum(px[i], px[i + 1], px[i + 2]); };
    for (let y = top; y < bottom - 2; y += 1) for (let x = 0; x < right - 2; x += 1) {
      const here = at(x, y);
      edge = Math.max(edge, ratio(here, at(x + 2, y)), ratio(here, at(x, y + 2)));
    }
    const worst = targets.map((t) => {
      let w = Infinity;
      const [fr, fg, fb, fa] = t.colour;
      for (const r of t.rects) for (let y = Math.max(0, r.y); y < Math.min(img.height, r.y + r.h); y += 1) for (let x = Math.max(0, r.x); x < Math.min(img.width, r.x + r.w); x += 1) {
        const i = (y * img.width + x) * 4;
        const br = px[i], bg = px[i + 1], bb = px[i + 2];
        w = Math.min(w, ratio(lum(fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa)), lum(br, bg, bb)));
      }
      return { what: t.what, need: t.need, ratio: Math.round(w * 100) / 100 };
    });
    return { edge: Math.round(edge * 1000) / 1000, worst };
  })`;

  for (const size of [{ width: 1920, height: 870 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`dark, ${size.width}×${size.height}: text scrolled under the header is only a soft blur, and the header's own text keeps AA over it`, async () => {
      const mobile = size.width < 640;
      // The decoder first: the page opened last is the one in front, where scrolling and painting run.
      const decoder = await chrome.newPage();
      const page = await chrome.newPage();
      await page.send('Page.bringToFront');
      await page.send('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile });
      await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
      await page.send('Page.navigate', { url: `${app.baseUrl}/explore` });
      await poll(page, `document.body?.dataset.route && document.readyState === 'complete' && document.querySelector('#explore-map [aria-pressed]') && document.documentElement.dataset.theme === 'dark'`, 'the page, dark', 20_000);
      await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', true`);

      // The category chips' text (sharp, light, on a dark page) runs through
      // the middle of the header. Scrolled until it holds (the route's own
      // scroll restoring may run after the first try).
      await poll(page, `(() => {
        const header = document.querySelector('header').getBoundingClientRect();
        const chip = document.querySelector('#explore-map [aria-pressed]').getBoundingClientRect();
        const target = chip.top + scrollY - (header.height - chip.height) / 2;
        if (Math.abs(scrollY - target) > 1) { window.scrollTo(0, target); return false; }
        return document.querySelector('header').dataset.scrolled === 'true';
      })()`, 'the chips under the scrolled header');
      await poll(page, settled('header'), 'the header to settle');
      await sleep(200);

      const band = await page.evaluate<{ top: number; bottom: number; right: number }>(`(() => {
        const r = document.querySelector('header').getBoundingClientRect();
        // Inside the header, clear of its bottom edge line.
        return { top: Math.ceil(r.top) + 2, bottom: Math.floor(r.bottom) - 3, right: Math.floor(r.right) };
      })()`);
      const style = (css: string) => page.evaluate(`(() => {
        let s = document.getElementById('test-style');
        if (!s) { s = document.createElement('style'); s.id = 'test-style'; document.head.append(s); }
        s.textContent = ${JSON.stringify(css)};
        return true;
      })()`);
      const shoot = async () => ((await page.send('Page.captureScreenshot', { format: 'png' })) as { data: string }).data;
      const measure = async (targets: unknown[] = []) =>
        decoder.evaluate<{ edge: number; worst: Array<{ what: string; need: number; ratio: number }> }>(
          `${MEASURE_BAND}(${JSON.stringify(await shoot())}, ${band.top}, ${band.bottom}, ${band.right}, ${JSON.stringify(targets)})`
        );
      const OUT_OF_THE_WAY = '[data-whatsapp-button], [data-scroll-top] { visibility: hidden !important; }';

      // Precondition: with the header gone, the band holds readable text.
      await style(`header { visibility: hidden !important; } ${OUT_OF_THE_WAY}`);
      const bare = await measure();
      assert.ok(bare.edge >= 4.5, `precondition: readable text under the header (edges at ${bare.edge}:1)`);

      // The header's surface alone (its links and buttons hidden): what shows
      // through is a soft blur, with no edges left to read. The same tint
      // without its blur keeps the text's edges (about 1.1:1, and readable:
      // the bug this replaced), so the measure tells the two apart.
      await style(`header * { visibility: hidden !important; } header { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; } ${OUT_OF_THE_WAY}`);
      const unblurred = await measure();
      assert.ok(unblurred.edge >= 1.08, `precondition: without the blur, the text's edges show (${unblurred.edge}:1)`);
      await style(`header * { visibility: hidden !important; } ${OUT_OF_THE_WAY}`);
      const through = await measure();
      assert.ok(through.edge <= 1.04, `text behind the header shows edges at ${through.edge}:1 (at most 1.04:1)`);

      // The header's own text and icons, against what is really behind them now.
      await style(OUT_OF_THE_WAY);
      const targets = await page.evaluate<unknown[]>(`(() => {
        const probe = document.createElement('canvas').getContext('2d');
        const rgba = (css) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = css; probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
        const out = [];
        for (const el of document.querySelectorAll('header *')) {
          const s = getComputedStyle(el);
          if (s.visibility === 'hidden' || s.display === 'none' || el.closest('.sr-only')) continue;
          const isIcon = el.tagName === 'svg';
          const texts = isIcon ? [] : [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
          if (!isIcon && texts.length === 0) continue;
          if (isIcon && el.closest('a, button')?.textContent.trim()) continue;
          const rects = (isIcon ? [el.getBoundingClientRect()] : texts.flatMap((n) => { const r = document.createRange(); r.selectNodeContents(n); return [...r.getClientRects()]; }))
            .filter((r) => r.width > 0 && r.height > 0)
            .map((r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }));
          if (rects.length === 0) continue;
          const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight, 10) >= 700;
          out.push({ what: isIcon ? 'icon: ' + (el.closest('a, button')?.getAttribute('aria-label') || 'svg') : el.textContent.trim().slice(0, 30), colour: rgba(s.color), need: isIcon || size >= 24 || (bold && size >= 18.66) ? 3 : 4.5, rects });
        }
        return out;
      })()`);
      assert.ok(targets.length >= (mobile ? 3 : 8), `precondition: the header's text found (${targets.length})`);
      await style(`header * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } header svg { visibility: hidden !important; } ${OUT_OF_THE_WAY}`);
      const { worst } = await measure(targets);
      assert.deepEqual(worst.filter((t) => t.ratio < t.need).map((t) => `${t.what}: ${t.ratio} < ${t.need}`), []);
    });
  }

  test('the built CSS keeps the standard backdrop-filter: glass blurs in Chrome, not only in Safari', async () => {
    const page = await openPage('/tours', false);
    await page.evaluate(`window.scrollTo(0, 600), true`);
    await poll(page, `document.querySelector('header').dataset.scrolled === 'true'`, 'the scrolled header');
    const filter = await page.evaluate<string>(`getComputedStyle(document.querySelector('header')).backdropFilter`);
    assert.match(filter, /blur\(/, `the scrolled header's backdrop-filter is "${filter}"`);
  });
});
