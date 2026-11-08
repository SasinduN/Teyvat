/**
 * Which database a process may use, so a local run can never reach
 * production by default (README, "Local database").
 *
 *   - `DATABASE_URL` is the local database (localhost). The server refuses
 *     any other host unless NODE_ENV=production (Railway, where it is the
 *     internal URL); so does `npm run migrate`, which Railway's start command
 *     runs.
 *   - Production from a laptop goes only through `PROD_DATABASE_URL`, only in
 *     the scripts that need it (admin:create, images:audit, images:import,
 *     content:import, media:rebase), only with `--prod`, and only after the target's host is
 *     printed and typed back.
 */
import { createInterface } from 'node:readline/promises';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Whether `url` is a database on this machine. Anything unparsable is not. */
export function isLocalDatabase(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** `host:port/database`, for messages: never the user or password. */
export function describeDatabase(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? `:${u.port}` : ''}${u.pathname}`;
  } catch {
    return '(not a URL)';
  }
}

/**
 * Why the server (or `npm run migrate`) must not use `url`, or null. Off
 * production, only a local database.
 */
export function databaseRefusal(url: string, nodeEnv: string | undefined): string | null {
  if (nodeEnv === 'production' || isLocalDatabase(url)) return null;
  return (
    `DATABASE_URL points at ${describeDatabase(url)}, which isn't this machine.\n` +
    'Local runs use a local database (localhost; README, "Local database"). Production is\n' +
    'reached only from Railway (NODE_ENV=production), or by the scripts that need it with\n' +
    'PROD_DATABASE_URL and --prod.'
  );
}

/**
 * The database a script uses: `DATABASE_URL`, which must be local, or with
 * `--prod` `PROD_DATABASE_URL`, after the person at the terminal has typed
 * its host back. Exits with a message otherwise.
 */
export async function scriptDatabaseUrl(
  options: { prod: boolean; script: string },
  io: { ask?: (question: string) => Promise<string>; interactive?: boolean } = {}
): Promise<string> {
  const fail = (message: string): never => {
    console.error(message);
    process.exit(1);
  };

  if (!options.prod) {
    const url = process.env.DATABASE_URL;
    if (!url) fail('DATABASE_URL is not set. Put the local database in .env (README, "Local database").');
    if (!isLocalDatabase(url!)) {
      fail(
        `DATABASE_URL points at ${describeDatabase(url!)}, which isn't this machine.\n` +
          `To run ${options.script} against production, set PROD_DATABASE_URL and add --prod.`
      );
    }
    return url!;
  }

  const url = process.env.PROD_DATABASE_URL;
  if (!url) fail('--prod needs PROD_DATABASE_URL: the production database URL (Railway, public proxy).');
  if (isLocalDatabase(url!)) fail('PROD_DATABASE_URL points at this machine; drop --prod to use the local database.');
  const interactive = io.interactive ?? Boolean(process.stdin.isTTY);
  if (!interactive) fail('--prod asks for confirmation, so it runs only in an interactive terminal.');

  const host = new URL(url!).hostname;
  console.log(`\n${options.script} --prod: PRODUCTION database ${describeDatabase(url!)}`);
  const ask =
    io.ask ??
    (async (question: string) => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        return await rl.question(question);
      } finally {
        rl.close();
      }
    });
  const typed = (await ask(`Type the host (${host}) to continue, anything else to stop: `)).trim();
  if (typed !== host) fail('Stopped: nothing was done.');
  return url!;
}
