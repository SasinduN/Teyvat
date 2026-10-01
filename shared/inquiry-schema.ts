/**
 * What the public enquiry form may send, and what an admin may change.
 *
 * The public schema is also the insert whitelist: the route inserts exactly
 * these fields (minus the honeypot), so `status`, `admin_notes`, `spam` and
 * `closed_at` can never come from a visitor. Unknown keys are dropped.
 *
 * Messages are written for travellers, because the form shows the server's
 * message as it is.
 */
import { z } from './zod';

import { INQUIRY_STATUSES } from './database.types';

export const inquirySubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please tell us your name.')
    .max(120, 'Please shorten your name to 120 characters.'),
  email: z
    .string()
    .trim()
    .max(254, 'Please check your email address.')
    .pipe(z.email('Please check your email address.')),
  phone: z
    .string()
    .trim()
    .max(40, 'Please shorten your phone number to 40 characters.')
    .nullish()
    .transform((v) => (v ? v : null)),
  travelers: z.string().trim().min(1, 'Please say how many are travelling.').max(80),
  dates: z.string().trim().min(1, 'Please say when you would like to travel.').max(80),
  subject: z.string().trim().max(300, 'The subject is too long.').default(''),
  message: z
    .string()
    .trim()
    .max(5000, 'Please keep your message under 5,000 characters.')
    .default(''),
  /** The hidden honeypot. A person never sees it; anything in it marks the enquiry as spam. */
  website: z.string().max(2000).optional()
});

export type InquirySubmission = z.output<typeof inquirySubmissionSchema>;

/** The columns a public submission writes, in order. Never from the request. */
export const INQUIRY_INSERT_COLUMNS = [
  'name',
  'email',
  'phone',
  'travelers',
  'dates',
  'subject',
  'message'
] as const satisfies readonly (keyof InquirySubmission)[];

export const inquiryPatchSchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  admin_notes: z
    .string()
    .trim()
    .max(5000, 'Keep notes under 5000 characters.')
    .nullable()
    .transform((v) => (v ? v : null))
    .optional(),
  spam: z.boolean().optional(),
  expectedUpdatedAt: z.iso.datetime({ offset: true })
});
