/**
 * Shared set-up for the API tests: a migrated test database, the real app on a
 * random port, and small helpers for calling it.
 *
 * Import `./test-db` before this file.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Express } from 'express';

import { passwords } from '../src/auth/passwords';
import { SESSION_COOKIE } from '../src/auth/cookies';
import { pool } from '../src/db';
import { TEST_DATABASE_NAME, TEST_DATABASE_URL } from './test-db';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Applies every migration with the real runner, so the tests see the schema a
 * deploy would. Its DATABASE_URL is the test URL, passed explicitly.
 */
export function migrateTestDatabase(): void {
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

/**
 * Puts the content back to the approved baseline: empties the nine content
 * tables, re-runs the 0002 seed, and resets `site_settings` to its 0001
 * values as 0004 left them (links NULL).
 *
 * 0002 is an upsert that must never be run by hand against production. Here
 * it only ever reaches the database `test-db.ts` has already proven is the
 * local test database.
 */
export async function resetContent(): Promise<void> {
  await assertConnectedToTestDatabase();
  await pool.query(`truncate ${CONTENT_TABLES.map((t) => `public.${t}`).join(', ')}`);
  await pool.query(readFileSync(resolve(REPO_ROOT, 'db/migrations/0002_seed.sql'), 'utf8'));
  await pool.query(
    `update public.site_settings
        set postal_address = 'Level 12, Galle Face Terrace, Colombo 03, Sri Lanka',
            phone = '+94 11 234 5678',
            contact_email = 'hello@traveleye.lk',
            instagram_url = null, facebook_url = null, tiktok_url = null, youtube_url = null,
            privacy_url = null, terms_url = null, sustainability_url = null
      where id`
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
