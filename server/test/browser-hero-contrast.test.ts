// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Text on photos (problem 8 of docs/plans/redesign-redo.md): the home hero,
 * and the page headers of a list page, a detail page with chips, /plan and
 * the 404, at desktop and phone widths.
 *
 * The photos change with the content, so each is replaced by white, the
 * worst case for light text. The header is captured with its text and icons
 * hidden, so what is left is the real background: the overlay over white,
 * and any button's own fill. Every piece of text, icon and control on it is
 * then measured against every pixel behind it: 4.5:1 for text, 3:1 for
 * large text and for the icons of icon-only controls (the slide controls).
 * An icon beside its own text (a breadcrumb chevron) is
 * decorative: the text carries it (WCAG 1.4.11).
 *
 * Needs `npm run build` and Chrome; skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const skip = !executable ? 'no Chrome found; set CHROME_PATH to run these' : !built ? 'no build; run `npm run build` first' : false;

const HERO = '.te-hero, .te-page-hero';

/** The photo becomes white, and the text and icons are hidden: only the background is left. */
const BACKGROUND_ONLY = `
  :is(${HERO}) img { visibility: hidden !important; }
  :is(${HERO}) { background: #fff !important; }
  :is(${HERO}) * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }
  :is(${HERO}) svg { visibility: hidden !important; }
`;

interface Target {
  what: string;
  /** The text's (or icon's) colour, with its opacity applied: [r, g, b, a]. */
  colour: [number, number, number, number];
  need: number;
  rects: { x: number; y: number; w: number; h: number }[];
}

/** In the page: every piece of text and every icon in the header, with its boxes. */
const TARGETS = `(() => {
  const probe = document.createElement('canvas').getContext('2d');
  const rgba = (css) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const hero = document.querySelector(${JSON.stringify(HERO)});
  const out = [];
  for (const el of hero.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    let opacity = 1;
    for (let node = el; node && node !== document.body; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity);
    if (opacity === 0) continue;
    const size = parseFloat(style.fontSize), bold = parseInt(style.fontWeight, 10) >= 700;
    if (el.tagName === 'svg') {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const control = el.closest('a, button');
      const decorative = el.getAttribute('aria-hidden') === 'true' && !(control && !control.textContent.trim());
      if (decorative) continue;
      // A filled icon (the rating star) shows its fill; the rest are strokes in the text colour.
      const fill = style.fill && style.fill !== 'none' && !style.fill.startsWith('url') ? style.fill : null;
      const c = rgba(fill && el.getAttribute('fill') !== 'none' && el.classList.value.includes('fill-') ? fill : style.color);
      out.push({ what: 'icon in ' + (el.parentElement.getAttribute('aria-label') || el.parentElement.textContent.trim() || el.parentElement.tagName).slice(0, 40), colour: [c[0], c[1], c[2], c[3] * opacity], need: 3, rects: [{ x: r.x, y: r.y, w: r.width, h: r.height }] });
      continue;
    }
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (texts.length === 0) continue;
    const rects = texts.flatMap((n) => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()]; })
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }));
    if (rects.length === 0) continue;
    const c = rgba(style.color);
    out.push({ what: el.textContent.trim().slice(0, 40), colour: [c[0], c[1], c[2], c[3] * opacity], need: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5, rects });
  }
  return out;
})()`;

describe('text on photos: contrast over any photo, in Chrome', { skip }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let decoder: Page;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
    // Screenshots are decoded on a blank page: the site's CSP rightly refuses data: images.
    decoder = await chrome.newPage();
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  /** The shortfalls on `path`'s header: "what: ratio < need". */
  async function shortfalls(path: string, mobile: boolean): Promise<string[]> {
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1280, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile });
    // Still slides and no fades, so the capture and the boxes agree.
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.send('Page.navigate', { url: `${app.baseUrl}${path}` });
    await poll(page, `document.querySelector(${JSON.stringify(HERO)}) && document.querySelector('main h1')`, `${path}'s header`);
    await page.evaluate(`document.fonts.ready.then(() => true)`);
    await sleep(800);

    const targets = (await page.evaluate<Target[]>(TARGETS)).filter((t) => t.rects.some((r) => r.y < (mobile ? 844 : 900)));
    assert.ok(targets.length >= 4, `precondition: text found on ${path} (${targets.length})`);

    await page.evaluate(`(() => { const s = document.createElement('style'); s.id = 'background-only'; s.textContent = ${JSON.stringify(BACKGROUND_ONLY)}; document.head.append(s); return true; })()`);
    await sleep(300);
    const { data } = (await page.send('Page.captureScreenshot', { format: 'png' })) as { data: string };

    return decoder.evaluate<string[]>(`(async () => {
      const img = new Image();
      img.src = 'data:image/png;base64,${data}';
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const failures = [];
      for (const t of ${JSON.stringify(targets)}) {
        const [fr, fg, fb, fa] = t.colour;
        let worst = Infinity;
        for (const r of t.rects) {
          const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y));
          const x1 = Math.min(img.width, Math.ceil(r.x + r.w)), y1 = Math.min(img.height, Math.ceil(r.y + r.h));
          for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
            const i = (y * img.width + x) * 4;
            const br = pixels[i], bg = pixels[i + 1], bb = pixels[i + 2];
            // The text over this pixel, with its alpha.
            const tr = fr * fa + br * (1 - fa), tg = fg * fa + bg * (1 - fa), tb = fb * fa + bb * (1 - fa);
            const [hi, lo] = [lum(tr, tg, tb), lum(br, bg, bb)].sort((a, b) => b - a);
            worst = Math.min(worst, (hi + 0.05) / (lo + 0.05));
          }
        }
        if (worst < t.need) failures.push(t.what + ': ' + worst.toFixed(2) + ' < ' + t.need);
      }
      return failures;
    })()`);
  }

  for (const mobile of [false, true]) {
    const width = mobile ? 'phone' : 'desktop';
    for (const path of ['/', '/destinations', '/destinations/ella', '/plan', '/nope']) {
      test(`${width} ${path}: the header's text, icons and controls meet AA over a white photo`, async () => {
        assert.deepEqual(await shortfalls(path, mobile), [], path);
      });
    }
  }
});
