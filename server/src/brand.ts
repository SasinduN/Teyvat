/**
 * The brand as the server uses it: `shared/brand.ts`'s defaults with the
 * admin's settings on top (0024). Read per request, like everything the pages
 * send, so a saved name shows in the very next response and email.
 */
import type { Pool, PoolClient } from 'pg';

import { BRAND, BRAND_COLUMNS, resolveBrand, type Brand, type BrandSettings } from '../../shared/brand';
import { DEFAULT_TEXT_SIZE, isTextSize, type TextSize } from '../../shared/text-size';
import { pool } from './db';

const COLUMNS = Object.values(BRAND_COLUMNS).join(', ');

/** What every page needs from `site_settings`: the brand and the text size, in one query. */
export interface PageSettings {
  brand: Brand;
  textSize: TextSize;
}

export async function loadPageSettings(db: Pool | PoolClient = pool): Promise<PageSettings> {
  const { rows } = await db.query<BrandSettings & { text_size: number }>(
    `select ${COLUMNS}, text_size from public.site_settings where id`
  );
  const row = rows[0];
  return { brand: resolveBrand(row), textSize: isTextSize(row?.text_size) ? row.text_size : DEFAULT_TEXT_SIZE };
}

/** The brand, or the defaults when the database can't be read (an email still goes out). */
export async function loadBrand(db: Pool | PoolClient = pool): Promise<Brand> {
  try {
    const { rows } = await db.query<BrandSettings>(`select ${COLUMNS} from public.site_settings where id`);
    return resolveBrand(rows[0]);
  } catch {
    return BRAND;
  }
}
