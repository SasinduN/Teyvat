/**
 * `npm run bundle:report` (after `npm run build`): what each page type loads,
 * from Vite's manifest, gzipped.
 *
 * "On load" is the entry plus the page's own chunk and everything they import
 * statically. "Map, on demand" is Leaflet's JS, which only the pages with a
 * map fetch, when the map is about to render; its stylesheet (unpkg) comes
 * with it and isn't counted here.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

interface Chunk {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  isEntry?: boolean;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8')) as Record<string, Chunk>;

const PAGES: [string, string, boolean][] = [
  ['Home', 'src/pages/HomePage.tsx', true],
  ['Destinations list', 'src/pages/DestinationsPage.tsx', false],
  ['Destination', 'src/pages/DestinationPage.tsx', false],
  ['Experiences list', 'src/pages/ExperiencesPage.tsx', false],
  ['Experience', 'src/pages/ExperiencePage.tsx', false],
  ['Tours list', 'src/pages/ToursPage.tsx', false],
  ['Tour', 'src/pages/TourPage.tsx', true],
  ['Article', 'src/pages/ArticlePage.tsx', false],
  ['About', 'src/pages/AboutPage.tsx', false],
  ['Photo credits', 'src/pages/PhotoCreditsPage.tsx', false],
  ['Unsubscribe', 'src/pages/UnsubscribePage.tsx', false],
  ['404', 'src/pages/NotFoundPage.tsx', false],
  ['Admin', 'src/admin/AdminApp.tsx', false]
];

const gz = (file: string) => gzipSync(readFileSync(join(DIST, file))).length;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

/** A chunk's file, its static imports' files, recursively, and their CSS. */
function closure(key: string, files = new Set<string>()): Set<string> {
  const chunk = manifest[key];
  if (!chunk || files.has(chunk.file)) return files;
  files.add(chunk.file);
  for (const css of chunk.css ?? []) files.add(css);
  for (const imported of chunk.imports ?? []) closure(imported, files);
  return files;
}

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry)!;
const entry = closure(entryKey);
const leafletKey = Object.keys(manifest).find((k) => /\/leaflet-src-[^/]+\.js$/.test(manifest[k].file));
const leaflet = leafletKey ? gz(manifest[leafletKey].file) : 0;

const sum = (files: Iterable<string>, ext: string) =>
  [...files].filter((f) => f.endsWith(ext)).reduce((n, f) => n + gz(f), 0);

console.log('| Page type | JS on load | CSS on load | Map, on demand |');
console.log('|---|---:|---:|---:|');
for (const [label, key, map] of PAGES) {
  if (!manifest[key]) throw new Error(`${key} isn't in the manifest; did the build run?`);
  const files = closure(key, new Set(entry));
  console.log(`| ${label} | ${kb(sum(files, '.js'))} | ${kb(sum(files, '.css'))} | ${map ? `+ ${kb(leaflet)} (Leaflet)` : '—'} |`);
}
console.log(`\nShared by every public page (the entry): ${kb(sum(entry, '.js'))} JS, ${kb(sum(entry, '.css'))} CSS, gzipped.`);
