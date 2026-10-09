/**
 * The brand isn't decided (CLAUDE.md), so no new "Travel Eye" may appear in
 * the site's code: titles, headings, labels, storage keys and ids take it
 * from `shared/brand.ts` (`BRAND_NAME`), or say something brand-neutral.
 *
 * The strings that were already there (the approved demo's copy, the admin's
 * name, the notification email) are allowed, file by file, up to how many
 * each file had when this test was written. Removing one is fine (lower the
 * number here when you do); adding one fails, with the file and line.
 *
 * "Travel Eye" and "travel-eye", in any case; not identifiers such as
 * `WhyTravelEye`, which the rename changes along with everything else.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BRAND = /travel[ -]eye/i;
const ROOTS = ['src', 'shared', 'server/src', 'public', 'index.html'];
const SOURCE = /\.(ts|tsx|js|mjs|css|html|txt|json|svg)$/;

/** Where the brand is defined: the one place it belongs. */
const BRAND_SOURCE = 'shared/brand.ts';

/** File → how many lines naming the brand it may have (9 October 2026). */
const ALLOWED: Record<string, number> = {
  'server/src/env.ts': 1,
  'server/src/inquiries/notify.ts': 2,
  'shared/page-meta.ts': 1,
  'src/admin/collections.ts': 3,
  'src/admin/components/AdminLayout.tsx': 2,
  'src/admin/pages/LoginPage.tsx': 2,
  'src/admin/useInquiryCounts.ts': 2,
  'src/components/Footer.tsx': 5,
  'src/components/HiddenGemsSection.tsx': 1,
  'src/components/InquiryForm.tsx': 2,
  'src/components/IntroSection.tsx': 2,
  'src/components/JournalSection.tsx': 1,
  'src/components/Navbar.tsx': 2,
  'src/components/PhotoStorySection.tsx': 1,
  'src/components/WhyTravelEye.tsx': 1,
  'src/lib/planner.ts': 1,
  'src/pages/HomePage.tsx': 2,
  'src/types/index.ts': 1
};

function files(path: string): string[] {
  const full = join(REPO_ROOT, path);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return [path];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

test('no new "Travel Eye" outside shared/brand.ts', () => {
  const found = new Map<string, string[]>();
  for (const file of ROOTS.flatMap(files).map((f) => relative(REPO_ROOT, join(REPO_ROOT, f)).replace(/\\/g, '/'))) {
    if (file === BRAND_SOURCE || !SOURCE.test(file)) continue;
    readFileSync(join(REPO_ROOT, file), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (BRAND.test(line)) found.set(file, [...(found.get(file) ?? []), `${file}:${i + 1}: ${line.trim()}`]);
      });
  }

  const problems: string[] = [];
  for (const [file, lines] of found) {
    const allowed = ALLOWED[file] ?? 0;
    if (lines.length > allowed) {
      problems.push(`${file}: ${lines.length} line(s) name the brand, ${allowed} allowed. Use BRAND_NAME from ${BRAND_SOURCE}:\n  ${lines.join('\n  ')}`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n\n'));
});

test('the brand itself is defined in shared/brand.ts', () => {
  assert.match(readFileSync(join(REPO_ROOT, BRAND_SOURCE), 'utf8'), /export const BRAND_NAME = '[^']+';/);
});
