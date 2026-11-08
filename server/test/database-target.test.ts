/**
 * Local runs never use production by default (shared/database-target.ts):
 *
 *   - the server refuses to start with a DATABASE_URL that isn't this
 *     machine, unless NODE_ENV=production; so does `npm run migrate`;
 *   - a script reaches production only with --prod, PROD_DATABASE_URL and
 *     the host typed back.
 *
 * No database: the refusals happen before any connection. The remote hosts
 * are `.invalid`, which never resolves.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, mock, test } from 'node:test';

import { databaseRefusal, isLocalDatabase, scriptDatabaseUrl } from '../../shared/database-target';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOCAL = 'postgresql://postgres:secret@localhost:5433/teyvat_dev';
const REMOTE = 'postgresql://postgres:secret@db.example.invalid:5432/railway?sslmode=require';

/** Runs a TypeScript entry point with `env` on top of this process's, and returns how it ended. */
function run(entry: string, env: Record<string, string>) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 45_000
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('which database a process may use', () => {
  test('local means this machine', () => {
    for (const url of [LOCAL, 'postgresql://u:p@127.0.0.1:5433/x', 'postgresql://u:p@[::1]:5433/x']) assert.equal(isLocalDatabase(url), true, url);
    for (const url of [REMOTE, 'postgresql://u:p@example.proxy.rlwy.net:12345/railway', 'postgres.railway.internal', 'not a url']) {
      assert.equal(isLocalDatabase(url), false, url);
    }
  });

  test('the server and migrate: anything but local is refused, except in production', () => {
    assert.equal(databaseRefusal(LOCAL, 'development'), null);
    assert.equal(databaseRefusal(LOCAL, undefined), null);
    assert.equal(databaseRefusal(REMOTE, 'production'), null);
    for (const env of ['development', 'test', undefined]) {
      const refusal = databaseRefusal(REMOTE, env);
      assert.ok(refusal, `${env}: refused`);
      assert.match(refusal!, /db\.example\.invalid:5432\/railway/);
      assert.doesNotMatch(refusal!, /secret/, 'never the password');
    }
  });

  test('the server refuses to start on a remote DATABASE_URL off production', () => {
    const { status, output } = run('server/src/index.ts', { DATABASE_URL: REMOTE, NODE_ENV: 'development', PORT: '18099' });
    assert.equal(status, 1, output);
    assert.match(output, /refusing to start/);
    assert.doesNotMatch(output, /listening/);
    assert.doesNotMatch(output, /secret/);
  });

  test('npm run migrate refuses a remote DATABASE_URL off production', () => {
    const { status, output } = run('scripts/migrate.ts', { DATABASE_URL: REMOTE, NODE_ENV: 'development' });
    assert.equal(status, 1, output);
    assert.match(output, /isn't this machine/);
    assert.doesNotMatch(output, /connected:/);
  });

  test('a production script without --prod refuses a remote DATABASE_URL', () => {
    const { status, output } = run('scripts/images-audit.ts', { DATABASE_URL: REMOTE, PROD_DATABASE_URL: '' });
    assert.equal(status, 1, output);
    assert.match(output, /PROD_DATABASE_URL and add --prod/);
  });
});

describe('--prod', () => {
  const saved = { DATABASE_URL: process.env.DATABASE_URL, PROD_DATABASE_URL: process.env.PROD_DATABASE_URL };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  /** `scriptDatabaseUrl` with exit turned into a throw, and what it printed. */
  async function choose(prod: boolean, io: Parameters<typeof scriptDatabaseUrl>[1]) {
    const lines: string[] = [];
    const mocks = [
      mock.method(console, 'log', (...a: unknown[]) => void lines.push(a.join(' '))),
      mock.method(console, 'error', (...a: unknown[]) => void lines.push(a.join(' '))),
      mock.method(process, 'exit', () => {
        throw new Error('exit');
      })
    ];
    try {
      return { url: await scriptDatabaseUrl({ prod, script: 'images:audit' }, io), lines };
    } catch (error) {
      if ((error as Error).message !== 'exit') throw error;
      return { url: null, lines };
    } finally {
      // Before the test ends: the runner exits the process once the file is done.
      for (const m of mocks) m.mock.restore();
    }
  }

  test('without --prod: the local DATABASE_URL', async () => {
    process.env.DATABASE_URL = LOCAL;
    process.env.PROD_DATABASE_URL = REMOTE;
    assert.equal((await choose(false, {})).url, LOCAL);
  });

  test('needs PROD_DATABASE_URL, a remote one, and a terminal', async () => {
    delete process.env.PROD_DATABASE_URL;
    assert.equal((await choose(true, { interactive: true, ask: async () => 'db.example.invalid' })).url, null);
    process.env.PROD_DATABASE_URL = LOCAL;
    assert.equal((await choose(true, { interactive: true, ask: async () => 'localhost' })).url, null);
    process.env.PROD_DATABASE_URL = REMOTE;
    assert.equal((await choose(true, { interactive: false, ask: async () => 'db.example.invalid' })).url, null);
  });

  test('prints the target, then goes on only when its host is typed back', async () => {
    process.env.PROD_DATABASE_URL = REMOTE;
    const asked: string[] = [];
    const wrong = await choose(true, { interactive: true, ask: async (q) => (asked.push(q), 'y') });
    assert.equal(wrong.url, null);
    assert.ok(wrong.lines.some((l) => l.includes('PRODUCTION database db.example.invalid:5432/railway')));
    assert.ok(!wrong.lines.join('\n').includes('secret'), 'never the password');
    assert.match(asked[0], /Type the host \(db\.example\.invalid\)/);

    const right = await choose(true, { interactive: true, ask: async () => ' db.example.invalid ' });
    assert.equal(right.url, REMOTE);
  });
});
