/**
 * Before/after screenshots for a design PR (CLAUDE.md, docs/plans/redesign-redo.md).
 *
 *   npm run screenshots -- --base origin/main
 *   npm run screenshots -- --base origin/main --pages /,/about --dark
 *   npm run screenshots -- --base origin/main --pages / --admin --dark
 *   npm run screenshots -- --base origin/main --pages / --admin --text-size 120
 *
 * Builds `--base` in a throwaway git worktree and the working tree as it is,
 * serves each from its own scratch database on the local test server, and
 * captures every page at 1280 px and 375 px (full page) plus a few named
 * states (the phone menu, the enquiry form), into
 * `docs/screenshots/<branch>/<page>-<desktop|phone>[-dark]-<before|after>.jpg`
 * (git-ignored: never committed). It then compares each pair and writes
 * `summary.md` there: identical, or how much differs and where. A PR lists
 * the pages that changed; the author drags those pairs into it on GitHub.
 *
 * `--text-size` sets the admin's text size in the "after" site only; with
 * `--text-size-both`, in both, so a pair compares the same size.
 *
 * For a short run (the laptop's memory, a time limit): `--only-dark` skips the
 * light theme and `--no-states` the named states, so a set can go in batches.
 *
 * `--header-floating` takes only the header, its dropdowns, the phone menu, the floating
 * buttons and the wishlist's badge, as twelve pairs, and opens with bookings on so the Book
 * a ride button and its link are there. Both versions show the fake WhatsApp number
 * (`scripts/fixtures/dev-whatsapp.ts`), in every mode: a local database has no other.
 *
 * `--when-to-go` takes only the ten pairs for that PR: the page on a phone and a laptop, light and
 * dark, in January and July, the admin's month picker, and the Discover dropdown.
 *
 * `--attractions` takes only the ten pairs for nearby attractions: Galle's page with its Nearby
 * cards, the Explore map after "View on map", and the admin's list and form. The "after" scratch
 * database gets `npm run content:import -- --skip-photos`, its attractions of published places
 * published there only: so the cards show their placeholder (no R2 here, and the CSP keeps
 * Commons out), as production will until the import's photos are in.
 *
 * `--brand` takes only the ten pairs for the rebrand: the header and footer, the home hero, the
 * phone menu, the admin's sign-in, light and dark, phone and laptop, and an email preview: the
 * new-enquiry email each version would send (subject, sender name, text), from its own
 * `composeEmail`, drawn as a plain message card.
 *
 * `--ride` takes only the ride page's pairs (docs/plans/ride-vehicle-picker.md): its states, light
 * and dark, phone and laptop, the home hero's two slides and Admin → Bookings, with bookings on in both
 * scratch databases. For a short retake: `--ride-states goods-empty,goods-filled` takes only those
 * states (no hero, no admin), and `--phone-only` only the 375 px width (for pages too).
 *
 * `--tour-categories` takes only the twelve pairs for tour categories (docs/plans/tour-categories.md):
 * `/tours` and a category's page (Beach), phone and laptop, light and dark; the Tours dropdown;
 * the phone menu; Admin → Tour Categories and the tour form's categories. "Before", the category
 * page is a 404, Tours is a plain link and the admin has neither.
 *
 * `--tour-form` takes only the tour editor, whole, on a laptop and a phone: two pairs (the new tour
 * drafts' best months, docs/plans/new-tours.md).
 *
 * `--admin` adds the admin: the login page (empty, a password typed and
 * shown, after two wrong tries, locked), then (signed in as a throwaway
 * admin created in each scratch database) the dashboard, a collection, two
 * editors, the media library, photo credits, enquiries and settings.
 *
 * Animations would make two identical builds differ, so each page is shot
 * with `prefers-reduced-motion: reduce` emulated (the map honours it), after
 * the fonts and every image have loaded, and once the page has stopped
 * changing: no DOM mutation for 1.2 s (the scroll-in animations and the
 * count-ups don't check reduced motion, but they do finish).
 *
 * The scratch databases are created on TEST_DATABASE_URL's server (the same
 * guards as the tests: localhost, an explicit port), named
 * `site_shots_{base,head}_test`, and dropped afterwards. Nothing touches
 * DATABASE_URL, production, or the test database itself. Pages are rendered
 * from the seeded content, with no R2 and no email.
 */
import '../shared/load-env';

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { randomBytes } from 'node:crypto';

import { passwords } from '../server/src/auth/passwords';
import { findChrome, launchChrome, SAMPLE_WISHLIST, saveTheme, saveWishlist, type Chrome, type Page } from '../server/test/chrome';
import { DESTINATIONS } from './fixtures/destinations';
import { DEV_WHATSAPP_NUMBER } from './fixtures/dev-whatsapp';

const ROOT = resolve(import.meta.dirname, '..');

const PAGES = [
  '/', '/explore', '/plan', '/when-to-go', '/journal', '/destinations', '/destinations/ella', '/experiences', '/experiences/safari-yala', '/tours',
  '/tours/island-in-7-days', '/journal/ultimate-ella-guide', '/about', '/photo-credits', '/wishlist', '/no-such-page'
];
const VIEWPORTS = {
  desktop: { width: 1280, height: 900, mobile: false },
  phone: { width: 375, height: 812, mobile: true }
} as const;

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'origin/main' },
    pages: { type: 'string' },
    dark: { type: 'boolean', default: false },
    'only-dark': { type: 'boolean', default: false },
    'no-states': { type: 'boolean', default: false },
    admin: { type: 'boolean', default: false },
    'text-size': { type: 'string' },
    'text-size-both': { type: 'boolean', default: false },
    /** A site's public URL: both versions show that site's R2 photos, as production does. */
    'live-photos': { type: 'string' },
    /** Every page opens with a saved wishlist, so /wishlist has cards and the header its count. */
    'saved-wishlist': { type: 'boolean', default: false },
    /** Only the twelve pairs for the header and floating buttons, bookings on. */
    'header-floating': { type: 'boolean', default: false },
    /** Only the ten pairs for /when-to-go, its month picker and the Discover dropdown. */
    'when-to-go': { type: 'boolean', default: false },
    /** Only the ten pairs for nearby attractions: Galle's page, the map, the admin. */
    attractions: { type: 'boolean', default: false },
    /** Only the ten pairs for the rebrand: header, footer, hero, phone menu, admin sign-in, an email. */
    brand: { type: 'boolean', default: false },
    /** Only the twelve pairs for tour categories: /tours, a category page, the menus, the admin. */
    'tour-categories': { type: 'boolean', default: false },
    /** Only the tour editor, whole, laptop and phone. */
    'tour-form': { type: 'boolean', default: false },
    /** Only the ride page's states, the home hero and Admin → Bookings, bookings on. */
    ride: { type: 'boolean', default: false },
    /** With --ride: only these states (comma-separated names), and no hero or admin. */
    'ride-states': { type: 'string' },
    /** With --ride: only the 375 px width. */
    'phone-only': { type: 'boolean', default: false },
    out: { type: 'string' }
  },
  strict: true
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The live site's public photo sets. Scratch databases have no R2 rows, so without this they show the seed's stock photos. */
const livePhotos = await (async () => {
  if (!values['live-photos']) return null;
  const { photoSets } = (await (await fetch(new URL('/api/content', values['live-photos']))).json()) as { photoSets: Record<string, { width: number; url: string }[]> };
  const first = Object.values(photoSets)[0]?.[0];
  if (!first) throw new Error('--live-photos: that site has no photo sets.');
  return { sets: photoSets, origin: new URL(first.url).origin };
})();
const run = (cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) =>
  execFileSync(cmd, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });

/** The test server's URL for `database`, with the tests' own guards. */
function scratchUrl(database: string): string {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) throw new Error('TEST_DATABASE_URL is not set: the scratch databases go on that server.');
  const url = new URL(raw);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !url.port) {
    throw new Error('TEST_DATABASE_URL must be localhost with an explicit port.');
  }
  url.pathname = `/${database}`;
  return url.toString();
}

async function admin(sql: string): Promise<void> {
  const client = new Client({ connectionString: scratchUrl('postgres') });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

function freePort(): Promise<number> {
  return new Promise((done) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => done(port));
    });
  });
}

interface Site {
  label: 'before' | 'after';
  dir: string;
  database: string;
  server?: ChildProcess;
  url?: string;
}

/** The admin pages `--admin` captures, signed in (the login page comes first, signed out). */
const ADMIN_PAGES = [
  '/admin',
  '/admin/destinations',
  '/admin/destinations/ella',
  '/admin/tours/wild-sri-lanka',
  '/admin/media',
  '/admin/credits',
  '/admin/inquiries',
  '/admin/settings'
];

/** A throwaway admin for the scratch databases: local only, a new password each run. */
const SHOTS_ADMIN = { email: 'screenshots@example.test', password: randomBytes(18).toString('base64url') };

async function prepare(site: Site): Promise<void> {
  const db = scratchUrl(site.database);
  await admin(`drop database if exists ${site.database}`);
  await admin(`create database ${site.database}`);
  console.log(`\n[${site.label}] build`);
  run('npm', ['run', 'build'], site.dir);
  run('npx', ['tsx', 'scripts/migrate.ts'], site.dir, { ...process.env, DATABASE_URL: db });
  {
    // The fake number, so every shot shows the WhatsApp button: in this scratch database only.
    const client = new Client({ connectionString: db });
    await client.connect();
    try {
      await client.query('update public.site_settings set whatsapp_number = $1 where id', [DEV_WHATSAPP_NUMBER]);
    } finally {
      await client.end();
    }
  }
  if (livePhotos) {
    const client = new Client({ connectionString: db });
    await client.connect();
    try {
      for (const [key, variants] of Object.entries(livePhotos.sets)) {
        for (const { width, url } of variants) {
          await client.query(
            `insert into public.media (key, url, content_type, bytes, uploaded_by, photo_key, width) values ($1, $2, 'image/webp', 1, null, $3, $4)`,
            [new URL(url).pathname.slice(1), url, key, width]
          );
        }
      }
    } finally {
      await client.end();
    }
  }
  if (site.label === 'after' && values.attractions) {
    // The researched places as drafts, without photos; then, in this scratch database only,
    // published where their destination is, so Galle's page and the map have them.
    run('npx', ['tsx', 'scripts/content-import.ts', '--skip-photos'], site.dir, { ...process.env, DATABASE_URL: db });
    const client = new Client({ connectionString: db });
    await client.connect();
    try {
      await client.query(`update public.attractions a set published = true from public.destinations d where d.id = a.destination_id and d.published`);
    } finally {
      await client.end();
    }
  }
  if ((site.label === 'after' || values['text-size-both']) && values['text-size']) {
    const client = new Client({ connectionString: db });
    await client.connect();
    try {
      await client.query('update public.site_settings set text_size = $1 where id', [Number(values['text-size'])]);
    } finally {
      await client.end();
    }
  }
  if (values.admin || values['when-to-go'] || values.attractions || values.ride || values['tour-categories'] || values['tour-form']) {
    const client = new Client({ connectionString: db });
    await client.connect();
    try {
      await client.query('insert into public.users (email, password_hash, full_name) values ($1, $2, $3)', [
        SHOTS_ADMIN.email,
        await passwords.hash(SHOTS_ADMIN.password),
        'Screenshots'
      ]);
    } finally {
      await client.end();
    }
  }

  const port = await freePort();
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: db, PORT: String(port), NODE_ENV: 'development' };
  // Blank, not deleted: the server loads .env (the head's working tree has one) and dotenv fills in
  // any variable that isn't set, so a deleted R2 key came back and only the base ran without R2.
  for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL', 'RESEND_API_KEY', 'NOTIFY_EMAIL_TO', 'NOTIFY_EMAIL_FROM']) env[key] = '';
  // The same for the switches: as the base would have them.
  env.BOOKINGS_ENABLED = values['header-floating'] || values.ride ? 'true' : '';
  // The bucket's public origin, so the CSP lets the photos in. The rest only has to be set: nothing is uploaded.
  if (livePhotos) {
    Object.assign(env, { R2_ACCOUNT_ID: 'screenshots', R2_ACCESS_KEY_ID: 'screenshots', R2_SECRET_ACCESS_KEY: 'screenshots', R2_BUCKET: 'screenshots', R2_PUBLIC_BASE_URL: livePhotos.origin });
  }
  env.SITE_INDEXABLE = '';
  site.server = spawn(process.execPath, ['server/dist/index.js'], { cwd: site.dir, env, stdio: 'ignore' });
  site.url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(`${site.url}/api/health`)).ok) return;
    } catch {
      // not up yet
    }
    await sleep(200);
  }
  throw new Error(`[${site.label}] the server didn't start`);
}

async function waitFor(page: Page, expression: string, ms = 15_000): Promise<boolean> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if (await page.evaluate<boolean>(`Boolean(${expression})`)) return true;
    } catch {
      // navigating
    }
    await sleep(150);
  }
  return false;
}

async function open(chrome: Chrome, url: string, viewport: { width: number; height: number; mobile: boolean }, dark: boolean): Promise<Page> {
  const page = await chrome.newPage();
  await page.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 });
  await page.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' },
      { name: 'prefers-reduced-motion', value: 'reduce' }
    ]
  });
  // The saved choice decides (with nothing saved the site is light, whatever the system).
  await saveTheme(page, dark ? 'dark' : 'light');
  if (values['saved-wishlist']) await saveWishlist(page, SAMPLE_WISHLIST);
  if (viewport.mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Page.navigate', { url });
  await waitFor(page, `document.readyState === 'complete' && document.body.dataset.route`);
  await sleep(1000);
  return page;
}

/** An admin page (no public route marker): loaded, then still. */
async function openAdmin(chrome: Chrome, url: string, viewport: { width: number; height: number; mobile: boolean }, dark: boolean): Promise<Page> {
  const page = await chrome.newPage();
  await page.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 });
  await page.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' },
      { name: 'prefers-reduced-motion', value: 'reduce' }
    ]
  });
  // The saved choice decides (with nothing saved the site is light, whatever the system).
  await saveTheme(page, dark ? 'dark' : 'light');
  await page.send('Page.navigate', { url });
  await waitFor(page, `document.readyState === 'complete' && document.querySelector('main, form')`);
  await page.evaluate(LOADED);
  await page.evaluate(QUIET);
  return page;
}

/** Resolves once the fonts and every `<img>` have loaded (or failed), at most 15 s. */
const LOADED = `Promise.race([
  new Promise((r) => setTimeout(r, 15000)),
  Promise.all([
    document.fonts.ready,
    ...[...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))
  ])
]).then(() => true)`;

/** Resolves once nothing in the page has changed for 1.2 s, at most 12 s. */
const QUIET = `new Promise((resolve) => {
  let timer;
  const done = () => { observer.disconnect(); resolve(true); };
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(done, 1200); });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  timer = setTimeout(done, 1200);
  setTimeout(done, 12000);
})`;

/**
 * Scrolls through so lazy images and sections load and their scroll-in
 * animations run, back to the top, then waits for fonts, images and a
 * still page.
 */
async function settle(page: Page): Promise<void> {
  const height = await page.evaluate<number>('document.documentElement.scrollHeight');
  for (let y = 0; y < height; y += 500) {
    await page.evaluate(`window.scrollTo(0, ${y}), true`);
    await sleep(120);
  }
  await page.evaluate('window.scrollTo(0, 0), true');
  await page.evaluate(LOADED);
  await page.evaluate(QUIET);
}

/** Forgets the scratch database's sign-in failures. */
async function clearLoginAttempts(site: Site): Promise<void> {
  const client = new Client({ connectionString: scratchUrl(site.database) });
  await client.connect();
  try {
    await client.query('delete from public.login_attempts');
  } finally {
    await client.end();
  }
}

/** Replaces a field's text the way typing does, so React sees it. */
async function typeInto(page: Page, selector: string, text: string): Promise<void> {
  await page.evaluate(`(document.querySelector('${selector}').focus(), document.querySelector('${selector}').select(), true)`);
  await page.send('Input.insertText', { text });
}

/** No focus (no caret blinking), then a still page. */
async function still(page: Page): Promise<void> {
  await page.evaluate('(document.activeElement?.blur(), true)');
  await page.evaluate(QUIET);
}

/** `times` wrong sign-ins for `email` through the login form, each answered before the next. */
async function tryLogin(page: Page, email: string, times: number): Promise<void> {
  await page.evaluate(`(() => {
    const send = window.fetch;
    window.__logins = 0;
    window.fetch = (...args) => send(...args).finally(() => { if (String(args[0]).includes('/api/auth/login')) window.__logins += 1; });
    return true;
  })()`);
  await typeInto(page, '#admin-email', email);
  for (let i = 1; i <= times; i += 1) {
    await typeInto(page, '#admin-password', `wrong password ${i}`);
    await page.evaluate(`document.querySelector('form button[type=submit]').click(), true`);
    if (!(await waitFor(page, `window.__logins === ${i}`, 10_000))) throw new Error(`sign-in ${i} for ${email} got no answer`);
    await sleep(200);
  }
  await still(page);
}

async function shoot(page: Page, file: string, fullPage: boolean): Promise<void> {
  const params: Record<string, unknown> = { format: 'jpeg', quality: 60 };
  if (fullPage) {
    const { width } = await page.evaluate<{ width: number }>('({ width: innerWidth })');
    const height = Math.min(await page.evaluate<number>('document.documentElement.scrollHeight'), 14_000);
    Object.assign(params, { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: width > 500 ? 0.75 : 1 } });
  }
  const { data } = (await page.send('Page.captureScreenshot', params)) as { data: string };
  writeFileSync(file, Buffer.from(data, 'base64'));
}

/** One element only, at full size, however far down the page it is. */
async function shootElement(page: Page, file: string, selector: string): Promise<void> {
  const clip = await page.evaluate<{ x: number; y: number; width: number; height: number; scale: number }>(`(() => {
    // The fixed header and buttons would be painted over it, wherever they sit: only this element shows.
    const element = document.querySelector(${JSON.stringify(selector)});
    document.body.style.visibility = 'hidden';
    element.style.visibility = 'visible';
    const r = element.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, scale: 1 };
  })()`);
  const { data } = (await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 60, captureBeyondViewport: true, clip })) as { data: string };
  writeFileSync(file, Buffer.from(data, 'base64'));
}

/** A tab is closed once its shot is taken: a full run opens a hundred or more, and this laptop runs out of memory. */
const closePage = (page: Page) => page.send('Page.close').catch(() => undefined);

/**
 * Each before/after pair: identical (the same bytes: the same pixels encode
 * the same), or the share of pixels differing by more than 25 levels in any
 * channel and the box around them, worked out in Chrome on a canvas.
 */
async function compare(chrome: Chrome, out: string): Promise<string> {
  const pairs = readdirSync(out).filter((f) => f.endsWith('-before.jpg')).sort();
  const page = await chrome.newPage();
  const rows: string[] = [];
  let identical = 0;
  for (const before of pairs) {
    const after = before.replace(/-before\.jpg$/, '-after.jpg');
    const name = before.replace(/-before\.jpg$/, '');
    const a = readFileSync(join(out, before));
    if (!existsSync(join(out, after))) {
      rows.push(`| ${name} | no "after" shot | |`);
      continue;
    }
    const b = readFileSync(join(out, after));
    if (a.equals(b)) {
      identical += 1;
      rows.push(`| ${name} | identical | |`);
      continue;
    }
    const diff = await page.evaluate<{ sameSize: boolean; share: number; box: number[] | null }>(`(async () => {
      const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const [x, y] = await Promise.all([load('data:image/jpeg;base64,${a.toString('base64')}'), load('data:image/jpeg;base64,${b.toString('base64')}')]);
      if (x.width !== y.width || x.height !== y.height) return { sameSize: false, share: 1, box: null };
      const pixels = (img) => { const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
      const p = pixels(x), q = pixels(y);
      let n = 0, minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
      for (let i = 0; i < p.length; i += 4) {
        if (Math.abs(p[i] - q[i]) > 25 || Math.abs(p[i + 1] - q[i + 1]) > 25 || Math.abs(p[i + 2] - q[i + 2]) > 25) {
          n += 1;
          const px = (i / 4) % x.width, py = Math.floor(i / 4 / x.width);
          minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
        }
      }
      return { sameSize: true, share: n / (p.length / 4), box: n ? [minX, minY, maxX, maxY] : null };
    })()`);
    if (diff.sameSize && diff.box === null) {
      identical += 1;
      rows.push(`| ${name} | identical (within 25 levels) | |`);
    } else {
      rows.push(`| ${name} | **differs**: ${diff.sameSize ? `${(diff.share * 100).toFixed(2)}% of pixels` : 'different page height'} | ${diff.box ? diff.box.join(', ') : ''} |`);
    }
  }
  return [
    `**${identical}/${pairs.length} identical.**`,
    '',
    '| Shot | Before vs after | Box (x1, y1, x2, y2) |',
    '|---|---|---|',
    ...rows,
    ''
  ].join('\n');
}

const slug = (path: string) => (path === '/' ? 'home' : path.slice(1).replace(/[^a-z0-9]+/gi, '-'));

const LAPTOP = { width: 1280, height: 800, mobile: false };
const PHONE = { width: 375, height: 812, mobile: true };
const OPEN_DISCOVER = `[...document.querySelectorAll('.te-nav-trigger')].find((b) => b.textContent.trim() === 'Discover')?.click(), true`;
const OPEN_MENU = `document.querySelector('header button[aria-label*="menu" i]')?.click(), true`;
const SCROLL_DOWN = `window.scrollTo({ top: 1400, behavior: 'instant' }), true`;
/** Stopping near the top is what brings a phone's labels back, for a few seconds: long enough for the shot. */
const LABELS_BACK = `new Promise((done) => {
  window.scrollTo({ top: 5, behavior: 'instant' });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.scrollTo({ top: 0, behavior: 'instant' }); done(true); }));
})`;
const TEN_SAVED = DESTINATIONS.slice(0, 10).map(({ id }) => ({ kind: 'destination', id }));

/** `--header-floating`: twelve pairs. The header's shots are cropped to its row, with room below for the badge. */
const HEADER_FLOATING: { name: string; path: string; viewport: typeof LAPTOP | typeof PHONE; dark?: boolean; saved?: { kind: string; id: string }[]; action?: string; settleMs?: number; /** Shoot straight after: the labels only stay for a few seconds. */ quick?: boolean; crop?: { height: number; scale?: number } }[] = [
  { name: 'header-1280', path: '/about', viewport: LAPTOP, crop: { height: 96 } },
  { name: 'header-1100', path: '/about', viewport: { ...LAPTOP, width: 1100 }, crop: { height: 96 } },
  { name: 'dropdown-light', path: '/destinations', viewport: LAPTOP, action: OPEN_DISCOVER, crop: { height: 320 } },
  { name: 'dropdown-dark', path: '/destinations', viewport: LAPTOP, dark: true, action: OPEN_DISCOVER, crop: { height: 320 } },
  { name: 'phone-menu', path: '/destinations', viewport: PHONE, action: OPEN_MENU },
  { name: 'phone-menu-dark', path: '/destinations', viewport: PHONE, dark: true, action: OPEN_MENU },
  { name: 'buttons-home-top-phone', path: '/', viewport: PHONE, action: LABELS_BACK, settleMs: 700, quick: true },
  { name: 'buttons-home-scrolled-phone', path: '/', viewport: PHONE, action: SCROLL_DOWN, settleMs: 900 },
  { name: 'buttons-home-top-desktop', path: '/', viewport: LAPTOP },
  { name: 'buttons-home-scrolled-desktop', path: '/', viewport: LAPTOP, action: SCROLL_DOWN, settleMs: 900 },
  { name: 'badge-1-saved', path: '/about', viewport: LAPTOP, saved: [{ kind: 'destination', id: 'ella' }], crop: { height: 96 } },
  { name: 'badge-9-plus-saved', path: '/about', viewport: LAPTOP, saved: TEN_SAVED, crop: { height: 96 } }
];

async function shootHeaderFloating(chrome: Chrome, site: Site, out: string): Promise<void> {
  for (const shot of HEADER_FLOATING) {
    const page = await chrome.newPage();
    await page.send('Emulation.setDeviceMetricsOverride', { ...shot.viewport, deviceScaleFactor: 1 });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await saveTheme(page, shot.dark ? 'dark' : 'light');
    await saveWishlist(page, shot.saved ?? []);
    if (shot.viewport.mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.send('Page.navigate', { url: site.url + shot.path });
    await waitFor(page, `document.readyState === 'complete' && document.body.dataset.route`);
    await page.evaluate(LOADED);
    if (shot.action) await page.evaluate(shot.action);
    if (!shot.quick) await page.evaluate(LOADED);
    await sleep(shot.settleMs ?? 500);
    const file = join(out, `${shot.name}-${site.label}.jpg`);
    const clip = shot.crop ? { x: 0, y: 0, width: shot.viewport.width, height: shot.crop.height, scale: 1 } : undefined;
    const { data } = (await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, ...(clip ? { clip } : {}) })) as { data: string };
    writeFileSync(file, Buffer.from(data, 'base64'));
    await closePage(page);
    console.log(`  ${shot.name}-${site.label}.jpg`);
  }
}

const SET_MONTH = (month: number) => `(() => {
  const input = document.querySelector('[data-month-slider] input');
  if (!input) return true;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${month}');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

/** `--when-to-go`: ten pairs. "Before" the page is a 404, and the form has no picker. */
const WHEN_TO_GO: { name: string; viewport: typeof LAPTOP | typeof PHONE; dark?: boolean; month?: number; admin?: boolean; dropdown?: boolean }[] = [
  { name: 'when-to-go-january-desktop', viewport: LAPTOP, month: 1 },
  { name: 'when-to-go-january-desktop-dark', viewport: LAPTOP, dark: true, month: 1 },
  { name: 'when-to-go-january-phone', viewport: PHONE, month: 1 },
  { name: 'when-to-go-january-phone-dark', viewport: PHONE, dark: true, month: 1 },
  { name: 'when-to-go-july-desktop', viewport: LAPTOP, month: 7 },
  { name: 'when-to-go-july-phone-dark', viewport: PHONE, dark: true, month: 7 },
  { name: 'admin-month-picker-desktop', viewport: LAPTOP, admin: true },
  { name: 'admin-month-picker-phone', viewport: PHONE, admin: true },
  { name: 'discover-dropdown', viewport: LAPTOP, dropdown: true },
  { name: 'discover-dropdown-dark', viewport: LAPTOP, dark: true, dropdown: true }
];

async function shootWhenToGo(chrome: Chrome, site: Site, out: string): Promise<void> {
  for (const shot of WHEN_TO_GO) {
    const file = join(out, `${shot.name}-${site.label}.jpg`);
    if (shot.admin) {
      const page = await openAdmin(chrome, `${site.url}/admin/login`, shot.viewport, Boolean(shot.dark));
      const status = await page.evaluate<number>(`fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${JSON.stringify(SHOTS_ADMIN)})
      }).then((r) => r.status)`);
      if (status !== 200) throw new Error(`[${site.label}] admin sign-in failed (${status})`);
      await page.send('Page.navigate', { url: `${site.url}/admin/destinations/ella` });
      await waitFor(page, `document.querySelector('#field-best_time')?.value`);
      await page.evaluate(`(document.querySelector('[data-month-picker]') ?? document.querySelector('#field-best_time')).scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
      await page.evaluate(QUIET);
      await shoot(page, file, false);
      await closePage(page);
    } else if (shot.dropdown) {
      const page = await open(chrome, `${site.url}/destinations`, shot.viewport, Boolean(shot.dark));
      await page.evaluate(OPEN_DISCOVER);
      await sleep(500);
      const { data } = (await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: shot.viewport.width, height: 360, scale: 1 } })) as { data: string };
      writeFileSync(file, Buffer.from(data, 'base64'));
      await closePage(page);
    } else {
      const page = await open(chrome, `${site.url}/when-to-go`, shot.viewport, Boolean(shot.dark));
      await page.evaluate(SET_MONTH(shot.month!));
      await settle(page);
      await waitFor(page, `document.querySelector('[data-season-map] img.leaflet-tile-loaded') || !document.querySelector('[data-season-map]')`, 10_000);
      await page.evaluate(LOADED);
      await shoot(page, file, true);
      await closePage(page);
    }
    console.log(`  ${shot.name}-${site.label}.jpg`);
  }
}

/** `--attractions`: ten pairs. "Before" there is no Nearby section, no attraction on the map, and no admin page for them (it goes to the dashboard). */
const ATTRACTIONS: { name: string; viewport: typeof LAPTOP | typeof PHONE; dark?: boolean; kind: 'page' | 'map' | 'list' | 'form' }[] = [
  { name: 'destination-galle-desktop', viewport: LAPTOP, kind: 'page' },
  { name: 'destination-galle-desktop-dark', viewport: LAPTOP, dark: true, kind: 'page' },
  { name: 'destination-galle-phone', viewport: PHONE, kind: 'page' },
  { name: 'destination-galle-phone-dark', viewport: PHONE, dark: true, kind: 'page' },
  { name: 'explore-view-on-map-galle-desktop', viewport: LAPTOP, kind: 'map' },
  { name: 'explore-view-on-map-galle-desktop-dark', viewport: LAPTOP, dark: true, kind: 'map' },
  { name: 'explore-view-on-map-galle-phone-dark', viewport: PHONE, dark: true, kind: 'map' },
  { name: 'admin-attractions-galle-desktop', viewport: LAPTOP, kind: 'list' },
  { name: 'admin-attraction-form-desktop', viewport: LAPTOP, kind: 'form' },
  { name: 'admin-attraction-form-phone', viewport: PHONE, kind: 'form' }
];

async function shootAttractions(chrome: Chrome, site: Site, out: string): Promise<void> {
  for (const shot of ATTRACTIONS) {
    const file = join(out, `${shot.name}-${site.label}.jpg`);
    if (shot.kind === 'page') {
      const page = await open(chrome, `${site.url}/destinations/galle`, shot.viewport, Boolean(shot.dark));
      await settle(page);
      await shoot(page, file, true);
      await closePage(page);
    } else if (shot.kind === 'map') {
      const page = await open(chrome, `${site.url}/explore?place=galle#explore-map`, shot.viewport, Boolean(shot.dark));
      await page.evaluate(`document.getElementById('explore-map')?.scrollIntoView({ block: 'start' }), true`);
      await waitFor(page, `document.querySelector('#explore-map .leaflet-marker-icon') && document.querySelector('#explore-map img.leaflet-tile-loaded')`, 10_000);
      // "After", the place is picked and the map has flown in: its attractions show.
      await waitFor(page, `document.querySelector('#explore-map .attraction-leaflet-marker')`, 5_000);
      await page.evaluate(LOADED);
      await page.evaluate(`(() => { const box = document.querySelector('#explore-map .leaflet-container')?.closest('.grid'); if (box) window.scrollTo(0, box.getBoundingClientRect().top + scrollY - 100); return true; })()`);
      await page.evaluate(QUIET);
      await shoot(page, file, false);
      await closePage(page);
    } else {
      const page = await openAdmin(chrome, `${site.url}/admin/login`, shot.viewport, Boolean(shot.dark));
      const status = await page.evaluate<number>(`fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${JSON.stringify(SHOTS_ADMIN)})
      }).then((r) => r.status)`);
      if (status !== 200) throw new Error(`[${site.label}] admin sign-in failed (${status})`);
      const path = shot.kind === 'list' ? '/admin/attractions?destination_id=galle' : '/admin/attractions/jungle-beach';
      await page.send('Page.navigate', { url: site.url + path });
      await waitFor(page, shot.kind === 'list' ? `document.querySelectorAll('main .font-mono').length > 0` : `document.querySelector('[data-location-map] img.leaflet-tile-loaded') || location.pathname === '/admin'`, 10_000);
      await page.evaluate(LOADED);
      await page.evaluate(QUIET);
      await shoot(page, file, true);
      await closePage(page);
    }
    console.log(`  ${shot.name}-${site.label}.jpg`);
  }
}

/** `--tour-categories`: twelve pairs. */
const TOUR_CATEGORY_SHOTS: { name: string; viewport: typeof LAPTOP | typeof PHONE; dark?: boolean; path: string; kind: 'page' | 'dropdown' | 'menu' | 'admin'; whole?: boolean }[] = [
  { name: 'tours-desktop', viewport: LAPTOP, path: '/tours', kind: 'page' },
  { name: 'tours-desktop-dark', viewport: LAPTOP, dark: true, path: '/tours', kind: 'page' },
  { name: 'tours-phone', viewport: PHONE, path: '/tours', kind: 'page' },
  { name: 'tours-phone-dark', viewport: PHONE, dark: true, path: '/tours', kind: 'page' },
  { name: 'category-beach-desktop', viewport: LAPTOP, path: '/tours/category/beach', kind: 'page' },
  { name: 'category-beach-desktop-dark', viewport: LAPTOP, dark: true, path: '/tours/category/beach', kind: 'page' },
  { name: 'category-beach-phone', viewport: PHONE, path: '/tours/category/beach', kind: 'page' },
  { name: 'category-beach-phone-dark', viewport: PHONE, dark: true, path: '/tours/category/beach', kind: 'page' },
  { name: 'tours-dropdown', viewport: LAPTOP, path: '/tours', kind: 'dropdown' },
  { name: 'tours-phone-menu', viewport: PHONE, path: '/tours', kind: 'menu' },
  { name: 'admin-tour-categories', viewport: LAPTOP, path: '/admin/tour-categories', kind: 'admin' },
  { name: 'admin-tour-form-categories', viewport: LAPTOP, path: '/admin/tours/island-in-7-days', kind: 'admin' }
];

/** `--tour-form`: two pairs, the tour editor whole. */
const TOUR_FORM_SHOTS: typeof TOUR_CATEGORY_SHOTS = [
  { name: 'admin-tour-form-desktop', viewport: LAPTOP, path: '/admin/tours/wild-sri-lanka', kind: 'admin', whole: true },
  { name: 'admin-tour-form-phone', viewport: PHONE, path: '/admin/tours/wild-sri-lanka', kind: 'admin', whole: true }
];

async function shootTourCategories(chrome: Chrome, site: Site, out: string, shots: typeof TOUR_CATEGORY_SHOTS): Promise<void> {
  for (const shot of shots) {
    const file = join(out, `${shot.name}-${site.label}.jpg`);
    const dark = Boolean(shot.dark);
    if (shot.kind === 'page') {
      const page = await open(chrome, site.url + shot.path, shot.viewport, dark);
      await settle(page);
      await shoot(page, file, true);
      await closePage(page);
    } else if (shot.kind === 'dropdown' || shot.kind === 'menu') {
      const page = await open(chrome, site.url + shot.path, shot.viewport, dark);
      await settle(page);
      await page.evaluate(
        shot.kind === 'dropdown'
          ? `[...document.querySelectorAll('.te-nav-trigger')].find((b) => b.textContent.trim() === 'Tours')?.click(), true`
          : `document.querySelector('header button[aria-label*="menu" i]')?.click(), true`
      );
      await sleep(400);
      await page.evaluate(QUIET);
      await shoot(page, file, false);
      await closePage(page);
    } else {
      const page = await openAdmin(chrome, `${site.url}/admin/login`, shot.viewport, dark);
      const status = await page.evaluate<number>(`fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${JSON.stringify(SHOTS_ADMIN)})
      }).then((r) => r.status)`);
      if (status !== 200) throw new Error(`[${site.label}] admin sign-in failed (${status})`);
      await page.send('Page.navigate', { url: site.url + shot.path });
      await waitFor(page, `document.querySelector('main h1') || document.querySelector('main')?.innerText.length > 40`, 10_000);
      await page.evaluate(LOADED);
      // The tour form: its categories (after), or where they go, by the price (before).
      if (!shot.whole) await page.evaluate(`(document.querySelector('[data-tour-categories-field]') ?? document.querySelector('#field-price_from'))?.scrollIntoView({ block: 'center', behavior: 'instant' }), true`);
      await page.evaluate(QUIET);
      await shoot(page, file, Boolean(shot.whole) || shot.path.endsWith('tour-categories'));
      await closePage(page);
    }
    console.log(`  ${shot.name}-${site.label}.jpg`);
  }
}

/** `--brand`: ten pairs. */
const BRAND_SHOTS: { name: string; viewport: typeof LAPTOP | typeof PHONE; dark?: boolean; kind: 'header' | 'footer' | 'hero' | 'menu' | 'login' | 'email' }[] = [
  { name: 'brand-header-desktop', viewport: LAPTOP, kind: 'header' },
  { name: 'brand-header-desktop-dark', viewport: LAPTOP, dark: true, kind: 'header' },
  { name: 'brand-footer-desktop', viewport: LAPTOP, kind: 'footer' },
  { name: 'brand-footer-phone-dark', viewport: PHONE, dark: true, kind: 'footer' },
  { name: 'brand-home-hero-desktop', viewport: LAPTOP, kind: 'hero' },
  { name: 'brand-home-hero-phone-dark', viewport: PHONE, dark: true, kind: 'hero' },
  { name: 'brand-phone-menu', viewport: PHONE, kind: 'menu' },
  { name: 'brand-phone-menu-dark', viewport: PHONE, dark: true, kind: 'menu' },
  { name: 'brand-admin-login-desktop', viewport: LAPTOP, kind: 'login' },
  { name: 'brand-email-preview', viewport: LAPTOP, kind: 'email' }
];

/**
 * The new-enquiry email this version sends, as JSON: its own `composeEmail` and test sender,
 * run in its own checkout. The address is the configured one in both; only the name may differ.
 */
function emailOf(site: Site): { from: string; subject: string; text: string } {
  const at = (path: string) => JSON.stringify(pathToFileURL(join(site.dir, path)).href);
  const script = join(mkdtempSync(join(tmpdir(), 'site-email-')), 'email.mts');
  writeFileSync(
    script,
    `const notify = await import(${at('server/src/inquiries/notify.ts')});
     const env = await import(${at('server/src/env.ts')});
     const email = notify.composeEmail(2, 'https://www.example.com');
     let from = env.RESEND_TEST_SENDER;
     if (email.senderName) from = (await import(${at('shared/brand.ts')})).emailSender(from, { name: email.senderName });
     console.log(JSON.stringify({ from, subject: email.subject, text: email.text }));`
  );
  try {
    const out = execFileSync(process.execPath, ['--import', 'tsx', script], {
      cwd: site.dir,
      encoding: 'utf8',
      env: { ...process.env, RESEND_API_KEY: '', NOTIFY_EMAIL_TO: '' }
    });
    return JSON.parse(out.trim().split('\n').at(-1)!);
  } finally {
    rmSync(dirname(script), { recursive: true, force: true });
  }
}

const escapeForHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function shootBrand(chrome: Chrome, site: Site, out: string): Promise<void> {
  for (const shot of BRAND_SHOTS) {
    const file = join(out, `${shot.name}-${site.label}.jpg`);
    const dark = Boolean(shot.dark);
    if (shot.kind === 'header') {
      const page = await open(chrome, `${site.url}/about`, shot.viewport, dark);
      await page.evaluate(LOADED);
      await shootElement(page, file, 'header');
      await closePage(page);
    } else if (shot.kind === 'footer') {
      const page = await open(chrome, `${site.url}/about`, shot.viewport, dark);
      await settle(page);
      await shootElement(page, file, 'footer');
      await closePage(page);
    } else if (shot.kind === 'hero') {
      const page = await open(chrome, `${site.url}/`, shot.viewport, dark);
      await settle(page);
      await page.evaluate('window.scrollTo(0, 0), true');
      await page.evaluate(QUIET);
      await shoot(page, file, false);
      await closePage(page);
    } else if (shot.kind === 'menu') {
      const page = await open(chrome, `${site.url}/`, shot.viewport, dark);
      await page.evaluate(`document.querySelector('header button[aria-label*="menu" i]')?.click(), true`);
      await page.evaluate(QUIET);
      await shoot(page, file, false);
      await closePage(page);
    } else if (shot.kind === 'login') {
      const blank = await chrome.newPage();
      await blank.send('Network.clearBrowserCookies');
      await closePage(blank);
      const page = await openAdmin(chrome, `${site.url}/admin/login`, shot.viewport, dark);
      await shoot(page, file, true);
      await closePage(page);
    } else {
      const email = emailOf(site);
      const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#eef0ec;font:16px/1.5 system-ui,sans-serif;color:#1d2321">
        <div style="max-width:760px;margin:40px auto;background:#fff;border:1px solid #d5d9d2;border-radius:12px;padding:28px 32px">
          <div style="font-size:13px;color:#5b625e">From</div><div style="font-weight:600;margin-bottom:12px">${escapeForHtml(email.from)}</div>
          <div style="font-size:13px;color:#5b625e">Subject</div><div style="font-weight:700;font-size:20px;margin-bottom:20px">${escapeForHtml(email.subject)}</div>
          <div style="white-space:pre-wrap;border-top:1px solid #e3e6e1;padding-top:20px">${escapeForHtml(email.text)}</div>
        </div></body>`;
      const page = await chrome.newPage();
      await page.send('Page.enable');
      await page.send('Emulation.setDeviceMetricsOverride', { width: shot.viewport.width, height: 520, deviceScaleFactor: 1, mobile: false });
      await page.send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(html).toString('base64')}` });
      await sleep(500);
      await shoot(page, file, false);
      await closePage(page);
    }
    console.log(`  ${shot.name}-${site.label}.jpg`);
  }
}

/** Sets a labelled field the way typing does, so React sees it (the ride form's fields, either version). */
const FILL = (label: string, value: string) => `(() => {
  const label = [...document.querySelectorAll('label')].find((l) => l.textContent.trim() === ${JSON.stringify(label)});
  const input = label && document.getElementById(label.htmlFor);
  if (!input) return false;
  const proto = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  return true;
})()`;
/** Chooses a vehicle: a card's radio after, the dropdown before. */
const CHOOSE = (id: string) => `(() => {
  const radio = document.querySelector('.ride-vehicle__input[value="${id}"]');
  if (radio) { radio.click(); return true; }
  return ${FILL('Vehicle category', id)};
})()`;
const ROUTE = [FILL('Pickup location', 'Colombo airport'), FILL('Drop-off location', 'Galle'), FILL('Pickup date', '2099-12-20'), FILL('Pickup time', '09:00')];
const ROUND_TRIP = `(document.querySelector('input[value=round_trip]')?.click(), true)`;
/** The Goods tab (0029); before it there is none, so "before" stays on passengers. */
const GOODS = `(document.querySelector('input[name=ride-mode][value=goods]')?.click(), true)`;
const GOODS_WHAT = FILL('What are you moving?', 'Two suitcases, a bicycle and three boxes of books');
const GOODS_WEIGHT = (kg: string) => FILL('Approximate weight in kg (optional)', kg);
const GOODS_RIDER = `(document.querySelector('.ride-goods__rider input')?.click(), true)`;
const GOODS_BACK = (load: string) => `(document.querySelector('input[name=ride-return-load][value=${load}]')?.click(), true)`;

/**
 * `--ride`: the ride page's states (nothing chosen, a vehicle chosen, a capacity error, the buses, a
 * round trip, and the Goods tab: empty, filled in, over the weight limit, a round trip) at 1280 and
 * 375 px, light and dark; the Admin → Bookings vehicle form (the Car, and the lorry); and the home hero with
 * bookings on: its first slide and the "Book a ride" slide. With `--text-size 120`, the "after" site at
 * 120%. Bookings are on in both scratch databases, and nowhere else.
 * Before 0027 there is no Mini, so "before" shows the capacity error with the Car and 6 passengers.
 */
const RIDE_STATES: { name: string; steps: (before: boolean) => string[]; view?: string }[] = [
  { name: 'ride-nothing-chosen', steps: () => [] },
  { name: 'ride-vehicle-chosen', steps: () => [...ROUTE, FILL('Number of passengers', '2'), CHOOSE('car')] },
  {
    name: 'ride-capacity-error',
    // Before, the error showed only on submitting; after, it shows as the count changes.
    steps: (before) => before
      ? [...ROUTE, CHOOSE('car'), FILL('Number of passengers', '6'), `(document.querySelector('.ride-form').requestSubmit(), true)`]
      : [...ROUTE, CHOOSE('mini'), FILL('Number of passengers', '4')]
  },
  // The buses (0028): each chosen for a group it takes. Before 0028 neither is offered.
  { name: 'ride-ac-bus-chosen', steps: () => [...ROUTE, FILL('Number of passengers', '12'), CHOOSE('ac-bus')] },
  { name: 'ride-bus-chosen', steps: () => [...ROUTE, FILL('Number of passengers', '40'), CHOOSE('bus')] },
  {
    name: 'ride-round-trip',
    steps: () => [...ROUTE, ROUND_TRIP, FILL('Return date', '2099-12-27'), FILL('Return time', '17:30'), FILL('Number of passengers', '2'), CHOOSE('car')]
  },
  // The Mini Lorry (0029). Phones show the goods fields rather than the cards.
  { name: 'goods-empty', steps: () => [GOODS], view: '.ride-mode' },
  { name: 'goods-filled', steps: () => [...ROUTE, GOODS, GOODS_WHAT, GOODS_WEIGHT('60'), GOODS_RIDER], view: '.ride-goods' },
  { name: 'goods-over-weight', steps: () => [...ROUTE, GOODS, GOODS_WHAT, GOODS_WEIGHT('101')], view: '#ride-weight' },
  {
    name: 'goods-round-trip',
    steps: () => [...ROUTE, ROUND_TRIP, FILL('Return date', '2099-12-27'), FILL('Return time', '17:30'), GOODS, GOODS_WHAT, GOODS_RIDER, GOODS_BACK('rider')],
    view: '.ride-goods__rider'
  }
];


async function shootRide(chrome: Chrome, site: Site, out: string): Promise<void> {
  const before = site.label === 'before';
  const only = values['ride-states']?.split(',').map((n) => n.trim()).filter(Boolean);
  const unknown = only?.filter((n) => !RIDE_STATES.some((s) => s.name === n)) ?? [];
  if (unknown.length) throw new Error(`--ride-states: no state named ${unknown.join(', ')}`);
  const states = only ? RIDE_STATES.filter((s) => only.includes(s.name)) : RIDE_STATES;
  const viewports = Object.entries(VIEWPORTS).filter(([, v]) => !values['phone-only'] || v.mobile);
  for (const dark of [false, true]) {
    for (const [name, viewport] of viewports) {
      const suffix = `${name}${dark ? '-dark' : ''}-${site.label}.jpg`;
      for (const state of states) {
        const page = await open(chrome, `${site.url}/booking`, viewport, dark);
        await waitFor(page, `document.querySelector('.ride-form')`);
        // A draft would open WhatsApp: never, here.
        await page.evaluate(`(window.open = () => null, true)`);
        for (const step of state.steps(before)) {
          await page.evaluate(step);
          await sleep(120);
        }
        await page.evaluate('(document.activeElement?.blur(), true)');
        // The chosen card in view along its row (five cards overflow it), without moving the page.
        await page.evaluate(`(() => {
          const card = document.querySelector('.ride-vehicle.is-selected');
          const track = card?.closest('.ride-vehicles__track');
          if (card && track) track.scrollLeft = card.offsetLeft - track.offsetLeft - 8;
          return true;
        })()`);
        await page.evaluate(LOADED);
        await page.evaluate(QUIET);
        if (viewport.mobile) {
          // The phone's bar sticks to the screen's bottom: a screenful, with the vehicles in it.
          await page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(state.view ? `${state.view}, .ride-vehicles, .ride-form select` : '.ride-vehicles, .ride-form select')}); el?.scrollIntoView({ block: 'center' }); return true; })()`);
          await page.evaluate(QUIET);
          await shoot(page, join(out, `${state.name}-${suffix}`), false);
        } else {
          await shoot(page, join(out, `${state.name}-${suffix}`), true);
        }
        await closePage(page);
        console.log(`  ${state.name}-${suffix}`);
      }
      if (only) continue;
      // The home hero: the first slide, then the "Book a ride" slide (the second).
      const home = await open(chrome, `${site.url}/`, viewport, dark);
      await home.evaluate(LOADED);
      await home.evaluate(QUIET);
      await shoot(home, join(out, `hero-first-slide-${suffix}`), false);
      await home.evaluate(`(document.querySelector('[aria-label="Next featured destination"]')?.click(), true)`);
      await sleep(1200);
      await home.evaluate(LOADED);
      await home.evaluate(QUIET);
      await shoot(home, join(out, `hero-second-slide-${suffix}`), false);
      await closePage(home);
      console.log(`  hero-*-${suffix}`);
      // Admin → Bookings, its vehicle form open on the Car.
      const blank = await chrome.newPage();
      await blank.send('Network.clearBrowserCookies');
      await closePage(blank);
      const signIn = await openAdmin(chrome, `${site.url}/admin/login`, viewport, dark);
      const status = await signIn.evaluate<number>(`fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${JSON.stringify(SHOTS_ADMIN)})
      }).then((r) => r.status)`);
      if (status !== 200) throw new Error(`[${site.label}] admin sign-in failed (${status})`);
      await closePage(signIn);
      const admin = await openAdmin(chrome, `${site.url}/admin/bookings`, viewport, dark);
      await waitFor(admin, `[...document.querySelectorAll('button')].some((b) => b.textContent.startsWith('Edit Car'))`);
      await admin.evaluate(`([...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Edit Car'))?.click(), true)`);
      await admin.evaluate(LOADED);
      await admin.evaluate(QUIET);
      await shoot(admin, join(out, `admin-bookings-${suffix}`), true);
      // The lorry's form (0029); before it there is no lorry, so the Car's again.
      await admin.evaluate(`([...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Edit Mini Lorry'))?.click(), true)`);
      await sleep(150);
      await admin.evaluate(QUIET);
      await shoot(admin, join(out, `admin-bookings-lorry-${suffix}`), true);
      await closePage(admin);
      console.log(`  admin-bookings-${suffix}`);
    }
  }
}

async function main(): Promise<void> {
  const executable = findChrome();
  if (!executable) throw new Error('No Chrome found; set CHROME_PATH.');
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const out = resolve(ROOT, values.out ?? join('docs', 'screenshots', branch.replace(/[^\w.-]+/g, '-')));
  mkdirSync(out, { recursive: true });
  // Old shots would mix into the comparison.
  for (const file of readdirSync(out)) if (/\.jpg$|^summary\.md$/.test(file)) rmSync(join(out, file));
  const pages = values.pages ? values.pages.split(',') : PAGES;
  for (const page of pages) {
    if (!/^\/[^:\\]*$/.test(page)) {
      // Git Bash turns a leading "/" into a Windows path unless told not to.
      throw new Error(`"${page}" isn't a site path like /about. In Git Bash, prefix the command with MSYS_NO_PATHCONV=1.`);
    }
  }
  const themes = values['only-dark'] ? [true] : values.dark ? [false, true] : [false];
  const states = !values['no-states'];

  const worktree = mkdtempSync(join(tmpdir(), 'site-shots-'));
  rmSync(worktree, { recursive: true });
  run('git', ['worktree', 'add', '--detach', worktree, values.base!], ROOT);
  // The base shares this checkout's dependencies (a junction on Windows).
  symlinkSync(join(ROOT, 'node_modules'), join(worktree, 'node_modules'), 'junction');

  const sites: Site[] = [
    { label: 'before', dir: worktree, database: 'site_shots_base_test' },
    { label: 'after', dir: ROOT, database: 'site_shots_head_test' }
  ];
  let chrome: Chrome | undefined;
  try {
    for (const site of sites) await prepare(site);
    chrome = await launchChrome(executable);
    for (const site of sites) {
      if (values['header-floating']) {
        await shootHeaderFloating(chrome, site, out);
        continue;
      }
      if (values['when-to-go']) {
        await shootWhenToGo(chrome, site, out);
        continue;
      }
      if (values.attractions) {
        await shootAttractions(chrome, site, out);
        continue;
      }
      if (values.brand) {
        await shootBrand(chrome, site, out);
        continue;
      }
      if (values['tour-categories']) {
        await shootTourCategories(chrome, site, out, TOUR_CATEGORY_SHOTS);
        continue;
      }
      if (values['tour-form']) {
        await shootTourCategories(chrome, site, out, TOUR_FORM_SHOTS);
        continue;
      }
      if (values.ride) {
        await shootRide(chrome, site, out);
        continue;
      }
      for (const dark of themes) {
        for (const [name, viewport] of Object.entries(VIEWPORTS).filter(([, v]) => !values['phone-only'] || v.mobile)) {
          const suffix = `${name}${dark ? '-dark' : ''}-${site.label}.jpg`;
          for (const path of pages) {
            const page = await open(chrome, site.url + path, viewport, dark);
            await settle(page);
            await shoot(page, join(out, `${slug(path)}-${suffix}`), true);
            await closePage(page);
            console.log(`  ${slug(path)}-${suffix}`);
          }
          if (states) {
            // The footer on its own, from a page whose footer every page shares.
            const foot = await open(chrome, site.url + '/about', viewport, dark);
            await settle(foot);
            await foot.evaluate(`document.querySelector('footer').scrollIntoView({ block: 'end', behavior: 'instant' }), true`);
            await foot.evaluate(QUIET);
            await shoot(foot, join(out, `state-footer-${suffix}`), false);
            // On a phone the footer is taller than the screen: the whole of it, cropped from the page.
            if (viewport.mobile) await shootElement(foot, join(out, `state-footer-crop-${suffix}`), 'footer');
            await closePage(foot);
            // Named states: the phone menu, and the enquiry form on a tour.
            if (viewport.mobile) {
              const menu = await open(chrome, site.url + '/', viewport, dark);
              await menu.evaluate(`document.querySelector('header button[aria-label*="menu" i]')?.click(), true`);
              await menu.evaluate(QUIET);
              await shoot(menu, join(out, `state-menu-${suffix}`), false);
              await closePage(menu);
            } else {
              // The header at the narrowest width that keeps its links.
              const narrow = await open(chrome, site.url + '/about', { width: 1100, height: 700, mobile: false }, dark);
              await narrow.evaluate(LOADED);
              await shootElement(narrow, join(out, `state-header-1100${dark ? '-dark' : ''}-${site.label}.jpg`), 'header');
              await closePage(narrow);
            }
          }
          if (values.admin) {
            // Signed out first: the last pass signed in, and the login page sends a session on to /admin.
            const blank = await chrome.newPage();
            await blank.send('Network.clearBrowserCookies');
            await closePage(blank);
            const login = await openAdmin(chrome, `${site.url}/admin/login`, viewport, dark);
            await shoot(login, join(out, `admin-login-${suffix}`), true);
            // Its states: a password typed and shown (where there's a toggle), two wrong tries, locked.
            await clearLoginAttempts(site);
            const typed = await openAdmin(chrome, `${site.url}/admin/login`, viewport, dark);
            await typeInto(typed, '#admin-email', 'someone@example.test');
            await typeInto(typed, '#admin-password', 'not the password');
            await typed.evaluate(`document.querySelector('button[aria-controls="admin-password"]')?.click(), true`);
            await still(typed);
            await shoot(typed, join(out, `admin-login-visible-${suffix}`), true);
            await closePage(typed);
            const failed = await openAdmin(chrome, `${site.url}/admin/login`, viewport, dark);
            await tryLogin(failed, 'someone@example.test', 2);
            await shoot(failed, join(out, `admin-login-failed-${suffix}`), true);
            await closePage(failed);
            const locked = await openAdmin(chrome, `${site.url}/admin/login`, viewport, dark);
            await tryLogin(locked, 'locked@example.test', 6);
            await shoot(locked, join(out, `admin-login-locked-${suffix}`), true);
            await closePage(locked);
            // Otherwise the next pass's tries would reach the per-IP limit (20).
            await clearLoginAttempts(site);
            const status = await login.evaluate<number>(`fetch('/api/auth/login', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(${JSON.stringify(SHOTS_ADMIN)})
            }).then((r) => r.status)`);
            if (status !== 200) throw new Error(`[${site.label}] admin sign-in failed (${status})`);
            await closePage(login);
            for (const path of ADMIN_PAGES) {
              const page = await openAdmin(chrome, site.url + path, viewport, dark);
              await shoot(page, join(out, `${slug(path)}-${suffix}`), true);
              await closePage(page);
              console.log(`  ${slug(path)}-${suffix}`);
            }
          }
          if (states) {
            // The map with a place picked from Quick Jump (its second place), the map in view.
            const map = await open(chrome, `${site.url}/explore`, viewport, dark);
            await map.evaluate(`document.getElementById('explore-map')?.scrollIntoView({ block: 'start' }), true`);
            await waitFor(map, `document.querySelector('#explore-map .leaflet-marker-icon')`, 10_000);
            await map.evaluate(`document.querySelectorAll('#explore-map [role=group] button')[1]?.click(), true`);
            await map.evaluate(LOADED);
            await map.evaluate(QUIET);
            // The map and its side card, just under the header.
            await map.evaluate(`(() => { const box = document.querySelector('#explore-map .leaflet-container')?.closest('.grid'); if (box) window.scrollTo(0, box.getBoundingClientRect().top + scrollY - 100); return true; })()`);
            await map.evaluate(QUIET);
            await shoot(map, join(out, `state-map-${suffix}`), false);
            await closePage(map);
            // The map's first view (nothing picked), then the category chips scrolled under the header.
            const first = await open(chrome, `${site.url}/explore`, viewport, dark);
            await first.evaluate(`document.getElementById('explore-map')?.scrollIntoView({ block: 'start' }), true`);
            await waitFor(first, `document.querySelector('#explore-map .leaflet-marker-icon')`, 10_000);
            await first.evaluate(LOADED);
            await first.evaluate(`(() => { const box = document.querySelector('#explore-map .leaflet-container')?.closest('.grid'); if (box) window.scrollTo(0, box.getBoundingClientRect().top + scrollY - 100); return true; })()`);
            await first.evaluate(QUIET);
            await shoot(first, join(out, `state-map-view-${suffix}`), false);
            await first.evaluate(`(() => {
              const header = document.querySelector('header')?.getBoundingClientRect();
              const chip = document.querySelector('#explore-map [aria-pressed]')?.getBoundingClientRect();
              if (header && chip) window.scrollTo(0, chip.top + scrollY - (header.height - chip.height) / 2);
              return true;
            })()`);
            await first.evaluate(QUIET);
            await shoot(first, join(out, `state-header-${suffix}`), false);
            await closePage(first);
            const tour = await open(chrome, `${site.url}/tours/island-in-7-days`, viewport, dark);
            await tour.evaluate(`[...document.querySelectorAll('main button')].find((b) => /enquire|inquire/i.test(b.textContent))?.click(), true`);
            await waitFor(tour, `document.querySelector('[role=dialog] form, .fixed.inset-0 form')`, 5_000);
            await tour.evaluate(LOADED);
            await tour.evaluate(QUIET);
            await shoot(tour, join(out, `state-enquiry-${suffix}`), false);
            await closePage(tour);
          }
        }
      }
    }
    const summary = await compare(chrome, out);
    writeFileSync(join(out, 'summary.md'), summary);
    console.log(`\n${summary}\nSaved in ${out}`);
  } finally {
    await chrome?.close().catch(() => undefined);
    for (const site of sites) site.server?.kill();
    await sleep(500);
    for (const site of sites) await admin(`drop database if exists ${site.database}`).catch(() => undefined);
    // Unlink the junction itself, never what it points at, before anything
    // removes the worktree recursively. If it can't be unlinked, stop there.
    const link = join(worktree, 'node_modules');
    if (existsSync(link)) {
      if (!lstatSync(link).isSymbolicLink()) throw new Error(`${link} is not the junction this script made; not removing ${worktree}.`);
      unlinkSync(link);
    }
    run('git', ['worktree', 'remove', '--force', worktree], ROOT);
    if (existsSync(worktree)) rmSync(worktree, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(`\nscreenshots failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
