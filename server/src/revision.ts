/** JSON-safe UTC timestamp retaining all six PostgreSQL fractional digits. */
export const REVISION_COLUMN = `to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at`;
