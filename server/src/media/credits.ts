/**
 * Photo credits (`public.image_credits`): which ones the public site shows.
 *
 * A credit is public when a published row uses its photo, in any image column
 * (plain or list). The columns come from `IMAGE_COLUMNS`, so a new image field
 * is covered with no change here.
 */
import type { PoolClient } from 'pg';

import type { PublicImageCredit } from '../../../shared/image-credits';
import { IMAGE_COLUMNS } from './media';

type Queryable = Pick<PoolClient, 'query'>;

/** Every image URL a published row uses, as one SQL union (identifiers from `IMAGE_COLUMNS` only). */
const PUBLISHED_IMAGE_URLS = IMAGE_COLUMNS.map((c) =>
  c.list
    ? `select u.url from public.${c.table} t, unnest(t."${c.column}") as u(url) where t.published`
    : `select t."${c.column}" as url from public.${c.table} t where t.published and t."${c.column}" is not null`
).join(' union ');

/** The credits `GET /api/content` publishes, by author then URL. */
export async function publicImageCredits(db: Queryable): Promise<PublicImageCredit[]> {
  const { rows } = await db.query<PublicImageCredit>(
    `select c.url, c.author, c.license, c.license_url, c.source_url
       from public.image_credits c
      where c.url in (${PUBLISHED_IMAGE_URLS})
      order by lower(c.author), c.url`
  );
  return rows;
}
