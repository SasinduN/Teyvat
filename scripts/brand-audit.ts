/**
 * Lists the rows that still name an earlier brand or the placeholder: the
 * table, the row's id and the column, so each can be fixed in the admin. It
 * never prints the text itself (server/src/brand-audit.ts).
 *
 *   npm run brand:audit
 *   npm run brand:audit -- --prod   # production (PROD_DATABASE_URL), after typing the host back
 *
 * Read-only, and enforced as such: the connection is opened with
 * `default_transaction_read_only=on`, so Postgres itself refuses any write.
 * People's data (accounts, enquiries, subscribers, bookings) is never read.
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import { Client } from 'pg';

import { scriptDatabaseUrl } from '../shared/database-target';
import { connectionTargetFor } from '../shared/pg-connection';
import { findOldBrand, PERSONAL_TABLES } from '../server/src/brand-audit';

/** Where each table is edited, for the report. */
const WHERE_TO_FIX: Record<string, string> = {
  site_settings: 'Admin → Settings',
  media: 'Admin → Media (an R2 file name: upload it again under a new name, then delete the old one)',
  image_credits: 'Admin → Photo credits',
  content_imports: 'nothing to fix: the record of `npm run content:import`'
};

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { prod: { type: 'boolean', default: false } }, strict: true });
  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'brand:audit' });
  const target = connectionTargetFor(url);

  const client = new Client({
    connectionString: target.connectionString,
    ssl: target.ssl,
    application_name: 'site-brand-audit',
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
    console.log(`not read (people's data): ${PERSONAL_TABLES.join(', ')}\n`);

    const hits = await findOldBrand(client);
    if (hits.length === 0) {
      console.log('Nothing names an earlier brand or the placeholder.');
      return;
    }
    console.log(`${hits.length} field(s) name an earlier brand or the placeholder:\n`);
    let table = '';
    for (const hit of hits) {
      if (hit.table !== table) {
        table = hit.table;
        console.log(`${table}  (${WHERE_TO_FIX[table] ?? `Admin → ${table.replace(/_/g, ' ')}`})`);
      }
      console.log(`  ${hit.id}  ${hit.column}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  // The message only: a pg error's detail can quote row values.
  console.error(`brand:audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
