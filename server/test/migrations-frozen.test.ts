/**
 * Applied migrations are never edited (CLAUDE.md): each file in db/migrations/
 * must still hash to what `applied-migrations.ts` lists, every listed file must
 * still exist, and every file must be listed. A change to an applied migration
 * never reaches production (`migrate` records file names only), so it would
 * make production and fresh databases quietly differ. Write a new migration
 * instead.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

import { APPLIED_MIGRATIONS, migrationHash } from './applied-migrations';

const DIR = resolve(import.meta.dirname, '..', '..', 'db', 'migrations');
const onDisk = readdirSync(DIR).filter((name) => name.endsWith('.sql')).sort();

test('no applied migration has changed', () => {
  const changed = Object.entries(APPLIED_MIGRATIONS)
    .filter(([name]) => onDisk.includes(name))
    .filter(([name, hash]) => migrationHash(readFileSync(join(DIR, name), 'utf8')) !== hash)
    .map(([name]) => name);
  assert.deepEqual(
    changed,
    [],
    'These migrations are applied, so they are never edited, not even a comment: production never re-runs them. ' +
      'Undo the edit (git checkout origin/main -- <file>) and put the change in a new migration.'
  );
});

test('no applied migration has been deleted or renamed', () => {
  const missing = Object.keys(APPLIED_MIGRATIONS).filter((name) => !onDisk.includes(name));
  assert.deepEqual(missing, [], 'production has these in schema_migrations; restore them');
});

test('every migration is listed, so it is frozen once merged', () => {
  const unlisted = onDisk.filter((name) => !(name in APPLIED_MIGRATIONS));
  const lines = unlisted.map((name) => `  '${name}': '${migrationHash(readFileSync(join(DIR, name), 'utf8'))}',`);
  assert.deepEqual(unlisted, [], `Add the new migration to server/test/applied-migrations.ts in the same PR:\n${lines.join('\n')}`);
});

test('the hash ignores line endings only', () => {
  assert.equal(migrationHash('select 1;\r\n'), migrationHash('select 1;\n'));
  assert.notEqual(migrationHash('select 1;\n'), migrationHash('select 1; \n'), 'a space is a change');
  assert.notEqual(migrationHash('-- a comment\n'), migrationHash('-- a Comment\n'), 'so is a comment');
});
