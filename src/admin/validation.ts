import { z } from 'zod';
import type { CollectionDef, Field } from '@/admin/collections';

/**
 * Builds a Zod schema for a collection out of the same field descriptors that
 * generate its form, so validation can never drift from the UI.
 *
 * The schema is also the coercion layer: number inputs arrive as strings, text
 * is trimmed, optional text becomes `null`, and blank list rows are dropped.
 * `handleSubmit` therefore receives a payload that is ready to send to
 * Postgres, and the CHECK constraints in the database become a backstop rather
 * than the first line of defence.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Zod needs a non-empty tuple; our option lists are `readonly string[]`. */
const asEnum = (options: readonly string[]) =>
  z.enum(options as unknown as [string, ...string[]]);

function schemaForField(field: Field): z.ZodTypeAny {
  switch (field.type) {
    case 'slug':
      return z
        .string()
        .trim()
        .min(1, 'A URL slug is required.')
        .max(60, 'Keep the slug under 60 characters.')
        .regex(SLUG_RE, 'Use lowercase letters, numbers and single dashes only.');

    case 'text':
    case 'textarea':
      return field.required
        ? z.string().trim().min(1, `${field.label} is required.`)
        : z
            .string()
            .trim()
            // NULL rather than '' so the mapper yields `undefined` and the
            // component renders exactly as it did with hardcoded data.
            .transform((v) => (v === '' ? null : v));

    case 'number': {
      let n = z.coerce.number({ error: `${field.label} must be a number.` });
      if (field.min !== undefined) n = n.min(field.min, `Minimum is ${field.min}.`);
      if (field.max !== undefined) n = n.max(field.max, `Maximum is ${field.max}.`);
      return n;
    }

    case 'date':
      return z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.');

    case 'select':
      return field.allowEmpty
        ? z
            .union([asEnum(field.options), z.literal(''), z.null()])
            .transform((v) => (v === '' ? null : v))
        : asEnum(field.options);

    case 'multiselect':
      return z.array(asEnum(field.options));

    case 'boolean':
      return z.boolean();

    case 'image':
      return field.required
        ? z.string().min(1, `${field.label} is required — upload a file.`)
        : z.string();

    case 'imageList':
      return z.array(z.string());

    case 'stringList':
      // Blank rows the user left behind are dropped rather than rejected.
      return z
        .array(z.string())
        .transform((items) => items.map((s) => s.trim()).filter(Boolean));

    case 'itinerary':
      return z
        .array(
          z.object({
            day: z.coerce.number(),
            title: z.string().trim().min(1, 'Each day needs a title.'),
            description: z.string().trim(),
            location: z.string().trim()
          })
        )
        // Day numbers always run 1..n so the public tour view stays consistent.
        .transform((days) => days.map((d, i) => ({ ...d, day: i + 1 })));
  }
}

export function schemaForCollection(collection: CollectionDef) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of collection.fields) {
    shape[field.name] = schemaForField(field);
  }
  return z.object(shape);
}

/** The validated, coerced payload for a collection — what gets sent to Postgres. */
export type ValidatedRecord = Record<string, unknown>;
