/**
 * One address for the site: a page asked for on any other host (www, Railway's
 * `*.up.railway.app`) gets a 301 to the same path and query on `PUBLIC_SITE_URL`.
 *
 *   - Only GET and HEAD for pages. `/api/*` is never redirected: Railway's
 *     healthcheck (`/api/health`) calls the service on its own host, and a
 *     fetch from a tab already open on another host must keep working.
 *   - The `Host` header as received. Cloudflare and Railway both pass the
 *     visitor's host through; `X-Forwarded-Host` is ignored, so nobody can
 *     steer the comparison with a header of their own.
 *   - Hostnames are compared without case, port or a trailing dot, so the
 *     canonical host never redirects to itself.
 *   - Off without `PUBLIC_SITE_URL` (local runs, tests), and without a `Host`.
 *
 * The session cookie is `__Host-`, bound to the host that set it, so sending
 * every page to one host keeps sign-in on one host too.
 */
import type { RequestHandler } from 'express';

/** `Example.COM.:443` -> `example.com`; `[::1]:8081` -> `[::1]`. */
export function hostnameOf(host: string): string {
  let name = host.trim().toLowerCase();
  if (name.startsWith('[')) {
    const end = name.indexOf(']');
    name = end === -1 ? name : name.slice(0, end + 1);
  } else {
    const colon = name.indexOf(':');
    if (colon !== -1) name = name.slice(0, colon);
  }
  return name.replace(/\.+$/, '');
}

const isApi = (path: string): boolean => {
  // Express matches routes without case, so `/API/health` reaches the API too.
  const p = path.toLowerCase();
  return p === '/api' || p.startsWith('/api/');
};

/** `origin` is `PUBLIC_SITE_URL` (an https origin, no trailing slash) or null for off. */
export function canonicalHost(origin: string | null): RequestHandler {
  if (!origin) return (_req, _res, next) => next();
  const canonical = hostnameOf(new URL(origin).host);

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (isApi(req.path)) return next();
    const host = req.headers.host;
    if (!host || hostnameOf(host) === canonical) return next();
    // Only an origin-form target ("/path?query"). Appended, never resolved: "//evil.example"
    // stays a path on our host instead of becoming another host.
    if (!req.originalUrl.startsWith('/')) return next();
    res.redirect(301, `${origin}${req.originalUrl}`);
  };
}
