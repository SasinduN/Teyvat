/**
 * Two kinds of image stay out of the repo, where they would stay in git history
 * for good.
 *
 * Photos go through Admin → Media, into R2. Everything under public/ ships with
 * the site, so an image file there fails here, whether or not it has been
 * committed yet. Only the favicon and the logo may be there. SVGs aren't photos,
 * so they are allowed.
 *
 * Screenshots live in docs/screenshots/, which is git-ignored and full on a
 * working laptop. So that check asks git what is tracked, not the disk; it fails
 * on a file forced past .gitignore as soon as it is staged.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..', '..');
const IMAGE_FILE = /\.(jpe?g|png|webp|avif)$/i;
const ALLOWED = /^(favicon|logo)\.[^.]+$/i;

function forbiddenImages(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_FILE.test(entry.name) && !ALLOWED.test(entry.name))
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)).replace(/\\/g, '/'))
    .sort();
}

const git = (repo: string, ...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const trackedScreenshots = (repo: string) => git(repo, 'ls-files', '--', 'docs/screenshots').split('\n').filter(Boolean);

function withTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'site-images-'));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('no photos under public/', () => {
  assert.deepEqual(forbiddenImages(join(ROOT, 'public')), [], 'Upload these through Admin → Media (R2) instead of committing them');
});

test('the check finds every kind of image file, at any depth, and spares the favicon and logo', () => {
  withTemporaryDirectory((directory) => {
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
  });
});

test('nothing under docs/screenshots/ is tracked, and git ignores the folder', () => {
  assert.deepEqual(trackedScreenshots(ROOT), [], 'Screenshots are never committed: git rm --cached these');
  // check-ignore exits non-zero, and execFileSync throws, if the path isn't ignored.
  assert.equal(git(ROOT, 'check-ignore', 'docs/screenshots/any-page.png').trim(), 'docs/screenshots/any-page.png');
});

test('the check finds a screenshot forced past .gitignore, of any kind, once it is staged', () => {
  withTemporaryDirectory((repo) => {
    git(repo, 'init', '--quiet');
    writeFileSync(join(repo, '.gitignore'), 'docs/screenshots/\n');
    assert.deepEqual(trackedScreenshots(repo), []);

    mkdirSync(join(repo, 'docs', 'screenshots', 'a-branch'), { recursive: true });
    for (const file of ['home.png', 'a-branch/summary.md']) writeFileSync(join(repo, 'docs', 'screenshots', file), 'x');
    assert.deepEqual(trackedScreenshots(repo), [], 'on disk and ignored is fine');

    git(repo, 'add', '--force', 'docs/screenshots');
    assert.deepEqual(trackedScreenshots(repo), ['docs/screenshots/a-branch/summary.md', 'docs/screenshots/home.png']);
  });
});
