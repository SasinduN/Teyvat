// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * `npm run db:backup`: the pure pieces, then the real script against the local
 * test database. It writes a custom-format dump, prints its size and table
 * count (matching the database's), never the URL or the password, and the dump
 * restores into an empty database with the runbook's own command
 * (docs/runbooks/restore-from-backup.md).
 *
 * The run needs pg_dump and pg_restore at least as new as the test server;
 * skipped with the reason otherwise (the version check itself is tested above).
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';

import { Client } from 'pg';

import {
  backupFileName,
  findPgTool,
  formatBytes,
  majorVersion,
  pgEnvironment,
  redact,
  tablesInList,
  URL_VARIABLES
} from '../src/backup';
import { pool } from '../src/db';
import { assertConnectedToTestDatabase, migrateTestDatabase } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TEST_URL = process.env.TEST_DATABASE_URL!;

describe('db:backup, the pieces', () => {
  test('the file name: the date and time in UTC, sortable', () => {
    assert.equal(backupFileName(new Date('2026-11-13T09:05:07.900Z')), '2026-11-13-090507.dump');
  });

  test("pg_dump's environment: libpq variables, the password only in PGPASSWORD", () => {
    const env = pgEnvironment('postgresql://owner:p%40ss%3Aword@db.example.net:6543/railway?sslmode=require', 'site-db-backup');
    assert.deepEqual(env, {
      PGHOST: 'db.example.net',
      PGPORT: '6543',
      PGDATABASE: 'railway',
      PGUSER: 'owner',
      PGPASSWORD: 'p@ss:word',
      PGSSLMODE: 'require',
      PGAPPNAME: 'site-db-backup',
      PGCONNECT_TIMEOUT: '15',
      PGOPTIONS: '-c default_transaction_read_only=on'
    });
    assert.equal(pgEnvironment('postgresql://u:p@localhost:5433/x_test', 'a').PGSSLMODE, 'disable', 'no sslmode: no TLS, as the app');
    assert.equal(pgEnvironment('postgresql://u:p@h:1/x?sslmode=no-verify', 'a').PGSSLMODE, 'require');
    assert.equal(pgEnvironment('postgresql://u:p@h:1/x?sslmode=verify-full', 'a').PGSSLROOTCERT, 'system');
    assert.ok(URL_VARIABLES.includes('PROD_DATABASE_URL') && URL_VARIABLES.includes('DATABASE_URL'));
  });

  test('versions: pg_dump --version and server_version_num', () => {
    assert.equal(majorVersion('pg_dump (PostgreSQL) 18.4'), 18);
    assert.equal(majorVersion('pg_dump (PostgreSQL) 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)'), 16);
    assert.equal(majorVersion('180004'), 18);
    assert.equal(majorVersion('90624'), 9);
    assert.equal(majorVersion('17.2'), 17);
    assert.throws(() => majorVersion('nothing here'));
  });

  test('redact: the URL and the password, encoded or not, never come through', () => {
    const url = 'postgresql://owner:p%40ss@db.example.net:6543/railway';
    const text = `could not connect to ${url}; password p@ss and p%40ss rejected`;
    const out = redact(text, url);
    assert.ok(!out.includes('p@ss') && !out.includes('p%40ss') && !out.includes(url), out);
    assert.match(out, /<database URL>/);
  });

  test('the tables in a pg_restore listing: TABLE entries, not their data or comments', () => {
    const list = [
      ';',
      '; Archive created at 2026-11-13 14:25:30 UTC',
      '216; 1259 16390 TABLE public destinations postgres',
      '217; 1259 16400 TABLE public users postgres',
      '3401; 0 16390 TABLE DATA public destinations postgres',
      '3230; 2606 16410 CONSTRAINT public destinations destinations_pkey postgres',
      ';218; 1259 16500 TABLE public commented_out postgres'
    ].join('\n');
    assert.deepEqual(tablesInList(list), ['public.destinations', 'public.users']);
  });

  test('sizes', () => {
    assert.equal(formatBytes(900), '900 bytes');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  });
});

const pgDump = findPgTool('pg_dump');
const pgRestore = findPgTool('pg_restore');

describe('db:backup against the local test database', { timeout: 5 * 60_000 }, () => {
  let out: string;
  let skip: string | false = false;
  // Keeps the *_test convention: a scratch database on the test server, dropped after.
  const restoreDb = `${new URL(TEST_URL).pathname.slice(1).replace(/_test$/, "")}_restore_test`;
  const admin = async (sql: string) => {
    const client = new Client({ connectionString: TEST_URL });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }
  };

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    out = mkdtempSync(join(tmpdir(), 'site-backup-'));
    if (!pgDump || !pgRestore) {
      skip = 'pg_dump or pg_restore not found';
      return;
    }
    const tool = majorVersion(execFileSync(pgDump, ['--version'], { encoding: 'utf8' }));
    const { rows } = await pool.query<{ num: string }>(`select current_setting('server_version_num') as num`);
    const server = majorVersion(rows[0].num);
    if (tool < server) skip = `pg_dump ${tool} is older than the test server (${server})`;
  }, HOOK_TIMEOUT);

  after(async () => {
    rmSync(out, { recursive: true, force: true });
    await admin(`drop database if exists "${restoreDb}"`).catch(() => undefined);
    await pool.end();
  }, HOOK_TIMEOUT);

  test('a custom-format dump, its size and table count, and no URL or password in what it prints', async (t) => {
    if (skip) return t.skip(skip);
    const run = spawnSync(process.execPath, ['--import', 'tsx', join(ROOT, 'scripts', 'db-backup.ts'), '--out', out], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: TEST_URL }
    });
    const printed = `${run.stdout}${run.stderr}`;
    assert.equal(run.status, 0, printed);

    const files = readdirSync(out);
    assert.equal(files.length, 1, `one file, no .partial left: ${files.join(', ')}`);
    assert.match(files[0], /^\d{4}-\d{2}-\d{2}-\d{6}\.dump$/);
    assert.equal(readFileSync(join(out, files[0])).subarray(0, 5).toString(), 'PGDMP', "pg_dump's custom format");

    const { rows } = await pool.query<{ n: string }>(
      `select count(*) as n from information_schema.tables where table_type = 'BASE TABLE' and table_schema not in ('pg_catalog', 'information_schema')`
    );
    const tables = Number(rows[0].n);
    assert.ok(tables > 20, `the test database's tables: ${tables}`);
    assert.match(printed, new RegExp(`tables: ${tables} in the dump, ${tables} in the database`));
    assert.match(printed, /size: {3}[\d.]+ (KB|MB|GB|bytes) \(\d+ bytes\)/);
    assert.match(printed, /pg_dump: {2}pg_dump \(PostgreSQL\) \d+/);

    const parsed = new URL(TEST_URL);
    assert.ok(!printed.includes(TEST_URL), 'never the URL');
    if (parsed.password) assert.ok(!printed.includes(decodeURIComponent(parsed.password)), 'never the password');
  });

  test("it restores into an empty database with the runbook's command", async (t) => {
    if (skip) return t.skip(skip);
    const [file] = readdirSync(out);
    assert.ok(file && existsSync(join(out, file)), 'the dump from the test above');
    await admin(`drop database if exists "${restoreDb}"`);
    await admin(`create database "${restoreDb}"`);
    const target = new URL(TEST_URL);
    target.pathname = `/${restoreDb}`;
    const env: NodeJS.ProcessEnv = { ...process.env, ...pgEnvironment(target.toString(), 'site-db-restore-test') };
    delete env.PGOPTIONS; // Restoring writes.
    const restore = spawnSync(pgRestore!, ['--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', '--dbname', restoreDb, join(out, file)], { env, encoding: 'utf8' });
    assert.equal(restore.status, 0, redact(restore.stderr, TEST_URL));

    const client = new Client({ connectionString: target.toString() });
    await client.connect();
    try {
      const restored = await client.query<{ n: string }>(`select count(*) as n from public.destinations`);
      const original = await pool.query<{ n: string }>(`select count(*) as n from public.destinations`);
      assert.equal(restored.rows[0].n, original.rows[0].n, 'the rows came back');
      const migrations = await client.query<{ n: string }>(`select count(*) as n from public.schema_migrations`);
      assert.ok(Number(migrations.rows[0].n) > 20, 'with the migration ledger, so migrate sees it as up to date');
    } finally {
      await client.end();
    }
  });

  test('--prod refuses without a terminal, before connecting anywhere', (t) => {
    if (skip) return t.skip(skip);
    const run = spawnSync(process.execPath, ['--import', 'tsx', join(ROOT, 'scripts', 'db-backup.ts'), '--prod', '--out', out], {
      cwd: ROOT,
      encoding: 'utf8',
      input: '',
      env: { ...process.env, PROD_DATABASE_URL: 'postgresql://owner:secret-word@prod.example.invalid:6543/railway?sslmode=require' }
    });
    assert.notEqual(run.status, 0);
    const printed = `${run.stdout}${run.stderr}`;
    assert.match(printed, /interactive terminal/);
    assert.ok(!printed.includes('secret-word'), 'never the password');
  });
});
