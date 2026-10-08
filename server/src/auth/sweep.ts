/**
 * Housekeeping: at boot, then hourly.
 *
 * Two kinds of delete:
 *
 * - Tidy-up. Expired sessions are already refused by `expires_at > now()`,
 *   and the rate limits read at most 24 hours back. Deleting old rows only
 *   stops the tables growing forever.
 * - Retention, which the privacy policy promises:
 *     closed enquiries    12 months after they were closed
 *     spam enquiries      30 days after they arrived
 *   `new` and `contacted` enquiries are never deleted automatically.
 */
import { pool } from '../db';

const HOUR_MS = 60 * 60 * 1000;

export const CLOSED_INQUIRY_RETENTION = '12 months';
export const SPAM_INQUIRY_RETENTION = '30 days';

export interface SweepResult {
  sessions: number;
  loginAttempts: number;
  inquiryAttempts: number;
  newsletterAttempts: number;
  closedInquiries: number;
  spamInquiries: number;
}

/** One pass. Exported for the tests; the timer below runs it in production. */
export async function runSweep(): Promise<SweepResult> {
  const count = async (sql: string) => (await pool.query(sql)).rowCount ?? 0;

  return {
    sessions: await count('delete from public.sessions where expires_at <= now()'),
    loginAttempts: await count(
      "delete from public.login_attempts where attempted_at < now() - interval '24 hours'"
    ),
    inquiryAttempts: await count(
      "delete from public.inquiry_attempts where attempted_at < now() - interval '24 hours'"
    ),
    newsletterAttempts: await count(
      "delete from public.newsletter_attempts where window_started < now() - interval '24 hours'"
    ),
    closedInquiries: await count(
      `delete from public.inquiries
        where status = 'closed' and closed_at < now() - interval '${CLOSED_INQUIRY_RETENTION}'`
    ),
    spamInquiries: await count(
      `delete from public.inquiries
        where spam and created_at < now() - interval '${SPAM_INQUIRY_RETENTION}'`
    )
  };
}

async function sweep(): Promise<void> {
  try {
    const r = await runSweep();
    const parts = Object.entries(r).filter(([, n]) => n > 0);
    if (parts.length > 0) {
      // Counts only: never anything about the rows themselves.
      console.log(`[sweep] deleted ${parts.map(([what, n]) => `${n} ${what}`).join(', ')}`);
    }
  } catch (error) {
    // A failed sweep is retried next hour; it must never take the process down.
    console.error('[sweep] failed:', (error as Error).message);
  }
}

/** Starts the sweep. Call the returned function at shutdown. */
export function startSweep(): () => void {
  void sweep();
  const timer = setInterval(() => void sweep(), HOUR_MS);
  return () => clearInterval(timer);
}
