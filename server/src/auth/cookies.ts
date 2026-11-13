/**
 * The session cookie, and just enough of a `Cookie` header parser to read it.
 *
 * `__Host-` makes the browser refuse the cookie unless it is `Secure`, has
 * `Path=/` and has no `Domain`, so a sibling subdomain cannot plant or
 * overwrite it. Chrome and Firefox treat http://localhost as a secure context,
 * so the same cookie works in local development without a flag.
 */
import type { Request, Response } from 'express';

export const SESSION_COOKIE = '__Host-session';

/** Seven days, fixed from sign-in. Activity does not extend it. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/'
} as const;

/** The value of one cookie from the request, or null. */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;

    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
}
