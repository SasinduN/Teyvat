/**
 * Before/after screenshots for a design PR (CLAUDE.md, docs/plans/redesign-redo.md).
 *
 *   npm run screenshots -- --base origin/main
 *   npm run screenshots -- --base origin/main --pages /,/about --dark
 *
 * Builds `--base` in a throwaway git worktree and the working tree as it is,
 * serves each from its own scratch database on the local test server, and
 * captures every page at 1280 px and 375 px (full page) plus a few named
 * states (the phone menu, the enquiry form), into
 * `docs/screenshots/<branch>/<page>-<desktop|phone>[-dark]-<before|after>.jpg`.
 *
 * The scratch databases are created on TEST_DATABASE_URL's server (the same
 * guards as the tests: localhost, an explicit port), named
 * `teyvat_shots_{base,head}_test`, and dropped afterwards. Nothing touches
 * DATABASE_URL, production, or the test database itself. Pages are rendered
 * from the seeded content, with no R2 and no email.
 */
import '../shared/load-env';

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { findChrome, launchChrome, type Chrome, type Page } from '../server/test/chrome';

const ROOT = resolve(import.meta.dirname, '..');

const PAGES = [
  '/', '/destinations', '/destinations/ella', '/experiences', '/experiences/safari-yala', '/tours',
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

async function prepare(site: Site): Promise<void> {
  const db = scratchUrl(site.database);
  await admin(`drop database if exists ${site.database}`);
  await admin(`create database ${site.database}`);
  console.log(`\n[${site.label}] build`);
  run('npm', ['run', 'build'], site.dir);
  run('npx', ['tsx', 'scripts/migrate.ts'], site.dir, { ...process.env, DATABASE_URL: db });

  const port = await freePort();
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: db, PORT: String(port), NODE_ENV: 'development' };
  for (const key of Object.keys(env)) if (/^(R2_|RESEND_|NOTIFY_)/.test(key)) delete env[key];
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
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  if (viewport.mobile) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Page.navigate', { url });
  await waitFor(page, `document.readyState === 'complete' && document.body.dataset.route`);
  await sleep(1000);
  return page;
}

/** Scrolls through so lazy images and sections load, then back to the top. */
async function settle(page: Page): Promise<void> {
  const height = await page.evaluate<number>('document.documentElement.scrollHeight');
  for (let y = 0; y < height; y += 500) {
    await page.evaluate(`window.scrollTo(0, ${y}), true`);
    await sleep(120);
  }
  await page.evaluate('window.scrollTo(0, 0), true');
  await sleep(800);
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

const slug = (path: string) => (path === '/' ? 'home' : path.slice(1).replace(/[^a-z0-9]+/gi, '-'));

async function main(): Promise<void> {
  const executable = findChrome();
  if (!executable) throw new Error('No Chrome found; set CHROME_PATH.');
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const out = resolve(ROOT, values.out ?? join('docs', 'screenshots', branch.replace(/[^\w.-]+/g, '-')));
  mkdirSync(out, { recursive: true });
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
          // Named states: the phone menu, and the enquiry form on a tour.
          if (viewport.mobile) {
            const menu = await open(chrome, site.url + '/', viewport, dark);
            await menu.evaluate(`document.querySelector('header button[aria-label*="menu" i]')?.click(), true`);
            await sleep(800);
            await shoot(menu, join(out, `state-menu-${suffix}`), false);
          }
          const tour = await open(chrome, `${site.url}/tours/island-in-7-days`, viewport, dark);
          await tour.evaluate(`[...document.querySelectorAll('main button')].find((b) => /enquire|inquire/i.test(b.textContent))?.click(), true`);
          await waitFor(tour, `document.querySelector('[role=dialog] form, .fixed.inset-0 form')`, 5_000);
          await sleep(600);
          await shoot(tour, join(out, `state-enquiry-${suffix}`), false);
        }
      }
    }
    console.log(`\nSaved in ${out}`);
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
