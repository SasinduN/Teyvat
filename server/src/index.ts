/**
 * Process entry point.
 *
 * Migrations are NOT run from here — the start command does
 * `npm run migrate && node server/dist/index.js`, so a failed migration stops
 * the deploy before any traffic reaches a half-migrated schema. Running them
 * in-process would start serving first and migrate second.
 */
import { createApp } from './app';
import { pool } from './db';
import { env } from './env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on :${env.PORT} (${env.NODE_ENV})`);
});

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
