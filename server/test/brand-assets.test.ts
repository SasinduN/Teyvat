/**
 * The logo's files (docs/plans/brand-themes.md): public/brand/ as `npm run brand:assets`
 * writes it from design/brand/. Every file on the list exists, has its exact size in
 * pixels and stays within its budget; nothing else is there; the site points at them;
 * and `sharp`, which makes them, never reaches the app.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import sharp from 'sharp';

import { BRAND, BRAND_ASSETS } from '../../shared/brand';
import { BRAND_DIR, BRAND_FILES, EMBLEM } from '../../shared/brand-files';
import { renderHead } from '../src/pages/head';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC_BRAND = join(ROOT, 'public', 'brand');

test('every brand file exists, at its exact size, within its budget', async () => {
  for (const file of BRAND_FILES) {
    const path = join(PUBLIC_BRAND, file.name);
    assert.ok(existsSync(path), `${file.name} is missing: run npm run brand:assets`);
    const bytes = statSync(path).size;
    assert.ok(bytes <= file.budgetKb * 1024, `${file.name}: ${(bytes / 1024).toFixed(1)} KB, budget ${file.budgetKb} KB`);
    if (file.name.endsWith('.ico')) continue;
    const meta = await sharp(path).metadata();
    assert.equal(meta.width, file.width, `${file.name} width`);
    if (file.height !== null) assert.equal(meta.height, file.height, `${file.name} height`);
    const format = file.name.split('.').pop()!.replace('jpg', 'jpeg');
    assert.equal(meta.format, format, `${file.name} is really ${format}`);
  }
});

test('the .ico holds the emblem at 16 and 32 px, as PNGs', () => {
  const ico = readFileSync(join(PUBLIC_BRAND, 'favicon.ico'));
  assert.deepEqual([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)], [0, 1, 2], 'an icon file with two images');
  const sides = [0, 1].map((i) => ico.readUInt8(6 + 16 * i));
  assert.deepEqual(sides, [16, 32]);
  for (const i of [0, 1]) {
    const offset = ico.readUInt32LE(6 + 16 * i + 12);
    assert.equal(ico.subarray(offset + 1, offset + 4).toString('latin1'), 'PNG');
  }
});

test('nothing else is in public/brand/, and the originals stay out of public/', () => {
  assert.deepEqual(readdirSync(PUBLIC_BRAND).sort(), BRAND_FILES.map((f) => f.name).sort());
  for (const original of ['logo.svg', 'logo1.svg']) {
    assert.ok(existsSync(join(ROOT, 'design', 'brand', original)), `design/brand/${original}`);
  }
  const shipped = readdirSync(join(ROOT, 'public'), { recursive: true }).map(String);
  assert.ok(!shipped.some((f) => /logo1?\.svg$/.test(f)), 'the 700 KB Canva files never ship');
});

test('the site points at the brand files', () => {
  const listed = new Set(BRAND_FILES.map((f) => `${BRAND_DIR}/${f.name}`));
  const used = [BRAND_ASSETS.favicon, BRAND_ASSETS.appleTouchIcon, BRAND_ASSETS.ogImage, ...BRAND_ASSETS.manifestIcons.map((i) => i.src)];
  for (const path of used) assert.ok(path && listed.has(path), `${path} is one of the brand files`);
  for (const source of [EMBLEM.png, ...EMBLEM.webp.split(', '), ...EMBLEM.pngSet.split(', ')].map((s) => s.split(' ')[0])) {
    assert.ok(listed.has(source), `${source} is one of the brand files`);
  }
  assert.deepEqual(BRAND_ASSETS.manifestIcons.map((i) => i.purpose), ['any', 'any', 'maskable']);
});

test('a page with no photo of its own shares the default image, at its size', () => {
  const head = renderHead(
    { title: 'About', description: 'About us.', path: '/about', image: null, type: 'website' },
    { origin: 'https://tours.example', indexable: true, brand: BRAND }
  );
  assert.match(head, /<meta property="og:image" content="https:\/\/tours\.example\/brand\/og-default\.jpg"/);
  assert.match(head, /<meta property="og:image:width" content="1200"/);
  assert.match(head, /<meta property="og:image:height" content="630"/);
  assert.match(head, /<meta name="twitter:card" content="summary_large_image"/);
});

test('sharp is a dev dependency only, and nothing the app runs imports it', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.devDependencies.sharp, 'sharp is in devDependencies');
  assert.equal(pkg.dependencies.sharp, undefined, 'and not in dependencies');
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const importers = ['src', 'server/src', 'shared']
    .flatMap((d) => walk(join(ROOT, d)))
    .filter((f) => /\.(tsx?|mjs|js)$/.test(f) && /from ['"]sharp['"]|require\(['"]sharp['"]\)/.test(readFileSync(f, 'utf8')))
    .map((f) => relative(ROOT, f));
  assert.deepEqual(importers, []);
  const bundle = join(ROOT, 'server', 'dist', 'index.js');
  if (existsSync(bundle)) assert.doesNotMatch(readFileSync(bundle, 'utf8'), /['"]sharp['"]/, 'the server bundle');
});
