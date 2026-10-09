/**
 * Copies the Wikimedia Commons photos the content uses into R2, and points
 * the rows (and their photo credits) at the copies. See
 * `server/src/media/import.ts` for exactly what it does.
 *
 *   npm run images:import -- --dry-run    # lists the photos and where each is used
 *   npm run images:import
 *
 * Runs against DATABASE_URL (in the local .env, production through Railway's
 * public proxy, `?sslmode=require`) and needs the five R2_* variables, the
 * same values as the Railway service. Prints the target first. Re-runnable:
 * a photo already copied is no longer found. Run it when nobody is editing.
 *
 * Afterwards, `npm run images:audit` with the branch that removes
 * upload.wikimedia.org from the CSP must report nothing blocked before that
 * branch is merged (docs/LAUNCH-CHECKLIST.md, item 16).
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';
import { importWikimediaImages, wikimediaImagesInUse } from '../server/src/media/import';
import { mediaFromEnv } from '../server/src/media/media';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { 'dry-run': { type: 'boolean', default: false } },
    strict: true
  });
  const dryRun = values['dry-run'];

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const media = mediaFromEnv();
  if (!media && !dryRun) {
    throw new Error('R2 is not configured: set all five R2_* variables, as on the Railway service.');
  }

  const target = connectionTargetFor(url);
  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: 'teyvat-images-import'
  });
  await client.connect();

  try {
    const where = new URL(target.connectionString);
    const { rows } = await client.query<{ db: string }>('select current_database() as db');
    console.log(`database: ${rows[0].db} on ${where.hostname}`);
    console.log(`R2: ${media ? media.publicBaseUrl : '(not configured)'}`);

    const inUse = await wikimediaImagesInUse(client);
    console.log(`Wikimedia photos in use: ${inUse.size}\n`);

    if (dryRun) {
      for (const [photo, uses] of inUse) {
        console.log(photo);
        for (const u of uses) console.log(`    ${u.table}/${u.id}  ${u.column}`);
      }
      console.log('\nNothing was downloaded or changed (--dry-run).');
      return;
    }
    if (inUse.size === 0) {
      console.log('Nothing to do.');
      return;
    }

    const outcomes = await importWikimediaImages(client, media!, { log: (line) => console.log(line) });
    const moved = outcomes.filter((o) => o.status === 'moved');
    const failed = outcomes.filter((o) => o.status === 'failed');
    console.log(`\nCopied ${moved.length} photo(s); ${failed.length} failed.`);
    if (failed.length > 0) {
      for (const f of failed) console.log(`  ${f.url}\n    ${f.reason}`);
      console.log('\nRe-run to retry the failed ones; the copied ones are not touched again.');
      process.exitCode = 2;
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\nimages:import failed: ${error instanceof Error ? error.message : error}`);
  const hint = privateHostHint(error);
  if (hint) console.error(hint);
  process.exit(1);
});
