// Must be first: points the server at the test database (and clears
// PUBLIC_SITE_URL and SITE_INDEXABLE), or refuses to run.
import './test-db';

/**
 * The SEO quick wins (docs/reviews/seo-audit-2026-11.md, section 9, Q1 to Q5), in the HTML
 * Express sends:
 *
 *   - titles: what people search for, then the brand, at most 60 characters, on every page
 *     type; content pages from their own name; descriptions about 120 to 160 characters;
 *   - the TravelAgency JSON-LD from Admin → Settings: each contact detail and profile only when
 *     it's really set (never empty, never a placeholder), and never a rating, review, price or
 *     opening hours;
 *   - a BreadcrumbList on every indexed page below home, and an ItemList on the list pages;
 *   - every sitemap URL with a real `<lastmod>`, and no priority or changefreq;
 *   - `og:image:alt` and `twitter:image:alt`: the photo's own alt text.
 *
 * The footer's links (Q6), one h1 and the visible breadcrumbs are `browser-seo`'s.
 * Needs `npm run build` (the page shell); skipped with a message otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { BRAND } from '../../shared/brand';
import { businessDetails, realAddress, realEmail, realLink, realPhone } from '../../shared/business';
import { contentTitle, CRUMB_NAMES, fitTitle, fixedTitle, homeDescription, homeTitle, META_DESCRIPTIONS, TITLE_MAX } from '../../shared/page-meta';
import { photoAlt } from '../../shared/photo-assets';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { brandJsonLd, renderHead, SCHEMA_LOGO } from '../src/pages/head';
import { DESCRIPTION_MIN, fillDescription } from '../src/pages/pages';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, seedPhotoSet, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));

const SITE = 'https://travel.example';
const SUFFIX = ` | ${BRAND.name}`;

const unescape = (value: string) =>
  value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function headOf(html: string): string {
  const start = html.indexOf('<!--page-meta-->');
  const end = html.indexOf('<!--/page-meta-->');
  assert.ok(start >= 0 && end > start, 'the page-meta markers');
  return html.slice(start, end);
}
function metaContent(head: string, key: string): string | null {
  const m = head.match(new RegExp(`<meta (?:property|name)="${key.replace(/[:.]/g, '\\$&')}" content="([^"]*)">`));
  return m ? unescape(m[1]) : null;
}
const titleOf = (head: string) => unescape(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');

type Block = Record<string, unknown> & { '@type': string };
/** Every JSON-LD block, parsed: each must parse. */
const jsonLdOf = (head: string): Block[] =>
  [...head.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1]) as Block);

/** Every indexed page type, with the breadcrumbs its page shows and whether it's a list. */
const PAGE_TYPES: { path: string; crumbs: string[] | null; list?: boolean }[] = [
  { path: '/', crumbs: null },
  { path: '/destinations', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.destinations], list: true },
  { path: '/destinations/ella', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.destinations, 'Ella'] },
  { path: '/experiences', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.experiences], list: true },
  { path: '/experiences/safari-yala', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.experiences, 'Safari in Yala'] },
  { path: '/tours', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.tours], list: true },
  { path: '/tours/category/cultural', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.tours, 'Cultural Tours'], list: true },
  { path: '/tours/island-in-7-days', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.tours, 'Island in 7 Days'] },
  { path: '/journal', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.journal], list: true },
  { path: '/journal/ultimate-ella-guide', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.journal, 'The Ultimate Ella Travel Guide: Mountains, Trains & Tea'] },
  { path: '/when-to-go', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.whenToGo] },
  { path: '/explore', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.explore] },
  { path: '/about', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.about] },
  { path: '/plan', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.plan] },
  { path: '/photo-credits', crumbs: [CRUMB_NAMES.home, CRUMB_NAMES.photoCredits] }
];

/* ------------------------------------------------------------------ pure */

describe('titles, descriptions and placeholders (pure)', () => {
  test('titles: the search phrase or the content’s own name, the brand last, at most 60 characters', () => {
    assert.equal(homeTitle(BRAND), `Sri Lanka Tours, Planned Around You${SUFFIX}`);
    assert.equal(fixedTitle('tours', BRAND), `Sri Lanka Tours and Itineraries${SUFFIX}`);
    assert.equal(fixedTitle('whenToGo', BRAND), `Best Time to Visit Sri Lanka${SUFFIX}`);
    assert.equal(contentTitle('destination', 'Galle Fort', BRAND), `Galle Fort, Sri Lanka${SUFFIX}`);
    assert.equal(contentTitle('destination', 'Horton Plains National Park', BRAND), `Horton Plains National Park, Sri Lanka${SUFFIX}`);
    assert.equal(contentTitle('tour', 'Island in 7 Days', BRAND), `Island in 7 Days: Sri Lanka Itinerary${SUFFIX}`);
    assert.equal(contentTitle('tour', 'Wild Sri Lanka Expedition', BRAND), `Wild Sri Lanka Expedition${SUFFIX}`, 'never Sri Lanka twice');
    assert.equal(contentTitle('experience', 'Safari in Yala', BRAND), `Safari in Yala, Sri Lanka${SUFFIX}`);
    assert.equal(
      contentTitle('article', 'The Ultimate Ella Travel Guide: Mountains, Trains & Tea', BRAND),
      `The Ultimate Ella Travel Guide${SUFFIX}`,
      'too long: cut at its colon'
    );
    const long = contentTitle('article', 'A very long article title with no colon that runs on and on past the limit', BRAND);
    assert.ok(long.length <= TITLE_MAX && long.endsWith(`…${SUFFIX}`), long);
    assert.ok(fitTitle(['x'.repeat(100)], BRAND).endsWith(SUFFIX), 'the brand always ends it');
  });

  test('a short description gains the first sentence that fits; a long one is left alone', () => {
    const short = 'Where misty mountains, lush tea plantations, and scenic train journeys meet';
    const filled = fillDescription(short, ['x'.repeat(200), 'Plan a trip to Ella, Sri Lanka.']);
    assert.equal(filled, `${short}. Plan a trip to Ella, Sri Lanka.`);
    const long = 'y'.repeat(DESCRIPTION_MIN);
    assert.equal(fillDescription(long, ['More.']), long);
    assert.equal(fillDescription(short, ['z'.repeat(200)]), short, 'nothing fits: as it is');
  });

  test('the descriptions we wrote: 120 to 160 characters, and no claims ("best" only in "best time to visit")', () => {
    for (const [page, text] of [...Object.entries(META_DESCRIPTIONS), ['home', homeDescription(BRAND)]] as [string, string][]) {
      assert.ok(text.length >= 120 && text.length <= 160, `${page}: ${text.length}`);
      assert.doesNotMatch(text.replace(/best time to visit/i, ''), /\b(best|finest|leading|no\. ?1|number one|award|unbeatable|cheapest)\b/i, page);
      assert.doesNotMatch(text, /—/, `${page}: no em dash (plain-copy)`);
    }
  });

  test('placeholders count as not set', () => {
    for (const empty of [null, '', '  ', 'https://www.instagram.com/', 'https://www.instagram.com', 'http://facebook.com/page', 'https://example.com/x', 'not a url']) {
      assert.equal(realLink(empty), undefined, String(empty));
    }
    assert.equal(realLink('https://www.instagram.com/serendib'), 'https://www.instagram.com/serendib');
    assert.equal(realPhone('+94 00 000 0000'), undefined);
    assert.equal(realPhone('123'), undefined);
    assert.equal(realPhone('+94 41 222 3333'), '+94 41 222 3333');
    assert.equal(realAddress('Placeholder address: set it in Admin → Settings'), undefined);
    assert.equal(realAddress(' Matara  81300, Sri Lanka '), 'Matara 81300, Sri Lanka');
    assert.equal(realEmail('someone@example.com'), undefined);
    assert.equal(realEmail('placeholder@site.lk'), undefined);
    assert.equal(realEmail('hello@serendibluxetours.com'), 'hello@serendibluxetours.com');
  });

  test('TravelAgency: name, URL, logo and area always; each detail only when set; nothing invented', () => {
    const bare = brandJsonLd(BRAND, SITE, businessDetails({ postal_address: 'Placeholder address: set it in Admin → Settings', phone: '+94 00 000 0000', contact_email: '', instagram_url: 'https://www.instagram.com/' }));
    assert.equal(bare['@type'], 'TravelAgency');
    assert.equal(bare.name, BRAND.name);
    assert.equal(bare.url, `${SITE}/`);
    assert.equal(bare.logo, `${SITE}${SCHEMA_LOGO}`);
    assert.match(String(SCHEMA_LOGO), /^\/brand\/.+\.png$/);
    assert.deepEqual(bare.areaServed, { '@type': 'Country', name: 'Sri Lanka' });
    for (const key of ['address', 'telephone', 'email', 'sameAs']) assert.ok(!(key in bare), `no ${key}`);

    const full = brandJsonLd(
      BRAND,
      SITE,
      businessDetails({
        postal_address: 'Matara 81300, Sri Lanka',
        phone: '+94 41 222 3333',
        contact_email: 'hello@serendibluxetours.com',
        instagram_url: 'https://www.instagram.com/serendib',
        facebook_url: 'https://www.facebook.com/',
        tiktok_url: null,
        youtube_url: 'https://www.youtube.com/@serendib'
      })
    );
    assert.deepEqual(full.address, { '@type': 'PostalAddress', streetAddress: 'Matara 81300, Sri Lanka', addressCountry: 'LK' });
    assert.equal(full.telephone, '+94 41 222 3333');
    assert.equal(full.email, 'hello@serendibluxetours.com');
    assert.deepEqual(full.sameAs, ['https://www.instagram.com/serendib', 'https://www.youtube.com/@serendib'], 'the bare Facebook is left out');
    // An address that doesn't say its country: no country is added.
    const town = brandJsonLd(BRAND, SITE, businessDetails({ postal_address: 'Matara 81300' }));
    assert.deepEqual(town.address, { '@type': 'PostalAddress', streetAddress: 'Matara 81300' });
    assert.doesNotMatch(JSON.stringify(full), /rating|review|offer|price|openingHours/i);
  });
});

/* ------------------------------------------------------------ over HTTP */

describe('the quick wins over HTTP', { skip: built ? false : 'no build; run `npm run build` first' }, () => {
  let open: RunningApp;
  const get = (path: string) => fetch(`${open.baseUrl}${path}`, { redirect: 'manual' });
  const head = async (path: string) => {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    return headOf(await res.text());
  };

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    open = await listen(createApp({ media: null, site: { url: SITE, indexable: true } }));
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await open?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  test('every page type: a title of at most 60 characters ending with the brand (once), a description of 100 to 160', async () => {
    for (const { path } of PAGE_TYPES) {
      const h = await head(path);
      const title = titleOf(h);
      assert.ok(title.length <= TITLE_MAX, `${path}: ${title} (${title.length})`);
      assert.ok(title.endsWith(SUFFIX), `${path}: ${title}`);
      assert.equal(title.split(BRAND.name).length - 1, 1, `${path}: the brand once`);
      assert.equal(metaContent(h, 'og:title'), title, path);
      const description = metaContent(h, 'description')!;
      // Photo credits keeps its own short one (about 100).
      assert.ok(description.length >= 100 && description.length <= 160, `${path}: ${description} (${description.length})`);
    }
  });

  test('every page type: its JSON-LD parses, one TravelAgency, breadcrumbs below home, an ItemList on the lists', async () => {
    for (const { path, crumbs, list } of PAGE_TYPES) {
      const blocks = jsonLdOf(await head(path));
      for (const block of blocks) assert.equal(block['@context'], 'https://schema.org', path);
      assert.equal(blocks.filter((b) => b['@type'] === 'TravelAgency').length, 1, `${path}: one TravelAgency`);

      const trail = blocks.find((b) => b['@type'] === 'BreadcrumbList') as { itemListElement: { '@type': string; position: number; name: string; item: string }[] } | undefined;
      if (!crumbs) {
        assert.equal(trail, undefined, `${path}: none on home`);
      } else {
        assert.ok(trail, `${path}: a BreadcrumbList`);
        assert.deepEqual(trail.itemListElement.map((c) => c.name), crumbs, path);
        trail.itemListElement.forEach((crumb, i) => {
          assert.equal(crumb['@type'], 'ListItem', path);
          assert.equal(crumb.position, i + 1, path);
          assert.ok(crumb.item.startsWith(`${SITE}/`), `${path}: ${crumb.item}`);
        });
        assert.equal(trail.itemListElement[0].item, `${SITE}/`, `${path}: from home`);
        assert.equal(trail.itemListElement.at(-1)!.item, `${SITE}${path}`, `${path}: to itself`);
      }

      const items = blocks.find((b) => b['@type'] === 'ItemList') as { numberOfItems: number; itemListElement: { position: number; name: string; url: string }[] } | undefined;
      assert.equal(Boolean(items), Boolean(list), `${path}: an ItemList only on a list page`);
      if (items) {
        assert.ok(items.itemListElement.length > 0, path);
        assert.equal(items.numberOfItems, items.itemListElement.length, path);
        items.itemListElement.forEach((item, i) => {
          assert.equal(item.position, i + 1, path);
          assert.ok(item.name && item.url.startsWith(`${SITE}/`), `${path}: ${JSON.stringify(item)}`);
        });
      }
      assert.doesNotMatch(JSON.stringify(blocks), /rating|review|offers|price|openingHours/i, path);
    }
  });

  test('the list pages’ ItemLists: every published row, in the page’s order', async () => {
    for (const [path, table, prefix] of [
      ['/destinations', 'destinations', '/destinations/'],
      ['/experiences', 'featured_experiences', '/experiences/'],
      ['/journal', 'articles', '/journal/']
    ] as const) {
      await pool.query(`update public.${table} set published = false where id = (select id from public.${table} order by sort_order desc, id desc limit 1)`);
      const { rows } = await pool.query<{ id: string }>(`select id from public.${table} where published order by sort_order asc, id asc`);
      const items = jsonLdOf(await head(path)).find((b) => b['@type'] === 'ItemList') as unknown as { itemListElement: { url: string }[] };
      assert.deepEqual(items.itemListElement.map((i) => i.url), rows.map((r) => `${SITE}${prefix}${r.id}`), path);
    }
  });

  test('TravelAgency follows Admin → Settings: the seed’s placeholders left out, real values in', async () => {
    // The seed: a placeholder address and phone, no profiles.
    let agency = jsonLdOf(await head('/')).find((b) => b['@type'] === 'TravelAgency')!;
    for (const key of ['address', 'telephone', 'sameAs']) assert.ok(!(key in agency), `seed: no ${key}`);
    assert.equal(agency.logo, `${SITE}${SCHEMA_LOGO}`);

    await pool.query(`update public.site_settings set instagram_url = 'https://www.instagram.com/' where id`);
    agency = jsonLdOf(await head('/tours')).find((b) => b['@type'] === 'TravelAgency')!;
    assert.ok(!('sameAs' in agency), 'a bare instagram.com is not a profile');

    await pool.query(
      `update public.site_settings set postal_address = 'Matara 81300, Sri Lanka', phone = '+94 41 222 3333',
              instagram_url = 'https://www.instagram.com/serendib', youtube_url = 'https://www.youtube.com/@serendib' where id`
    );
    agency = jsonLdOf(await head('/about')).find((b) => b['@type'] === 'TravelAgency')!;
    assert.deepEqual(agency.address, { '@type': 'PostalAddress', streetAddress: 'Matara 81300, Sri Lanka', addressCountry: 'LK' });
    assert.equal(agency.telephone, '+94 41 222 3333');
    assert.deepEqual(agency.sameAs, ['https://www.instagram.com/serendib', 'https://www.youtube.com/@serendib']);
    for (const [key, value] of Object.entries(agency)) {
      assert.ok(value !== '' && value !== null && !(Array.isArray(value) && value.length === 0), `${key} is not empty`);
    }
  });

  test('og:image:alt and twitter:image:alt on every page with a share image: the photo’s own alt text', async () => {
    for (const { path } of PAGE_TYPES) {
      const h = await head(path);
      assert.ok(metaContent(h, 'og:image'), `${path}: a share image`);
      const alt = metaContent(h, 'og:image:alt');
      assert.ok(alt && alt.length > 3, `${path}: og:image:alt`);
      assert.equal(metaContent(h, 'twitter:image:alt'), alt, path);
      assert.notEqual(alt, titleOf(h), `${path}: not the title again`);
    }
    // Ella's cover in R2, as in production: the catalogue's alt for that photo says what's in it.
    const files = await seedPhotoSet('ella', 'https://r2.test');
    const expected = photoAlt(files[0].url, { ella: files.map(({ width, url }) => ({ width, url })) });
    assert.match(expected ?? '', /Ella, Sri Lanka$/, 'the catalogue describes the photo');
    const ella = await head('/destinations/ella');
    assert.equal(metaContent(ella, 'og:image:alt'), expected);
    assert.equal(metaContent(ella, 'twitter:image:alt'), expected);
    // The default share image (no photo of its own) is the brand's logo.
    assert.equal(
      renderHead({ title: 't', description: 'd', path: '/x', image: null, type: 'website' }, { origin: SITE, indexable: true, brand: BRAND })
        .match(/og:image:alt" content="([^"]*)"/)?.[1],
      `${BRAND.name} logo`
    );
  });

  test('the sitemap: every URL has a real <lastmod>, rows their own updated_at; no priority or changefreq', async () => {
    const { rows } = await pool.query<{ updated_at: Date }>(`select updated_at from public.destinations where id = 'ella'`);
    const ellaDate = rows[0].updated_at.toISOString().slice(0, 10);
    const xml = await (await get('/sitemap.xml')).text();
    const urls = [...xml.matchAll(/<url>(.*?)<\/url>/g)].map((m) => m[1]);
    assert.ok(urls.length > 20);
    const today = new Date().toISOString().slice(0, 10);
    for (const url of urls) {
      const lastmod = url.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1];
      assert.ok(lastmod && /^\d{4}-\d{2}-\d{2}$/.test(lastmod), url);
      assert.ok(!Number.isNaN(Date.parse(lastmod)) && lastmod <= today && lastmod >= '2026-01-01', `${url}: a real date`);
    }
    assert.ok(xml.includes(`<url><loc>${SITE}/destinations/ella</loc><lastmod>${ellaDate}</lastmod></url>`), 'a row’s own updated_at');
    // A fixed page: the date this server started (each deploy starts it).
    assert.match(xml, new RegExp(`<url><loc>${SITE}/about</loc><lastmod>${today}</lastmod></url>`));
    assert.doesNotMatch(xml, /<priority>|<changefreq>/);
  });
});
