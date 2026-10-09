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

import { connectionTargetFor, isRailwayInternal } from '../../shared/pg-connection';
import { env, isProduction } from './env';

const target = connectionTargetFor(env.DATABASE_URL);

/**
 * The deployed service should reach Postgres over Railway's private network
 * (`${{Postgres.DATABASE_URL}}`), where no TLS is needed. Anything else, such
 * as the public proxy URL pasted in by mistake, means traffic crossing the
 * internet with an unverified certificate (`shared/pg-connection.ts`). Warn
 * rather than refuse: a variable mistake shouldn't take the site down. The
 * URL itself is never logged.
 */
if (isProduction && !isRailwayInternal(env.DATABASE_URL)) {
  console.warn("[db] DATABASE_URL is not Railway's internal URL; the service should use ${{Postgres.DATABASE_URL}}.");
}

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
