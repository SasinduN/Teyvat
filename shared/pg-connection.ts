/**
 * How this codebase connects to Postgres. Used by the API service and by the
 * migration runner, so the two cannot end up with different TLS behaviour.
 */

export interface ConnectionTarget {
  connectionString: string;
  ssl: false | { rejectUnauthorized: boolean };
}

/**
 * Decides TLS here rather than letting the connection string do it.
 *
 * `sslmode` in the URL is interpreted by pg-connection-string, and in pg 8.x
 * `require` is treated as `verify-full` — full certificate verification — while
 * pg 9 will switch it to libpq semantics (encrypt, do not verify). Those are
 * opposite behaviours from the same URL, and whichever one you rely on breaks
 * on upgrade. Worse, the parsed value wins over the `ssl` option passed
 * alongside it, so a relaxed setting there is silently ignored.
 *
 * So: read `sslmode` only as a yes/no signal for "use TLS", strip it, and state
 * the verification policy explicitly.
 *
 * `rejectUnauthorized: false` is deliberate and is a real trade-off. Railway's
 * TCP proxy presents a self-signed certificate that chains to nothing in the
 * default CA store, so verification cannot succeed without pinning their CA.
 * The connection is still encrypted, which defeats passive eavesdropping on the
 * public internet, but it does not authenticate the server — an active
 * machine-in-the-middle would not be detected.
 *
 * That is acceptable for applying migrations from a laptop, and it is why the
 * deployed service should use the internal `*.railway.internal` URL with no
 * `sslmode` at all: traffic never leaves Railway's private network, so there is
 * nothing to encrypt against and nothing to verify.
 */
export function connectionTargetFor(url: string): ConnectionTarget {
  const parsed = new URL(url);
  const mode = parsed.searchParams.get('sslmode');

  // Remove anything that would re-engage pg's own SSL handling.
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');

  return {
    connectionString: parsed.toString(),
    ssl: mode !== null && mode !== 'disable' ? { rejectUnauthorized: false } : false
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
