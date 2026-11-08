/**
 * Researched destinations and attractions (`scripts/content/places.json`) into the
 * database, as unpublished drafts, with their photos copied to R2 and credited. See
 * `server/src/content-import.ts` for exactly what it does, and
 * `docs/reviews/places-sources.md` for where every fact and photo came from.
 *
 *   npm run content:import -- --dry-run          # what it would do; reads only
 *   npm run content:import                       # the local DATABASE_URL (needs R2, or --skip-photos)
 *   npm run content:import -- --prod --dry-run   # production, reading only
 *   npm run content:import -- --prod             # production (PROD_DATABASE_URL), after typing its host back
 *
 * Never overwrites a row edited in the admin, never re-creates one deleted there, and
 * leaves rows it didn't create alone. Safe to run twice. Run it when nobody is editing.
 */
import '../shared/load-env';

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { scriptDatabaseUrl } from '../shared/database-target';
import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';
import { importPlaces, parsePlacesFile } from '../server/src/content-import';
import { mediaFromEnv } from '../server/src/media/media';

const DEFAULT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), 'content', 'places.json');

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      prod: { type: 'boolean', default: false },
      'skip-photos': { type: 'boolean', default: false },
      file: { type: 'string', default: DEFAULT_FILE }
    },
    strict: true
  });
  const dryRun = values['dry-run'];
  const skipPhotos = values['skip-photos'];

  // Checked before anything connects: a bad file stops here.
  const file = parsePlacesFile(JSON.parse(readFileSync(values.file, 'utf8')));
  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'content:import' });
  const media = mediaFromEnv();
  if (!media && !dryRun && !skipPhotos) {
    throw new Error('R2 is not configured: set all five R2_* variables, as on the Railway service (or --skip-photos for a database with no R2).');
  }

  const target = connectionTargetFor(url);
  const client = new Client({ connectionString: target.connectionString, ssl: target.ssl, application_name: 'teyvat-content-import' });
  await client.connect();
  try {
    const { rows } = await client.query<{ db: string }>('select current_database() as db');
    console.log(`database: ${rows[0].db} on ${new URL(target.connectionString).hostname}`);
    console.log(`R2: ${skipPhotos ? '(photos skipped)' : media ? media.publicBaseUrl : '(not configured)'}`);
    console.log(`file: ${file.destinations.length} destinations, ${file.attractions.length} attractions${dryRun ? ' (dry run: nothing is written)' : ''}\n`);

    const outcomes = await importPlaces(client, file, { dryRun, media, skipPhotos, log: (line) => console.log(line) });
    const count = (action: string) => outcomes.filter((o) => o.action === action).length;
    const verb = dryRun ? 'would be' : 'were';
    console.log(
      `\n${count('create')} ${verb} created (as drafts), ${count('update')} ${verb} updated, ${count('unchanged')} unchanged, ` +
        `${count('skip')} left alone, ${count('failed')} failed.`
    );
    const failed = outcomes.filter((o) => o.action === 'failed');
    if (failed.length > 0) {
      console.log('Re-run to retry the failed ones; everything done is not done again.');
      process.exitCode = 2;
    }
    if (!dryRun && count('create') > 0) console.log('Everything new is a draft: review it in the admin, then publish.');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\ncontent:import failed: ${error instanceof Error ? error.message : error}`);
  const hint = privateHostHint(error);
  if (hint) console.error(hint);
  process.exit(1);
});
