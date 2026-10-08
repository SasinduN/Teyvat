import { Router } from 'express';
import { newsletterSchema } from '../../../shared/newsletter-schema';
import { pool } from '../db';
import { ApiError, asyncRoute, clientIp } from '../http';

export const newsletterRouter = Router();
newsletterRouter.post('/newsletter', asyncRoute(async (req, res) => {
  const parsed = newsletterSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError('bad_request', 'Please enter a valid email address.');
  res.set('Cache-Control', 'no-store');
  const { rows } = await pool.query<{ attempts: number }>(
    `insert into public.newsletter_attempts (ip) values ($1)
     on conflict (ip) do update set
       attempts = case when newsletter_attempts.window_started < now() - interval '15 minutes' then 1 else newsletter_attempts.attempts + 1 end,
       window_started = case when newsletter_attempts.window_started < now() - interval '15 minutes' then now() else newsletter_attempts.window_started end
     returning attempts`, [clientIp(req)]
  );
  if (rows[0].attempts > 10) {
    res.set('Retry-After', '900');
    throw new ApiError('too_many_requests', 'Please wait a little before subscribing again.');
  }
  if (!parsed.data.website?.trim()) {
    await pool.query('insert into public.newsletter_subscribers (email) values ($1) on conflict do nothing', [parsed.data.email]);
  }
  // Same answer for duplicates and the spam trap; never disclose membership.
  res.status(201).json({ ok: true });
}));
