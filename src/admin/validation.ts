import type { CollectionDef } from '@/admin/collections';
import { schemaForTable } from '@shared/content-schema';

/**
 * The Zod schema for a collection's form: the same one the API applies to
 * what the form sends (`shared/content-schema.ts`), so the two cannot drift.
 *
 * It is also the coercion layer: number inputs arrive as strings, text is
 * trimmed, optional text becomes `null`, and blank list rows are dropped.
 * `handleSubmit` therefore receives a payload that is ready to send.
 *
 * `create` includes the slug. On `update` the slug is locked, so the form
 * leaves it out of what it sends.
 */
export function schemaForCollection(collection: CollectionDef, mode: 'create' | 'update') {
  return schemaForTable(collection.table, mode);
}

/** The validated, coerced payload for a collection — what gets sent to the API. */
export type ValidatedRecord = Record<string, unknown>;
