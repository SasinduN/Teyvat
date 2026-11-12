/**
 * Database dumps never enter git: `npm run db:backup` writes production's data
 * (accounts' password hashes, enquiries) to `backups/`, and anything committed
 * stays in the history for good. `backups/` and every `*.dump` are ignored, and
 * this fails as soon as one is tracked anyway (forced past .gitignore and
 * staged), anywhere in the repo. It asks git what is tracked, not the disk,
 * since a working laptop has dumps in `backups/`.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..', '..');

const git = (repo: string, ...args: string[]) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Tracked (or staged) files under backups/, or ending in .dump anywhere. */
const trackedBackups = (repo: string) =>
  git(repo, 'ls-files', '--', 'backups', '*.dump', '*.dump.partial').split('\n').filter(Boolean).sort();

test('nothing in backups/, and no .dump anywhere, is tracked', () => {
  assert.deepEqual(trackedBackups(ROOT), [], 'Backups are never committed: git rm --cached these, and rotate anything they exposed');
});

test('git ignores backups/ and dumps, wherever they are', () => {
  for (const path of ['backups/2026-11-13-142530.dump', 'backups/2026-11-13-142530.dump.partial', 'backups/notes.txt', 'scripts/stray.dump']) {
    // check-ignore exits non-zero, and execFileSync throws, if the path isn't ignored.
    assert.equal(git(ROOT, 'check-ignore', path).trim(), path);
  }
});

test('the check finds a dump forced past .gitignore, once it is staged', () => {
  const repo = mkdtempSync(join(tmpdir(), 'site-backups-'));
  try {
    git(repo, 'init', '--quiet');
    writeFileSync(join(repo, '.gitignore'), readFileSync(join(ROOT, '.gitignore'), 'utf8'));
    mkdirSync(join(repo, 'backups'));
    writeFileSync(join(repo, 'backups', '2026-11-13-142530.dump'), 'PGDMP');
    writeFileSync(join(repo, 'elsewhere.dump'), 'PGDMP');
    git(repo, 'add', '--all');
    assert.deepEqual(trackedBackups(repo), [], 'on disk and ignored is fine');

    git(repo, 'add', '--force', 'backups', 'elsewhere.dump');
    assert.deepEqual(trackedBackups(repo), ['backups/2026-11-13-142530.dump', 'elsewhere.dump']);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
