/**
 * Photo credits (`public.image_credits`, migration 0011): who took a photo and
 * the licence it is shared under, keyed by the image URL the content tables
 * store. Shared by the API, the admin's Photo credits page and the public
 * /photo-credits page.
 */
import { z } from './zod';

/** A row of `public.image_credits`, as the API sends it. */
export interface ImageCreditRow {
  url: string;
  author: string;
  license: string;
  license_url: string | null;
  source_url: string | null;
  created_at: string;
  /** The revision token for `expectedUpdatedAt` (microsecond precision). */
  updated_at: string;
}

/** What `GET /api/content` carries: the credits of photos that published rows use. */
export type PublicImageCredit = Pick<ImageCreditRow, 'url' | 'author' | 'license' | 'license_url' | 'source_url'>;

/** A link that may be left out: missing, null or empty are all stored as NULL. */
const optionalHttps = (label: string) =>
  z.preprocess(
    (v) => v ?? '',
    z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), `${label} must start with https://`)
      .transform((v) => (v === '' ? null : v))
  );

/** The editable fields. The URL is the key, so it is only set when creating. */
export const imageCreditValuesSchema = z.object({
  author: z.string().trim().min(1, 'Who took the photo?').max(200),
  license: z.string().trim().min(1, 'Which licence, e.g. CC BY-SA 4.0?').max(100),
  license_url: optionalHttps('The licence link'),
  source_url: optionalHttps('The source link')
});

export const imageCreditCreateSchema = imageCreditValuesSchema.extend({
  url: z.string().trim().max(2000).regex(/^https:\/\/\S+$/, 'The image URL must start with https://')
});

export type ImageCreditValues = z.infer<typeof imageCreditValuesSchema>;
export type ImageCreditCreate = z.infer<typeof imageCreditCreateSchema>;
