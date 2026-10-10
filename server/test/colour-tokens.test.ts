/**
 * The redesign moves every colour in the public site and the admin to a theme token
 * (`src/styles/tokens.css`, used as `var(--…)`), so the dark theme only has
 * to change the tokens (docs/plans/redesign-redo.md).
 *
 * Files the redesign has reached have no hex colour at all. The others are
 * allowed, file by file, up to how many they have now; each redesign PR
 * lowers or removes their entries as it restyles them, and the list is empty
 * when the last public page is done. Adding a hex colour anywhere fails, with
 * the file and line.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// The admin too, since redesign PR 5 restyled it.
const ROOTS = ['src/components', 'src/pages', 'src/admin', 'src/App.tsx'];
const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;

/** Hex colours each not-yet-restyled file may still have (after redesign PR 5). */
const ALLOWED: Record<string, number> = {
  // Untouched by decision in PRs 2 to 5; its own PR switches it to tokens.
  'src/components/WhatsAppButton.tsx': 5
};

function files(path: string): string[] {
  const full = join(REPO_ROOT, path);
  if (statSync(full).isFile()) return [path];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

test('no new hex colours in the public site or the admin', () => {
  const problems: string[] = [];
  for (const file of ROOTS.flatMap(files).map((f) => relative(REPO_ROOT, join(REPO_ROOT, f)).replace(/\\/g, '/'))) {
    if (!/\.tsx?$/.test(file)) continue;
    const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
    const found = lines.flatMap((line, i) => (line.match(HEX) ?? []).map((hex) => `${file}:${i + 1}: ${hex}`));
    const allowed = ALLOWED[file] ?? 0;
    if (found.length > allowed) {
      problems.push(`${file}: ${found.length} hex colour(s), ${allowed} allowed. Use a token from src/styles/tokens.css:\n  ${found.join('\n  ')}`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n\n'));
});

test('the allow-list only names files that still need it', () => {
  // A restyled file drops out of the list, so it can't quietly gain colours back.
  const stale = Object.entries(ALLOWED).filter(([file, allowed]) => {
    const count = (readFileSync(join(REPO_ROOT, file), 'utf8').match(HEX) ?? []).length;
    return count < allowed;
  });
  assert.deepEqual(stale.map(([file]) => file), [], 'lower these entries to their current counts (or remove them at 0)');
});
