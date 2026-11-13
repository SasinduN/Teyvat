/**
 * Moves every stored image URL from one base to another: for switching R2
 * from its r2.dev address to a custom domain.
 *
 *   npm run media:rebase -- --from https://pub-….r2.dev --to https://media.example.lk --dry-run
 *   npm run media:rebase -- --from https://pub-….r2.dev --to https://media.example.lk
 *   … --prod   # production (PROD_DATABASE_URL), after confirming
 *
 * Rewrites `media.url` and every image column in one transaction. --dry-run
 * reports the counts and rolls back. Runs against the local DATABASE_URL, or
 * with --prod PROD_DATABASE_URL (shared/database-target.ts), and prints the target first. Set R2_PUBLIC_BASE_URL to
 * the new base, in Railway and .env, in the same change.
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { scriptDatabaseUrl } from '../shared/database-target';
import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';
import { rebaseMedia } from '../server/src/media/maintenance';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      prod: { type: 'boolean', default: false }
    },
    strict: true
  });
  if (!values.from || !values.to) throw new Error('Both --from and --to are required.');

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
    console.log(`${values['dry-run'] ? 'DRY RUN: ' : ''}${values.from} -> ${values.to}\n`);

    await client.query('begin');
    const result = await rebaseMedia(client, values.from, values.to);
    console.log(`  media library rows: ${result.media}`);
    for (const [column, n] of Object.entries(result.columns)) {
      if (n > 0) console.log(`  ${column}: ${n}`);
    }

    if (values['dry-run']) {
      await client.query('rollback');
      console.log('\nNothing was changed (--dry-run).');
    } else {
      await client.query('commit');
      console.log('\nDone. Set R2_PUBLIC_BASE_URL to the new base in Railway and .env.');
    }
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
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
