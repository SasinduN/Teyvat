// Must be first: points the server at the test database (and clears
// PUBLIC_SITE_URL and SITE_INDEXABLE), or refuses to run.
import './test-db';

/**
 * The server-rendered first screen (docs/plans/server-rendered-headers.md, PR 1), in the HTML
 * Express sends:
 *
 *   - home's `#root` holds the first screen: the header and its links, and the hero (one h1,
 *     the headline from Admin → Settings, the subtitle, both buttons, the first slide as a real
 *     `<img>` with the same `srcset` and `sizes` as the preload), escaped, with no script;
 *   - every other page type is unchanged: an empty `#root`, rendered in the browser;
 *   - a missing or failing renderer sends the empty shell, never a broken page;
 *   - the renderer's file is never served; `Server-Timing` says what the page cost.
 *
 * In Chrome: `browser-ssr-no-js` (JavaScript off) and `browser-ssr-handover` (React taking over).
 * Needs `npm run build` (the renderer is built with the client); skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';
import express from 'express';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { firstScreen, injectFirstScreen, type FirstScreen } from '../src/pages/first-screen';
import { pagesRouter } from '../src/pages/pages';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RENDERER = join(REPO_ROOT, 'dist', '.ssr', 'first-screen.js');
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html')) && existsSync(RENDERER);

/** What's inside `#root`, and whether it's marked as server-rendered. */
function rootOf(html: string): { ssr: boolean; markup: string } {
  const open = /<div id="root"( data-ssr)?>/.exec(html);
  assert.ok(open, 'the shell has its #root');
  const rest = html.slice(open.index + open[0].length, html.lastIndexOf('</body>')).trim();
  assert.ok(rest.endsWith('</div>'), '#root closes before </body>');
  return { ssr: Boolean(open[1]), markup: rest.slice(0, -'</div>'.length) };
}

const all = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)];
const unescape = (text: string) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
/** An attribute's value, unescaped; names without case (React writes `srcSet`, HTML reads `srcset`). */
const attr = (tag: string, name: string) => {
  const value = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];
  return value === undefined ? null : unescape(value);
};
const textOf = (markup: string) => unescape(markup.replace(/<!-- -->/g, '').replace(/<br[^>]*>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

describe('injectFirstScreen (pure)', () => {
  test('inside the empty #root, marked data-ssr; a shell without one is left alone', () => {
    assert.equal(injectFirstScreen('<body><div id="root"></div></body>', '<p>x</p>'), '<body><div id="root" data-ssr><p>x</p></div></body>');
    assert.equal(injectFirstScreen('<body><main></main></body>', '<p>x</p>'), '<body><main></main></body>');
  });

  test('no renderer file: nothing covered, nothing rendered', async () => {
    const none = firstScreen(join(REPO_ROOT, 'dist', '.ssr', 'missing.js'));
    assert.equal(await none.covers('/'), false);
    assert.equal(await none.render('/', {} as never), null);
  });
});

describe('the first screen in the server HTML', { skip: built ? false : 'no build; run `npm run build` first' }, () => {
  let open: RunningApp;
  let withBookings: RunningApp;

  const get = async (app: RunningApp, path: string) => {
    const res = await fetch(`${app.baseUrl}${path}`);
    return { status: res.status, timing: res.headers.get('server-timing') ?? '', html: await res.text() };
  };

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    open = await listen(createApp({ media: null }));
    withBookings = await listen(createApp({ media: null, bookings: true }));
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await pool.query(`update public.site_settings set hero_headline = null where id`);
    await resetContent();
    await open?.close();
    await withBookings?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('home: the header and the hero, from the same content /api/content sends', async () => {
    const { status, html, timing } = await get(open, '/');
    assert.equal(status, 200);
    const { ssr, markup } = rootOf(html);
    assert.ok(ssr, '#root is marked data-ssr');
    const content = (await (await fetch(`${open.baseUrl}/api/content`)).json()) as {
      heroSlides: { image: string; title: string }[];
      siteSettings: { hero_headline: string | null; brand_tagline?: string | null };
    };

    // One h1: the headline (Admin → Settings, else the tagline).
    const h1s = all(markup, /<h1[^>]*>([\s\S]*?)<\/h1>/g);
    assert.equal(h1s.length, 1, 'one h1');
    assert.ok(textOf(h1s[0][1]).length > 0, 'the headline has text');
    assert.match(markup, /Tea country, ancient cities, leopards and surf, all on one island\./, 'the subtitle');
    assert.equal(all(markup, /\bdata-hero-ride-line\b/g).length, 0, 'no ride line while bookings are off');

    // The first slide only, as a real image: the preload's srcset and sizes, so one download.
    const images = all(markup, /<img [^>]*>/g).map((m) => m[0]);
    const slides = images.filter((tag) => attr(tag, 'src') === content.heroSlides[0].image);
    assert.equal(slides.length, 1, `the first slide is an <img>: ${content.heroSlides[0]?.image} in ${images.join(' | ')}`);
    const slide = slides[0];
    assert.ok(!images.some((tag) => content.heroSlides.slice(1).some((s) => attr(tag, 'src') === s.image)), 'only the first slide');
    const preload = /<link rel="preload" as="image" href="([^"]+)"(?: imagesrcset="([^"]+)" imagesizes="([^"]+)")?/.exec(html);
    assert.ok(preload, 'the hero photo is preloaded');
    assert.equal(unescape(preload[1]), attr(slide, 'src'), 'the same photo as the preload');
    if (preload[2]) {
      assert.equal(attr(slide, 'srcset'), unescape(preload[2]), 'the same srcset');
      assert.equal(attr(slide, 'sizes'), preload[3], 'the same sizes');
    }
    assert.equal(attr(slide, 'alt'), content.heroSlides[0].title, 'the slide named by its title');
    assert.equal(attr(slide, 'loading'), 'eager');

    // The header: the logo home, and every main link a real href.
    assert.match(markup, /<header [^>]*class="te-nav /, 'the header');
    const nav = /<nav [^>]*aria-label="Main Navigation"[^>]*>([\s\S]*?)<\/nav>/.exec(markup);
    assert.ok(nav, 'the main navigation');
    const hrefs = all(nav[1], /<a [^>]*href="([^"]*)"/g).map((m) => m[1]);
    assert.ok(hrefs.length >= 2, `links in the header (${hrefs.join(', ')})`);
    for (const href of hrefs) assert.match(href, /^\/[a-z0-9/#-]*$/, `${href}: a real path`);
    assert.match(markup, /<a [^>]*href="\/plan"/, 'Plan Your Trip');
    assert.match(markup, /<a [^>]*href="\/explore"/, 'Explore Sri Lanka');
    assert.match(markup, /<a class="skip-link" href="#main-content"/, 'the skip link first');
    assert.match(markup, /<main id="main-content" tabindex="-1" data-route-focus="true">/, 'the page inside <main>');

    // No script, nothing per visitor, nothing below the first screen.
    assert.doesNotMatch(markup, /<script/i, 'no script in the first screen');
    assert.doesNotMatch(markup, /<footer/i, 'no footer yet (PR 3)');
    assert.doesNotMatch(markup, /te-wish-count/, 'no saved wishlist items');
    // Inline styles: only a photo's focal point (the backlog's style-src item depends on it).
    for (const [, style] of all(markup, /\sstyle="([^"]*)"/g)) assert.match(style, /^object-position:[^;]+;?$/, `style="${style}"`);

    // What it cost: the page's own queries, the content, the render.
    assert.match(timing, /^db;dur=[\d.]+, content;dur=[\d.]+, render;dur=[\d.]+$/, timing);
  });

  test('home: the headline is the admin’s, escaped; bookings on add the ride line', async () => {
    await pool.query(`update public.site_settings set hero_headline = $1 where id`, ['Sri Lanka, <script>alert(1)</script> & more']);
    const { markup } = rootOf((await get(open, '/')).html);
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(markup)![1];
    assert.equal(textOf(h1), 'Sri Lanka, <script>alert(1)</script> & more');
    assert.doesNotMatch(markup, /<script/i, 'escaped, not markup');

    const booking = rootOf((await get(withBookings, '/')).html).markup;
    assert.match(booking, /data-hero-ride-line/, 'the ride line, as the browser draws it with bookings on');
    assert.match(booking, /data-hero-booking/, 'the Book a ride button');
  });

  test('every other page type is unchanged: an empty #root, rendered in the browser', async () => {
    const pages: [string, number][] = [
      ['/tours', 200], ['/tours/island-in-7-days', 200], ['/tours/category/cultural', 200], ['/destinations', 200],
      ['/destinations/galle', 200], ['/experiences', 200], ['/journal', 200], ['/about', 200], ['/explore', 200],
      ['/when-to-go', 200], ['/plan', 200], ['/photo-credits', 200], ['/wishlist', 200], ['/unsubscribe', 200],
      ['/admin', 200], ['/booking', 404], ['/no-such-page', 404], ['/tours/no-such-tour', 404]
    ];
    for (const [path, expected] of pages) {
      const { status, html, timing } = await get(open, path);
      assert.equal(status, expected, path);
      const { ssr, markup } = rootOf(html);
      assert.equal(ssr, false, `${path}: not marked data-ssr`);
      assert.equal(markup, '', `${path}: #root is empty`);
      assert.match(timing, /^db;dur=[\d.]+$/, `${path}: only the page's own queries (${timing})`);
    }
    // An old link is still a 301, before any rendering.
    const redirect = await fetch(`${open.baseUrl}/?tour=island-in-7-days`, { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/tours/island-in-7-days');
  });

  test('the renderer is never served', async () => {
    const res = await fetch(`${open.baseUrl}/.ssr/first-screen.js`);
    const body = await res.text();
    assert.equal(res.status, 404);
    assert.doesNotMatch(body, /renderFirstScreen/, 'the page shell, not the module');
  });

  test('a renderer that fails, or none, sends the empty shell', async () => {
    const template = readFileSync(join(REPO_ROOT, 'dist', 'index.html'), 'utf8');
    const failing: FirstScreen = {
      covers: async () => true,
      render: async () => {
        throw new Error('the renderer broke');
      }
    };
    for (const screen of [failing, firstScreen(join(REPO_ROOT, 'dist', '.ssr', 'missing.js'))]) {
      const app = express();
      app.use(pagesRouter({ template, site: { url: null, indexable: false }, firstScreen: screen }));
      const running = await listen(app);
      try {
        const { status, html } = await get(running, '/');
        assert.equal(status, 200, 'still the page');
        assert.deepEqual(rootOf(html), { ssr: false, markup: '' }, 'the empty shell, rendered in the browser');
      } finally {
        await running.close();
      }
    }
  });
});
