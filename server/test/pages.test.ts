// Must be first: points the server at the test database (and clears
// PUBLIC_SITE_URL and SITE_INDEXABLE), or refuses to run.
import './test-db';

/**
 * Phase 8b: the HTML Express sends for each public path.
 *
 *   - statuses: 200 for pages, 404 for unknown paths and unknown or
 *     unpublished slugs, 301 for old links and trailing slashes;
 *   - each page's <head>: title, description, canonical, og:* and twitter:*,
 *     escaped for their context, with absolute URLs from PUBLIC_SITE_URL and
 *     an absolute https share image;
 *   - nothing cached: an edit shows in the next response;
 *   - SITE_INDEXABLE: robots.txt, noindex, the sitemap and llms.txt, both ways.
 *
 * Needs `npm run build` (the page shell); skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { HOME_DESCRIPTION, HOME_TITLE, PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../shared/page-meta';
import { createApp } from '../src/app';
import type { SiteConfig } from '../src/env';
import { pool } from '../src/db';
import { injectHead, renderHead, shareImage, summarise, type PageMeta } from '../src/pages/head';
import { BRAND_NAME } from '../../shared/brand';
import { markdownText, robotsTxt } from '../src/pages/pages';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, seedPhotoSet, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));

const SITE = 'https://travel.example';

/* ------------------------------------------------------------- reading HTML */

const unescape = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The `<head>` Express injected, between the markers. */
function headOf(html: string): string {
  const start = html.indexOf('<!--page-meta-->');
  const end = html.indexOf('<!--/page-meta-->');
  assert.ok(start >= 0 && end > start, 'the page-meta markers');
  return html.slice(start, end);
}

/** A `<meta property|name="key" content="…">` value, unescaped, or null. */
function metaContent(head: string, key: string): string | null {
  const re = new RegExp(`<meta (?:property|name)="${key.replace(/[:.]/g, '\\$&')}" content="([^"]*)">`);
  const m = head.match(re);
  return m ? unescape(m[1]) : null;
}

const titleOf = (head: string) => {
  const m = head.match(/<title>([^<]*)<\/title>/);
  return m ? unescape(m[1]) : null;
};
const canonicalOf = (head: string) => {
  const m = head.match(/<link rel="canonical" href="([^"]*)">/);
  return m ? unescape(m[1]) : null;
};

/* ------------------------------------------------------- pure: head builder */

describe('the head builder', () => {
  const meta: PageMeta = {
    title: `Ella "Rock" <b>&</b> 'the' Peak | Travel Eye`,
    description: 'Tea, trains & "views" <everywhere>.',
    path: '/destinations/ella',
    image: 'https://images.unsplash.com/photo-1?auto=format&fit=crop&q=80&w=800',
    imageAlt: `Ella "Rock" <b>&</b>`,
    type: 'website'
  };

  test('every value is escaped for its context: quotes, < and & in text and attributes', () => {
    const head = renderHead(meta, { origin: SITE, indexable: true });
    // Nothing raw: no tag, no stray quote that could close an attribute.
    assert.doesNotMatch(head, /<b>|<\/b>|<everywhere>/);
    assert.equal((head.match(/content="[^"]*"/g) ?? []).length, (head.match(/content="/g) ?? []).length, 'every attribute closes where it should');
    // Text context (<title>) and attribute context (og:title) both come back exact.
    assert.match(head, /<title>Ella &quot;Rock&quot; &lt;b&gt;&amp;&lt;\/b&gt; &#39;the&#39; Peak \| Travel Eye<\/title>/);
    assert.equal(titleOf(head), meta.title);
    assert.equal(metaContent(head, 'og:title'), meta.title);
    assert.equal(metaContent(head, 'twitter:title'), meta.title);
    assert.equal(metaContent(head, 'description'), meta.description);
    assert.equal(metaContent(head, 'og:image:alt'), meta.imageAlt);
  });

  test('descriptions are one line of at most 160 characters, cut at a word', () => {
    assert.equal(summarise('  Short\n and   sweet. '), 'Short and sweet.');
    const long = 'word '.repeat(60).trim();
    const cut = summarise(long);
    assert.ok(cut.length <= 160, `${cut.length} characters`);
    assert.match(cut, /word…$/);
  });

  test('og:image is always an absolute https URL, sized for previews where the host allows', () => {
    const unsplash = shareImage('https://images.unsplash.com/photo-1?auto=format&fit=crop&q=80&w=800', SITE)!;
    const params = new URL(unsplash.url).searchParams;
    assert.deepEqual(
      [params.get('w'), params.get('h'), params.get('fit'), params.get('fm'), params.get('auto')],
      ['1200', '630', 'crop', 'jpg', null]
    );
    assert.deepEqual([unsplash.width, unsplash.height], [1200, 630]);

    assert.deepEqual(shareImage('https://media.example/destinations/1-aa.jpg', SITE), {
      url: 'https://media.example/destinations/1-aa.jpg'
    });
    assert.deepEqual(shareImage('/images/ella.jpg', SITE), { url: 'https://travel.example/images/ella.jpg' });
    assert.equal(shareImage('http://insecure.example/x.jpg', SITE), null, 'never http');
    assert.equal(shareImage('', SITE), null);
    assert.equal(shareImage(null, SITE), null);
  });

  test('without an image: no og:image, and a summary card', () => {
    const head = renderHead({ ...meta, image: 'http://insecure.example/x.jpg' }, { origin: SITE, indexable: true });
    assert.equal(metaContent(head, 'og:image'), null);
    assert.equal(metaContent(head, 'twitter:card'), 'summary');
  });

  test('a shell without the markers still gets the tags, in its <head>', () => {
    const html = injectHead('<html><head><title>x</title></head><body></body></html>', '<meta name="a" content="b">');
    assert.match(html, /<meta name="a" content="b">\s*<\/head>/);
  });

  test('robots.txt: closed to search engines but open to link previews; open when indexable', () => {
    const closed = robotsTxt(SITE, false);
    assert.match(closed, /User-agent: \*\nDisallow: \/\n/);
    assert.match(closed, /User-agent: facebookexternalhit\n/);
    assert.doesNotMatch(closed, /Sitemap:/);

    assert.equal(robotsTxt(SITE, true), `User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  });
});

/* ------------------------------------------------------------ over HTTP */

describe('pages over HTTP', { skip: built ? false : 'no build; run `npm run build` first' }, () => {
  let closed: RunningApp; // SITE_INDEXABLE false (the default)
  let open: RunningApp; // SITE_INDEXABLE true
  let booking: RunningApp; // SITE_INDEXABLE true, BOOKINGS_ENABLED true
  let local: RunningApp; // no PUBLIC_SITE_URL

  const site = (indexable: boolean): SiteConfig => ({ url: SITE, indexable });

  const get = (app: RunningApp, path: string, init: RequestInit = {}) =>
    fetch(`${app.baseUrl}${path}`, { redirect: 'manual', ...init });

  async function head(app: RunningApp, path: string): Promise<{ status: number; head: string; res: Response }> {
    const res = await get(app, path);
    return { status: res.status, head: headOf(await res.text()), res };
  }

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    closed = await listen(createApp({ media: null, site: site(false) }));
    open = await listen(createApp({ media: null, site: site(true) }));
    local = await listen(createApp({ media: null, site: { url: null, indexable: false } }));
    booking = await listen(createApp({ media: null, site: site(true), bookings: true }));
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await Promise.all([closed?.close(), open?.close(), local?.close(), booking?.close()]);
    await pool.end();
  }, HOOK_TIMEOUT);

  test('pages are 200; unknown paths, bad, unknown and unpublished slugs are 404', async () => {
    for (const path of [
      '/', '/destinations', '/destinations?category=Beaches', '/destinations/ella', '/experiences',
      '/experiences/safari-yala', '/tours', '/tours/island-in-7-days', '/journal/ultimate-ella-guide', '/about',
      '/explore', '/explore?mapTour=wild-sri-lanka', '/plan', '/journal',
      '/photo-credits', '/unsubscribe', '/unsubscribe?token=00000000-0000-4000-8000-000000000000'
    ]) {
      const res = await get(closed, path);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get('content-type') ?? '', /text\/html/, path);
      assert.equal(res.headers.get('cache-control'), 'no-cache', path);
    }

    for (const path of ['/nope', '/destinations/nowhere', '/tours/Not-A-Slug!', '/nope/', '/experiences/a/b', '/index']) {
      const res = await get(closed, path);
      // `/nope/` is a trailing slash first: 301 to /nope, which is a 404.
      const final = res.status === 301 ? await get(closed, res.headers.get('location')!) : res;
      assert.equal(final.status, 404, path);
      assert.match(final.headers.get('content-type') ?? '', /text\/html/, `${path}: the shell, with its 404 page`);
    }

    await pool.query(`update public.tours set published = false where id = 'wild-sri-lanka'`);
    assert.equal((await get(closed, '/tours/wild-sri-lanka')).status, 404, 'unpublished is not found');

    const api = await get(closed, '/api/nope');
    assert.equal(api.status, 404);
    assert.match(api.headers.get('content-type') ?? '', /application\/json/, 'the API still answers JSON');
  });

  test('301s: old ?tour= and ?destination= links, and trailing slashes; never off-site', async () => {
    const cases: [string, string][] = [
      ['/?tour=island-in-7-days', '/tours/island-in-7-days'],
      ['/?destination=ella', '/destinations/ella'],
      ['/?tour=nowhere', '/tours/nowhere'],
      ['/tours/', '/tours'],
      ['/destinations/ella/', '/destinations/ella'],
      ['/destinations/?category=Beaches', '/destinations?category=Beaches'],
      ['//evil.example/', '/evil.example']
    ];
    for (const [from, to] of cases) {
      const res = await get(closed, from);
      assert.equal(res.status, 301, from);
      assert.equal(res.headers.get('location'), to, from);
    }
  });

  test('HEAD answers like GET, without a body', async () => {
    for (const [path, status] of [['/destinations/ella', 200], ['/nope', 404]] as const) {
      const res = await get(closed, path, { method: 'HEAD' });
      assert.equal(res.status, status, path);
      assert.equal((await res.text()).length, 0, path);
    }
  });

  test('a destination, tour, experience and article each get their own head', async () => {
    const pages = [
      ['/destinations/ella', 'destinations', 'name', 'short_description', 'ella'],
      ['/tours/island-in-7-days', 'tours', 'title', 'short_desc', 'island-in-7-days'],
      ['/experiences/safari-yala', 'featured_experiences', 'title', 'description', 'safari-yala'],
      ['/journal/ultimate-ella-guide', 'articles', 'title', 'snippet', 'ultimate-ella-guide']
    ] as const;
    for (const [path, table, titleColumn, descriptionColumn, id] of pages) {
      const row = (await pool.query(`select ${titleColumn} as title, ${descriptionColumn} as description, image from public.${table} where id = $1`, [id])).rows[0];
      const { status, head: h } = await head(open, path);
      assert.equal(status, 200, path);
      assert.equal(titleOf(h), `${row.title} | Travel Eye`, path);
      assert.equal(metaContent(h, 'og:title'), `${row.title} | Travel Eye`, path);
      assert.equal(metaContent(h, 'description'), summarise(row.description), path);
      assert.equal(metaContent(h, 'og:description'), summarise(row.description), path);
      assert.equal(canonicalOf(h), `${SITE}${path}`, path);
      assert.equal(metaContent(h, 'og:url'), `${SITE}${path}`, path);
      assert.equal(metaContent(h, 'og:type'), table === 'articles' ? 'article' : 'website', path);
      assert.equal(metaContent(h, 'og:site_name'), 'Travel Eye', path);
      const payload = await (await fetch(`${open.baseUrl}/api/content`)).json();
      const collection = { destinations: 'destinations', tours: 'tours', featured_experiences: 'featuredExperiences', articles: 'articles' }[table];
      const publicRow = payload[collection].find((item: { id: string }) => item.id === id);
      assert.equal(metaContent(h, 'og:image'), shareImage(publicRow.image, SITE)!.url, `${path}: share image matches the public photo`);
      assert.match(metaContent(h, 'og:image') ?? '', /^https:\/\//, path);
      assert.equal(metaContent(h, 'twitter:card'), 'summary_large_image', path);
      assert.equal(metaContent(h, 'twitter:image'), metaContent(h, 'og:image'), path);
      assert.equal(metaContent(h, 'robots'), null, `${path}: indexable`);
    }
  });

  test('the fixed pages, a filtered list, the 404 and the admin', async () => {
    let { head: h } = await head(open, '/');
    assert.equal(titleOf(h), HOME_TITLE);
    assert.equal(metaContent(h, 'description'), HOME_DESCRIPTION);
    assert.equal(canonicalOf(h), `${SITE}/`);

    ({ head: h } = await head(open, '/about'));
    assert.equal(titleOf(h), PAGE_TITLES.about);
    assert.equal(metaContent(h, 'description'), PAGE_DESCRIPTIONS.about);

    // A filtered list's canonical is the list itself.
    ({ head: h } = await head(open, '/destinations?category=Beaches'));
    assert.equal(titleOf(h), PAGE_TITLES.destinations);
    assert.equal(canonicalOf(h), `${SITE}/destinations`);
    assert.equal(metaContent(h, 'og:url'), `${SITE}/destinations`);

    // The 404: never indexed, and no canonical to point at.
    ({ head: h } = await head(open, '/nope'));
    assert.equal(titleOf(h), PAGE_TITLES.notFound);
    assert.equal(metaContent(h, 'robots'), 'noindex');
    assert.equal(canonicalOf(h), null);
    assert.equal(metaContent(h, 'og:url'), null);

    // Redesign PR 3's pages: their own titles (the brand once), descriptions and canonicals.
    for (const page of ['explore', 'plan', 'journal'] as const) {
      ({ head: h } = await head(open, `/${page}`));
      assert.equal(titleOf(h), PAGE_TITLES[page], page);
      assert.equal(metaContent(h, 'description'), PAGE_DESCRIPTIONS[page], page);
      assert.equal(canonicalOf(h), `${SITE}/${page}`, page);
      assert.equal((titleOf(h)!.match(/Travel Eye/g) ?? []).length, 1, `${page}: the brand once`);
    }
    // A route on the map is the same page: the canonical has no query.
    ({ head: h } = await head(open, '/explore?mapTour=wild-sri-lanka'));
    assert.equal(canonicalOf(h), `${SITE}/explore`);
    // `/journal/` is now a trailing slash on a real page.
    const slash = await get(closed, '/journal/');
    assert.equal(slash.status, 301);
    assert.equal(slash.headers.get('location'), '/journal');

    ({ head: h } = await head(open, '/photo-credits'));
    assert.equal(titleOf(h), PAGE_TITLES.photoCredits);
    assert.equal(metaContent(h, 'description'), PAGE_DESCRIPTIONS.photoCredits);
    assert.equal(canonicalOf(h), `${SITE}/photo-credits`);

    // Reached only from newsletter emails: never indexed, whatever SITE_INDEXABLE says.
    const unsubscribe = await head(open, '/unsubscribe?token=00000000-0000-4000-8000-000000000000');
    assert.equal(unsubscribe.status, 200);
    assert.equal(titleOf(unsubscribe.head), PAGE_TITLES.unsubscribe);
    assert.equal(metaContent(unsubscribe.head, 'robots'), 'noindex');
    assert.equal(unsubscribe.res.headers.get('x-robots-tag'), 'noindex');
    assert.equal(canonicalOf(unsubscribe.head), null);

    // /booking: a 404 while bookings are off (the default); on, a page that's never indexed.
    for (const app of [closed, open]) assert.equal((await get(app, '/booking')).status, 404, '/booking, bookings off');
    assert.equal((await get(open, '/booking?tour=island-in-7-days')).status, 404);
    const booking1 = await head(booking, '/booking?tour=island-in-7-days');
    assert.equal(booking1.status, 200);
    assert.equal(titleOf(booking1.head), PAGE_TITLES.booking);
    assert.equal(metaContent(booking1.head, 'robots'), 'noindex');
    assert.equal(booking1.res.headers.get('x-robots-tag'), 'noindex');
    assert.equal(canonicalOf(booking1.head), null);
    const sitemap = await (await get(booking, '/sitemap.xml')).text();
    assert.ok(!sitemap.includes('/booking'), 'not in the sitemap');

    const admin = await head(open, '/admin/login');
    assert.equal(admin.status, 200);
    assert.equal(metaContent(admin.head, 'robots'), 'noindex');
    assert.equal(admin.res.headers.get('x-robots-tag'), 'noindex');
  });

  test('absolute URLs come from PUBLIC_SITE_URL, whatever the Host header says', async () => {
    const res = await get(open, '/tours/island-in-7-days', { headers: { 'X-Forwarded-Host': 'evil.example', 'X-Forwarded-Proto': 'http' } });
    const h = headOf(await res.text());
    assert.equal(canonicalOf(h), `${SITE}/tours/island-in-7-days`);
    assert.equal(metaContent(h, 'og:url'), `${SITE}/tours/island-in-7-days`);

    // Not set (local runs): the request's own origin.
    const { head: l } = await head(local, '/tours/island-in-7-days');
    assert.equal(canonicalOf(l), `${local.baseUrl}/tours/island-in-7-days`);
  });

  test('a title with quotes, < and & is escaped end to end', async () => {
    const name = `Ella "Rock" <b>&</b> 'Peak'`;
    await pool.query(`update public.destinations set name = $1 where id = 'ella'`, [name]);
    const res = await get(open, '/destinations/ella');
    const html = await res.text();
    const h = headOf(html);
    assert.doesNotMatch(h, /<b>|<\/b>/, 'no raw tag in the head');
    assert.match(h, /<title>Ella &quot;Rock&quot; &lt;b&gt;&amp;&lt;\/b&gt; &#39;Peak&#39; \| Travel Eye<\/title>/);
    assert.equal(titleOf(h), `${name} | Travel Eye`);
    assert.equal(metaContent(h, 'og:title'), `${name} | Travel Eye`);
    assert.equal(metaContent(h, 'og:image:alt'), name);
  });

  test("a relative or http image: absolute https, or none", async () => {
    // Tours retain editable images; named destination covers are pinned separately.
    await pool.query(`update public.tours set image = '/images/tour.jpg' where id = 'island-in-7-days'`);
    let { head: h } = await head(open, '/tours/island-in-7-days');
    assert.equal(metaContent(h, 'og:image'), `${SITE}/images/tour.jpg`);

    await pool.query(`update public.tours set image = 'http://insecure.example/tour.jpg' where id = 'island-in-7-days'`);
    ({ head: h } = await head(open, '/tours/island-in-7-days'));
    assert.equal(metaContent(h, 'og:image'), null);
    assert.equal(metaContent(h, 'twitter:card'), 'summary');
  });

  test('destination share previews use the same verified cover as public content despite saved URLs', async () => {
    await seedPhotoSet('ella', 'https://r2.test');
    try {
      for (const image of ['/images/unrelated.jpg', 'http://insecure.example/unrelated.jpg', 'https://media.example/beach.jpg']) {
        await pool.query(`update public.destinations set image = $1 where id = 'ella'`, [image]);
        const payload = await (await get(open, '/api/content')).json();
        const cover = payload.destinations.find((row: { id: string }) => row.id === 'ella').image;
        assert.match(cover, /^https:\/\/r2\.test\/assets\/1280-/);
        const { head: h } = await head(open, '/destinations/ella');
        assert.equal(metaContent(h, 'og:image'), cover);
        assert.equal(metaContent(h, 'twitter:image'), cover);
        assert.equal(metaContent(h, 'twitter:card'), 'summary_large_image');
      }
    } finally {
      await pool.query('delete from public.media where photo_key is not null');
    }
  });

  test('a pinned destination not in R2 previews the photo its row stores', async () => {
    await pool.query(`update public.destinations set image = 'https://media.example/beach.jpg' where id = 'ella'`);
    const { head: h } = await head(open, '/destinations/ella');
    assert.equal(metaContent(h, 'og:image'), 'https://media.example/beach.jpg');
    assert.equal(metaContent(h, 'twitter:card'), 'summary_large_image');
  });

  test('an admin edit shows in the very next response', async () => {
    assert.equal(titleOf((await head(open, '/tours/island-in-7-days')).head), 'Island in 7 Days | Travel Eye');
    await pool.query(`update public.tours set title = 'Island in Seven Days' where id = 'island-in-7-days'`);
    assert.equal(titleOf((await head(open, '/tours/island-in-7-days')).head), 'Island in Seven Days | Travel Eye');
  });

  test('SITE_INDEXABLE off (the default): robots.txt closed, every page noindex, no sitemap', async () => {
    const robots = await get(closed, '/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get('content-type') ?? '', /text\/plain/);
    assert.equal(await robots.text(), robotsTxt(SITE, false));

    for (const path of ['/', '/destinations', '/destinations/ella', '/tours/island-in-7-days', '/about']) {
      assert.equal(metaContent((await head(closed, path)).head, 'robots'), 'noindex', path);
    }
    assert.equal((await get(closed, '/sitemap.xml')).status, 404);
  });

  test('SITE_INDEXABLE on: the normal robots.txt, and a sitemap of every published page', async () => {
    assert.equal(await (await get(open, '/robots.txt')).text(), robotsTxt(SITE, true));
    assert.equal(metaContent((await head(open, '/')).head, 'robots'), null);

    await pool.query(`update public.destinations set published = false where id = 'galle'`);
    const res = await get(open, '/sitemap.xml');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/xml/);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    const xml = await res.text();
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    assert.match(xml, /<\/urlset>\n$/);

    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    for (const loc of locs) assert.ok(loc.startsWith(`${SITE}/`), loc);
    for (const path of ['/', '/destinations', '/experiences', '/tours', '/about', '/photo-credits', '/explore', '/plan', '/journal']) {
      assert.ok(locs.includes(`${SITE}${path}`), path);
    }
    assert.ok(!locs.some((l) => l.includes('/unsubscribe')), 'never the unsubscribe page');

    const count = async (table: string) =>
      (await pool.query(`select count(*)::int as n from public.${table} where published`)).rows[0].n as number;
    const rows = (await count('destinations')) + (await count('featured_experiences')) + (await count('tours')) + (await count('articles'));
    assert.equal(locs.length, 9 + rows, 'the fixed pages plus every published row');
    assert.ok(!locs.includes(`${SITE}/destinations/galle`), 'not the unpublished one');
    assert.ok(!locs.some((l) => l.includes('?')), 'no filtered lists');
    assert.match(xml, new RegExp(`<url><loc>${SITE}/destinations/ella</loc><lastmod>\\d{4}-\\d{2}-\\d{2}</lastmod></url>`));
  });

  test('llms.txt: a 404 until the site is indexable', async () => {
    const res = await get(closed, '/llms.txt');
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
  });

  test('llms.txt: the brand, the fixed pages and every published row, as absolute links', async () => {
    await pool.query(`update public.destinations set published = false where id = 'galle'`);
    await pool.query(`update public.tours set title = 'Island [in] 7 *Days*' where id = 'island-in-7-days'`);
    const res = await get(open, '/llms.txt');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/markdown/);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    const text = await res.text();

    assert.ok(text.startsWith(`# ${BRAND_NAME}\n\n> `), 'the brand from shared/brand.ts, then the summary');
    for (const heading of ['## Pages', '## Destinations', '## Experiences', '## Tours', '## Journal']) {
      assert.ok(text.includes(`\n${heading}\n`), heading);
    }

    const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
    for (const link of links) assert.ok(link.startsWith(`${SITE}/`), link);
    for (const path of ['/', '/explore', '/destinations', '/experiences', '/tours', '/plan', '/journal', '/about', '/photo-credits']) {
      assert.ok(links.includes(`${SITE}${path}`), path);
    }
    const count = async (table: string) =>
      (await pool.query(`select count(*)::int as n from public.${table} where published`)).rows[0].n as number;
    const rows = (await count('destinations')) + (await count('featured_experiences')) + (await count('tours')) + (await count('articles'));
    assert.equal(links.length, 9 + rows, 'the fixed pages plus every published row');
    assert.ok(links.includes(`${SITE}/destinations/ella`));
    assert.ok(!links.includes(`${SITE}/destinations/galle`), 'not the unpublished one');
    assert.ok(!links.some((l) => /\/admin|\/api\/|\/unsubscribe/.test(l)), 'never the admin, the API or the unsubscribe page');

    // A row's text can't break out of its list item.
    assert.ok(text.includes(`- [Island \\[in\\] 7 \\*Days\\*](${SITE}/tours/island-in-7-days)`), 'escaped');
  });

  test('markdownText: one line, Markdown syntax escaped', () => {
    assert.equal(markdownText('  Ella &\n Kandy  '), 'Ella & Kandy');
    assert.equal(markdownText('[a](b) *c* _d_ `e` <f> #g !h |i| \\j'), '\\[a\\]\\(b\\) \\*c\\* \\_d\\_ \\`e\\` \\<f\\> \\#g \\!h \\|i\\| \\\\j');
  });
});
