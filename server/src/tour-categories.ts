/**
 * A tour's categories (0030): `public.tour_category_links`, one row per tour and
 * category, in the order the admin picked (`position`). The admin's tour form edits
 * them with the row; the public payload gives each tour its published categories.
 */
import type { Pool, PoolClient } from 'pg';

import { ApiError } from './http';

type Db = Pool | PoolClient;

/**
 * Every tour's published categories, ids in each tour's own order. An unpublished
 * category is left out, so a draft's slug never reaches the public site.
 */
export async function publicCategoryIdsByTour(db: Db): Promise<Map<string, string[]>> {
  const { rows } = await db.query<{ tour_id: string; category_id: string }>(
    `select l.tour_id, l.category_id
       from public.tour_category_links l
       join public.tour_categories c on c.id = l.category_id
      where c.published
      order by l.tour_id, l.position, c.sort_order, c.id`
  );
  const byTour = new Map<string, string[]>();
  for (const row of rows) byTour.set(row.tour_id, [...(byTour.get(row.tour_id) ?? []), row.category_id]);
  return byTour;
}

/** A tour's categories for the admin's form, drafts too, in order. */
export async function adminCategoryIds(db: Db, tourId: string): Promise<string[]> {
  const { rows } = await db.query<{ category_id: string }>(
    'select category_id from public.tour_category_links where tour_id = $1 order by position, category_id',
    [tourId]
  );
  return rows.map((r) => r.category_id);
}

const NO_SUCH_CATEGORY = 'A category you picked no longer exists. Reload and choose again.';

/**
 * Replaces a tour's categories with `ids`, in order, inside the caller's
 * transaction. The categories are locked (`for key share`), so one can't be deleted
 * between this check and the commit; a missing one is a field error.
 */
export async function replaceCategoryLinks(client: PoolClient, tourId: string, ids: string[]): Promise<void> {
  if (ids.length > 0) {
    const { rows } = await client.query<{ id: string }>(
      'select id from public.tour_categories where id = any($1::text[]) for key share',
      [ids]
    );
    if (rows.length !== ids.length) {
      throw new ApiError('bad_request', NO_SUCH_CATEGORY, { category_ids: NO_SUCH_CATEGORY });
    }
  }
  await client.query('delete from public.tour_category_links where tour_id = $1', [tourId]);
  for (const [position, categoryId] of ids.entries()) {
    await client.query(
      'insert into public.tour_category_links (tour_id, category_id, position) values ($1, $2, $3)',
      [tourId, categoryId, position]
    );
  }
}
