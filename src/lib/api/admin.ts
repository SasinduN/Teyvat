/**
 * Authenticated CRUD for the admin panel.
 *
 * These helpers deliberately do NOT check permissions themselves — the
 * database does, via the `admin insert/update/delete` RLS policies, which call
 * `public.is_admin()`. A signed-in user who is not in `public.admins` gets a
 * 42501 from Postgres no matter what the UI allows.
 */
import { supabase } from '@/lib/supabase';
import type {
  ContentTableName,
  ContentTables,
  Insert,
  Update
} from '@shared/database.types';

/** Rows are listed in editing order: by `sort_order`, then id. */
export async function listRows<T extends ContentTableName>(
  table: T
): Promise<ContentTables[T][]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ContentTables[T][];
}

export async function getRow<T extends ContentTableName>(
  table: T,
  id: string
): Promise<ContentTables[T] | null> {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as ContentTables[T] | null;
}

export async function createRow<T extends ContentTableName>(
  table: T,
  values: Insert<ContentTables[T]>
): Promise<ContentTables[T]> {
  const { data, error } = await supabase
    .from(table)
    .insert(values as never)
    .select('*')
    .single();

  if (error) throw error;
  return data as ContentTables[T];
}

export async function updateRow<T extends ContentTableName>(
  table: T,
  id: string,
  values: Update<ContentTables[T]>
): Promise<ContentTables[T]> {
  const { data, error } = await supabase
    .from(table)
    .update(values as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as ContentTables[T];
}

export async function deleteRow(table: ContentTableName, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function setPublished(
  table: ContentTableName,
  id: string,
  published: boolean
): Promise<void> {
  const { error } = await supabase.from(table).update({ published }).eq('id', id);
  if (error) throw error;
}

/**
 * Persists a new ordering. Called after a move-up / move-down in the list
 * views; only the rows whose index actually changed are written.
 */
export async function reorderRows(
  table: ContentTableName,
  orderedIds: readonly string[]
): Promise<void> {
  const writes = orderedIds.map((id, index) =>
    supabase.from(table).update({ sort_order: index }).eq('id', id)
  );

  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Row counts for the dashboard, one lightweight HEAD request per table. */
export async function countRows(table: ContentTableName): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
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
