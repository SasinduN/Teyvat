/**
 * Points the server at the test database. Import this FIRST in every test
 * file, before anything that touches `server/src/db.ts`.
 *
 * The tests truncate `users`, `sessions` and `login_attempts` between cases.
 * Pointed at the wrong database, that deletes every admin account. So there is
 * no fallback of any kind: TEST_DATABASE_URL must be set, must point at this
 * machine, must name a database ending in `_test`, and must state its port.
 * A default port is how a test run ends up in somebody else's Postgres.
 */
import '../../shared/load-env';

const HOW_TO_FIX =
  '\n\nSet it in .env, for example:\n' +
  '  TEST_DATABASE_URL=postgresql://postgres:<password>@localhost:<port>/teyvat_test\n' +
  'with the port your own PostgreSQL listens on, written out.';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Query parameters that libpq and pg-connection-string let override the host,
 * port or database named in the URL. Any of them would defeat the checks
 * below, so none are allowed.
 */
const OVERRIDING_PARAMS = ['host', 'hostaddr', 'port', 'dbname', 'database'];

function refuse(reason: string): never {
  throw new Error(`Refusing to run the tests: ${reason}${HOW_TO_FIX}`);
}

function checkedTestUrl(): string {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) refuse('TEST_DATABASE_URL is not set.');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    refuse('TEST_DATABASE_URL is not a valid URL.');
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    refuse(`TEST_DATABASE_URL must be a postgresql:// URL, not ${url.protocol}//.`);
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    refuse(`TEST_DATABASE_URL must point at localhost, not "${url.hostname || '(no host)'}".`);
  }
  if (url.port === '') {
    refuse('TEST_DATABASE_URL has no explicit port. Write the port out, e.g. localhost:5432.');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database.endsWith('_test')) {
    refuse(`TEST_DATABASE_URL names database "${database || '(none)'}", which does not end in _test.`);
  }

  const overriding = OVERRIDING_PARAMS.filter((p) => url.searchParams.has(p));
  if (overriding.length > 0) {
    refuse(`TEST_DATABASE_URL may not set ${overriding.join(', ')} as a query parameter.`);
  }

  return raw;
}

export const TEST_DATABASE_URL = checkedTestUrl();
export const TEST_DATABASE_NAME = decodeURIComponent(
  new URL(TEST_DATABASE_URL).pathname.replace(/^\//, '')
);

// load-env has already copied the real DATABASE_URL out of .env. Replace it
// before server/src/env.ts reads it, so the server's pool can only ever open
// the test database in this process.
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
