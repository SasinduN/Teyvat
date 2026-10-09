import { UNSUBSCRIBE_TOKEN_PATTERN } from './site-paths';
import { z } from './zod';

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Please enter a valid email address.')),
  /** The honeypot: a filled-in value means a bot, and nothing is stored. */
  website: z.string().max(2000).optional()
});

export const unsubscribeSchema = z.object({
  token: z.string().trim().regex(UNSUBSCRIBE_TOKEN_PATTERN)
});
