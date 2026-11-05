/**
 * Lists every stored image URL the Content-Security-Policy would block,
 * meaning one not on the allow-list in `shared/image-hosts.ts` (Unsplash,
 * plus our R2 bucket from R2_PUBLIC_BASE_URL).
 *
 *   npm run images:audit
 *   npm run images:audit -- --prod   # production (PROD_DATABASE_URL), after confirming
 *
 * Read-only, and enforced as such: the connection is opened with
 * `default_transaction_read_only=on`, so Postgres itself refuses any write.
 * Runs against the local DATABASE_URL, or with --prod PROD_DATABASE_URL
 * (shared/database-target.ts). Prints the target first. Content rows only: no personal data is read.
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { scriptDatabaseUrl } from '../shared/database-target';
import { allowedImageOrigins } from '../shared/image-hosts';
import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';
import { r2Config } from '../server/src/env';
import { auditImages, storedImages } from '../server/src/media/maintenance';
import { auditAssets, type AssetAudit } from '../server/src/media/migrate-assets';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { prod: { type: 'boolean', default: false } }, strict: true });
  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'images:audit' });
  const target = connectionTargetFor(url);

  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: 'teyvat-images-audit',
    options: '-c default_transaction_read_only=on'
  });
  await client.connect();

  try {
    const where = new URL(target.connectionString);
    const { rows } = await client.query<{ db: string; ro: string }>(
      "select current_database() as db, current_setting('default_transaction_read_only') as ro"
    );
    console.log(`database: ${rows[0].db} on ${where.hostname}:${where.port || '(default port)'}  read-only: ${rows[0].ro}`);
    if (rows[0].ro !== 'on') throw new Error('The connection is not read-only. Stopping.');

    const origins = allowedImageOrigins(r2Config?.publicBaseUrl ?? null);
    console.log(`allowed image origins: ${origins.join(', ')}`);
    if (!r2Config) console.log('(R2 is not configured in this environment, so uploaded images would count as blocked.)');

    const all = await storedImages(client);
    const blocked = await auditImages(client, origins);
    console.log(`\nstored image URLs: ${all.length}`);

    const byOrigin = new Map<string, number>();
    for (const img of all) {
      let origin = '(not a URL)';
      try {
        origin = new URL(img.url).origin;
      } catch {
        // counted under "(not a URL)"
      }
      byOrigin.set(origin, (byOrigin.get(origin) ?? 0) + 1);
    }
    for (const [origin, n] of [...byOrigin].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(5)}  ${origin}${origins.includes(origin) ? '' : '   <- not allowed'}`);
    }

    if (blocked.length === 0) {
      console.log('\nResult: nothing would be blocked. Safe to deploy the CSP.');
    } else {
      console.log(`\nResult: ${blocked.length} image URL(s) would be blocked. Re-upload these first:`);
      for (const img of blocked) console.log(`  ${img.table}/${img.id}  ${img.column}  ${img.url}`);
      process.exitCode = 2;
    }

    // Whether public/assets/ can go (docs: images:migrate-assets). Rows alone don't
    // answer that: the code swaps URLs as it reads, so a row on R2 can still show a local file.
    const assets = await auditAssets(client);
    const line = ({ table, id, column, url }: AssetAudit['rowsHoldingAssets'][number]) => `  ${table}/${id}  ${column}  ${url}`;
    console.log(`\npublic/assets/:`);
    console.log(`  rows holding an /assets/ path: ${assets.rowsHoldingAssets.length}`);
    console.log(`  rows showing an /assets/ file: ${assets.rowsShowingAssets.length}`);
    console.log(`  photos the code uses, not in R2: ${assets.photosNotInR2.length}${assets.photosNotInR2.length ? ` (${assets.photosNotInR2.join(', ')})` : ''}`);
    for (const row of assets.rowsHoldingAssets) console.log(line(row));
    for (const row of assets.rowsShowingAssets) console.log(line(row));
    const clean = assets.rowsHoldingAssets.length + assets.rowsShowingAssets.length + assets.photosNotInR2.length === 0;
    console.log(clean ? 'Result: nothing depends on public/assets/. Safe to remove the files.' : 'Result: public/assets/ is still needed.');
    if (!clean) process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\nimages:audit failed: ${error instanceof Error ? error.message : error}`);
  const hint = privateHostHint(error);
  if (hint) console.error(hint);
  process.exit(1);
});
