import { z } from './zod';

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Please enter a valid email address.')),
  website: z.string().max(2000).optional()
});
