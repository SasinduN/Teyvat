/**
 * The one Postgres pool for the process.
 *
 * A pool, not a client: every HTTP request borrows a connection and gives it
 * back, so a slow query cannot serialise the whole service behind it.
 */
// Side-effect import: must run before any query so rows arrive in the shapes
// shared/database.types.ts declares. See that file for what breaks otherwise.
import '../../shared/pg-types';

import pg from 'pg';

import { connectionTargetFor } from '../../shared/pg-connection';
import { env } from './env';

const target = connectionTargetFor(env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: target.connectionString,
  ssl: target.ssl,
  application_name: 'teyvat-api',

  /**
   * Railway's Postgres allows a bounded number of connections, and every
   * replica of this service keeps its own pool. Ten is comfortable for one
   * replica; raise it only alongside checking `max_connections`.
   */
  max: 10,

  /** Return idle connections rather than holding them open indefinitely. */
  idleTimeoutMillis: 30_000,

  /**
   * Fail a request that cannot get a connection instead of hanging on it. A
   * request that waits forever looks identical to a hung service from outside.
   */
  connectionTimeoutMillis: 10_000
});

/**
 * An idle pooled connection can be dropped by the server or the network at any
 * time. Without a listener, node-postgres emits that as an unhandled `error`
 * event on the pool and takes the whole process down — losing every in-flight
 * request over one dead socket. The pool discards the bad connection itself, so
 * logging is the correct response.
 */
pool.on('error', (error) => {
  console.error('[db] idle client error:', error.message);
});

/** True when the database answers, not merely when a URL is configured. */
export async function databaseReachable(): Promise<boolean> {
  try {
    await pool.query('select 1');
    return true;
  } catch (error) {
    console.error('[db] health probe failed:', (error as Error).message);
    return false;
  }
}
