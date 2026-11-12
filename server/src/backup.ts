/**
 * The pieces of `npm run db:backup` (scripts/db-backup.ts) that can be tested
 * on their own: where the dump goes, how pg_dump is told where to connect
 * without the URL or password on its command line, which pg_dump to run, and
 * what the finished file holds.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** `backups/2026-11-13-142530.dump`: the date and time in UTC, sortable. */
export function backupFileName(now: Date): string {
  const iso = now.toISOString(); // 2026-11-13T14:25:30.123Z
  return `${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, '')}.dump`;
}

/**
 * libpq's environment variables for a database URL. pg_dump reads the password
 * from PGPASSWORD, so it never appears on a command line (where any process
 * listing could read it) or in anything printed. TLS follows the URL's
 * `sslmode` with libpq's meanings, as `shared/pg-connection.ts` does for the
 * app: absent means none, `no-verify` (pg's own word) means `require`.
 */
export function pgEnvironment(url: string, applicationName: string): Record<string, string> {
  const parsed = new URL(url);
  const mode = parsed.searchParams.get('sslmode');
  const env: Record<string, string> = {
    PGHOST: parsed.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: parsed.port || '5432',
    PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)),
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGSSLMODE: mode === null ? 'disable' : mode === 'no-verify' ? 'require' : mode,
    PGAPPNAME: applicationName,
    PGCONNECT_TIMEOUT: '15',
    // pg_dump only reads; this makes Postgres refuse anything else on the connection.
    PGOPTIONS: '-c default_transaction_read_only=on'
  };
  if (mode === 'verify-ca' || mode === 'verify-full') env.PGSSLROOTCERT = 'system';
  return env;
}

/** The variables a child process must not inherit: every database URL. */
export const URL_VARIABLES = ['DATABASE_URL', 'PROD_DATABASE_URL', 'TEST_DATABASE_URL', 'DATABASE_PUBLIC_URL'] as const;

/** The major version: "pg_dump (PostgreSQL) 18.4" → 18; server_version_num "160004" → 16. */
export function majorVersion(text: string): number {
  const trimmed = text.trim();
  if (/^\d{5,6}$/.test(trimmed)) return Math.floor(Number(trimmed) / 10000);
  const match = /\(PostgreSQL\)\s+(\d+)/.exec(trimmed) ?? /^(\d+)(?:\.\d+)?/.exec(trimmed);
  if (!match) throw new Error(`Can't read a PostgreSQL version from "${trimmed.slice(0, 60)}".`);
  return Number(match[1]);
}

/**
 * pg_dump or pg_restore: from PG_BIN when set, else the PATH, else (Windows)
 * the newest `C:\Program Files\PostgreSQL\<major>\bin`.
 */
export function findPgTool(name: 'pg_dump' | 'pg_restore', env: NodeJS.ProcessEnv = process.env): string | null {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  if (env.PG_BIN) {
    const candidate = join(env.PG_BIN, exe);
    return existsSync(candidate) ? candidate : null;
  }
  try {
    execFileSync(exe, ['--version'], { stdio: 'ignore' });
    return exe;
  } catch {
    // Not on the PATH.
  }
  if (process.platform === 'win32') {
    const root = join(env.ProgramFiles ?? 'C:\\Program Files', 'PostgreSQL');
    if (existsSync(root)) {
      const majors = readdirSync(root).filter((d) => /^\d+$/.test(d)).sort((a, b) => Number(b) - Number(a));
      for (const major of majors) {
        const candidate = join(root, major, 'bin', exe);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

/** The tables in a dump: `pg_restore --list`'s TABLE entries (not TABLE DATA). */
export function tablesInList(list: string): string[] {
  return list
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(';'))
    .map((line) => /^\d+;\s+\d+\s+\d+\s+TABLE\s+(?!DATA\s)(\S+)\s+(\S+)/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => `${m[1]}.${m[2]}`);
}

/** Text from pg_dump with the URL and the password taken out, before it is printed. */
export function redact(text: string, url: string): string {
  const parsed = new URL(url);
  let out = text.split(url).join('<database URL>');
  for (const secret of [parsed.password, decodeURIComponent(parsed.password)]) {
    if (secret) out = out.split(secret).join('<password>');
  }
  return out;
}

/** 1536 → "1.5 KB". */
export function formatBytes(bytes: number): string {
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${bytes} bytes` : `${value.toFixed(1)} ${units[unit]}`;
}
