/**
 * Request guards for `/api/*`.
 *
 * These are the protection. The React route guard in `src/admin` only decides
 * what to render; anything it hides is still refused here.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { sendError } from '../http';
import { clearSessionCookie, readCookie, SESSION_COOKIE } from './cookies';
import { findSession, type SessionContext } from './sessions';

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireSession` / `requireAdmin`. */
      auth?: SessionContext;
    }
  }
}

/** The request's session, after `requireSession` has run. */
export function sessionOf(req: Request): SessionContext {
  if (!req.auth) {
    throw new Error('sessionOf() called on a route without requireSession');
  }
  return req.auth;
}

/**
 * A valid, unexpired session whose user still exists, or 401.
 *
 * A cookie that names no live session is cleared, so the browser stops sending
 * it on every request.
 */
export const requireSession: RequestHandler = (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) {
    sendError(res, 'unauthorized', 'Sign in to continue.');
    return;
  }

  findSession(token)
    .then((session) => {
      if (!session) {
        clearSessionCookie(res);
        sendError(res, 'unauthorized', 'Your session has ended. Sign in again.');
        return;
      }
      req.auth = session;
      next();
    })
    .catch(next);
};

/**
 * Every user is an admin, so this is `requireSession` under another name. It
 * stays a separate export so admin routes say what they need, and so a role
 * check has one place to go if a second kind of user ever exists.
 */
export const requireAdmin: RequestHandler = requireSession;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-site request forgery guard for every state-changing `/api` request.
 *
 * `SameSite=Strict` already keeps the session cookie off cross-site requests,
 * but this also covers the login form, which has no cookie to protect it.
 * Browsers send `Origin` on every cross-origin POST and on same-origin POSTs
 * from fetch, so it must match this server exactly. Where `Origin` is absent,
 * `Sec-Fetch-Site: same-origin` is accepted instead; a request with neither is
 * refused.
 *
 * `req.protocol` honours `X-Forwarded-Proto` under `trust proxy`, so behind
 * Railway's edge it is `https`. In development the Vite proxy passes the
 * browser's own Host through (`changeOrigin: false`), so the check sees
 * `http://localhost:5173` on both sides.
 */
export function sameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  const expected = `${req.protocol}://${req.host}`;

  const allowed =
    origin !== undefined ? origin === expected : req.get('sec-fetch-site') === 'same-origin';

  if (!allowed) {
    sendError(res, 'forbidden', 'Cross-origin request refused.');
    return;
  }
  next();
}
