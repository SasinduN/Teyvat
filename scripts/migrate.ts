/**
 * Migration runner for the self-managed Railway Postgres.
 *
 *   npm run migrate                 # apply every pending file, in order
 *   npm run migrate -- --dry-run    # list what would be applied, touch nothing
 *
 * Applied files are recorded in `public.schema_migrations`, so this is safe to
 * run on every boot — the Railway start command is
 * `npm run migrate && node server/dist/index.js`.
 *
 * ---------------------------------------------------------------------------
 * Why this instead of node-pg-migrate or psql
 * ---------------------------------------------------------------------------
 * node-pg-migrate wraps the run in its own transaction. `0002_seed.sql` opens
 * with `begin;` and ends with `commit;`, and a nested BEGIN makes Postgres warn
 * ("there is already a transaction in progress") while the file's COMMIT closes
 * the *runner's* outer transaction, stranding its bookkeeping writes outside
 * it. Using it would mean editing the generated seed file.
 *
 * psql would work locally (this machine has PostgreSQL 18 installed), but the
 * binary is not guaranteed in Railway's Nixpacks image, which is where these
 * migrations actually run on deploy — and it keeps no record of what has
 * already been applied, which is the part that matters most.
 *
 * So: each file owns its own transaction, and this runner only decides which
 * files to hand to the server and in what order.
 * ---------------------------------------------------------------------------
 */
import '../shared/load-env';

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '../db/migrations');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Session-level advisory lock, so two Railway replicas booting at the same
 * moment cannot interleave their migration runs. Session-level (not `_xact_`)
 * is required: the migration files commit mid-run, and a transaction-scoped
 * lock would be released by the first `commit;`.
 *
 * The value is arbitrary — it only has to be identical in every replica.
 * 0x746579766174 is "teyvat" in ASCII, which makes it self-documenting if it
 * ever shows up in `pg_locks`.
 */
const LOCK_ID = '127979178320244'; // 0x746579766174

/** `0001_init.sql` — four digits, snake_case, nothing else. */
const FILENAME_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'DATABASE_URL is not set.\n\n' +
        '  Railway:  it is injected automatically once the Postgres service is\n' +
        '            attached — use the internal `*.railway.internal` URL.\n' +
        '  Local:    put it in .env (or .env.local) in the project root:\n' +
        '              DATABASE_URL=postgresql://user:pass@host:5432/railway\n' +
        '            or pass it inline:\n' +
        '              DATABASE_URL=postgresql://... npm run migrate'
    );
    process.exit(1);
  }

  return url;
}

/**
 * `*.railway.internal` resolves only inside Railway's private network, so the
 * same DATABASE_URL that is correct for the deployed service is a guaranteed
 * ENOTFOUND anywhere else.
 *
 * This is keyed off the actual DNS failure rather than off an environment
 * variable such as RAILWAY_ENVIRONMENT. Those variables can be present in a
 * local shell as well as in a deployed container, so treating them as "we are
 * running inside Railway" suppresses this hint in exactly the case that needs
 * it. The DNS result cannot be wrong about it.
 */
function explainIfPrivateHost(error: unknown): boolean {
  const e = error as { code?: string; hostname?: string };
  const host = e.hostname ?? '';

  if ((e.code !== 'ENOTFOUND' && e.code !== 'EAI_AGAIN') || !host.endsWith('.railway.internal')) {
    return false;
  }

  console.error(
    `\n${host} is on Railway's private network and does not resolve from here.\n\n` +
      'That URL is the right one for the deployed service, where this runs from\n' +
      'the start command and the database is reachable privately. It cannot work\n' +
      'from a local machine.\n\n' +
      'For a local run, put the Postgres service\'s DATABASE_PUBLIC_URL\n' +
      '(*.proxy.rlwy.net, from its Variables tab) in .env as DATABASE_URL, with\n' +
      '`?sslmode=require` appended.'
  );
  return true;
}

interface ConnectionTarget {
  connectionString: string;
  ssl: false | { rejectUnauthorized: boolean };
}

/**
 * Decides TLS here rather than letting the connection string do it.
 *
 * `sslmode` in the URL is interpreted by pg-connection-string, and in pg 8.x
 * `require` is treated as `verify-full` — full certificate verification — while
 * pg 9 will switch it to libpq semantics (encrypt, do not verify). Those are
 * opposite behaviours from the same URL, and whichever one you rely on breaks
 * on upgrade. Worse, the parsed value wins over the `ssl` option passed
 * alongside it, so a relaxed setting there is silently ignored.
 *
 * So: read `sslmode` only as a yes/no signal for "use TLS", strip it, and state
 * the verification policy explicitly.
 *
 * `rejectUnauthorized: false` is deliberate and is a real trade-off. Railway's
 * TCP proxy presents a self-signed certificate that chains to nothing in the
 * default CA store, so verification cannot succeed without pinning their CA.
 * The connection is still encrypted, which defeats passive eavesdropping on the
 * public internet, but it does not authenticate the server — an active
 * machine-in-the-middle would not be detected. That is acceptable for applying
 * migrations from a laptop, and it is another reason the deployed service should
 * use the internal `*.railway.internal` URL, where traffic never leaves
 * Railway's private network and needs no TLS at all.
 */
function connectionTargetFor(url: string): ConnectionTarget {
  const parsed = new URL(url);
  const mode = parsed.searchParams.get('sslmode');

  // Remove anything that would re-engage pg's own SSL handling.
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');

  return {
    connectionString: parsed.toString(),
    ssl: mode !== null && mode !== 'disable' ? { rejectUnauthorized: false } : false
  };
}

function listMigrationFiles(): string[] {
  const entries = readdirSync(MIGRATIONS_DIR);

  const stray = entries.filter((name) => !FILENAME_PATTERN.test(name));
  if (stray.length > 0) {
    console.error(
      `Unexpected file(s) in db/migrations:\n  ${stray.join('\n  ')}\n\n` +
        'Migrations must be named NNNN_name.sql (e.g. 0003_add_reviews.sql).\n' +
        'Refusing to run rather than guess whether these should be applied.'
    );
    process.exit(1);
  }

  // Byte-lexical sort. The four-digit zero-padded prefix is what makes this
  // the same as numeric order.
  return entries.sort();
}

/**
 * Each file must wrap itself in `begin;` / `commit;`, because this runner
 * deliberately does not open a transaction of its own. Without one, a file
 * that fails halfway through would leave the schema partly applied in
 * autocommit — and the ledger would still say it had never run.
 */
function assertSelfContainedTransaction(name: string, sql: string): void {
  if (!/^begin;\s*$/m.test(sql) || !/^commit;\s*$/m.test(sql)) {
    console.error(
      `${name} does not wrap itself in \`begin;\` ... \`commit;\`.\n` +
        'The runner does not open a transaction, so every migration must open ' +
        'its own or a partial failure will leave the schema inconsistent.'
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const rawUrl = requireDatabaseUrl();
  const target = connectionTargetFor(rawUrl);
  const files = listMigrationFiles();

  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: 'teyvat-migrate'
  });

  await client.connect();

  let locked = false;
  try {
    // Fail loudly rather than hang forever if a previous run died holding the
    // lock, or if a replica is wedged.
    await client.query("set lock_timeout = '60s'");
    await client.query('select pg_advisory_lock($1::bigint)', [LOCK_ID]);
    locked = true;

    // Say which database this actually is, every run. Connection strings get
    // copied between projects and environments, and "which database did that
    // just go into?" is not a question you want to ask afterwards.
    const where = new URL(target.connectionString);
    const { rows: idRows } = await client.query<{ db: string; ver: string }>(
      "select current_database() as db, current_setting('server_version') as ver"
    );
    console.log(
      `connected: ${idRows[0]?.db} on ${where.hostname}:${where.port || 5432} ` +
        `(PostgreSQL ${idRows[0]?.ver}, tls ${target.ssl ? 'on, unverified' : 'off'})\n`
    );

    // A dry run must not write, so it does not create the ledger — it reports a
    // missing ledger as "nothing applied yet" instead. Creating a table is a
    // surprising thing for a --dry-run to leave behind, and doubly so if the
    // connection string turns out to point somewhere unintended.
    if (!DRY_RUN) {
      await client.query(`
        create table if not exists public.schema_migrations (
          filename   text primary key,
          applied_at timestamptz not null default now()
        );
      `);
    }

    const ledgerExists =
      (
        await client.query<{ exists: boolean }>(
          "select to_regclass('public.schema_migrations') is not null as exists"
        )
      ).rows[0]?.exists ?? false;

    const applied = new Set<string>();
    if (ledgerExists) {
      const { rows } = await client.query<{ filename: string }>(
        'select filename from public.schema_migrations'
      );
      for (const r of rows) applied.add(r.filename);
    }

    const pending = files.filter((name) => !applied.has(name));

    if (pending.length === 0) {
      console.log(`Up to date — ${applied.size} migration(s) already applied.`);
      return;
    }

    if (DRY_RUN) {
      console.log(`${pending.length} pending migration(s):`);
      for (const name of pending) console.log(`  ${name}`);
      console.log('\nNothing was applied (--dry-run).');
      return;
    }

    for (const name of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
      assertSelfContainedTransaction(name, sql);

      process.stdout.write(`applying ${name} ... `);
      const started = Date.now();

      // Sent as one simple-protocol query, so the file's own `begin;` /
      // `commit;` and its dollar-quoted blocks reach the server untouched.
      await client.query(sql);

      // Recorded immediately after, in its own statement — it cannot be part
      // of the file's transaction, because the file has already committed.
      // The gap is covered by both migrations being idempotent: a crash here
      // costs one harmless re-run, not a broken schema. Keep new migrations
      // idempotent for the same reason.
      await client.query(
        'insert into public.schema_migrations (filename) values ($1) on conflict do nothing',
        [name]
      );

      console.log(`ok (${Date.now() - started}ms)`);
    }

    console.log(`\nApplied ${pending.length} migration(s).`);
  } finally {
    if (locked) {
      await client.query('select pg_advisory_unlock($1::bigint)', [LOCK_ID]);
    }
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nMigration failed: ${message}`);

  if (explainIfPrivateHost(error)) {
    process.exit(1);
  }

  // Postgres tells us exactly where in the file it gave up; without this the
  // only clue is a line number nobody can map back to a 490-line migration.
  const detail = error as { detail?: string; hint?: string; position?: string };
  if (detail.detail) console.error(`  detail:   ${detail.detail}`);
  if (detail.hint) console.error(`  hint:     ${detail.hint}`);
  if (detail.position) console.error(`  position: character ${detail.position}`);

  process.exit(1);
});
