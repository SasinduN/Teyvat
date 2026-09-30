import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The single browser Supabase client.
 *
 * Only the publishable key (`sb_publishable_...`) is ever used here. Every table
 * is guarded by Row Level Security (see `supabase/migrations/0001_init.sql`),
 * so this key is safe to ship in the bundle. The secret key must never appear
 * in `src/`.
 *
 * Legacy `anon` / `service_role` JWTs are deprecated (end of 2026) and are not
 * supported by this app — use the new key format from Project Settings → API Keys.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * True when the app has credentials to talk to Supabase at all. Surfaced in the
 * UI so a missing `.env.local` produces a clear setup message rather than a
 * cascade of confusing network errors.
 */
export const isSupabaseConfigured = Boolean(url && publishableKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[Teyvat] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set. ' +
      'Copy .env.example to .env.local and fill them in.'
  );
}

export const supabase: SupabaseClient = createClient(
  url ?? 'http://localhost:54321',
  publishableKey ?? 'sb_publishable_placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'teyvat-auth'
    }
  }
);

/**
 * Moved to `@/lib/errors` so the public bundle can use it without loading the
 * Supabase SDK. Re-exported so the admin files importing it from here are
 * unchanged until phase 4 removes this module.
 */
export { describeError } from '@/lib/errors';
