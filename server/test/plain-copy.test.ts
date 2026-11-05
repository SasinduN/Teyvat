/**
 * Plain copy on the public site (docs/reviews/generic-ui-audit.md): the phrases the
 * audit removed stay out of the public components, pages and page descriptions, no
 * text there uses an em dash, and nothing promises a reply time. Comments don't count, and neither does the admin.
 * Seed text is handled by migration 0021.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..', '..');
const STOCK = /\b(authentic|unforgettable|seamless|curated|breathtaking|stunning|timeless|immersive|nestled|paradise|premier|secret spot)\b|hidden places|within \d+ hours|—/i;

function files(path: string): string[] {
  const full = join(ROOT, path);
  if (statSync(full).isFile()) return [path];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

const withoutComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

test('no stock phrases or em dashes in the public site\'s text', () => {
  const found: string[] = [];
  for (const file of [...files('src/components'), ...files('src/pages'), 'shared/page-meta.ts'].filter((f) => /\.tsx?$/.test(f))) {
    withoutComments(readFileSync(join(ROOT, file), 'utf8'))
      .split('\n')
      .forEach((line, i) => {
        if (STOCK.test(line)) found.push(`${relative(ROOT, join(ROOT, file)).replace(/\\/g, '/')}:${i + 1}: ${line.trim()}`);
      });
  }
  assert.deepEqual(found, [], found.join('\n'));
});

test('the check catches what it should', () => {
  for (const line of ['Discover unforgettable moments', 'A — B', 'Curated for you', 'hidden places', 'We reply within 12 hours']) assert.ok(STOCK.test(line), line);
  assert.ok(!STOCK.test('Off the path, with a map'));
});
