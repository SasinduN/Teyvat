/**
 * Process entry point.
 *
 * Migrations are NOT run from here — the start command does
 * `npm run migrate && node server/dist/index.js`, so a failed migration stops
 * the deploy before any traffic reaches a half-migrated schema. Running them
 * in-process would start serving first and migrate second.
 */
import { databaseRefusal } from '../../shared/database-target';
import { createApp } from './app';
import { startSweep } from './auth/sweep';
import { pool } from './db';
import { env } from './env';

// Off Railway, only a local database: a local run must never reach production.
const refusal = databaseRefusal(env.DATABASE_URL, env.NODE_ENV);
if (refusal) {
  console.error(`[api] refusing to start.\n${refusal}`);
  process.exit(1);
}

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on :${env.PORT} (${env.NODE_ENV})`);
});

const stopSweep = startSweep();

/**
 * Railway sends SIGTERM and waits before SIGKILL. Closing the listener first
 * lets in-flight requests finish, then the pool goes so Postgres is not left
 * holding connections from a replica that has gone away.
 */
let shuttingDown = false;

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] ${signal} received, shutting down`);
    stopSweep();

    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });

    // Do not hang forever on a stuck connection if something refuses to close.
    setTimeout(() => {
      console.error('[api] forced exit after 10s');
      process.exit(1);
    }, 10_000).unref();
  });
}
