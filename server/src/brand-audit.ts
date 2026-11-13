/**
 * Where the database still names an earlier brand or the placeholder:
 * `npm run brand:audit` (scripts/brand-audit.ts). For each match, the table,
 * the row's id and the column, never the value, so nothing it prints is
 * sensitive. Media rows are included, so R2 file names (`media`'s key and URL)
 * show up too.
 *
 * Read-only by construction: one `select` per text column. The tables that
 * hold people's data (accounts, sessions, enquiries, subscribers, bookings and
 * their rate limits) are never read: their text is what visitors wrote, and
 * nothing there is fixed in the admin.
 */
import type { Client, Pool, PoolClient } from 'pg';

/**
 * The earlier brand, the project's working name and the placeholder, as one
 * POSIX regular expression for Postgres's `~*`. Written so it doesn't match
 * itself (server/test/brand-strings.test.ts scans this file too).
 */
export const OLD_BRAND_SQL_PATTERN = 'travel[[:space:]_-]*eye|te[y]vat|your[[:space:]_-]*brand';

/** Never read: people's data, and the ledgers that only count requests. */
export const PERSONAL_TABLES: readonly string[] = [
  'users',
  'sessions',
  'login_attempts',
  'inquiries',
  'inquiry_attempts',
  'newsletter_subscribers',
  'newsletter_attempts',
  'bookings',
  'booking_attempts',
  'booking_history',
  'booking_notifications',
  'schema_migrations'
];

export interface BrandAuditHit {
  table: string;
  id: string;
  column: string;
}

type Db = Pool | PoolClient | Client;

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** Every row and text column (text, varchar, arrays of them, JSON) that matches, sorted. */
export async function findOldBrand(db: Db): Promise<BrandAuditHit[]> {
  const { rows: columns } = await db.query<{ table: string; column: string }>(
    `select c.table_name as table, c.column_name as column
       from information_schema.columns c
       join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
        and (c.data_type in ('text', 'character varying', 'json', 'jsonb')
             or (c.data_type = 'ARRAY' and c.udt_name in ('_text', '_varchar')))
        and not (c.table_name = any($1::text[]))
      order by c.table_name, c.ordinal_position`,
    [PERSONAL_TABLES]
  );

  // Each table's primary key, as the row's id ("tour/3" for a two-column key).
  const { rows: keys } = await db.query<{ table: string; columns: string[] }>(
    `select cl.relname as table, array_agg(a.attname::text order by k.ord) as columns
       from pg_index i
       join pg_class cl on cl.oid = i.indrelid
       join pg_namespace n on n.oid = cl.relnamespace and n.nspname = 'public'
       cross join lateral unnest(i.indkey) with ordinality as k(attnum, ord)
       join pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
      where i.indisprimary
      group by cl.relname`
  );
  const keyOf = new Map(keys.map((k) => [k.table, k.columns]));

  const hits: BrandAuditHit[] = [];
  for (const { table, column } of columns) {
    const key = keyOf.get(table);
    const id = key ? `concat_ws('/', ${key.map((c) => `${quoteIdent(c)}::text`).join(', ')})` : 'ctid::text';
    // Names come from the catalogue, never from input, and are quoted anyway.
    const { rows } = await db.query<{ id: string }>(
      `select ${id} as id from public.${quoteIdent(table)} where ${quoteIdent(column)}::text ~* $1 order by 1`,
      [OLD_BRAND_SQL_PATTERN]
    );
    for (const row of rows) hits.push({ table, id: row.id, column });
  }
  return hits;
}
