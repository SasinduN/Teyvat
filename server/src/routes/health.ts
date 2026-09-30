/**
 * `GET /api/health` — liveness plus a real database probe.
 *
 * Railway points its healthcheck here. It reports 200 only when the database
 * answers, so a deploy that comes up with a broken DATABASE_URL is caught at
 * rollout instead of by the first visitor. The database is the only thing
 * that can fail it: the `media` field is information, never a verdict.
 */
import { Router } from 'express';

import type { HealthPayload } from '../../../shared/api';
import { databaseReachable } from '../db';
import { asyncRoute, sendError } from '../http';
import { mediaOf, type MediaConfig } from '../media/media';

/**
 * Railway polls the healthcheck; R2 bills per request. One real check a
 * minute is plenty for a field that is informational anyway.
 */
const MEDIA_PING_TTL_MS = 60_000;
let lastPing: { at: number; store: MediaConfig['store']; up: boolean } | null = null;

const MEDIA_PING_TIMEOUT_MS = 3000;

/**
 * Never throws and never waits more than 3 s. Whatever the store does (says
 * no, rejects, throws, hangs), the answer is 'down', so only the database can
 * fail the healthcheck. An R2 outage must not take the site down or block a
 * deploy.
 */
async function mediaStatus(media: MediaConfig | null): Promise<HealthPayload['media']> {
  if (!media) return 'not_configured';
  if (lastPing && lastPing.store === media.store && Date.now() - lastPing.at < MEDIA_PING_TTL_MS) {
    return lastPing.up ? 'up' : 'down';
  }

  let up: boolean;
  try {
    up = await Promise.race([
      // Inside a promise, so a synchronous throw is caught the same way.
      Promise.resolve().then(() => media.store.ping()),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), MEDIA_PING_TIMEOUT_MS).unref())
    ]);
  } catch {
    up = false;
  }

  lastPing = { at: Date.now(), store: media.store, up: up === true };
  return up === true ? 'up' : 'down';
}

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncRoute(async (req, res) => {
    const up = await databaseReachable();

    if (!up) {
      sendError(res, 'internal', 'Database unreachable.');
      return;
    }

    const payload: HealthPayload = {
      status: 'ok',
      database: 'up',
      media: await mediaStatus(mediaOf(req)),
      uptimeSeconds: Math.round(process.uptime())
    };

    // Never cache a healthcheck — a cached 200 defeats the entire point.
    res.set('Cache-Control', 'no-store');
    res.json(payload);
  })
);
