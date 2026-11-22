// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The type system in Chrome, at the default text size: self-hosted fonts and
 * nothing else (DM Sans for text, Playfair Display 600 for headings, Allura only
 * for accent words, docs/plans/brand-themes.md); the accent rules on every page
 * type; the minimum sizes on every page type; 16 px inputs at any text size
 * (iPhones zoom into smaller ones); about 70 characters a line in long text; one
 * heading scale. And, without a browser, no hardcoded small sizes coming back in
 * the source, and the script used nowhere but `<Accent>`.
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
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, seedStoredPhotoCredit, type RunningApp } from './helpers';
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
  '/when-to-go',
  '/journal',
  '/journal/ultimate-ella-guide',
  '/destinations',
  '/destinations/ella',
  '/experiences',
  '/experiences/safari-yala',
  '/tours',
  '/tours/island-in-7-days',
  '/tours/category/cultural',
  '/booking',
  '/about',
  '/photo-credits',
  '/wishlist',
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

  test('the accent script is set only through <Accent> (.te-accent)', () => {
    const rel = (f: string) => f.slice(ROOT.length + 1).replace(/\\/g, '/');
    // The font and its token: declared in fonts.css and index.css, used by .te-accent alone (Accent.tsx names it).
    const script = files
      .filter((f) => /\.(css|tsx?)$/.test(f))
      .flatMap((f) => (/Allura|--font-accent/.test(readFileSync(f, 'utf8')) ? [rel(f)] : []));
    assert.deepEqual(script.sort(), ['src/components/Accent.tsx', 'src/index.css', 'src/styles/fonts.css']);
    const css = readFileSync(join(ROOT, 'src', 'index.css'), 'utf8');
    assert.deepEqual([...css.matchAll(/var\(--font-accent\)/g)].length, 1, 'only .te-accent uses it');
    // The class: written by Accent.tsx only.
    const classUsers = files.filter((f) => f.endsWith('.tsx') && readFileSync(f, 'utf8').includes('te-accent')).map(rel);
    assert.deepEqual(classUsers, ['src/components/Accent.tsx']);
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
    await seedStoredPhotoCredit();
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

  test('preloads: the body weight and the heading serif everywhere, the script on the home page only; no font host', async () => {
    const fontPreloads = (html: string) => [...html.matchAll(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/g)].map((m) => m[0]);
    const home = await (await fetch(`${app.baseUrl}/`)).text();
    const other = await (await fetch(`${app.baseUrl}/tours`)).text();
    const expected = [/dm-sans-latin-400-normal-/, /playfair-display-latin-600-normal-/];
    assert.equal(fontPreloads(home).length, 3, fontPreloads(home).join('\n'));
    assert.equal(fontPreloads(other).length, 2, fontPreloads(other).join('\n'));
    for (const [i, file] of [...expected, /allura-latin-400-normal-/].entries()) {
      assert.match(fontPreloads(home)[i], new RegExp(`href="/assets/${file.source}[^"]+\\.woff2"`));
      assert.match(fontPreloads(home)[i], /crossorigin/);
    }
    for (const [i, file] of expected.entries()) assert.match(fontPreloads(other)[i], file);
    for (const html of [home, other]) {
      assert.doesNotMatch(html, /home-only/, 'the markers never reach a page');
      assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
    }
  });

  test('the only font files fetched are ours: DM Sans for text, Playfair Display for headings', async () => {
    for (const path of ['/destinations/ella', '/']) {
      await visit(path, 1280);
      const fonts = await page.evaluate<{ files: string[]; faces: string[] }>(`({
        files: performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\\.(woff2?|ttf|otf)(\\?|$)|fonts\\.g/.test(n)),
        faces: [...document.fonts].map((f) => f.family.replace(/"/g, '') + ' ' + f.weight + ' ' + f.style + ' ' + f.display)
      })`);
      assert.ok(fonts.files.length > 0, 'fonts were fetched');
      for (const file of fonts.files) {
        assert.match(file, new RegExp(`^${app.baseUrl}/assets/(dm-sans-latin-(400|500|600|700)|playfair-display-latin-600|allura-latin-400)-normal-`));
      }
      // The web fonts, then the measured local fallbacks (fonts.css), which download nothing.
      assert.deepEqual(fonts.faces.filter((f) => !f.includes('Fallback')).sort(), [
        'Allura 400 normal swap',
        ...[400, 500, 600, 700].map((w) => `DM Sans ${w} normal swap`),
        'Playfair Display 600 normal swap'
      ]);
      assert.deepEqual(fonts.faces.filter((f) => f.includes('Fallback')).map((f) => f.split(' ').slice(0, -3).join(' ')).sort(), [
        'Allura Fallback DejaVu', 'Allura Fallback Georgia', 'Allura Fallback Times',
        'Playfair Display Fallback DejaVu', 'Playfair Display Fallback Georgia', 'Playfair Display Fallback Times',
        'Playfair Display Wordmark Fallback DejaVu', 'Playfair Display Wordmark Fallback Georgia', 'Playfair Display Wordmark Fallback Times'
      ]);
    }
    // The script downloads only where an accent is on the page: the home page, not Ella's.
    // A fresh tab, so nothing the home page asked for is carried over.
    const shared = page;
    page = await chrome.newPage();
    try {
      await page.send('Page.enable');
      await visit('/destinations/ella', 1280);
      const files = await page.evaluate<string[]>(`performance.getEntriesByType('resource').map((e) => e.name)`);
      const status = await page.evaluate<string>(`[...document.fonts].find((f) => f.family === 'Allura').status`);
      assert.ok(!files.some((f) => f.includes('allura')), `no accent, no script file: ${files.filter((f) => /woff/.test(f)).join(', ')}`);
      assert.equal(status, 'unloaded');
    } finally {
      await page.send('Page.close').catch(() => undefined);
      page = shared;
    }

    const first = (selector: string) => `getComputedStyle(document.querySelector('${selector}')).fontFamily.split(',')[0].replace(/"/g, '')`;
    const text = await page.evaluate<string[]>(`[...new Set(['body', 'main p', '.te-nav-link', '.te-button', 'footer', 'input, textarea, select'].filter((s) => document.querySelector(s)).map((s) => ${first('X').replace("'X'", 's')}))]`);
    assert.deepEqual(text, ['DM Sans'], 'body text, nav, buttons, footer and forms');
    const headings = await page.evaluate<string[]>(`[...new Set(['main h1', 'main h2', '.te-logo-main'].map((s) => ${first('X').replace("'X'", 's')}))]`);
    assert.deepEqual(headings, ['Playfair Display'], 'headings and the wordmark');
  });

  for (const width of [375, 1280]) {
    test(`accent words at ${width} px: in a heading, short, at least 2rem, at most two a page, the script nowhere else`, async () => {
      const found: Record<string, number> = {};
      for (const path of PAGES) {
        await visit(path, width);
        const result = await page.evaluate<{ accents: { text: string; px: number; inHeading: boolean; forbidden: string | null }[]; stray: string[] }>(`(() => {
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
          const accents = [...document.querySelectorAll('.te-accent')].map((el) => ({
            text: el.textContent.trim(),
            px: parseFloat(getComputedStyle(el).fontSize) / rem * 16,
            inHeading: Boolean(el.closest('h1, h2, h3')),
            forbidden: el.closest('nav, button, label, input, select, textarea, footer, .te-button, [class*="price"], [class*="badge"]')?.tagName ?? null
          }));
          // Anything else set in the script: a face that isn't an accent's.
          const stray = [...document.querySelectorAll('body *')]
            .filter((el) => !el.closest('.te-accent') && getComputedStyle(el).fontFamily.replace(/"/g, '').startsWith('Allura'))
            .map((el) => el.tagName + ' ' + (el.textContent || '').trim().slice(0, 40));
          return { accents, stray };
        })()`);
        found[path] = result.accents.length;
        assert.deepEqual(result.stray, [], `${path}: the script outside an accent`);
        assert.ok(result.accents.length <= 2, `${path}: ${result.accents.length} accents`);
        for (const a of result.accents) {
          assert.ok(a.inHeading, `${path}: "${a.text}" isn't in a heading`);
          assert.equal(a.forbidden, null, `${path}: "${a.text}" is inside ${a.forbidden}`);
          assert.ok(a.text.length <= 24, `${path}: "${a.text}" is longer than 24 characters`);
          assert.ok(a.px >= 32 - 0.01, `${path}: "${a.text}" is ${a.px.toFixed(1)} px at 100%, under 2rem`);
        }
      }
      // The approved places: the hero and "Plan your trip" on the home page, the title on /explore.
      assert.equal(found['/'], 2);
      assert.equal(found['/explore'], 1);
      assert.equal(Object.values(found).reduce((a, b) => a + b, 0), 3, JSON.stringify(found));
    });
  }

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

  test('body text on a phone is never under 16 px, at any text size', async () => {
    try {
      for (const [textSize, px] of [[100, 16], [110, 17.6], [120, 19.2]]) {
        await pool.query('update public.site_settings set text_size = $1 where id', [textSize]);
        await visit('/journal/ultimate-ella-guide', 375);
        const found = await page.evaluate<number[]>(`[document.body, document.querySelector('.te-prose')].map((el) => parseFloat(getComputedStyle(el).fontSize))`);
        for (const size of found) assert.ok(size >= px - .01, `${size} px at ${textSize}%, expected at least ${px}`);
      }
    } finally {
      await pool.query('update public.site_settings set text_size = 100 where id');
    }
  });

  test('inputs stay at 16 px at every text size', async () => {
    const inputs = `[...document.querySelectorAll('input, select, textarea')]
      .filter((el) => !['checkbox', 'radio', 'file', 'hidden', 'range'].includes(el.type) && el.getBoundingClientRect().width > 1)
      .map((el) => [el.id || el.name || el.type, parseFloat(getComputedStyle(el).fontSize)])`;
    try {
      for (const textSize of [100, 110, 120]) {
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
