/**
 * The Express application: `/api/*` plus the built client, on one origin.
 *
 * One origin is the whole point of collapsing this into a single service. The
 * browser fetches `/api/content` from the same host it loaded the page from, so
 * there is no CORS configuration anywhere, and the session cookie can be
 * `SameSite=Strict` without a cross-site exemption.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import express, { type Express } from 'express';

import { API_ROUTES } from '../../shared/api';
import { isProduction } from './env';
import { errorHandler, sendError } from './http';
import { contentRouter } from './routes/content';
import { healthRouter } from './routes/health';

/**
 * Resolved from the repo root rather than from `import.meta.url`, because the
 * server is bundled to `server/dist/index.js` and `dist/` sits two levels up
 * from there — but only in the built layout. Anchoring on the root keeps the
 * path the same whether this runs from source via tsx or from the bundle.
 */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLIENT_DIST = join(REPO_ROOT, 'dist');
const CLIENT_INDEX = join(CLIENT_DIST, 'index.html');

export function createApp(): Express {
  const app = express();

  /**
   * Railway terminates TLS at its edge and forwards over HTTP. Without this,
   * Express sees an http request and refuses to set `Secure` cookies, and
   * `req.ip` is the proxy rather than the caller — which matters for the
   * `sessions.ip` column in phase 3.
   */
  app.set('trust proxy', 1);

  // No `X-Powered-By: Express`. Free, and there is no reason to advertise it.
  app.disable('x-powered-by');

  app.use(express.json({ limit: '100kb' }));

  /* ------------------------------------------------------------------- api */

  app.use('/api', healthRouter);
  app.use('/api', contentRouter);

  /**
   * Unknown `/api/*` must be a JSON 404, not the SPA shell. Falling through to
   * `index.html` would hand a fetch() caller 200 and a page of HTML, which
   * surfaces as a JSON parse error a long way from the actual typo.
   */
  app.use('/api', (_req, res) => {
    sendError(res, 'not_found', 'No such endpoint.');
  });

  /* ---------------------------------------------------------------- client */

  if (existsSync(CLIENT_INDEX)) {
    /**
     * Vite content-hashes everything under `/assets`, so those are immutable
     * and cached for a year. `index.html` is the opposite: it names the hashed
     * bundles, so a cached copy would keep pointing at files a deploy has
     * already replaced.
     */
    app.use(
      '/assets',
      express.static(join(CLIENT_DIST, 'assets'), {
        immutable: true,
        maxAge: '1y'
      })
    );

    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));

    /**
     * SPA fallback. Registered as middleware rather than a `'*'` route because
     * Express 5 moved to path-to-regexp v8, where a bare `*` is no longer a
     * valid pattern and throws at startup.
     *
     * This is what makes `/admin/...` deep links work — the reason
     * `vite-plugin-singlefile` was dropped.
     */
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      res.set('Cache-Control', 'no-cache');
      res.sendFile(CLIENT_INDEX);
    });
  } else if (isProduction) {
    // In production a missing bundle means the build step did not run. Say so
    // once at boot instead of serving 404s that look like a routing bug.
    console.error(
      `[api] no client build at ${CLIENT_DIST}. ` +
        'Run `npm run build` before starting, or check the Railway build command.'
    );
  } else {
    console.log(
      `[api] no client build at ${CLIENT_DIST} — serving ${API_ROUTES.content} only.\n` +
        '      In development the client is served by Vite on :5173, which ' +
        'proxies /api here.'
    );
  }

  app.use(errorHandler);

  return app;
}
