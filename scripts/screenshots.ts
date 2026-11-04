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
 * `--text-size` sets the admin's text size in the "after" site only.
 *
 * `--admin` adds the admin: the login page, then (signed in as a throwaway
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
 * `teyvat_shots_{base,head}_test`, and dropped afterwards. Nothing touches
 * DATABASE_URL, production, or the test database itself. Pages are rendered
 * from the seeded content, with no R2 and no email.
 */
import '../shared/load-env';

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { randomBytes } from 'node:crypto';

import { passwords } from '../server/src/auth/passwords';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from '../server/test/chrome';

const ROOT = resolve(import.meta.dirname, '..');

const PAGES = [
  '/', '/explore', '/plan', '/journal', '/destinations', '/destinations/ella', '/experiences', '/experiences/safari-yala', '/tours',
  '/tours/island-in-7-days', '/journal/ultimate-ella-guide', '/about', '/photo-credits', '/no-such-page'
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
    admin: { type: 'boolean', default: false },
    'text-size': { type: 'string' },
    out: { type: 'string' }
  },
  strict: true
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
  if (site.label === 'after' && values['text-size']) {
    const client = new Client({ connectionString: db });
    await client.connect();
    try {
      await client.query('update public.site_settings set text_size = $1 where id', [Number(values['text-size'])]);
    } finally {
      await client.end();
    }
  }
  if (values.admin) {
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
  env.BOOKINGS_ENABLED = '';
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

async function open(chrome: Chrome, url: string, viewport: (typeof VIEWPORTS)[keyof typeof VIEWPORTS], dark: boolean): Promise<Page> {
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
  if (viewport.mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Page.navigate', { url });
  await waitFor(page, `document.readyState === 'complete' && document.body.dataset.route`);
  await sleep(1000);
  return page;
}

/** An admin page (no public route marker): loaded, then still. */
async function openAdmin(chrome: Chrome, url: string, viewport: (typeof VIEWPORTS)[keyof typeof VIEWPORTS], dark: boolean): Promise<Page> {
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
  const themes = values.dark ? [false, true] : [false];

  const worktree = mkdtempSync(join(tmpdir(), 'teyvat-shots-'));
  rmSync(worktree, { recursive: true });
  run('git', ['worktree', 'add', '--detach', worktree, values.base!], ROOT);
  // The base shares this checkout's dependencies (a junction on Windows).
  symlinkSync(join(ROOT, 'node_modules'), join(worktree, 'node_modules'), 'junction');

  const sites: Site[] = [
    { label: 'before', dir: worktree, database: 'teyvat_shots_base_test' },
    { label: 'after', dir: ROOT, database: 'teyvat_shots_head_test' }
  ];
  let chrome: Chrome | undefined;
  try {
    for (const site of sites) await prepare(site);
    chrome = await launchChrome(executable);
    for (const site of sites) {
      for (const dark of themes) {
        for (const [name, viewport] of Object.entries(VIEWPORTS)) {
          const suffix = `${name}${dark ? '-dark' : ''}-${site.label}.jpg`;
          for (const path of pages) {
            const page = await open(chrome, site.url + path, viewport, dark);
            await settle(page);
            await shoot(page, join(out, `${slug(path)}-${suffix}`), true);
            console.log(`  ${slug(path)}-${suffix}`);
          }
          // The footer on its own, from a page whose footer every page shares.
          const foot = await open(chrome, site.url + '/about', viewport, dark);
          await settle(foot);
          await foot.evaluate(`document.querySelector('footer').scrollIntoView({ block: 'end', behavior: 'instant' }), true`);
          await foot.evaluate(QUIET);
          await shoot(foot, join(out, `state-footer-${suffix}`), false);
          // Named states: the phone menu, and the enquiry form on a tour.
          if (viewport.mobile) {
            const menu = await open(chrome, site.url + '/', viewport, dark);
            await menu.evaluate(`document.querySelector('header button[aria-label*="menu" i]')?.click(), true`);
            await menu.evaluate(QUIET);
            await shoot(menu, join(out, `state-menu-${suffix}`), false);
          }
          if (values.admin) {
            const login = await openAdmin(chrome, `${site.url}/admin/login`, viewport, dark);
            await shoot(login, join(out, `admin-login-${suffix}`), true);
            const status = await login.evaluate<number>(`fetch('/api/auth/login', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(${JSON.stringify(SHOTS_ADMIN)})
            }).then((r) => r.status)`);
            if (status !== 200) throw new Error(`[${site.label}] admin sign-in failed (${status})`);
            for (const path of ADMIN_PAGES) {
              const page = await openAdmin(chrome, site.url + path, viewport, dark);
              await shoot(page, join(out, `${slug(path)}-${suffix}`), true);
              console.log(`  ${slug(path)}-${suffix}`);
            }
          }
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
          const tour = await open(chrome, `${site.url}/tours/island-in-7-days`, viewport, dark);
          await tour.evaluate(`[...document.querySelectorAll('main button')].find((b) => /enquire|inquire/i.test(b.textContent))?.click(), true`);
          await waitFor(tour, `document.querySelector('[role=dialog] form, .fixed.inset-0 form')`, 5_000);
          await tour.evaluate(LOADED);
          await tour.evaluate(QUIET);
          await shoot(tour, join(out, `state-enquiry-${suffix}`), false);
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
