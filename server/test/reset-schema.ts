/**
 * Gives the test database a brand-new `public` schema, so the migrations that
 * follow (`migrateTestDatabase`) build every table from scratch.
 *
 * Why: Postgres never reuses a dropped column's slot, and a table can have at
 * most 1,600 columns, dropped ones included. The content reset used to add
 * `tours.route` back and drop it again on every call, so a long-used test
 * database eventually failed with "tables can have at most 1600 columns".
 * With fresh tables for every test file, and the reset no longer altering
 * them (`resetContent` in helpers.ts), that can't build up.
 *
 * Run as its own process by `migrateTestDatabase`. `./test-db` refuses
 * anything but a local database whose name ends in `_test`, and the live
 * connection is checked again before anything is dropped.
 */
import { TEST_DATABASE_NAME, TEST_DATABASE_URL } from './test-db';

import pg from 'pg';

const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query<{ db: string }>('select current_database() as db');
  if (rows[0]?.db !== TEST_DATABASE_NAME || !rows[0].db.endsWith('_test')) {
    throw new Error(`Connected to "${rows[0]?.db}", not the test database. Not dropping anything.`);
  }
  await client.query(`
    drop schema if exists test_seed cascade;
    drop schema if exists public cascade;
    create schema public;
  `);
} finally {
  await client.end();
}
