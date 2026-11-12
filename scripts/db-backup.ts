/**
 * A full pg_dump of the database, in pg_dump's custom format, to
 * `backups/<date>-<time>.dump` (UTC; `backups/` is git-ignored).
 *
 *   npm run db:backup                 # the local DATABASE_URL
 *   npm run db:backup -- --prod       # production (PROD_DATABASE_URL), after typing the host back
 *   npm run db:backup -- --out <dir>  # somewhere else
 *
 * - Reads only: pg_dump takes a consistent snapshot, and the session is
 *   read-only (`default_transaction_read_only`).
 * - Never prints the URL or the password. pg_dump gets them through libpq's
 *   environment variables (PGHOST, PGPASSWORD…), not its command line, and
 *   anything it prints is redacted first.
 * - Stops before dumping if this pg_dump is older than the server: an older
 *   pg_dump can't read a newer server's catalogue. It prints both versions.
 * - Writes `<name>.partial` and renames it only when pg_dump succeeded, so a
 *   file without the suffix is a whole dump.
 * - Ends with the file's size and its table count, read back from the file
 *   with `pg_restore --list`, against the database's own count.
 *
 * Restoring: docs/runbooks/restore-from-backup.md.
 */
import '../shared/load-env';

import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { scriptDatabaseUrl } from '../shared/database-target';
import { connectionTargetFor } from '../shared/pg-connection';
import {
  backupFileName,
  findPgTool,
  formatBytes,
  majorVersion,
  pgEnvironment,
  redact,
  tablesInList,
  URL_VARIABLES
} from '../server/src/backup';

const ROOT = resolve(import.meta.dirname, '..');
const APP_NAME = 'site-db-backup';

function fail(message: string): never {
  console.error(`db:backup: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { prod: { type: 'boolean', default: false }, out: { type: 'string' } },
    strict: true
  });
  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'db:backup' });

  const pgDump = findPgTool('pg_dump') ?? fail('pg_dump not found. Install the PostgreSQL client tools, or set PG_BIN to their folder.');
  const pgRestore = findPgTool('pg_restore') ?? fail('pg_restore not found (it checks the finished file). Set PG_BIN to the PostgreSQL bin folder.');

  // What the server is and holds, over a read-only connection.
  const target = connectionTargetFor(url);
  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: APP_NAME,
    options: '-c default_transaction_read_only=on'
  });
  let database: string;
  let serverVersion: string;
  let serverTables: number;
  try {
    await client.connect();
    const { rows } = await client.query<{ db: string; version: string; num: string; tables: string }>(
      `select current_database() as db, current_setting('server_version') as version,
              current_setting('server_version_num') as num,
              (select count(*) from information_schema.tables
                where table_type = 'BASE TABLE' and table_schema not in ('pg_catalog', 'information_schema')) as tables`
    );
    database = rows[0].db;
    serverVersion = rows[0].version;
    serverTables = Number(rows[0].tables);
    const serverMajor = majorVersion(rows[0].num);

    const toolVersion = spawnSync(pgDump, ['--version'], { encoding: 'utf8' }).stdout.trim();
    const toolMajor = majorVersion(toolVersion);
    const host = new URL(url).hostname;
    console.log(`database: ${database} on ${host}  (PostgreSQL ${serverVersion})`);
    console.log(`pg_dump:  ${toolVersion}`);
    if (toolMajor < serverMajor) {
      fail(
        `this pg_dump (${toolMajor}) is older than the server (${serverMajor}), and can't dump it. ` +
          `Install the PostgreSQL ${serverMajor} client tools, or set PG_BIN to their bin folder. Nothing was written.`
      );
    }
  } catch (error) {
    // The message only: never the URL.
    fail(`couldn't read the database: ${redact(error instanceof Error ? error.message : String(error), url)}`);
  } finally {
    await client.end().catch(() => undefined);
  }

  const dir = resolve(ROOT, values.out ?? 'backups');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, backupFileName(new Date()));
  const partial = `${file}.partial`;

  // A clean environment for pg_dump: libpq's variables, and none of the URLs.
  const env: NodeJS.ProcessEnv = { ...process.env, ...pgEnvironment(url, APP_NAME) };
  for (const name of URL_VARIABLES) delete env[name];

  console.log(`dumping to ${relative(ROOT, file) || file} …`);
  const dump = spawnSync(pgDump, ['--format=custom', '--no-password', '--file', partial], { env, encoding: 'utf8' });
  if (dump.status !== 0) {
    rmSync(partial, { force: true });
    const detail = redact(`${dump.stderr ?? ''}${dump.error ? ` ${dump.error.message}` : ''}`, url).trim();
    fail(`pg_dump failed (exit ${dump.status ?? 'none'}). Nothing was kept.${detail ? `\n${detail}` : ''}`);
  }
  renameSync(partial, file);

  // Read the file back: a dump pg_restore can list is a dump it can restore.
  const list = spawnSync(pgRestore, ['--list', file], { encoding: 'utf8' });
  if (list.status !== 0) fail(`pg_restore can't read ${file}: ${redact(list.stderr ?? '', url).trim()}`);
  const tables = tablesInList(list.stdout);

  const bytes = statSync(file).size;
  console.log(`\nsaved:  ${relative(ROOT, file) || file}`);
  console.log(`size:   ${formatBytes(bytes)} (${bytes} bytes)`);
  console.log(`tables: ${tables.length} in the dump, ${serverTables} in the database`);
  if (tables.length !== serverTables) fail('the dump has a different number of tables from the database. Keep the file, but check it before relying on it.');
}

main().catch((error: unknown) => {
  console.error(`db:backup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
