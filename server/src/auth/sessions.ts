/**
 * Server-side sessions in `public.sessions`.
 *
 * The cookie carries a random 32-byte token; the table stores only its SHA-256.
 * See the comment on `public.sessions` in 0001_init.sql for why SHA-256 and not
 * argon2 is right for a full-entropy token.
 */
import { createHash, randomBytes } from 'node:crypto';

import type { AuthUser } from '../../../shared/api';
import { pool } from '../db';
import { SESSION_TTL_MS } from './cookies';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface SessionContext {
  sessionId: string;
  user: AuthUser;
}

export interface NewSession {
  userId: string;
  userAgent: string | null;
  ip: string | null;
}

/** Creates a session and returns the token for the cookie. */
export async function createSession(session: NewSession): Promise<string> {
  const token = randomBytes(32).toString('base64url');

  await pool.query(
    `insert into public.sessions (user_id, token_hash, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, now() + $5::interval)`,
    [
      session.userId,
      sha256Hex(token),
      session.userAgent?.slice(0, 400) ?? null,
      session.ip,
      `${SESSION_TTL_MS / 1000} seconds`
    ]
  );

  return token;
}

/**
 * The session and its user for a cookie token, or null if there is no such
 * session, it has expired, or its user has been deleted (the foreign key
 * cascades, so the session row goes with the user).
 *
 * `expires_at > now()` is checked here on every request. The cookie's Max-Age
 * is only a hint to the browser.
 */
export async function findSession(token: string): Promise<SessionContext | null> {
  const { rows } = await pool.query<{
    session_id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    stale: boolean;
  }>(
    `select s.id as session_id, u.id as user_id, u.email, u.full_name,
            s.last_seen_at < now() - interval '5 minutes' as stale
       from public.sessions s
       join public.users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [sha256Hex(token)]
  );

  const row = rows[0];
  if (!row) return null;

  // At most one write every five minutes per session, not one per request.
  if (row.stale) {
    await pool.query('update public.sessions set last_seen_at = now() where id = $1', [
      row.session_id
    ]);
  }

  return {
    sessionId: row.session_id,
    user: { id: row.user_id, email: row.email, fullName: row.full_name }
  };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await pool.query('delete from public.sessions where token_hash = $1', [sha256Hex(token)]);
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await pool.query('delete from public.sessions where user_id = $1', [userId]);
}
