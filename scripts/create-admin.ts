/**
 * Creates an admin user, or resets one's password.
 *
 *   npm run admin:create -- --email you@x.lk --name "Full Name"
 *   npm run admin:create -- --email you@x.lk --reset-password
 *   npm run admin:create -- --email you@x.lk --name "Full Name" --prod
 *
 * The password is typed twice at a hidden prompt. It is never accepted as an
 * argument, because arguments land in shell history and in the process list.
 * Nothing here prints the password or its hash.
 *
 * Runs against the local DATABASE_URL. With --prod it runs against
 * PROD_DATABASE_URL, after printing the host and having it typed back
 * (shared/database-target.ts): how the first admin gets into the deployed
 * site, with no Railway CLI involved.
 *
 * The account code (and with it the database pool) loads only once the
 * database is chosen: the pool reads DATABASE_URL when it is imported.
 *
 * Every user is an admin. There is no HTTP route that creates one.
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import { scriptDatabaseUrl } from '../shared/database-target';
import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';

const USAGE =
  'Usage:\n' +
  '  npm run admin:create -- --email you@x.lk --name "Full Name"\n' +
  '  npm run admin:create -- --email you@x.lk --reset-password\n' +
  '  add --prod for production (PROD_DATABASE_URL)';

function fail(message: string): never {
  console.error(`${message}\n`);
  process.exit(1);
}

/**
 * Reads one line from the terminal without echoing it. Raw mode means handling
 * the few keys that matter by hand: Enter, Backspace and Ctrl+C.
 */
function promptHidden(label: string): Promise<string> {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    let value = '';

    stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };

    stdin.on('data', onData);
  });
}

/** Set once the pool exists, so `finally` can close it. */
let closePool: () => Promise<void> = async () => undefined;
let isAccountError: (error: unknown) => boolean = () => false;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      'reset-password': { type: 'boolean', default: false },
      prod: { type: 'boolean', default: false }
    },
    strict: true
  });

  if (!values.email) fail(`--email is required.\n\n${USAGE}`);

  if (!process.stdin.isTTY) {
    fail(
      'Run this in an interactive terminal: the password is read from a hidden\n' +
        'prompt and is never accepted from a pipe or an argument.'
    );
  }

  // The database first; the account code (and its pool) load for that one.
  const url = await scriptDatabaseUrl({ prod: values.prod, script: 'admin:create' });
  process.env.DATABASE_URL = url;
  const accounts = await import('../server/src/auth/accounts');
  const { pool } = await import('../server/src/db');
  closePool = () => pool.end();
  isAccountError = (error) => error instanceof accounts.AccountError;
  const { createOrResetAdmin, isPublicContactEmail, isValidEmail, normaliseEmail, PASSWORD_MAX, PASSWORD_MIN } = accounts;

  const email = normaliseEmail(values.email!);
  if (!isValidEmail(email)) fail(`Not a valid email: ${email}`);

  const fullName = values.name?.trim() || null;
  const resetPassword = values['reset-password'];

  // Say where this is going before asking for anything.
  const where = new URL(connectionTargetFor(url).connectionString);
  const { rows } = await pool.query<{ db: string }>('select current_database() as db');
  console.log(`database: ${rows[0]?.db} on ${where.hostname}${where.port ? `:${where.port}` : ''}`);
  console.log(`${resetPassword ? 'resetting password for' : 'creating admin'}: ${email}\n`);

  if (await isPublicContactEmail(email)) {
    console.warn(
      `WARNING: ${email} is site_settings.contact_email, which the public Footer\n` +
        'shows to every visitor. An admin login on a published address gives an\n' +
        'attacker half of the credentials. Prefer a private address.\n'
    );
  }

  const password = await promptHidden(`Password (${PASSWORD_MIN}–${PASSWORD_MAX} characters): `);
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    fail(`The password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`);
  }
  const again = await promptHidden('Repeat password: ');
  if (again !== password) fail('The passwords do not match. Nothing was changed.');

  const result = await createOrResetAdmin({ email, fullName, password, resetPassword });

  if (result === 'created') {
    console.log(`\nCreated ${email}. Sign in at /admin/login.`);
  } else {
    console.log(
      `\nPassword reset for ${email}. Its sessions were ended and its failed ` +
        'sign-in attempts cleared.'
    );
  }
}

main()
  .catch((error: unknown) => {
    if (isAccountError(error)) {
      console.error(`\n${(error as Error).message}\n`);
    } else {
      console.error(`\ncreate-admin failed: ${error instanceof Error ? error.message : error}`);
      const hint = privateHostHint(error);
      if (hint) console.error(hint);
    }
    process.exitCode = 1;
  })
  .finally(() => closePool());
