/**
 * Security headers on every response: the page, the assets and the API.
 *
 * The Content-Security-Policy tells the browser what the site may load and
 * from where, so that injected markup can't run a script or pull from an
 * unexpected host. Every source it allows, and why:
 *
 *   script-src   'self'                          our own bundles only; no inline
 *                                                 scripts, no eval (the build has neither)
 *   style-src    'self' 'unsafe-inline'          our CSS, plus the <style> the admin's
 *                                                 toast library (Sonner) injects at runtime
 *   font-src     'self'                          our DM Sans files (src/styles/fonts.css)
 *   img-src      'self' + allowedImageOrigins()   Unsplash and our R2 bucket
 *                https://*.basemaps.cartocdn.com  the map tiles
 *   connect-src  'self'                          the browser only ever calls our /api
 *   frame-ancestors 'none'                       nobody may frame the site or the admin
 *
 * Inline *styles* are allowed and inline *scripts* aren't: an injected style
 * can't run code; an injected script is what XSS needs. React's `style={…}` and
 * Leaflet's positioning go through the CSSOM, which CSP doesn't restrict.
 *
 * Applies to what Express serves (production, `npm start`). `npm run dev`
 * pages come from Vite and carry none of this.
 */
import type { RequestHandler } from 'express';

import { allowedImageOrigins, MAP_TILES_SOURCE } from '../../shared/image-hosts';
import type { MediaConfig } from './media/media';
import { OSM_TILES_ORIGIN } from '../../shared/map-tiles';

/** One day to start. Raised to a year at launch (docs/LAUNCH-CHECKLIST.md). */
export const HSTS_MAX_AGE = 86_400;

export function contentSecurityPolicy(media: MediaConfig | null): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'"],
    'img-src': ["'self'", ...allowedImageOrigins(media?.publicBaseUrl ?? null), MAP_TILES_SOURCE, OSM_TILES_ORIGIN],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"]
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

export function securityHeaders(media: MediaConfig | null): RequestHandler {
  const csp = contentSecurityPolicy(media);

  return (req, res, next) => {
    res.set({
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // For browsers too old for frame-ancestors.
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': `camera=(), microphone=(), geolocation=${req.path === '/booking' ? '(self)' : '()'}`,
      'Cross-Origin-Opener-Policy': 'same-origin'
    });
    // HSTS means nothing over plain HTTP (and must not be sent there).
    // `req.secure` honours X-Forwarded-Proto behind Railway's proxy.
    if (req.secure) res.set('Strict-Transport-Security', `max-age=${HSTS_MAX_AGE}`);
    next();
  };
}
