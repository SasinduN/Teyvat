/**
 * The admin panel's reads and writes, through `/api/admin/*`.
 *
 * These do not check permissions themselves: the API does, with
 * `requireAdmin` on every route, so bypassing the UI grants nothing.
 */
import {
  API_ROUTES,
  type CountPayload,
  type ImageCreditItem,
  type ReorderRequest,
  type VersionedUpdate
} from '@shared/api';
import type { ImageCreditCreate, ImageCreditRow, ImageCreditValues } from '@shared/image-credits';
import type { SiteSettingsValues } from '@shared/content-schema';
import type {
  ContentTableName,
  ContentTables,
  Insert,
  SiteSettingsRow,
  Update
} from '@shared/database.types';
import { ApiRequestError, deleteJson, getJson, patchJson, postJson, putJson } from '@/lib/api/http';

const tablePath = (table: ContentTableName) => `${API_ROUTES.admin.content}/${table}`;
const rowPath = (table: ContentTableName, id: string) =>
  `${tablePath(table)}/${encodeURIComponent(id)}`;

/** Every row, drafts included, in editing order: by `sort_order`, then id. */
export async function listRows<T extends ContentTableName>(
  table: T
): Promise<ContentTables[T][]> {
  return getJson<ContentTables[T][]>(tablePath(table));
}

export async function getRow<T extends ContentTableName>(
  table: T,
  id: string
): Promise<ContentTables[T] | null> {
  try {
    return await getJson<ContentTables[T]>(rowPath(table, id));
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

/** The new row goes to the end of the list. */
export async function createRow<T extends ContentTableName>(
  table: T,
  values: Insert<ContentTables[T]>
): Promise<ContentTables[T]> {
  return postJson<ContentTables[T]>(tablePath(table), values);
}

/**
 * `expectedUpdatedAt` is the `updated_at` of the row the form was loaded from.
 * If anyone has saved the row since, the API refuses with 409 instead of
 * overwriting their change.
 */
export async function updateRow<T extends ContentTableName>(
  table: T,
  id: string,
  values: Update<ContentTables[T]>,
  expectedUpdatedAt: string
): Promise<ContentTables[T]> {
  const body: VersionedUpdate<Update<ContentTables[T]>> = { values, expectedUpdatedAt };
  return putJson<ContentTables[T]>(rowPath(table, id), body);
}

export async function deleteRow(table: ContentTableName, id: string): Promise<void> {
  await deleteJson<null>(rowPath(table, id));
}

export async function setPublished(
  table: ContentTableName,
  id: string,
  published: boolean
): Promise<void> {
  await patchJson(`${rowPath(table, id)}/published`, { published });
}

/**
 * Persists a new ordering: every id in the table, in order. One transaction
 * on the server; if the list changed underneath (a row added or deleted),
 * nothing is written and this throws a 409.
 */
export async function reorderRows(
  table: ContentTableName,
  orderedIds: readonly string[]
): Promise<void> {
  const body: ReorderRequest = { ids: [...orderedIds] };
  await putJson<null>(`${tablePath(table)}/order`, body);
}

/** Row count for the dashboard, drafts included. */
export async function countRows(table: ContentTableName): Promise<number> {
  const { count } = await getJson<CountPayload>(`${tablePath(table)}/count`);
  return count;
}

export async function getSiteSettings(): Promise<SiteSettingsRow> {
  return getJson<SiteSettingsRow>(API_ROUTES.admin.siteSettings);
}

export async function updateSiteSettings(
  values: SiteSettingsValues,
  expectedUpdatedAt: string
): Promise<SiteSettingsRow> {
  const body: VersionedUpdate<SiteSettingsValues> = { values, expectedUpdatedAt };
  return putJson<SiteSettingsRow>(API_ROUTES.admin.siteSettings, body);
}

/**
 * Turns a title into a URL-safe slug for the `id` column.
 * Matches the style of the existing ids ('ella', 'island-in-7-days').
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ----------------------------------------------------------- photo credits */

const creditPath = (url: string) => `${API_ROUTES.admin.imageCredits}?url=${encodeURIComponent(url)}`;

/** Every credit, with the rows using its photo. */
export const listImageCredits = () => getJson<ImageCreditItem[]>(API_ROUTES.admin.imageCredits);

export const createImageCredit = (values: ImageCreditCreate) =>
  postJson<ImageCreditRow>(API_ROUTES.admin.imageCredits, values);

/** Refused with 409 if someone has saved this credit since `expectedUpdatedAt`. */
export const updateImageCredit = (url: string, values: ImageCreditValues, expectedUpdatedAt: string) =>
  putJson<ImageCreditRow>(creditPath(url), { values, expectedUpdatedAt } satisfies VersionedUpdate<ImageCreditValues>);

export const deleteImageCredit = (url: string) => deleteJson<void>(creditPath(url));
