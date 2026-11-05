/**
 * Moves the photographs committed in public/assets/ into R2, and points the rows
 * at them. See `server/src/media/migrate-assets.ts` for exactly what it does.
 *
 *   npm run images:migrate-assets -- --dry-run         # the inventory and the plan; changes nothing
 *   npm run images:migrate-assets -- --dry-run --prod  # the same, against production
 *   npm run images:migrate-assets -- --prod            # production, after typing the host back
 *
 * Runs against the local DATABASE_URL, or with --prod PROD_DATABASE_URL
 * (shared/database-target.ts). A real run needs the five R2_* variables, the
 * same values as the Railway service. Prints the target first. Safe to run
 * twice: what is already done is left alone. Run it when nobody is editing, and
 * take a backup first.
 *
 * Afterwards `npm run images:audit` says whether the site still depends on
 * public/assets/.
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { scriptDatabaseUrl } from '../shared/database-target';
import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';
import { mediaFromEnv } from '../server/src/media/media';
import { migrateAssets, planAssetMigration, type AssetPlan } from '../server/src/media/migrate-assets';

function printPlan(plan: AssetPlan): void {
  const moving = plan.photos.filter((p) => !p.skip);
  const uploads = moving.flatMap((p) => p.files.filter((f) => f.action === 'upload'));
  console.log(`Photos in public/assets/: ${plan.photos.length}\n`);

  for (const p of plan.photos) {
    const files = p.files.map((f) => `${f.width}${f.action === 'upload' ? '' : f.action === 'reuse' ? ' (reuse)' : ' (done)'}`).join(', ');
    const left = p.leftOut.length ? `  leaves out ${p.leftOut.join(', ')} (upscaled)` : '';
    console.log(`${p.key.padEnd(16)} ${p.skip ? `SKIP: ${p.skip}` : files}${left}`);
    console.log(`${''.padEnd(16)} ${p.license}, ${p.author}; used by ${p.usedBy}${p.copyInR2 ? `\n${''.padEnd(16)} already in R2: ${p.copyInR2}` : ''}`);
  }

  const list = (title: string, items: string[]) => console.log(`\n${title}: ${items.length ? items.join(', ') : 'none'}`);
  list('Already in R2, 1280 px not uploaded again', moving.filter((p) => p.copyInR2).map((p) => p.key));
  list('Not referenced, skipped', plan.photos.filter((p) => p.skip === 'not referenced').map((p) => p.key));
  list('No clear reusable licence, skipped', plan.photos.filter((p) => p.skip === 'no clear licence').map((p) => p.key));

  const megabytes = uploads.reduce((sum, f) => sum + f.bytes, 0) / (1024 * 1024);
  console.log(`\nWould upload ${uploads.length} file(s), ${megabytes.toFixed(1)} MB.`);
  console.log(`Would repoint ${plan.rows.length} column(s):`);
  for (const row of plan.rows) console.log(`  ${row.table}/${row.id} ${row.column}\n    ${[row.from].flat().join(' ')}\n    -> ${[row.to].flat().join(' ')}`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { 'dry-run': { type: 'boolean', default: false }, prod: { type: 'boolean', default: false } },
    strict: true
  });
  const dryRun = values['dry-run'];

  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'images:migrate-assets' });
  const media = mediaFromEnv();
  if (!media && !dryRun) {
    throw new Error('R2 is not configured: set all five R2_* variables, as on the Railway service.');
  }

  const target = connectionTargetFor(url);
  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: 'teyvat-images-migrate-assets',
    // A dry run can't write, whatever a bug might try: Postgres refuses.
    ...(dryRun ? { options: '-c default_transaction_read_only=on' } : {})
  });
  await client.connect();

  try {
    const where = new URL(target.connectionString);
    const { rows } = await client.query<{ db: string; ready: boolean }>(
      `select current_database() as db, exists (select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'media' and column_name = 'photo_key') as ready`
    );
    console.log(`database: ${rows[0].db} on ${where.hostname}${dryRun ? '  (dry run: read-only)' : ''}`);
    console.log(`R2: ${media ? media.publicBaseUrl : '(not configured)'}\n`);
    if (!rows[0].ready) throw new Error('Migration 0020 has not run on this database. Deploy this branch or run `npm run migrate` first.');

    if (dryRun) {
      printPlan(await planAssetMigration(client, { publicBaseUrl: media?.publicBaseUrl ?? null }));
      console.log('\nNothing was uploaded or changed (--dry-run).');
      return;
    }

    const result = await migrateAssets(client, media!, { log: (line) => console.log(line) });
    const failed = result.photos.filter((p) => p.status === 'failed');
    const moved = result.photos.filter((p) => p.status === 'moved').length;
    const skipped = result.photos.filter((p) => p.status === 'skipped').length;
    console.log(`\n${moved} photo(s) in R2, ${skipped} skipped, ${failed.length} failed; ${result.rowsChanged} column(s) repointed, ${result.rowsFailed.length} failed.`);
    if (failed.length > 0 || result.rowsFailed.length > 0) {
      console.log('Re-run to retry; what is done is left alone.');
      process.exitCode = 2;
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\nimages:migrate-assets failed: ${error instanceof Error ? error.message : error}`);
  const hint = privateHostHint(error);
  if (hint) console.error(hint);
  process.exit(1);
});
