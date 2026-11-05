/**
 * Photos go through Admin → Media, into R2. Everything under public/ ships with
 * the site and stays in git history for good, so an image file there fails here,
 * whether or not it has been committed yet. Only the favicon and the logo may be
 * there. SVGs aren't photos, so they are allowed.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';

const IMAGE_FILE = /\.(jpe?g|png|webp|avif)$/i;
const ALLOWED = /^(favicon|logo)\.[^.]+$/i;

function forbiddenImages(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_FILE.test(entry.name) && !ALLOWED.test(entry.name))
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)).replace(/\\/g, '/'))
    .sort();
}

test('no photos under public/', () => {
  const found = forbiddenImages(resolve(import.meta.dirname, '..', '..', 'public'));
  assert.deepEqual(found, [], 'Upload these through Admin → Media (R2) instead of committing them');
});

test('the check finds every kind of image file, at any depth, and spares the favicon and logo', () => {
  const directory = mkdtempSync(join(tmpdir(), 'teyvat-public-'));
  try {
    const files = [
      'photo.jpg', 'photo.jpeg', 'photo.png', 'photo.webp', 'photo.avif', 'SHOUTING.JPG', 'assets/deep/er/ella-1280.webp',
      'favicon.png', 'images/logo.webp', 'images/glass-noise.svg', 'theme-init.js', 'not-a-logo.png'
    ];
    for (const file of files) {
      mkdirSync(dirname(join(directory, file)), { recursive: true });
      writeFileSync(join(directory, file), '');
    }
    assert.deepEqual(forbiddenImages(directory), [
      'SHOUTING.JPG', 'assets/deep/er/ella-1280.webp', 'not-a-logo.png', 'photo.avif', 'photo.jpeg', 'photo.jpg', 'photo.png', 'photo.webp'
    ]);
    assert.ok(!forbiddenImages(directory).some((file) => /^(favicon|logo)\./.test(basename(file))));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
