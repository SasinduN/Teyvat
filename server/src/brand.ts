/**
 * The brand as the server uses it: `shared/brand.ts`'s defaults with the
 * admin's settings on top (0024). Read per request, like everything the pages
 * send, so a saved name shows in the very next response and email.
 */
import type { Pool, PoolClient } from 'pg';

import { BRAND, BRAND_COLUMNS, resolveBrand, type Brand, type BrandSettings } from '../../shared/brand';
import { DEFAULT_TEXT_SIZE, isTextSize, type TextSize } from '../../shared/text-size';
import { DEFAULT_PALETTE, isPalette, type Palette } from '../../shared/palette';
import { DEFAULT_DEFAULT_MODE, isDefaultMode, type DefaultMode } from '../../shared/default-mode';
import { pool } from './db';

const COLUMNS = Object.values(BRAND_COLUMNS).join(', ');

/** What every page needs from `site_settings`: the brand, the text size, the colour theme and the default mode, in one query. */
export interface PageSettings {
  brand: Brand;
  textSize: TextSize;
  palette: Palette;
  defaultMode: DefaultMode;
}

export async function loadPageSettings(db: Pool | PoolClient = pool): Promise<PageSettings> {
  const { rows } = await db.query<BrandSettings & { text_size: number; palette: string; default_mode: string }>(
    `select ${COLUMNS}, text_size, palette, default_mode from public.site_settings where id`
  );
  const row = rows[0];
  return {
    brand: resolveBrand(row),
    textSize: isTextSize(row?.text_size) ? row.text_size : DEFAULT_TEXT_SIZE,
    palette: isPalette(row?.palette) ? row.palette : DEFAULT_PALETTE,
    defaultMode: isDefaultMode(row?.default_mode) ? row.default_mode : DEFAULT_DEFAULT_MODE
  };
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
