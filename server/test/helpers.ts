/**
 * Shared set-up for the API tests: a migrated test database, the real app on a
 * random port, and small helpers for calling it.
 *
 * Import `./test-db` before this file.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Express } from 'express';

import { DEV_WHATSAPP_NUMBER } from '../../scripts/fixtures/dev-whatsapp';
import { passwords } from '../src/auth/passwords';
import { SESSION_COOKIE } from '../src/auth/cookies';
import { pool } from '../src/db';
import { TEST_DATABASE_NAME, TEST_DATABASE_URL } from './test-db';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * A brand-new schema, then every migration with the real runner, so the tests
 * see the schema a deploy would, on tables nothing has altered before (see
 * `reset-schema.ts`). Its DATABASE_URL is the test URL, passed explicitly.
 */
export function migrateTestDatabase(): void {
  execFileSync(
    process.execPath,
    [resolve(REPO_ROOT, 'node_modules/tsx/dist/cli.mjs'), resolve(REPO_ROOT, 'server/test/reset-schema.ts')],
    { cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: 'pipe' }
  );
  execFileSync(
    process.execPath,
    [resolve(REPO_ROOT, 'node_modules/tsx/dist/cli.mjs'), resolve(REPO_ROOT, 'scripts/migrate.ts')],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe'
    }
  );
}

/**
 * A second check, on the live connection: whatever the URL said, the server
 * we are connected to must say it is the test database.
 */
export async function assertConnectedToTestDatabase(): Promise<void> {
  const { rows } = await pool.query<{ db: string }>('select current_database() as db');
  const db = rows[0]?.db;
  if (db !== TEST_DATABASE_NAME || !db.endsWith('_test')) {
    throw new Error(`Connected to "${db}", not the test database. Stopping before any writes.`);
  }
}

/** `media` too: its `uploaded_by` references `users`. */
export async function resetAuthTables(): Promise<void> {
  await pool.query('truncate public.login_attempts, public.sessions, public.media, public.users');
}

const CONTENT_TABLES = [
  'destinations',
  'experience_categories',
  'featured_experiences',
  'tours',
  'articles',
  'hidden_gems',
  'photo_stories',
  'hero_slides',
  'pillars'
];

const migration = (name: string) => readFileSync(resolve(REPO_ROOT, 'db/migrations', name), 'utf8');

/**
 * A photo set in `media`, as production has them: one row per width, at a stable
 * key. Returns the files. `resetContent` leaves these; `resetAuthTables` removes them.
 */
export async function seedPhotoSet(photoKey: string, base: string, widths: readonly number[] = [480, 768, 1280]): Promise<{ width: number; objectKey: string; url: string }[]> {
  const files = widths.map((width) => {
    const objectKey = `assets/${width}-${createHash('sha256').update(`${photoKey}-${width}`).digest('hex').slice(0, 16)}.webp`;
    return { width, objectKey, url: `${base}/${objectKey}` };
  });
  for (const { width, objectKey, url } of files) {
    await pool.query(
      `insert into public.media (key, url, content_type, bytes, uploaded_by, photo_key, width) values ($1, $2, 'image/webp', 1, null, $3, $4)`,
      [objectKey, url, photoKey, width]
    );
  }
  return files;
}

/** A credit for a photo a row stores, so `/photo-credits` has cards to measure: with no R2 rows it would be empty. */
export async function seedStoredPhotoCredit(): Promise<void> {
  await pool.query(
    `insert into public.image_credits (url, author, license, license_url, source_url)
     select image, 'A. Photographer', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:X.jpg'
       from public.destinations where id = 'ella'
     on conflict (url) do nothing`
  );
}

/** The seeded content, copied once per test process (see `resetContent`). */
const SEED_SCHEMA = 'test_seed';
let seedSnapshot = false;

/**
 * Puts the content back to the approved baseline: empties the nine content
 * tables (and the tour stops), restores the 0002 seed with 0007's route
 * stops, and resets `site_settings` to its 0001 values as 0004 left them
 * (links NULL), with the fake WhatsApp number, so the button is on the page as it
 * is in production (`whatsappNumber` picks another, or null for none).
 *
 * 0002 writes `tours.route`, which 0007 turned into `tour_stops` and dropped.
 * So the first reset in a process brings the column back, replays 0002 and
 * then 0007 (converting the routes exactly as on deploy, and proving 0007
 * still re-runs) and 0022, and copies the result into the `test_seed` schema. Every
 * later reset copies it back from there, without altering any table: each
 * add-and-drop of `tours.route` used up one of the table's 1,600 column
 * slots for good, and a long-used test database ran out. The schema itself is
 * new for every test file (`migrateTestDatabase`).
 *
 * 0002 is an upsert that must never be run by hand against production. Here
 * it only ever reaches the database `test-db.ts` has already proven is the
 * local test database.
 */
export async function resetContent(options: { whatsappNumber?: string | null } = {}): Promise<void> {
  await assertConnectedToTestDatabase();
  const tables = [...CONTENT_TABLES, 'tour_stops'];
  // Booking requests reference tours and destinations, so they go too (0014).
  const bookings = ['booking_notifications', 'booking_history', 'bookings'];
  await pool.query(`truncate ${[...bookings, ...tables].map((t) => `public.${t}`).join(', ')}`);
  if (seedSnapshot) {
    // Parents first: tour_stops references tours and destinations.
    for (const t of tables) {
      await pool.query(`insert into public.${t} overriding system value select * from ${SEED_SCHEMA}.${t}`);
    }
  } else {
    await pool.query(`alter table public.tours add column route text[] not null default '{}'`);
    await pool.query(migration('0002_seed.sql'));
    await pool.query(migration('0007_tour_stops.sql'));
    // Best months come from best_time, which 0002 just wrote (0002 knows nothing of the column).
    await pool.query(migration('0022_when_to_go.sql'));
    await pool.query(`drop schema if exists ${SEED_SCHEMA} cascade; create schema ${SEED_SCHEMA}`);
    for (const t of tables) await pool.query(`create table ${SEED_SCHEMA}.${t} as table public.${t}`);
    seedSnapshot = true;
  }
  await pool.query(
    `update public.site_settings
        set postal_address = 'Level 12, Galle Face Terrace, Colombo 03, Sri Lanka',
            phone = '+94 11 234 5678',
            contact_email = 'hello@traveleye.lk',
            instagram_url = null, facebook_url = null, tiktok_url = null, youtube_url = null,
            privacy_url = null, terms_url = null, sustainability_url = null,
            whatsapp_number = $1,
            text_size = 100
      where id`,
    [options.whatsappNumber === undefined ? DEV_WHATSAPP_NUMBER : options.whatsappNumber]
  );
}

export interface RunningApp {
  baseUrl: string;
  close: () => Promise<void>;
}

export function listen(app: Express): Promise<RunningApp> {
  return new Promise((resolveListen) => {
    const server: Server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolveListen({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

export const PASSWORD = 'correct horse battery staple';

export async function createUser(
  email = 'admin@example.test',
  password = PASSWORD,
  fullName: string | null = 'Test Admin'
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    'insert into public.users (email, password_hash, full_name) values ($1, $2, $3) returning id',
    [email, await passwords.hash(password), fullName]
  );
  return rows[0].id;
}

/** Headers a same-origin browser POST would carry, from a chosen client IP. */
export function browserHeaders(app: RunningApp, ip?: string): Record<string, string> {
  return {
    Origin: app.baseUrl,
    'Content-Type': 'application/json',
    // `trust proxy` is 1, so the app takes the last entry as the client IP,
    // exactly as it would from Railway's proxy.
    ...(ip ? { 'X-Forwarded-For': ip } : {})
  };
}

export function login(
  app: RunningApp,
  email: string,
  password: string,
  ip = '203.0.113.1'
): Promise<Response> {
  return fetch(`${app.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: browserHeaders(app, ip),
    body: JSON.stringify({ email, password })
  });
}

/** The session token from a response's Set-Cookie, or null. */
export function sessionTokenFrom(res: Response): string | null {
  for (const cookie of res.headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const eq = pair.indexOf('=');
    if (pair.slice(0, eq) === SESSION_COOKIE) return pair.slice(eq + 1) || null;
  }
  return null;
}

export function withSession(token: string): Record<string, string> {
  return { Cookie: `${SESSION_COOKIE}=${token}` };
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
