/**
 * Creates an admin user, or resets one's password.
 *
 *   npm run admin:create -- --email you@x.lk --name "Full Name"
 *   npm run admin:create -- --email you@x.lk --reset-password
 *
 * The password is typed twice at a hidden prompt. It is never accepted as an
 * argument, because arguments land in shell history and in the process list.
 * Nothing here prints the password or its hash.
 *
 * Runs against DATABASE_URL. In the local .env that is PRODUCTION, which is the
 * point: it is how the first admin gets into the deployed site, with no Railway
 * CLI involved. The target is printed before anything is written.
 *
 * Every user is an admin. There is no HTTP route that creates one.
 */
import '../shared/load-env';

import { parseArgs } from 'node:util';

import {
  AccountError,
  createOrResetAdmin,
  isPublicContactEmail,
  isValidEmail,
  normaliseEmail,
  PASSWORD_MAX,
  PASSWORD_MIN
} from '../server/src/auth/accounts';
import { pool } from '../server/src/db';
import { connectionTargetFor, privateHostHint } from '../shared/pg-connection';

const USAGE =
  'Usage:\n' +
  '  npm run admin:create -- --email you@x.lk --name "Full Name"\n' +
  '  npm run admin:create -- --email you@x.lk --reset-password';

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

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      'reset-password': { type: 'boolean', default: false }
    },
    strict: true
  });

  if (!values.email) fail(`--email is required.\n\n${USAGE}`);

  const email = normaliseEmail(values.email);
  if (!isValidEmail(email)) fail(`Not a valid email: ${email}`);

  const fullName = values.name?.trim() || null;
  const resetPassword = values['reset-password'];

  if (!process.stdin.isTTY) {
    fail(
      'Run this in an interactive terminal: the password is read from a hidden\n' +
        'prompt and is never accepted from a pipe or an argument.'
    );
  }

  // Say where this is going before asking for anything.
  const url = process.env.DATABASE_URL;
  if (!url) fail('DATABASE_URL is not set. Put it in .env in the project root.');
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
    if (error instanceof AccountError) {
      console.error(`\n${error.message}\n`);
    } else {
      console.error(`\ncreate-admin failed: ${error instanceof Error ? error.message : error}`);
      const hint = privateHostHint(error);
      if (hint) console.error(hint);
    }
    process.exitCode = 1;
  })
  .finally(() => pool.end());
