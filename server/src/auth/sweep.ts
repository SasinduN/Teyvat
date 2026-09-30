/**
 * Housekeeping for the auth tables: at boot, then hourly.
 *
 * Neither delete is needed for correctness. Expired sessions are already
 * refused by `expires_at > now()` in the lookup, and the throttle only reads
 * the last 15 minutes of attempts. This just stops both tables growing forever.
 */
import { pool } from '../db';

const HOUR_MS = 60 * 60 * 1000;

async function sweep(): Promise<void> {
  try {
    const sessions = await pool.query('delete from public.sessions where expires_at <= now()');
    const attempts = await pool.query(
      "delete from public.login_attempts where attempted_at < now() - interval '24 hours'"
    );
    if (sessions.rowCount || attempts.rowCount) {
      console.log(
        `[auth] swept ${sessions.rowCount ?? 0} expired session(s), ` +
          `${attempts.rowCount ?? 0} old login attempt(s)`
      );
    }
  } catch (error) {
    // A failed sweep is retried next hour; it must never take the process down.
    console.error('[auth] sweep failed:', (error as Error).message);
  }
}

/** Starts the sweep. Call the returned function at shutdown. */
export function startSweep(): () => void {
  void sweep();
  const timer = setInterval(() => void sweep(), HOUR_MS);
  return () => clearInterval(timer);
}
