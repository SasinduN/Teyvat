/**
 * How this codebase connects to Postgres. Used by the API service and by the
 * migration runner, so the two cannot end up with different TLS behaviour.
 */

export interface ConnectionTarget {
  connectionString: string;
  ssl: false | { rejectUnauthorized: boolean };
}

/** TLS verifies certificates by default. For private local development only,
 * sslmode=no-verify may explicitly opt out. Remote self-signed deployments
 * must configure a trusted CA (for example NODE_EXTRA_CA_CERTS). */
export function connectionTargetFor(url: string): ConnectionTarget {
  const parsed = new URL(url);
  const mode = parsed.searchParams.get('sslmode');
  if (mode !== null && !['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full', 'no-verify'].includes(mode)) throw new Error('Unsupported database sslmode.');
  if (mode === 'no-verify' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error('Unverified TLS is only permitted for an explicitly configured local database.');

  // Remove anything that would re-engage pg's own SSL handling.
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');

  return {
    connectionString: parsed.toString(),
    ssl: mode !== null && mode !== 'disable' ? { rejectUnauthorized: mode !== 'no-verify' } : false
  };
}

/**
 * `*.railway.internal` resolves only inside Railway's private network, so the
 * DATABASE_URL that is correct for the deployed service is a guaranteed
 * ENOTFOUND anywhere else. Returns a hint for that specific failure, or null if
 * the error is something else.
 *
 * Keyed off the actual DNS result rather than an environment variable such as
 * RAILWAY_ENVIRONMENT: those can be present in a local shell as well as in a
 * deployed container, so treating them as "we are running inside Railway"
 * suppresses the hint in exactly the case that needs it.
 */
export function privateHostHint(error: unknown): string | null {
  const e = error as { code?: string; hostname?: string };
  const host = e.hostname ?? '';

  if ((e.code !== 'ENOTFOUND' && e.code !== 'EAI_AGAIN') || !host.endsWith('.railway.internal')) {
    return null;
  }

  return (
    `\n${host} is on Railway's private network and does not resolve from here.\n\n` +
    'That URL is the right one for the deployed service, where the database is\n' +
    'reachable privately. It cannot work from a local machine.\n\n' +
    "For a local run, put the Postgres service's DATABASE_PUBLIC_URL\n" +
    '(*.proxy.rlwy.net, from its Variables tab) in .env as DATABASE_URL, with\n' +
    '`?sslmode=require` appended.'
  );
}
