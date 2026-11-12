// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Phase 8 turns the home page's cards and navigation into links and retires
 * three modals, inside frozen components. The page must look exactly as it
 * did, so each changed section is rendered twice in headless Chrome with the
 * built stylesheet: once as it was at its baseline commit (read with
 * `git show`) and once as it is now.
 *
 * Each section has its own baseline commit (`SECTIONS[].baseline`). They all
 * start at `bf94e25`, the last commit before phase 8. A PR that redesigns a
 * section on purpose moves only that section's baseline, to the commit with
 * the approved design, with screenshots and the other teammate's approval
 * (CLAUDE.md; docs/plans/redesign-redo.md). No pixel may differ by more
 * than 2 colour levels; a control renders the baseline twice, so the method
 * proves itself first. The same approach as `browser-inquiry.test.ts`.
 *
 * Covered, at desktop and phone widths: the Navbar, the spotlight cards,
 * featured experiences, the tour cards, the experience categories, the
 * journal cards and the search modal.
 *
 * Not covered here: the Footer (its labels change on purpose, phase 8
 * question 1) and the map section (its only change, "Explore <name>" as a
 * link, is checked in browser-routes; its tiles need the network).
 *
 * Offline on purpose: images are a solid placeholder and DM Sans isn't
 * served, so both versions render alike and nothing can stall.
 * Needs `npm run build` (for the CSS) and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { build, type Plugin } from 'esbuild';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const executable = findChrome();
const cssDir = join(REPO_ROOT, 'dist', 'assets');
const cssFile = existsSync(cssDir) ? readdirSync(cssDir).find((f) => /^index-.*\.css$/.test(f)) : undefined;
const skip = !executable
  ? 'no Chrome found; set CHROME_PATH to run these'
  : !cssFile
    ? 'no built CSS; run `npm run build` first'
    : false;

/**
 * The sections, with props both versions accept (each ignores the ones it
 * doesn't know). `baseline` is the commit whose version of the component
 * the section must still match. `height` is the viewport for fixed-position
 * ones; the rest are measured.
 */
const SECTIONS: { name: string; baseline: string; props: string; height?: number }[] = [
  // Header groups (d999cb4): five top items, Discover and About as dropdowns (was ca26709, typography).
  { name: 'Navbar', baseline: 'd999cb4', props: '{ onOpenSearch() {}, onOpenPlanner() {}, onNavigateSection() {} }', height: 120 },
  // The editorial redesign (0bec8db): one large card and three smaller, a plain heading (was aee696e, the friend import).
  { name: 'DestinationSpotlight', baseline: '0bec8db', props: '{ onSelectDestination() {} }' },
  // The editorial redesign (d233e32): a lead row and plain rows (was ca26709, typography).
  { name: 'FeaturedExperiences', baseline: 'd233e32', props: '{ onSelectExperience() {} }' },
  // d233e32: photo and text side by side (was ca26709).
  { name: 'ToursSection', baseline: 'd233e32', props: '{ onOpenInquiry() {}, onViewRoute() {} }' },
  // d233e32: an asymmetric grid, captions under the photos (was 4c6ae6c).
  { name: 'ExperiencesSection', baseline: 'd233e32', props: '{ onSelectCategory() {} }' },
  // 0bec8db: a lead story and plain rows (was ca26709).
  { name: 'JournalSection', baseline: '0bec8db', props: '{}' },
  // Typography (ca26709): the rem scale in the modal and its input (was e6cdc02, #12 parity).
  { name: 'SearchModal', baseline: 'ca26709', props: '{ isOpen: true, onClose() {}, onSelectDestination() {} }', height: 900 }
];

const baselineOf = (name: string): string => SECTIONS.find((s) => s.name === name)!.baseline;

const WIDTHS = [1280, 390];

/** Serves `baseline:<Component>` from git, resolving its imports from today's src/components. */
const baselinePlugin: Plugin = {
  name: 'baseline',
  setup(b) {
    b.onResolve({ filter: /^baseline:/ }, (args) => ({ path: args.path.slice('baseline:'.length), namespace: 'baseline' }));
    b.onLoad({ filter: /.*/, namespace: 'baseline' }, (args) => ({
      contents: execFileSync('git', ['show', `${baselineOf(args.path)}:src/components/${args.path}.tsx`], {
        cwd: REPO_ROOT,
        encoding: 'utf8'
      }),
      loader: 'tsx',
      resolveDir: join(REPO_ROOT, 'src', 'components')
    }));
  }
};

/**
 * A script exposing `window.renderSection(name, payload)` for one version of
 * every section: the content comes from `payload` (via a stubbed fetch),
 * inside a router and a query client, as in the app.
 */
async function bundle(version: 'baseline' | 'current'): Promise<string> {
  const from = (name: string) => (version === 'baseline' ? `baseline:${name}` : `@/components/${name}`);
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
        import { MemoryRouter } from 'react-router-dom';
        import { fetchSiteContent } from '@/lib/api/content';
        import { queryKeys } from '@/lib/queryClient';
        ${SECTIONS.map((s) => `import { ${s.name} } from '${from(s.name)}';`).join('\n')}
        const sections = { ${SECTIONS.map((s) => `${s.name}: [${s.name}, ${s.props}]`).join(', ')} };
        window.renderSection = async (name, payload) => {
          window.fetch = async () => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
          const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
          await client.fetchQuery({ queryKey: queryKeys.siteContent, queryFn: fetchSiteContent });
          const [Component, props] = sections[name];
          createRoot(document.getElementById('root')).render(
            React.createElement(QueryClientProvider, { client },
              React.createElement(MemoryRouter, null, React.createElement(Component, props)))
          );
        };
      `,
      resolveDir: REPO_ROOT,
      loader: 'tsx'
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    write: false,
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
    alias: { '@': resolve(REPO_ROOT, 'src'), '@shared': resolve(REPO_ROOT, 'shared') },
    plugins: [baselinePlugin],
    logLevel: 'silent'
  });
  return result.outputFiles[0].text;
}

/** Every image in the content becomes the same solid placeholder. */
const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#6f8a7a"/></svg>'
)}`;

function offline(value: unknown): unknown {
  if (typeof value === 'string') return /^https?:\/\//.test(value) ? PLACEHOLDER : value;
  if (Array.isArray(value)) return value.map(offline);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, offline(v)]));
  }
  return value;
}

/** One section, rendered and settled; returns its PNG. */
async function screenshot(
  chrome: Chrome,
  script: string,
  css: string,
  payload: unknown,
  section: (typeof SECTIONS)[number],
  width: number
): Promise<{ page: Page; png: string }> {
  const page = await chrome.newPage();
  await page.send('Emulation.setDeviceMetricsOverride', { width, height: section.height ?? 900, deviceScaleFactor: 1, mobile: width < 500 });
  await page.evaluate(`(() => {
    document.open();
    document.write(${JSON.stringify(`<!doctype html><html><head><meta charset="utf-8">
      <style>${css}
      /* A focused search field's blinking caret is timing noise, not design. */
      input, textarea { caret-color: transparent; }
      </style></head><body><div id="root"></div></body></html>`)});
    document.close();
    return true;
  })()`);
  await page.evaluate(script);
  await page.evaluate(`window.renderSection(${JSON.stringify(section.name)}, ${JSON.stringify(payload)}).then(() => true)`);
  await sleep(300);

  // Tall enough to show the whole section, so every in-view animation runs.
  if (!section.height) {
    const height = await page.evaluate<number>('document.documentElement.scrollHeight');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  }
  await page.evaluate(`document.fonts.ready.then(() => true)`);
  await sleep(2500); // framer-motion's staggered entrances, with room to spare
  const { data } = (await page.send('Page.captureScreenshot', { format: 'png' })) as { data: string };
  return { page, png: data };
}

/** Pixels differing by more than `TOLERANCE` in any channel (see browser-inquiry). */
const TOLERANCE = 2;

async function differingPixels(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate<number>(`(async () => {
    const load = async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    };
    const [x, y] = await Promise.all([load(${JSON.stringify(a)}), load(${JSON.stringify(b)})]);
    if (x.width !== y.width || x.height !== y.height) return -1;
    let diff = 0;
    for (let i = 0; i < x.data.length; i += 4) {
      const d = Math.max(
        Math.abs(x.data[i] - y.data[i]),
        Math.abs(x.data[i + 1] - y.data[i + 1]),
        Math.abs(x.data[i + 2] - y.data[i + 2]),
        Math.abs(x.data[i + 3] - y.data[i + 3])
      );
      if (d > ${TOLERANCE}) diff++;
    }
    return diff;
  })()`);
}

// `--test-timeout` (60 s) applies to a suite as a whole too, and these 14
// comparisons take about 9 s each; each test still has its own 60 s.
describe(`the home page's changed sections look as they did at their baseline commits, in Chrome`, { skip, timeout: 5 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;
  let css: string;
  let payload: unknown;
  let baselineScript: string;
  let currentScript: string;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    app = await listen(createApp({ media: null }));
    payload = offline(await (await fetch(`${app.baseUrl}/api/content`)).json());
    chrome = await launchChrome(executable!);
    css = readFileSync(join(cssDir, cssFile!), 'utf8');
    [baselineScript, currentScript] = await Promise.all([bundle('baseline'), bundle('current')]);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  for (const section of SECTIONS) {
    for (const width of WIDTHS) {
      test(`${section.name} at ${width}px: no pixel differs from ${section.baseline} by more than ${TOLERANCE} levels`, async () => {
        const before = await screenshot(chrome, baselineScript, css, payload, section, width);
        const control = await screenshot(chrome, baselineScript, css, payload, section, width);
        const now = await screenshot(chrome, currentScript, css, payload, section, width);

        const keep = () => {
          const dir = mkdtempSync(join(tmpdir(), `site-home-${section.name}-${width}-`));
          for (const [name, shot] of Object.entries({ before, control, now })) {
            writeFileSync(join(dir, `${name}.png`), Buffer.from(shot.png, 'base64'));
          }
          return dir;
        };

        // Not two blank pages: the section really rendered, with its content.
        const text = await now.page.evaluate<number>(`document.getElementById('root').innerText.trim().length`);
        assert.ok(text > 20, `${section.name} rendered (${text} characters)`);

        const noise = await differingPixels(now.page, before.png, control.png);
        assert.equal(noise, 0, `the baseline differs from itself by ${noise} pixel(s): screenshots in ${noise ? keep() : ''}`);

        const diff = await differingPixels(now.page, before.png, now.png);
        // Closed as we go: three full-height pages per test add up.
        await Promise.all([before, control, now].map((shot) => shot.page.send('Page.close').catch(() => undefined)));
        assert.equal(diff, 0, `${diff} pixel(s) differ (-1: different sizes): screenshots in ${diff ? keep() : ''}`);
      });
    }
  }
});
