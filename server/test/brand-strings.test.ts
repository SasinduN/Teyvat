/**
 * The brand lives in one place, `shared/brand.ts` (and the admin's settings on
 * top), so a rebrand is one change.
 *
 * 1. No earlier name, and not the placeholder used before the name was chosen,
 *    anywhere: every file git tracks (or would track), except
 *    `docs/`, which holds the project's history (plans, reviews, changelogs) and
 *    is never shown to visitors, and the applied migrations: those are frozen
 *    (`migrations-frozen.test.ts`), so the earlier name stays in them, in
 *    comments and in SQL that production already ran. A migration that isn't
 *    frozen yet is read without its `--` comments, and its SQL must not name
 *    an earlier brand. Zero allowed: code, tests, seeds, the README and
 *    CLAUDE.md included. Identifiers count too (a component named
 *    after the old brand, a cookie or a database named after the project).
 * 2. The current name, tagline and legal name are written only in
 *    `shared/brand.ts`: everything else reads them from there.
 *
 * The patterns below are written so they don't match themselves.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { BRAND, BRAND_TEXT_DEFAULTS } from '../../shared/brand';
import { APPLIED_MIGRATIONS, migrationHash } from './applied-migrations';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BRAND_SOURCE = 'shared/brand.ts';

/**
 * The earlier brand (with and without spaces, dashes or underscores, so its
 * domain and identifiers too), the project's working name, the placeholder and
 * its domain, and a name already used by another Sri Lankan tour company, so
 * it never creeps in.
 */
// The separators include `.` and `*`, so a regular expression that spells a name out with `.*` between its words counts too.
const OLD_NAMES: readonly RegExp[] = [/travel[\s_.*-]*eye/i, /te[y]vat/i, /your[\s_.*-]*brand/i, /ceylon[\s_.*-]*eminence/i];

/** Every text file git tracks, plus new ones it would track, outside `docs/`. */
function repoFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  return [...new Set(out.split('\0').filter(Boolean))].filter((file) => !file.startsWith('docs/'));
}

function textOf(file: string): string | null {
  let buffer: Buffer;
  try {
    buffer = readFileSync(join(REPO_ROOT, file));
  } catch {
    return null; // Deleted in the working tree, not yet staged.
  }
  return buffer.includes(0) ? null : buffer.toString('utf8');
}

const MIGRATIONS = 'db/migrations/';

/** An applied migration, unchanged: frozen, never edited, so never scanned. */
function isFrozenMigration(file: string, text: string): boolean {
  return file.startsWith(MIGRATIONS) && APPLIED_MIGRATIONS[file.slice(MIGRATIONS.length)] === migrationHash(text);
}

function linesMatching(files: string[], patterns: readonly RegExp[]): string[] {
  const found: string[] = [];
  for (const file of files) {
    const text = textOf(file);
    if (text === null || isFrozenMigration(file, text)) continue;
    text.split('\n').forEach((raw, i) => {
      // In a migration, its SQL counts and its comments don't: they never reach a visitor.
      const line = file.startsWith(MIGRATIONS) ? raw.replace(/--.*$/, '') : raw;
      if (patterns.some((p) => p.test(line))) found.push(`${file}:${i + 1}: ${raw.trim().slice(0, 160)}`);
    });
  }
  return found;
}

test('no earlier brand name in any file outside docs/', () => {
  const files = repoFiles();
  assert.ok(files.length > 100, `expected the whole repo, got ${files.length} files`);
  const found = linesMatching(files, OLD_NAMES);
  assert.deepEqual(found, [], `Use shared/brand.ts (BRAND, useBrand(), loadBrand()) instead:\n  ${found.join('\n  ')}`);
});

test('the name, tagline and legal name are written only in shared/brand.ts', () => {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const values = [BRAND_TEXT_DEFAULTS.name, BRAND_TEXT_DEFAULTS.tagline, BRAND_TEXT_DEFAULTS.legalName];
  const patterns = values.map((value) => new RegExp(escape(value), 'i'));
  const files = repoFiles().filter((file) => file !== BRAND_SOURCE && !file.startsWith('server/test/'));
  const found = linesMatching(files, patterns);
  assert.deepEqual(found, [], `Read the brand from ${BRAND_SOURCE} instead:\n  ${found.join('\n  ')}`);
});

test('the patterns catch the earlier names in every spelling, and spare the brand', () => {
  // Built from pieces, so this file doesn't name them either.
  const travel = ['Travel', 'Eye'];
  const placeholder = ['Your', 'Brand'];
  const samples = [
    travel.join(' '),
    travel.join('').toUpperCase(),
    `${travel.join('-').toLowerCase()}.lk`,
    `Why${travel.join('')}`,
    'te' + 'yvat_test',
    `${placeholder.join(' ')} Tours`,
    `hello@${placeholder.join('').toLowerCase()}tours.example`,
    'Ceylon' + ' Eminence',
    `/${travel.join('.*').toUpperCase()}/`
  ];
  for (const sample of samples) assert.ok(OLD_NAMES.some((p) => p.test(sample)), sample);
  for (const fine of [BRAND.name, BRAND.shortName, BRAND.legalName, BRAND.tagline, BRAND.emailDomain, 'travelling with sharp eyes', 'your own brand-new itinerary']) {
    assert.ok(!OLD_NAMES.some((p) => p.test(fine)), fine);
  }
});

test('shared/brand.ts defines every part of the brand', () => {
  for (const [key, value] of Object.entries(BRAND_TEXT_DEFAULTS)) assert.ok(value.trim().length > 0, key);
  assert.ok(BRAND.favicon.startsWith('/'), 'the favicon is a site path');
  assert.match(BRAND.emailDomain, /^[a-z0-9.-]+\.[a-z]+$/);
  assert.match(BRAND.themeColor, /^#[0-9A-F]{6}$/i);
  assert.match(BRAND.backgroundColor, /^#[0-9A-F]{6}$/i);
  assert.equal(BRAND.logo.onLight === null, BRAND.logo.onDark === null, 'both logo files, or neither (the text wordmark)');
});
