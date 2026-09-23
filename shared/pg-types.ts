/**
 * node-postgres type parsers, so rows arrive in the shapes
 * `shared/database.types.ts` claims.
 *
 * Import this for side effects before creating a pool or client:
 *
 *     import '../../shared/pg-types';
 *
 * ---------------------------------------------------------------------------
 * Why this file exists
 * ---------------------------------------------------------------------------
 * Supabase served rows through PostgREST, which hands back JSON. node-postgres
 * talks the wire protocol and converts values itself, and its defaults differ
 * in two ways that change what the public site renders. Neither shows up as an
 * error — both produce wrong output that looks plausible.
 * ---------------------------------------------------------------------------
 */
import pg from 'pg';

const DATE = 1082;
const NUMERIC = 1700;

/**
 * `date` -> keep the raw `YYYY-MM-DD` string.
 *
 * By default pg builds a JS Date at *local* midnight. Serialised to JSON that
 * becomes an instant in UTC, so in any zone east of Greenwich the date moves
 * back a day: `2026-01-28` leaves the database and arrives as
 * `"2026-01-27T18:30:00.000Z"` at +05:30.
 *
 * `formatArticleDate` in `src/lib/mappers.ts` then appends `T00:00:00Z` to
 * whatever it is given, producing nonsense, failing its own NaN check, and
 * falling back to printing the raw string — so an article would render its
 * headline date as `2026-01-27T18:30:00.000Z`.
 *
 * `articles.published_at` is the only `date` column, and it is declared
 * `published_at: string` precisely because it is meant to stay `YYYY-MM-DD`.
 */
pg.types.setTypeParser(DATE, (value: string) => value);

/**
 * `numeric` -> number.
 *
 * pg returns numerics as strings to avoid losing precision, which is right in
 * general but contradicts `rating: number` and `price_from: number`. The
 * mappers already wrap both in `Number()`, so nothing would visibly break — the
 * declared types would simply be a lie, and the next person to read
 * `row.rating` without coercing would get string concatenation.
 *
 * Safe for these two columns specifically: `numeric(3,2)` ratings and
 * `numeric(10,2)` prices are far inside what a float64 represents exactly at
 * two decimal places. Do NOT extend this reasoning to a column used for exact
 * monetary arithmetic — that wants the string, or integer minor units.
 */
pg.types.setTypeParser(NUMERIC, (value: string) => Number.parseFloat(value));

/**
 * Left on the default deliberately: `timestamptz` (`created_at`, `updated_at`)
 * becomes a JS Date in process and an ISO 8601 string once serialised, which is
 * exactly what the `string` in the row types describes on the wire. Nothing
 * server-side reads these columns, and an instant has no timezone ambiguity to
 * get wrong the way a bare date does.
 */
export {};
