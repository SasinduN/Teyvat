// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The type system in Chrome, at the default text size: DM Sans, self-hosted,
 * and nothing else; the minimum sizes on every page type; 16 px inputs at any
 * text size (iPhones zoom into smaller ones); about 70 characters a line in
 * long text; one heading scale. And, without a browser, no hardcoded small
 * sizes coming back in the source.
 *
 * Needs `npm run build` and Chrome for the browser part; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { SCROLL_THROUGH, TEXT_SIZES_ON_PAGE } from './text-audit';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();
const skip = !executable
  ? 'no Chrome found; set CHROME_PATH to run these'
  : !existsSync(join(ROOT, 'dist', 'index.html'))
    ? 'no build; run `npm run build` first'
    : false;

const PAGES = [
  '/',
  '/explore',
  '/plan',
  '/journal',
  '/journal/ultimate-ella-guide',
  '/destinations',
  '/destinations/ella',
  '/experiences',
  '/experiences/safari-yala',
  '/tours',
  '/tours/island-in-7-days',
  '/booking',
  '/about',
  '/photo-credits',
  '/no-such-page'
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

describe('the source', () => {
  const files = walk(join(ROOT, 'src'));

  test('no component hardcodes a text size', () => {
    const found = files
      .filter((f) => f.endsWith('.tsx'))
      .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\btext-\[\.?\d[\w.%]*\]/g)].map((m) => `${f}: ${m[0]}`));
    assert.deepEqual(found, []);
  });

  test('no stylesheet sets a font size in px', () => {
    const found = files
      .filter((f) => f.endsWith('.css'))
      .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/font-size:\s*\d[\d.]*px/g)].map((m) => `${f}: ${m[0]}`));
    assert.deepEqual(found, []);
  });

  test('no Google Fonts in the page', () => {
    assert.doesNotMatch(readFileSync(join(ROOT, 'index.html'), 'utf8'), /fonts\.(googleapis|gstatic)\.com/);
  });
});

// `--test-timeout` (60 s) applies to a suite as a whole too; each test keeps it.
describe('type on every page type, in Chrome', { skip, timeout: 6 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let page: Page;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null, bookings: true }));
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.send('Page.enable');
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  async function visit(path: string, width: number): Promise<void> {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await page.send('Page.navigate', { url: app.baseUrl + path });
    const until = Date.now() + 20_000;
    for (;;) {
      const ready = await page
        .evaluate<boolean>(`Boolean(document.readyState === 'complete' && document.body.dataset.route && document.querySelector('main h1') && document.querySelector('footer'))`)
        .catch(() => false);
      if (ready) break;
      if (Date.now() > until) throw new Error(`timed out waiting for ${path} at ${width}`);
      await sleep(50);
    }
    await page.evaluate('document.fonts.ready.then(() => true)');
  }

  test('the served page preloads the body weight only, and links no font host', async () => {
    const html = await (await fetch(`${app.baseUrl}/`)).text();
    const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/g)].map((m) => m[0]);
    assert.equal(preloads.length, 1, preloads.join('\n'));
    assert.match(preloads[0], /href="\/assets\/dm-sans-latin-400-normal-[^"]+\.woff2"/);
    assert.match(preloads[0], /crossorigin/);
    assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  });

  test('the only font files fetched are ours, and every text is DM Sans', async () => {
    await visit('/destinations/ella', 1280);
    const fonts = await page.evaluate<{ files: string[]; faces: string[] }>(`({
      files: performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\\.(woff2?|ttf|otf)(\\?|$)|fonts\\.g/.test(n)),
      faces: [...document.fonts].map((f) => f.family.replace(/"/g, '') + ' ' + f.weight + ' ' + f.style + ' ' + f.display)
    })`);
    assert.ok(fonts.files.length > 0, 'fonts were fetched');
    for (const file of fonts.files) assert.match(file, new RegExp(`^${app.baseUrl}/assets/dm-sans-latin-(400|500|600|700)-normal-`));
    assert.deepEqual(fonts.faces.sort(), [400, 500, 600, 700].map((w) => `DM Sans ${w} normal swap`));

    const families = await page.evaluate<string[]>(`[...new Set(['body', 'main h1', 'main h2', 'main p', '.te-nav-link', '.te-button', 'footer'].map((s) => getComputedStyle(document.querySelector(s)).fontFamily.split(',')[0].replace(/"/g, '')))]`);
    assert.deepEqual(families, ['DM Sans']);
  });

  for (const width of [375, 1280]) {
    for (const path of PAGES) {
      test(`${path} at ${width} px: nothing under the minimums`, async () => {
        await visit(path, width);
        await page.evaluate(SCROLL_THROUGH);
        const sizes = await page.evaluate<[number, number, string][]>(TEXT_SIZES_ON_PAGE);
        assert.deepEqual(sizes.filter(([px]) => px < 13).map(([px, , text]) => `${px} ${text}`), [], 'labels are at least 13 px');
        // A sentence, not a label: card and description text.
        assert.deepEqual(sizes.filter(([px, length]) => px < 15 && length >= 60).map(([px, , text]) => `${px} ${text}`), [], 'long text is at least 15 px');
      });
    }

    test(`body text at ${width} px`, async () => {
      await visit('/about', width);
      const body = await page.evaluate<{ size: number; leading: number }>(`(() => {
        const s = getComputedStyle(document.body);
        return { size: parseFloat(s.fontSize), leading: parseFloat(s.lineHeight) / parseFloat(s.fontSize) };
      })()`);
      if (width === 375) assert.equal(body.size, 16);
      else assert.ok(body.size >= 17 && body.size <= 18, `${body.size} px`);
      assert.ok(Math.abs(body.leading - 1.6) < .01, `line height ${body.leading}`);
    });
  }

  test('headings follow one scale from phone to desktop', async () => {
    const sizes = async (width: number) => {
      await visit('/destinations/ella', width);
      return page.evaluate<{ page: number; section: number }>(`({
        page: parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize),
        section: parseFloat(getComputedStyle(document.querySelector('main section h2')).fontSize)
      })`);
    };
    const phone = await sizes(375);
    const desktop = await sizes(1280);
    assert.ok(phone.page >= 32 && phone.page <= 34, `h1 ${phone.page} px on a phone`);
    assert.ok(desktop.page >= 46 && desktop.page <= 52, `h1 ${desktop.page} px on a desktop`);
    assert.ok(phone.section >= 28 && phone.section < phone.page, `h2 ${phone.section} px on a phone`);
    assert.ok(desktop.section >= 36 && desktop.section < desktop.page, `h2 ${desktop.section} px on a desktop`);
  });

  for (const path of ['/journal/ultimate-ella-guide', '/destinations/ella', '/tours/island-in-7-days']) {
    test(`${path}: about 70 characters a line`, async () => {
      await visit(path, 1280);
      // The longest paragraph's first line, counted: where its characters first move down.
      const characters = await page.evaluate<number>(`(() => {
        const p = [...document.querySelectorAll('.te-prose, .te-prose p')].filter((el) => el.children.length === 0).sort((a, b) => b.textContent.length - a.textContent.length)[0];
        const node = p.firstChild;
        const top = (i) => { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); return r.getBoundingClientRect().top; };
        for (let i = 1; i < node.length - 1; i += 1) if (top(i) > top(0) + 4) return i;
        return node.length;
      })()`);
      assert.ok(characters >= 55 && characters <= 80, `${characters} characters on the first line`);
    });
  }

  test('inputs stay at 16 px at every text size, even at 90%', async () => {
    const inputs = `[...document.querySelectorAll('input, select, textarea')]
      .filter((el) => !['checkbox', 'radio', 'file', 'hidden', 'range'].includes(el.type) && el.getBoundingClientRect().width > 1)
      .map((el) => [el.id || el.name || el.type, parseFloat(getComputedStyle(el).fontSize)])`;
    try {
      for (const textSize of [90, 100, 120]) {
        await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
        for (const path of ['/', '/booking', '/about']) {
          await visit(path, 375);
          await page.evaluate(SCROLL_THROUGH);
          const found = await page.evaluate<[string, number][]>(inputs);
          assert.ok(found.length > 0, `${path} has inputs`);
          assert.deepEqual(found.filter(([, px]) => px < 16), [], `${path} at ${textSize}%`);
        }
      }
    } finally {
      await pool.query('update public.site_settings set text_size = 100 where id');
    }
  });
});
