/**
 * The brand, end to end: `shared/brand.ts`'s values, and an admin's override
 * (Admin → Settings, 0024), in every place the server writes it: titles, the
 * Open Graph and Twitter tags, JSON-LD, the web manifest, llms.txt and the
 * enquiry email (the booking email: bookings.test). Then 0025 (seed text replaced only where it still matches),
 * and `npm run brand:audit`'s query.
 *
 * The earlier brand is built from pieces here, so this file doesn't name it
 * (brand-strings).
 */
import './test-db';

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';

import { BRAND, emailSender, heroHeadlineParts, resolveBrand, wordmarkLines } from '../../shared/brand';
import { siteSettingsSchema } from '../../shared/content-schema';
import { homeTitle, pageTitle, PAGE_NAMES } from '../../shared/page-meta';
import { createApp } from '../src/app';
import { findOldBrand } from '../src/brand-audit';
import { loadBrand } from '../src/brand';
import { pool } from '../src/db';
import { composeEmail, createNotifier, type NotificationEmail } from '../src/inquiries/notify';
import { assertConnectedToTestDatabase, createUser, listen, login, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, sessionTokenFrom, withSession, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const built = existsSync(join(REPO_ROOT, 'dist', 'index.html'));
const SITE = 'https://brand.example';

const OLD = ['Travel', 'Eye'].join(' ');
const OVERRIDE = {
  brand_name: 'Lagoon & Hills Journeys',
  brand_short_name: 'Lagoon & Hills',
  brand_tagline: 'Slow trips, <fast> answers.',
  brand_legal_name: 'Lagoon & Hills (Pvt) Ltd'
};

const unescape = (value: string) =>
  value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function headOf(html: string): string {
  const start = html.indexOf('<!--page-meta-->');
  const end = html.indexOf('<!--/page-meta-->');
  assert.ok(start >= 0 && end > start, 'the page-meta markers');
  return html.slice(start, end);
}
const meta = (head: string, key: string): string | null => {
  const m = head.match(new RegExp(`<meta (?:property|name)="${key.replace(/[:.]/g, '\\$&')}" content="([^"]*)">`));
  return m ? unescape(m[1]) : null;
};
const titleOf = (head: string) => unescape(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
function jsonLdOf(head: string): Record<string, unknown> {
  const blocks = [...head.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)];
  assert.equal(blocks.length, 1, 'one JSON-LD block');
  return JSON.parse(blocks[0][1]);
}

/* ------------------------------------------------------------------- pure */

describe('shared/brand.ts', () => {
  test('the brand: Serendib Luxe Tours', () => {
    assert.equal(BRAND.name, 'Serendib Luxe Tours');
    assert.equal(BRAND.shortName, 'Serendib Luxe');
    assert.equal(BRAND.tagline, 'Sri Lanka, planned around you.');
    assert.equal(BRAND.legalName, 'Serendib Luxe Tours');
    assert.equal(BRAND.emailDomain, 'serendibluxetours.com');
    assert.equal(homeTitle(BRAND), 'Serendib Luxe Tours | Sri Lanka, planned around you.');
  });

  test('the wordmark: the short name large, the rest small; any name works', () => {
    assert.deepEqual(wordmarkLines(BRAND), { main: 'Serendib Luxe', sub: 'Tours' });
    assert.deepEqual(wordmarkLines(resolveBrand(OVERRIDE)), { main: 'Lagoon & Hills', sub: 'Journeys' });
    assert.deepEqual(wordmarkLines({ name: 'Island Ways', shortName: 'Serendib Luxe' }), { main: 'Island Ways', sub: '' });
  });

  test('the hero headline: the emphasis after the first comma', () => {
    assert.deepEqual(heroHeadlineParts(BRAND.tagline), { lead: 'Sri Lanka,', emphasis: 'planned around you.' });
    assert.deepEqual(heroHeadlineParts('Go slowly'), { lead: '', emphasis: 'Go slowly' });
  });

  test('blank settings fall back to the defaults; the admin form saves blanks as NULL', () => {
    assert.deepEqual(resolveBrand({ brand_name: '  ', brand_tagline: null }), BRAND);
    const parsed = siteSettingsSchema.safeParse({
      postal_address: 'x', phone: 'x', contact_email: 'a@b.example', text_size: 100, stats: [],
      instagram_url: null, facebook_url: null, tiktok_url: null, youtube_url: null, privacy_url: null,
      terms_url: null, sustainability_url: null, whatsapp_number: null, when_to_go_explainer: null,
      brand_name: '  ', brand_short_name: '', brand_tagline: 'A line', brand_legal_name: null, hero_headline: ''
    });
    assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
    assert.equal(parsed.data.brand_name, null);
    assert.equal(parsed.data.brand_tagline, 'A line');
    assert.equal(parsed.data.hero_headline, null);
    const tooLong = siteSettingsSchema.safeParse({ ...parsed.data, brand_name: 'x'.repeat(61) });
    assert.ok(!tooLong.success, 'the name is at most 60 characters, as in the database');
  });

  test("emails: the brand's name in front of the configured address", () => {
    const email = composeEmail(1, null);
    assert.equal(email.subject, `New enquiry on ${BRAND.name}`);
    assert.equal(emailSender('onboarding@resend.dev', BRAND), 'Serendib Luxe Tours <onboarding@resend.dev>');
  });
});

/* -------------------------------------------------------- the database */

describe('the brand from the database', () => {
  let app: RunningApp;
  let token: string;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    app = await listen(createApp({ media: null, site: { url: SITE, indexable: true } }));
    await resetAuthTables();
    await createUser();
    token = sessionTokenFrom(await login(app, 'admin@example.test', PASSWORD))!;
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await resetContent();
  }, HOOK_TIMEOUT);

  after(async () => {
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  /** Saves the override through the admin's own endpoint: validation and all. */
  async function saveOverride(changes: Record<string, unknown> = OVERRIDE): Promise<void> {
    const headers = { ...withSession(token), Origin: app.baseUrl, 'Content-Type': 'application/json' };
    const row = await (await fetch(`${app.baseUrl}/api/admin/site-settings`, { headers })).json();
    const { id: _id, created_at: _c, updated_at, ...values } = row;
    const res = await fetch(`${app.baseUrl}/api/admin/site-settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ values: { ...values, ...changes }, expectedUpdatedAt: updated_at })
    });
    assert.equal(res.status, 200, await res.clone().text());
  }

  const page = async (path: string) => headOf(await (await fetch(`${app.baseUrl}${path}`)).text());

  test('loadBrand: the defaults, then the admin’s values', async () => {
    assert.deepEqual(await loadBrand(), BRAND);
    await saveOverride();
    const brand = await loadBrand();
    assert.equal(brand.name, OVERRIDE.brand_name);
    assert.equal(brand.legalName, OVERRIDE.brand_legal_name);
    assert.equal(brand.favicon, BRAND.favicon, 'files stay in shared/brand.ts');
  });

  test('the content API carries the brand and the hero headline', async () => {
    await saveOverride({ ...OVERRIDE, hero_headline: 'Tea, then the coast' });
    const { siteSettings } = await (await fetch(`${app.baseUrl}/api/content`)).json();
    assert.equal(siteSettings.brand_name, OVERRIDE.brand_name);
    assert.equal(siteSettings.hero_headline, 'Tea, then the coast');
  });

  for (const which of ['default', 'override'] as const) {
    test(`titles, share tags and JSON-LD: the ${which} brand`, { skip: built ? false : 'no build' }, async () => {
      if (which === 'override') await saveOverride();
      const brand = which === 'override' ? resolveBrand(OVERRIDE) : BRAND;

      const home = await page('/');
      assert.equal(titleOf(home), homeTitle(brand));
      assert.equal(meta(home, 'og:title'), homeTitle(brand));
      assert.equal(meta(home, 'twitter:title'), homeTitle(brand));
      assert.equal(meta(home, 'og:site_name'), brand.name);
      assert.equal(meta(home, 'application-name'), brand.name, 'for the admin and the splash');
      assert.ok(meta(home, 'description')!.includes(brand.name));

      for (const [path, title] of [
        ['/destinations/ella', pageTitle('Ella', brand)],
        ['/about', pageTitle(PAGE_NAMES.about, brand)],
        ['/admin', pageTitle(PAGE_NAMES.admin, brand)],
        ['/nope', pageTitle(PAGE_NAMES.notFound, brand)]
      ]) {
        const head = await page(path);
        assert.equal(titleOf(head), title, path);
        assert.equal(meta(head, 'og:site_name'), brand.name, path);
        const ld = jsonLdOf(head);
        assert.equal(ld['@context'], 'https://schema.org');
        assert.equal(ld['@type'], 'TravelAgency');
        assert.equal(ld.name, brand.name, path);
        assert.equal(ld.legalName, brand.legalName, path);
        assert.equal(ld.slogan, brand.tagline, path);
        assert.equal(ld.url, `${SITE}/`, path);
      }
      // The tagline's "<fast>" can't close the script element.
      if (which === 'override') assert.ok(!home.includes('<fast>') && home.includes('\\u003cfast\\u003e'));
    });
  }

  test('the web manifest: names, tagline and icon from the brand; the override too', async () => {
    let res = await fetch(`${app.baseUrl}/site.webmanifest`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/manifest\+json/);
    let manifest = await res.json();
    assert.equal(manifest.name, 'Serendib Luxe Tours');
    assert.equal(manifest.short_name, 'Serendib Luxe');
    assert.equal(manifest.description, BRAND.tagline);
    assert.deepEqual(manifest.icons, [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]);
    assert.equal(manifest.theme_color, BRAND.themeColor);

    await saveOverride();
    manifest = await (await fetch(`${app.baseUrl}/site.webmanifest`)).json();
    assert.equal(manifest.name, OVERRIDE.brand_name);
    assert.equal(manifest.short_name, OVERRIDE.brand_short_name);
    res = await fetch(`${app.baseUrl}/favicon.svg`);
    if (built) assert.equal(res.status, 200, 'the icon it names exists');
  });

  test('index.html links the manifest and the brand’s favicon', () => {
    const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
    assert.ok(html.includes('<link rel="manifest" href="/site.webmanifest" />'));
    assert.ok(html.includes('href="%BRAND_FAVICON%"'));
    const favicon = readFileSync(join(REPO_ROOT, 'public', BRAND.favicon), 'utf8');
    assert.match(favicon, />SL<\/text>/, 'the SL monogram');
  });

  test('llms.txt: the brand, then the override', async () => {
    let text = await (await fetch(`${app.baseUrl}/llms.txt`)).text();
    assert.ok(text.startsWith(`# ${BRAND.name}\n\n> ${BRAND.tagline} `), text.slice(0, 120));
    await saveOverride();
    text = await (await fetch(`${app.baseUrl}/llms.txt`)).text();
    assert.ok(text.startsWith('# Lagoon & Hills Journeys\n\n> Slow trips, \\<fast\\> answers. Tea country'), text.slice(0, 120));
  });

  test('the enquiry email: subject, text and sender name follow a saved name', async () => {
    await saveOverride();
    const sent: NotificationEmail[] = [];
    createNotifier(async (e) => void sent.push(e), { siteUrl: null, brand: () => loadBrand() }).newInquiry();
    for (let i = 0; i < 50 && sent.length === 0; i++) await new Promise((r) => setTimeout(r, 20));
    assert.equal(sent[0]?.subject, 'New enquiry on Lagoon & Hills Journeys');
    assert.equal(sent[0]?.senderName, 'Lagoon & Hills Journeys');
    assert.ok(sent[0]?.text.startsWith('Lagoon & Hills Journeys has a new enquiry.'));
  });

  test('0025: the seed contact email is replaced; an edited one is left alone; re-running does nothing', async () => {
    const migration = readFileSync(join(REPO_ROOT, 'db/migrations/0025_rebrand_seed_text.sql'), 'utf8');
    const seedEmail = `hello@${OLD.replace(' ', '').toLowerCase()}.lk`;

    await pool.query('update public.site_settings set contact_email = $1 where id', [seedEmail]);
    await pool.query(migration);
    await pool.query(migration);
    let { rows } = await pool.query<{ contact_email: string }>('select contact_email from public.site_settings where id');
    assert.equal(rows[0].contact_email, 'hello@serendibluxetours.com');

    await pool.query("update public.site_settings set contact_email = 'owner@example.test' where id");
    await pool.query(migration);
    ({ rows } = await pool.query<{ contact_email: string }>('select contact_email from public.site_settings where id'));
    assert.equal(rows[0].contact_email, 'owner@example.test', 'an admin’s address stays');
  });

  test('0001 then 0025 and 0026: a fresh database gets the placeholders; an edited address and phone stay', async () => {
    const read = (name: string) => readFileSync(join(REPO_ROOT, 'db/migrations', name), 'utf8');
    // 0001's own seed values, read from the frozen file, not copied here.
    const seed = /insert into public\.site_settings[\s\S]*?values \(\s*true,\s*'([^']*)',[^\n]*\n\s*'([^']*)',[^\n]*\n\s*'([^']*)'/.exec(read('0001_init.sql'));
    assert.ok(seed, "0001's site_settings insert");
    const [, address, phone, email] = seed;
    await pool.query('update public.site_settings set postal_address = $1, phone = $2, contact_email = $3 where id', [address, phone, email]);
    for (const name of ['0025_rebrand_seed_text.sql', '0026_seed_contact_placeholders.sql', '0026_seed_contact_placeholders.sql']) {
      await pool.query(read(name));
    }
    let { rows } = await pool.query<{ postal_address: string; phone: string; contact_email: string }>(
      'select postal_address, phone, contact_email from public.site_settings where id'
    );
    assert.deepEqual(rows[0], {
      postal_address: 'Placeholder address: set it in Admin → Settings',
      phone: '+94 00 000 0000',
      contact_email: 'hello@serendibluxetours.com'
    });

    await pool.query("update public.site_settings set postal_address = '12 Real Road, Galle', phone = '+94 91 555 0100' where id");
    await pool.query(read('0026_seed_contact_placeholders.sql'));
    ({ rows } = await pool.query('select postal_address, phone, contact_email from public.site_settings where id'));
    assert.equal(rows[0].postal_address, '12 Real Road, Galle', 'an admin’s address stays');
    assert.equal(rows[0].phone, '+94 91 555 0100', 'and their phone');
  });

  test('brand:audit: table, id and column of every match, never the value; people’s data unread', async () => {
    assert.deepEqual(await findOldBrand(pool), [], 'the seed and the tests’ content are clean');

    await pool.query(`update public.destinations set long_description = $1 where id = 'ella'`, [`Plan Ella with ${OLD}.`]);
    await pool.query(`update public.site_settings set brand_tagline = $1 where id`, [`${['Your', 'Brand'].join(' ')} line`]);
    await pool.query(
      `insert into public.media (key, url, content_type, bytes) values ($1, $2, 'image/jpeg', 10)`,
      ['hero/1700000000-abc.jpg', `https://r2.example/${OLD.replace(' ', '-').toLowerCase()}/hero.jpg`]
    );
    const media = (await pool.query<{ id: string }>(`select id from public.media where key = 'hero/1700000000-abc.jpg'`)).rows[0].id;
    // An enquiry that names it: people's text, never read.
    await pool.query(
      `insert into public.inquiries (name, email, travelers, dates, subject, message) values ('A', 'a@example.test', '2', 'June', 'S', $1)`,
      [`I found ${OLD} online`]
    );

    const hits = await findOldBrand(pool);
    assert.deepEqual(
      hits.map((h) => `${h.table} ${h.id} ${h.column}`).sort(),
      ['destinations ella long_description', `media ${media} url`, 'site_settings true brand_tagline'].sort()
    );
    for (const hit of hits) assert.deepEqual(Object.keys(hit).sort(), ['column', 'id', 'table'], 'no values');
    await pool.query(`delete from public.media where id = $1`, [media]);
  });
});
