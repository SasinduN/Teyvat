/**
 * Lists every stored image URL the Content-Security-Policy would block,
 * meaning one not on the allow-list in `shared/image-hosts.ts` (Unsplash,
 * R2's custom domain, our R2 bucket from R2_PUBLIC_BASE_URL, and during a move
 * the old one from R2_PREVIOUS_PUBLIC_BASE_URL).
 *
 *   npm run images:audit
 *   npm run images:audit -- --prod   # production (PROD_DATABASE_URL), after confirming
 *   npm run images:audit -- --prod --previous-base https://pub-….r2.dev
 *
 * During a move (docs/runbooks/move-r2-to-client.md) both bases are accepted:
 * the old one from --previous-base (or R2_PREVIOUS_PUBLIC_BASE_URL), and every
 * URL still on it is counted, so "0 on the previous base" is the sign the
 * rows have all moved. Your local .env's R2_PUBLIC_BASE_URL is the other base;
 * --r2-base overrides it, for when it isn't production's.
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
import { normaliseBaseUrl, previousR2Base, r2Config } from '../server/src/env';
import { auditImages, columnsMentioning, storedImages } from '../server/src/media/maintenance';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      prod: { type: 'boolean', default: false },
      'r2-base': { type: 'string' },
      'previous-base': { type: 'string' }
    },
    strict: true
  });
  const httpsBase = (flag: string, value: string | undefined): string | null => {
    if (value === undefined) return null;
    const base = normaliseBaseUrl(value);
    if (!/^https:\/\/[^\s/]+/.test(base)) throw new Error(`--${flag} must be an https:// URL.`);
    return base;
  };
  const currentBase = httpsBase('r2-base', values['r2-base']) ?? r2Config?.publicBaseUrl ?? null;
  const previousBase = httpsBase('previous-base', values['previous-base']) ?? previousR2Base;
  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'images:audit' });
  const target = connectionTargetFor(url);

  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: 'site-images-audit',
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

    const origins = allowedImageOrigins(currentBase, previousBase);
    console.log(`allowed image origins: ${origins.join(', ')}`);
    if (!currentBase) console.log('(R2 is not configured in this environment, so uploaded images would count as blocked.)');

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

    if (previousBase) {
      // Every table, not just the image columns: the media library and the credits too.
      const left = Object.entries(await columnsMentioning(client, previousBase));
      console.log(`\nstill mentioning the previous base (${previousBase}): ${left.length === 0 ? 'nothing, every row has moved' : ''}`);
      for (const [column, n] of left) console.log(`  ${String(n).padStart(5)}  ${column}`);
    }

    if (blocked.length === 0) {
      console.log('\nResult: nothing would be blocked. Safe to deploy the CSP.');
    } else {
      console.log(`\nResult: ${blocked.length} image URL(s) would be blocked. Re-upload these first:`);
      for (const img of blocked) console.log(`  ${img.table}/${img.id}  ${img.column}  ${img.url}`);
      process.exitCode = 2;
    }
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
