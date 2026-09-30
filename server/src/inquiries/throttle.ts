/**
 * Rate limit for the public enquiry form, per IP. The login throttle's
 * pattern: rows in Postgres, counted before anything is stored, so the limit
 * holds across redeploys and replicas.
 *
 *   5  per 15 minutes
 *   20 per 24 hours
 *
 * Generous on purpose: Sri Lankan mobile networks put many people behind one
 * shared address, and so do hotels and cafés. Every submission counts,
 * honeypot hits included. The table holds IP and time only.
 */
import { pool } from '../db';

export const INQUIRY_LIMITS = [
  { max: 5, minutes: 15 },
  { max: 20, minutes: 24 * 60 }
] as const;

/**
 * Seconds until this IP may submit again, or 0. For each window the block
 * lifts when the `max`-th most recent attempt leaves it.
 */
export async function inquirySecondsUntilAllowed(ip: string): Promise<number> {
  const [short, long] = INQUIRY_LIMITS;
  const { rows } = await pool.query<{ retry_at: Date | null }>(
    `with recent as (
       select attempted_at from public.inquiry_attempts
        where ip = $1::inet and attempted_at > now() - make_interval(mins => $5)
     )
     select greatest(
       (select attempted_at + make_interval(mins => $3) from recent
         where attempted_at > now() - make_interval(mins => $3)
         order by attempted_at desc offset $2 - 1 limit 1),
       (select attempted_at + make_interval(mins => $5) from recent
         order by attempted_at desc offset $4 - 1 limit 1)
     ) as retry_at`,
    [ip, short.max, short.minutes, long.max, long.minutes]
  );

  const retryAt = rows[0]?.retry_at;
  if (!retryAt) return 0;
  return Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000));
}

export async function recordInquiryAttempt(ip: string): Promise<void> {
  await pool.query('insert into public.inquiry_attempts (ip) values ($1)', [ip]);
}
