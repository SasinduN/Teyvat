import photos from '../shared/travel-photos.json';
import { PHOTO_CORRECTIONS } from '../shared/photo-corrections';
/** Compare the live, read-only content API with this copy's original fixtures. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { DESTINATIONS } from './fixtures/destinations';
import { EXPERIENCE_CATEGORIES, FEATURED_EXPERIENCES } from './fixtures/experiences';
import { TOURS } from './fixtures/tours';
import { ARTICLES } from './fixtures/journal';
import { HIDDEN_GEMS } from './fixtures/hiddenGems';
import { PHOTO_STORIES } from './fixtures/photoStories';
import { HERO_SLIDES } from './fixtures/heroSlides';
import { PILLARS } from './fixtures/pillars';
import { toDestination, toExperienceCategory, toExperienceItem, toTourPackage, toArticle, toHiddenGem, toPhotoStory, toHeroSlide, toPillar } from '../src/lib/mappers';
import type { SiteContentPayload } from '../shared/api';

const response = await fetch(`${process.env.AUDIT_BASE_URL ?? 'http://localhost:8081'}/api/content`);
if (!response.ok) throw Error(`Content returned ${response.status}`);
const data = await response.json() as SiteContentPayload;
const checks: Array<[string, unknown[], unknown[]]> = [
  ['destinations', data.destinations.map(toDestination), DESTINATIONS.map(d => ({ ...d, featured: d.featured ?? false }))],
  ['experience categories', data.experienceCategories.map(toExperienceCategory), EXPERIENCE_CATEGORIES],
  ['featured experiences', data.featuredExperiences.map(toExperienceItem), FEATURED_EXPERIENCES],
  // Match the already-approved 0007 conversion, as verify:roundtrip does.
  ['tours', data.tours.map(toTourPackage).map(({ stops: _stops, ...tour }) => tour), TOURS.map(t =>
    t.id === 'island-in-7-days' ? { ...t, route: t.route.flatMap(place => place === 'South Coast' ? ['Mirissa', 'Galle'] : [place]) } : t)],
  ['articles', data.articles.map(toArticle), ARTICLES], ['hidden gems', data.hiddenGems.map(toHiddenGem), HIDDEN_GEMS],
  ['photo stories', data.photoStories.map(toPhotoStory), PHOTO_STORIES], ['hero slides', data.heroSlides.map(toHeroSlide), HERO_SLIDES],
  ['pillars', data.pillars.map(toPillar), PILLARS]
];
const report: Array<{ collection: string; records: number; status: string }> = [];
for (const [collection, actual, expected] of checks) {
  const tables: Record<string, string> = { 'experience categories': 'experience_categories', 'featured experiences': 'featured_experiences', 'hidden gems': 'hidden_gems', 'photo stories': 'photo_stories', 'hero slides': 'hero_slides' };
  const revisedExpected = (expected as Array<Record<string, unknown>>).map(row => {
    const copy = { ...row }; const key = PHOTO_CORRECTIONS[tables[collection] ?? collection]?.[String(row.id)];
    if (collection === 'photo stories' && row.id === 'p6') copy.location = 'Nuwara Eliya';
    if (collection === 'photo stories' && row.id === 'p7') copy.location = 'Ahangama';
    if (key) { const photo = photos.find(item => item.key === key)!; copy[collection === 'hero slides' ? 'url' : 'image'] = collection === 'destinations' && row.id === 'jaffna' ? photo.original : photo.image; }
    if (collection === 'destinations' && ['ella', 'sigiriya'].includes(String(row.id))) copy.gallery = (row.id === 'ella' ? ['ella', 'train'] : ['sigiriya']).map(key => photos.find(photo => photo.key === key)!.image);
    return copy;
  });
  // JSON transport omits undefined properties. Do not treat absent and undefined as content edits.
  try { assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(revisedExpected))); report.push({ collection, records: actual.length, status: 'PASS' }); }
  catch { report.push({ collection, records: actual.length, status: 'FAIL: differs from the original fixture; inspect legitimate CMS edits before changing content' }); process.exitCode = 1; }
}
writeFileSync('docs/qa-results/content-preservation.json', JSON.stringify(report, null, 2));
console.log(report);
