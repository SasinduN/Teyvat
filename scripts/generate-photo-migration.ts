/** Generate reviewable, guarded corrections; never connect to a database here. */
import { readFileSync, writeFileSync } from 'node:fs';
import photos from '../shared/travel-photos.json';
import { PHOTO_CORRECTIONS } from '../shared/photo-corrections';

const inventory = JSON.parse(readFileSync('docs/qa-results/image-inventory.json', 'utf8')) as Array<{ collection: string; record: string; field: string; image: string }>;
const collectionKeys: Record<string, string> = { experienceCategories: 'experience_categories', featuredExperiences: 'featured_experiences', hiddenGems: 'hidden_gems', photoStories: 'photo_stories', heroSlides: 'hero_slides' };
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const sql = ['-- Replace only known original seed references; preserve owner-edited image URLs.', '-- Prices, durations, names, routes and travel descriptions are untouched.', 'begin;'];
let count = 0;
for (const item of inventory) {
  const table = collectionKeys[item.collection] ?? item.collection;
  const key = PHOTO_CORRECTIONS[table]?.[item.record];
  if (!key || item.field !== 'image') continue;
  const photo = photos.find(row => row.key === key);
  if (!photo) throw Error(`Missing credited photo: ${key}`);
  sql.push(`update public.${table} set image = ${quote(photo.image)}, updated_at = now() where id = ${quote(item.record)} and image = ${quote(item.image)};`);
  count++;
}
for (const id of ['ella', 'sigiriya']) {
  const oldGallery = inventory.filter(item => item.collection === 'destinations' && item.record === id && item.field.startsWith('gallery[')).map(item => item.image);
  const next = id === 'ella' ? ['ella', 'train'] : ['sigiriya'];
  sql.push(`update public.destinations set gallery = array[${next.map(key => quote(photos.find(photo => photo.key === key)!.image)).join(', ')}], updated_at = now() where id = ${quote(id)} and gallery = array[${oldGallery.map(quote).join(', ')}];`);
}
sql.push('commit;', '');
writeFileSync('db/migrations/0010_location_photography.sql', sql.join('\n'));
console.log(`Generated ${count} named image corrections and two guarded galleries; review/apply with the existing migration runner.`);
