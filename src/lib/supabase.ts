import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The single browser Supabase client.
 *
 * Only the anon key is ever used here. Every table is guarded by Row Level
 * Security (see `supabase/migrations/0001_init.sql`), so this key is safe to
 * ship in the bundle. The service-role key must never appear in `src/`.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when the app has credentials to talk to Supabase at all. Surfaced in the
 * UI so a missing `.env.local` produces a clear setup message rather than a
 * cascade of confusing network errors.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[Teyvat] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env.local and fill them in.'
  );
}

export const supabase: SupabaseClient = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'teyvat-auth'
    }
  }
);

/** Normalises a PostgrestError / unknown throw into a user-facing message. */
export function describeError(error: unknown): string {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const e = error as { message?: string; details?: string; code?: string };

    // RLS rejections surface as 42501 and are otherwise cryptic.
    if (e.code === '42501') {
      return 'You do not have permission to perform this action.';
    }
    if (e.code === '23505') {
      return 'That ID is already taken. Choose a different slug.';
    }
    if (e.message) return e.message;
    if (e.details) return e.details;
  }

  return 'Something went wrong.';
}
