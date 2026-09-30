/**
 * `/api/auth/*` — sign in, who am I, sign out, sign out everywhere.
 *
 * `sameOrigin` is applied to every state-changing `/api` request in app.ts, so
 * it is not repeated here.
 */
import { isIP } from 'node:net';

import { Router, type Request } from 'express';
import { z } from 'zod';

import type { AuthUserPayload } from '../../../shared/api';
import { clearSessionCookie, readCookie, SESSION_COOKIE, setSessionCookie } from '../auth/cookies';
import { requireSession, sessionOf } from '../auth/middleware';
import { getDummyHash, passwords } from '../auth/passwords';
import { createSession, revokeSessionByToken, revokeUserSessions } from '../auth/sessions';
import { clearEmailFailures, emailHash, recordAttempt, secondsUntilAllowed } from '../auth/throttle';
import { pool } from '../db';
import { asyncRoute, sendError } from '../http';

/**
 * The email is trimmed and lowercased here, the same normalisation
 * `create-admin` stores it with. It is not checked for being an email: a
 * malformed one is simply not a user, and gets the ordinary 401.
 */
const loginBody = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(1024)
});

const BAD_CREDENTIALS = 'Incorrect email or password.';

/**
 * The caller's address as Railway's proxy saw it. `trust proxy` is 1, so this
 * is the right-most `X-Forwarded-For` entry, the one the proxy appended. If it
 * is somehow not an address `inet` accepts, fall back to the socket.
 */
function clientIp(req: Request): string {
  if (req.ip && isIP(req.ip)) return req.ip;
  return req.socket.remoteAddress ?? '0.0.0.0';
}

function tooManyMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export const authRouter = Router();

// Nothing an auth route returns may be cached, by the browser or anything
// in between.
authRouter.use('/auth', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

authRouter.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'bad_request', 'Enter your email and password.');
      return;
    }

    const { email, password } = parsed.data;
    const hash = emailHash(email);
    const ip = clientIp(req);

    // Before any lookup or hashing: a locked-out caller gets the same answer
    // whether or not the email exists, and costs no argon2 work.
    const wait = await secondsUntilAllowed(hash, ip);
    if (wait > 0) {
      res.set('Retry-After', String(wait));
      sendError(res, 'too_many_requests', tooManyMessage(wait));
      return;
    }

    const { rows } = await pool.query<{
      id: string;
      email: string;
      full_name: string | null;
      password_hash: string;
    }>(
      'select id, email, full_name, password_hash from public.users where lower(email) = $1',
      [email]
    );
    const user = rows[0];

    // Exactly one verify on both paths, so an unknown email takes as long as
    // a wrong password.
    const ok = await passwords.verify(user?.password_hash ?? (await getDummyHash()), password);

    if (!user || !ok) {
      await recordAttempt(hash, ip, false);
      sendError(res, 'unauthorized', BAD_CREDENTIALS);
      return;
    }

    await recordAttempt(hash, ip, true);
    await clearEmailFailures(hash);
    await pool.query('update public.users set last_login_at = now() where id = $1', [user.id]);

    const token = await createSession({
      userId: user.id,
      userAgent: req.get('user-agent') ?? null,
      ip
    });
    setSessionCookie(res, token);

    const payload: AuthUserPayload = {
      user: { id: user.id, email: user.email, fullName: user.full_name }
    };
    res.json(payload);
  })
);

authRouter.get('/auth/me', requireSession, (req, res) => {
  const payload: AuthUserPayload = { user: sessionOf(req).user };
  res.json(payload);
});

/** Ends this browser's session. Succeeds even if there was none. */
authRouter.post(
  '/auth/logout',
  asyncRoute(async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await revokeSessionByToken(token);
    clearSessionCookie(res);
    res.status(204).end();
  })
);

/** Ends every session the signed-in user has, this one included. */
authRouter.post(
  '/auth/logout-all',
  requireSession,
  asyncRoute(async (req, res) => {
    await revokeUserSessions(sessionOf(req).user.id);
    clearSessionCookie(res);
    res.status(204).end();
  })
);
