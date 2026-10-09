/**
 * The footer's newsletter sign-up, and unsubscribing.
 *
 * Nothing sends newsletters yet (docs/LAUNCH-CHECKLIST.md). Whatever does
 * later must put `newsletterUnsubscribeUrl(origin, token)` in every email.
 * Both routes answer the same way whether or not an address or token exists,
 * so neither can be used to test who is subscribed. Neither logs request
 * data.
 */
import { Router, type Request, type Response } from 'express';

import { newsletterSchema, unsubscribeSchema } from '../../../shared/newsletter-schema';
import { pool } from '../db';
import { ApiError, asyncRoute, clientIp } from '../http';

/** Ten requests per IP per 15 minutes, subscribing and unsubscribing together. */
async function throttle(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<{ attempts: number }>(
    `insert into public.newsletter_attempts (ip) values ($1)
     on conflict (ip) do update set
       attempts = case when newsletter_attempts.window_started < now() - interval '15 minutes' then 1 else newsletter_attempts.attempts + 1 end,
       window_started = case when newsletter_attempts.window_started < now() - interval '15 minutes' then now() else newsletter_attempts.window_started end
     returning attempts`,
    [clientIp(req)]
  );
  if (rows[0].attempts > 10) {
    res.set('Retry-After', '900');
    throw new ApiError('too_many_requests', 'Please wait a little before trying again.');
  }
}

export const newsletterRouter = Router();

newsletterRouter.post(
  '/newsletter',
  asyncRoute(async (req, res) => {
    const parsed = newsletterSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError('bad_request', 'Please enter a valid email address.');
    res.set('Cache-Control', 'no-store');
    await throttle(req, res);
    if (!parsed.data.website?.trim()) {
      // A repeat sign-up keeps the original row, token and consent time.
      await pool.query('insert into public.newsletter_subscribers (email) values ($1) on conflict do nothing', [
        parsed.data.email
      ]);
    }
    // Same answer for duplicates and the spam trap; never disclose membership.
    res.status(201).json({ ok: true });
  })
);

/**
 * A POST, not a GET: mail clients and link scanners follow links in emails,
 * and must not unsubscribe anyone by doing so. The /unsubscribe page posts
 * this when the reader presses its button.
 */
newsletterRouter.post(
  '/newsletter/unsubscribe',
  asyncRoute(async (req, res) => {
    const parsed = unsubscribeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError('bad_request', 'That unsubscribe link is incomplete.');
    res.set('Cache-Control', 'no-store');
    await throttle(req, res);
    // Deleted, not flagged: the address is gone.
    await pool.query('delete from public.newsletter_subscribers where unsubscribe_token = $1', [parsed.data.token]);
    res.json({ ok: true });
  })
);
