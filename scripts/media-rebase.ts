/**
 * Moves every stored image URL from one base to another: for switching R2
 * from its r2.dev address to a custom domain, or to another account's bucket
 * (docs/runbooks/move-r2-to-client.md).
 *
 *   npm run media:rebase -- --from https://pub-….r2.dev --to https://images.example.lk --dry-run --verify-files
 *   npm run media:rebase -- --from https://pub-….r2.dev --to https://images.example.lk --verify-files
 *   … --prod   # production (PROD_DATABASE_URL), after typing its host back
 *
 * Rewrites `media.url` (uploads and photo sets), every image column and
 * `image_credits.url`, in one transaction (`runRebase`). Only values that start
 * with `--from` change; a second run changes nothing. Then it lists every
 * column, in any table, that still mentions `--from` (should be none).
 * --dry-run reports all of that and rolls back. --verify-files first asks the
 * new base for every file the database uses (a HEAD each) and stops, changing
 * nothing, if any is missing or isn't an image: proof the copy is complete.
 * Runs against the local DATABASE_URL, or with --prod PROD_DATABASE_URL
 * (shared/database-target.ts), and prints the target first. Copy the objects
 * before, and set R2_PUBLIC_BASE_URL to the new base after (the runbook's order).
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { scriptDatabaseUrl } from '../shared/database-target';
import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';
import { normaliseBaseUrl } from '../server/src/env';
import { missingFiles, runRebase, urlsUnder } from '../server/src/media/maintenance';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'verify-files': { type: 'boolean', default: false },
      prod: { type: 'boolean', default: false }
    },
    strict: true
  });
  if (!values.from || !values.to) throw new Error('Both --from and --to are required.');
  const dryRun = values['dry-run'];

  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'media:rebase' });
  const target = connectionTargetFor(url);
  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: 'site-rebase'
  });
  await client.connect();

  try {
    const where = new URL(target.connectionString);
    const { rows } = await client.query<{ db: string }>('select current_database() as db');
    console.log(`database: ${rows[0].db} on ${where.hostname}`);
    console.log(`${dryRun ? 'DRY RUN: ' : ''}${values.from} -> ${values.to}\n`);

    if (values['verify-files']) {
      const from = normaliseBaseUrl(values.from);
      const to = normaliseBaseUrl(values.to);
      const urls = (await urlsUnder(client, from)).map((stored) => to + stored.slice(from.length));
      console.log(`Checking ${urls.length} file(s) on ${to} ...`);
      const missing = await missingFiles(urls);
      if (missing.length > 0) {
        console.log(`\n${missing.length} file(s) are not on the new base yet. Nothing was changed. Copy them first:`);
        for (const { url: file, problem } of missing.slice(0, 50)) console.log(`  ${problem}  ${file}`);
        if (missing.length > 50) console.log(`  ... and ${missing.length - 50} more`);
        process.exitCode = 2;
        return;
      }
      console.log('Every file is there.\n');
    }

    const result = await runRebase(client, values.from, values.to, { dryRun });
    console.log(`  media library rows (uploads and photo sets): ${result.media}`);
    for (const [column, n] of Object.entries(result.columns)) {
      if (n > 0) console.log(`  ${column}: ${n}`);
    }
    console.log(`  image_credits: ${result.credits}`);
    if (result.creditsAlreadyMoved > 0) {
      console.log(`  image_credits left on the old base (already credited on the new one): ${result.creditsAlreadyMoved}`);
    }
    const total = result.media + result.credits + Object.values(result.columns).reduce((a, b) => a + b, 0);
    if (total === 0) console.log('\nNothing was under the old base: already moved, or the wrong --from.');

    const leftover = Object.entries(result.leftover);
    if (leftover.length === 0) {
      console.log(`\nAfterwards, nothing in any table mentions ${values.from}.`);
    } else {
      console.log(`\nAfterwards, these still mention ${values.from} (not image URLs, so not changed; look at them):`);
      for (const [column, n] of leftover) console.log(`  ${column}: ${n} row(s)`);
    }

    if (dryRun) console.log('\nNothing was changed (--dry-run).');
    else console.log('\nDone. Next: npm run images:audit, then the R2 variables in Railway (the runbook).');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\nmedia:rebase failed: ${error instanceof Error ? error.message : error}`);
  const hint = privateHostHint(error);
  if (hint) console.error(hint);
  process.exit(1);
});
