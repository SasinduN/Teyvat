/**
 * `GET /api/health` — liveness plus a real database probe.
 *
 * Railway points its healthcheck here. It reports 200 only when the database
 * answers, so a deploy that comes up with a broken DATABASE_URL is caught at
 * rollout instead of by the first visitor.
 */
import { Router } from 'express';

import type { HealthPayload } from '../../../shared/api';
import { databaseReachable } from '../db';
import { asyncRoute, sendError } from '../http';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncRoute(async (_req, res) => {
    const up = await databaseReachable();

    if (!up) {
      sendError(res, 'internal', 'Database unreachable.');
      return;
    }

    const payload: HealthPayload = {
      status: 'ok',
      database: 'up',
      uptimeSeconds: Math.round(process.uptime())
    };

    // Never cache a healthcheck — a cached 200 defeats the entire point.
    res.set('Cache-Control', 'no-store');
    res.json(payload);
  })
);
