/**
 * Which photographs are in R2, at which widths (`media.photo_key` and `width`,
 * migration 0020). `shared/public-photos.ts` resolves a photo to these.
 */
import type { PoolClient } from 'pg';

import type { PhotoSets, PhotoVariant } from '../../../shared/photo-assets';

type Queryable = Pick<PoolClient, 'query'>;

export async function loadPhotoSets(db: Queryable): Promise<PhotoSets> {
  const { rows } = await db.query<{ photo_key: string; width: number; url: string }>(
    `select photo_key, width, url from public.media where photo_key is not null order by photo_key, width`
  );
  const sets: Record<string, PhotoVariant[]> = {};
  for (const { photo_key, width, url } of rows) (sets[photo_key] ??= []).push({ width, url });
  return sets;
}
