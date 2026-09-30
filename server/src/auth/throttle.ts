/**
 * Brute-force limits on `POST /api/auth/login`, counted in `public.login_attempts`.
 *
 * Three limits, each over a rolling 15 minutes and each counting failures only:
 *
 *   5  per (email, ip)  An attacker hammering one account from one network
 *                       locks out only themselves, not the real admin
 *                       signing in from somewhere else.
 *   20 per ip           One source guessing across many emails.
 *   50 per email        A guess spread across many IPs. High enough that one
 *                       person cannot lock the admin out by themselves.
 *
 * The check runs before any password is verified, so a locked-out request
 * costs no argon2 work, and gets 429 even when the password is right. It does
 * not look at whether the email is a user, so the response says nothing about
 * that either.
 *
 * Rows in Postgres rather than memory: the counts survive a redeploy and are
 * shared by every replica. Concurrent requests can each read a count just
 * under a limit and all proceed, overshooting it by a few. That is accepted.
 */
import { pool } from '../db';
import { sha256Hex } from './sessions';

export const WINDOW_MINUTES = 15;

export const LIMITS = {
  perEmailAndIp: 5,
  perIp: 20,
  perEmail: 50
} as const;

/** The key a login attempt is counted under. Never the email itself. */
export function emailHash(normalisedEmail: string): string {
  return sha256Hex(normalisedEmail);
}

/**
 * Seconds until the caller may try again, or 0 if no limit is hit.
 *
 * For each limit, the block lifts when the `limit`-th most recent failure
 * leaves the window: after that, fewer than `limit` remain inside it. Each
 * subquery finds that failure (or nothing, if there are fewer than `limit`),
 * and the longest wait of the three wins.
 */
export async function secondsUntilAllowed(hash: string, ip: string): Promise<number> {
  const { rows } = await pool.query<{ retry_at: Date | null }>(
    `with recent as (
       select email_hash, ip, attempted_at
         from public.login_attempts
        where not succeeded
          and attempted_at > now() - make_interval(mins => $3)
          and (email_hash = $1 or ip = $2::inet)
     )
     select greatest(
       (select attempted_at from recent where email_hash = $1 and ip = $2::inet
         order by attempted_at desc offset $4 - 1 limit 1),
       (select attempted_at from recent where ip = $2::inet
         order by attempted_at desc offset $5 - 1 limit 1),
       (select attempted_at from recent where email_hash = $1
         order by attempted_at desc offset $6 - 1 limit 1)
     ) + make_interval(mins => $3) as retry_at`,
    [hash, ip, WINDOW_MINUTES, LIMITS.perEmailAndIp, LIMITS.perIp, LIMITS.perEmail]
  );

  const retryAt = rows[0]?.retry_at;
  if (!retryAt) return 0;

  const seconds = Math.ceil((retryAt.getTime() - Date.now()) / 1000);
  return Math.max(seconds, 1);
}

export async function recordAttempt(hash: string, ip: string, succeeded: boolean): Promise<void> {
  await pool.query(
    'insert into public.login_attempts (email_hash, ip, succeeded) values ($1, $2, $3)',
    [hash, ip, succeeded]
  );
}

/**
 * Forgets an email's failures after a successful sign-in, or after
 * `create-admin --reset-password`. Only that email's rows: failures from the
 * same IP against other emails still count.
 */
export async function clearEmailFailures(hash: string): Promise<void> {
  await pool.query('delete from public.login_attempts where email_hash = $1 and not succeeded', [
    hash
  ]);
}
