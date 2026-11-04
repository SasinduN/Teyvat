/**
 * The public site's HTML, robots.txt, sitemap.xml (phase 8b) and llms.txt.
 *
 * Every page is the same `index.html` shell (the client renders the page),
 * but Express gives each its own status and `<head>`: a destination, tour,
 * experience or article gets its own title, description, canonical URL and
 * share tags from its row, so a link pasted into WhatsApp or Facebook
 * previews the right page. An unknown path, or a slug that isn't a published
 * row, is a 404. Nothing is cached: each request reads the row, so an admin's
 * edit shows in the very next response.
 *
 * Absolute URLs come from `PUBLIC_SITE_URL` (the request's origin when it
 * isn't set). Until `SITE_INDEXABLE=true`, search engines are kept out.
 */
import { Router, type Request, type Response } from 'express';

import { BRAND_NAME, BRAND_TAGLINE } from '../../../shared/brand';
import { HOME_DESCRIPTION, HOME_TITLE, PAGE_DESCRIPTIONS, PAGE_TITLES, pageTitle } from '../../../shared/page-meta';
import { paths } from '../../../shared/site-paths';
import { SLUG_PATTERN } from '../../../shared/content-schema';
import { escapeHtml } from '../../../shared/html';
import type { SiteConfig } from '../env';
import { pool } from '../db';
import { describeForLog } from '../http';
import { injectHead, injectTextSize, renderHead, type PageMeta } from './head';
import { publicPhoto } from '../../../shared/public-photos';
import { DEFAULT_TEXT_SIZE, isTextSize, type TextSize } from '../../../shared/text-size';

type Resolved = { redirect: string } | { status: 200 | 404; meta: PageMeta; noindexHeader?: boolean };

/** The pages that are a content row, by URL prefix. Table and column names are constants, never from a request. */
const ROW_PAGES = [
  {
    prefix: '/destinations/',
    table: 'destinations',
    sql: 'select name as title, short_description as description, image from public.destinations where id = $1 and published',
    path: paths.destination,
    type: 'website'
  },
  {
    prefix: '/experiences/',
    table: 'featured_experiences',
    sql: 'select title, description, image from public.featured_experiences where id = $1 and published',
    path: paths.experience,
    type: 'website'
  },
  {
    prefix: '/tours/',
    table: 'tours',
    sql: 'select title, short_desc as description, image from public.tours where id = $1 and published',
    path: paths.tour,
    type: 'website'
  },
  {
    prefix: '/journal/',
    table: 'articles',
    sql: 'select title, snippet as description, image from public.articles where id = $1 and published',
    path: paths.article,
    type: 'article'
  }
] as const;

/** The first published row's image in a table, for a fixed page's share image. */
async function firstImage(table: 'hero_slides' | 'destinations' | 'featured_experiences' | 'tours' | 'articles', where = 'published'): Promise<string | null> {
  const { rows } = await pool.query<{ id: string; image: string }>(
    `select id, image from public.${table} where ${where} order by sort_order asc, id asc limit 1`
  );
  return rows[0] ? publicPhoto(table, rows[0].id, rows[0].image) : null;
}

const notFound = (): Resolved => ({
  status: 404,
  meta: {
    title: PAGE_TITLES.notFound,
    description: PAGE_DESCRIPTIONS.notFound,
    path: null,
    image: null,
    type: 'website',
    noindex: true
  }
});

/** The fixed pages: [title, description, share image]. */
const FIXED_PAGES: Record<string, () => Promise<[string, string, string | null]>> = {
  [paths.home]: async () => [HOME_TITLE, HOME_DESCRIPTION, await firstImage('hero_slides')],
  [paths.destinations]: async () => [
    PAGE_TITLES.destinations,
    PAGE_DESCRIPTIONS.destinations,
    (await firstImage('destinations', 'published and featured')) ?? (await firstImage('destinations'))
  ],
  [paths.experiences]: async () => [PAGE_TITLES.experiences, PAGE_DESCRIPTIONS.experiences, await firstImage('featured_experiences')],
  [paths.tours]: async () => [PAGE_TITLES.tours, PAGE_DESCRIPTIONS.tours, await firstImage('tours')],
  [paths.about]: async () => [PAGE_TITLES.about, PAGE_DESCRIPTIONS.about, await firstImage('hero_slides')],
  [paths.explore]: async () => [
    PAGE_TITLES.explore,
    PAGE_DESCRIPTIONS.explore,
    (await firstImage('destinations', 'published and featured')) ?? (await firstImage('destinations'))
  ],
  [paths.plan]: async () => [PAGE_TITLES.plan, PAGE_DESCRIPTIONS.plan, await firstImage('hero_slides')],
  [paths.journal]: async () => [PAGE_TITLES.journal, PAGE_DESCRIPTIONS.journal, await firstImage('articles')],
  [paths.photoCredits]: async () => [PAGE_TITLES.photoCredits, PAGE_DESCRIPTIONS.photoCredits, await firstImage('hero_slides')]
};

/** What a path is: a page (with its status and tags), or a redirect. */
export async function resolvePage(path: string, query: URLSearchParams, features = { bookings: false }): Promise<Resolved> {
  // Old links, already in WhatsApp chats: /?tour=<id> and /?destination=<id>.
  if (path === paths.home) {
    const tour = query.get('tour');
    if (tour) return { redirect: paths.tour(tour) };
    const destination = query.get('destination');
    if (destination) return { redirect: paths.destination(destination) };
  }

  const fixed = FIXED_PAGES[path];
  if (fixed) {
    const [title, description, image] = await fixed();
    // A filtered list (/destinations?category=…) is the same page: the canonical path has no query.
    return { status: 200, meta: { title, description, path, image, type: 'website' } };
  }

  for (const page of ROW_PAGES) {
    if (!path.startsWith(page.prefix)) continue;
    const slug = path.slice(page.prefix.length);
    if (!SLUG_PATTERN.test(slug)) return notFound();
    const { rows } = await pool.query<{ title: string; description: string; image: string }>(page.sql, [slug]);
    const row = rows[0];
    if (!row) return notFound();
    return {
      status: 200,
      meta: {
        title: pageTitle(row.title),
        description: row.description,
        path: page.path(slug),
        image: publicPhoto(page.table, slug, row.image),
        imageAlt: row.title,
        type: page.type
      }
    };
  }

  // Booking requests (BOOKINGS_ENABLED): a private form, never indexed or in the sitemap; off, a 404.
  if (path === paths.booking) {
    if (!features.bookings) return notFound();
    return {
      status: 200,
      noindexHeader: true,
      meta: { title: PAGE_TITLES.booking, description: PAGE_DESCRIPTIONS.booking, path: null, image: null, type: 'website', noindex: true }
    };
  }

  // Reached only from newsletter emails: a page, but never indexed or in the sitemap.
  if (path === paths.unsubscribe) {
    return {
      status: 200,
      noindexHeader: true,
      meta: { title: PAGE_TITLES.unsubscribe, description: PAGE_DESCRIPTIONS.unsubscribe, path: null, image: null, type: 'website', noindex: true }
    };
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    return {
      status: 200,
      noindexHeader: true,
      meta: { title: pageTitle('Admin'), description: HOME_DESCRIPTION, path: null, image: null, type: 'website', noindex: true }
    };
  }

  return notFound();
}

/** The admin's text size (Settings). Read per request, like everything here. */
async function currentTextSize(): Promise<TextSize> {
  const { rows } = await pool.query<{ text_size: number }>('select text_size from public.site_settings where id');
  return isTextSize(rows[0]?.text_size) ? rows[0].text_size : DEFAULT_TEXT_SIZE;
}

/** Where absolute URLs point: PUBLIC_SITE_URL, or this request's own origin. */
function originOf(req: Request, site: SiteConfig): string {
  return site.url ?? `${req.protocol}://${req.get('host')}`;
}

/** The link-preview crawlers robots.txt still lets in while the site isn't indexable. */
const PREVIEW_CRAWLERS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot-LinkExpanding',
  'TelegramBot',
  'Discordbot'
];

export function robotsTxt(origin: string, indexable: boolean): string {
  if (indexable) {
    return ['User-agent: *', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
  }
  return [
    '# Not open to search engines yet: SITE_INDEXABLE is not true.',
    'User-agent: *',
    'Disallow: /',
    '',
    '# Link previews (WhatsApp, Facebook, X, LinkedIn, Slack, Telegram, Discord)',
    '# may still read pages, so shared links show the right preview. Every page',
    '# also carries <meta name="robots" content="noindex">.',
    ...PREVIEW_CRAWLERS.map((agent) => `User-agent: ${agent}`),
    'Disallow: /admin',
    'Disallow: /api/',
    ''
  ].join('\n');
}

/** Every published page, for the sitemap: the fixed pages, then each row's. */
async function sitemapXml(origin: string): Promise<string> {
  const tables = [
    ['destinations', paths.destination],
    ['featured_experiences', paths.experience],
    ['tours', paths.tour],
    ['articles', paths.article]
  ] as const;
  const entries: { loc: string; lastmod?: string }[] = Object.keys(FIXED_PAGES).map((path) => ({ loc: origin + path }));
  for (const [table, path] of tables) {
    const { rows } = await pool.query<{ id: string; updated_at: Date }>(
      `select id, updated_at from public.${table} where published order by sort_order asc, id asc`
    );
    for (const row of rows) {
      entries.push({ loc: origin + path(row.id), lastmod: row.updated_at.toISOString().slice(0, 10) });
    }
  }
  const urls = entries.map(
    ({ loc, lastmod }) =>
      `  <url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
  );
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}

/** A page's name: its title without the " | <brand>" suffix. */
const pageName = (title: string): string => {
  const suffix = ` | ${BRAND_NAME}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
};

/**
 * Text from a row, made safe for one Markdown list item: one line, and the
 * characters that would start a link, emphasis, code or HTML escaped. (The
 * sitemap escapes for XML; this file is Markdown, so it escapes for that.)
 */
export function markdownText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/[\\`*_[\]()<>#!|]/g, '\\$&');
}

/**
 * `llms.txt` (llmstxt.org): what the site is, for language models, in
 * Markdown. The fixed pages, then every **published** destination,
 * experience, tour and article, each a link with its one-line description.
 * Built per request from the rows, so it's never stale; never the admin,
 * the API, drafts, settings or enquiries.
 */
export async function llmsTxt(origin: string): Promise<string> {
  const item = (name: string, path: string, description: string | null) =>
    `- [${markdownText(name)}](${origin}${path})${description ? `: ${markdownText(description)}` : ''}`;
  const fixed = [
    item('Home', paths.home, HOME_DESCRIPTION),
    item(pageName(PAGE_TITLES.explore), paths.explore, PAGE_DESCRIPTIONS.explore),
    item(pageName(PAGE_TITLES.destinations), paths.destinations, PAGE_DESCRIPTIONS.destinations),
    item(pageName(PAGE_TITLES.experiences), paths.experiences, PAGE_DESCRIPTIONS.experiences),
    item(pageName(PAGE_TITLES.tours), paths.tours, PAGE_DESCRIPTIONS.tours),
    item(pageName(PAGE_TITLES.plan), paths.plan, PAGE_DESCRIPTIONS.plan),
    item(pageName(PAGE_TITLES.journal), paths.journal, PAGE_DESCRIPTIONS.journal),
    item(pageName(PAGE_TITLES.about), paths.about, PAGE_DESCRIPTIONS.about),
    item(pageName(PAGE_TITLES.photoCredits), paths.photoCredits, PAGE_DESCRIPTIONS.photoCredits)
  ];
  // Table and column names are constants, never from a request.
  const sections = [
    { heading: 'Destinations', sql: 'select id, name as title, short_description as description from public.destinations', path: paths.destination },
    { heading: 'Experiences', sql: 'select id, title, description from public.featured_experiences', path: paths.experience },
    { heading: 'Tours', sql: 'select id, title, short_desc as description from public.tours', path: paths.tour },
    { heading: 'Journal', sql: 'select id, title, snippet as description from public.articles', path: paths.article }
  ] as const;
  const lines = [`# ${BRAND_NAME}`, '', `> ${BRAND_TAGLINE}. ${HOME_DESCRIPTION}`, '', '## Pages', '', ...fixed];
  for (const section of sections) {
    const { rows } = await pool.query<{ id: string; title: string; description: string | null }>(
      `${section.sql} where published order by sort_order asc, id asc`
    );
    if (rows.length === 0) continue;
    lines.push('', `## ${section.heading}`, '', ...rows.map((row) => item(row.title, section.path(row.id), row.description)));
  }
  return [...lines, ''].join('\n');
}

/**
 * `robots.txt`, `sitemap.xml`, `llms.txt`, and every other GET that reaches it (after the
 * API and the static files): the page shell with that page's status and head.
 */
export function pagesRouter(options: { template: string; site: SiteConfig; bookings?: boolean }): Router {
  const { template, site } = options;
  const features = { bookings: options.bookings === true };
  const router = Router();

  router.get('/robots.txt', (req, res) => {
    res.set('Cache-Control', 'no-cache').type('text/plain').send(robotsTxt(originOf(req, site), site.indexable));
  });

  router.get('/sitemap.xml', async (req, res, next) => {
    if (!site.indexable) {
      res.status(404).set('Cache-Control', 'no-cache').type('text/plain').send('Not found\n');
      return;
    }
    try {
      res.set('Cache-Control', 'no-cache').type('application/xml').send(await sitemapXml(originOf(req, site)));
    } catch (error) {
      next(error);
    }
  });

  // Like the sitemap: only once the site is open to search engines.
  router.get('/llms.txt', async (req, res, next) => {
    if (!site.indexable) {
      res.status(404).set('Cache-Control', 'no-cache').type('text/plain').send('Not found\n');
      return;
    }
    try {
      res.set('Cache-Control', 'no-cache').type('text/markdown').send(await llmsTxt(originOf(req, site)));
    } catch (error) {
      next(error);
    }
  });

  router.use(async (req: Request, res: Response, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const [path, search = ''] = req.originalUrl.split('?');

    // /tours/ is /tours. Leading slashes collapse too, so "//host/" can't become a redirect off-site.
    if (path !== '/' && path.endsWith('/')) {
      const target = `/${path.replace(/^\/+|\/+$/g, '')}`;
      res.redirect(301, search ? `${target}?${search}` : target);
      return;
    }

    const origin = originOf(req, site);
    let resolved: Resolved;
    let textSize: TextSize = DEFAULT_TEXT_SIZE;
    try {
      resolved = await resolvePage(path, new URLSearchParams(search), features);
      if (!('redirect' in resolved)) textSize = await currentTextSize();
    } catch (error) {
      // The database is down: still send the shell (it shows its own error),
      // with the default head, and a status that says try again.
      console.error(`[pages] couldn't resolve a page: ${describeForLog(error)}`);
      res.status(503).set('Cache-Control', 'no-cache').type('html');
      res.send(injectHead(template, renderHead({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: null, image: null, type: 'website', noindex: true }, { origin, indexable: false })));
      return;
    }

    if ('redirect' in resolved) {
      res.redirect(301, resolved.redirect);
      return;
    }
    if (resolved.noindexHeader) res.set('X-Robots-Tag', 'noindex');
    // The hero's first photo otherwise waits for the JS, the content API and
    // the page chunk. Same URL the hero requests (no srcset), so it is fetched once.
    let head = renderHead(resolved.meta, { origin, indexable: site.indexable });
    if (path === paths.home && resolved.status === 200 && resolved.meta.image) {
      head += `\n<link rel="preload" as="image" href="${escapeHtml(resolved.meta.image)}" fetchpriority="high">`;
    }
    res
      .status(resolved.status)
      .set('Cache-Control', 'no-cache')
      .type('html')
      .send(injectTextSize(injectHead(template, head), textSize));
  });

  return router;
}
