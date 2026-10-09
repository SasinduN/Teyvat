/**
 * The redesign moves every colour in the public components to a theme token
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
const ROOTS = ['src/components', 'src/pages'];
const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;

/** Hex colours each not-yet-restyled file may still have (redesign PR 2). */
const ALLOWED: Record<string, number> = {
  'src/components/CTASection.tsx': 13,
  'src/components/DestinationSpotlight.tsx': 16,
  'src/components/ExperiencesSection.tsx': 10,
  'src/components/FeaturedExperiences.tsx': 23,
  'src/components/HeroSection.tsx': 20,
  'src/components/HiddenGemsSection.tsx': 33,
  'src/components/InquiryForm.tsx': 42,
  'src/components/InquiryModal.tsx': 5,
  'src/components/InteractiveMapSection.tsx': 65,
  'src/components/IntroSection.tsx': 42,
  'src/components/JournalSection.tsx': 16,
  'src/components/PageCards.tsx': 35,
  'src/components/PageHero.tsx': 8,
  'src/components/PhotoStorySection.tsx': 8,
  'src/components/PlanCard.tsx': 9,
  'src/components/QuickSearch.tsx': 21,
  'src/components/RouteMap.tsx': 1,
  'src/components/SearchModal.tsx': 19,
  'src/components/SiteStatus.tsx': 9,
  'src/components/ToursSection.tsx': 26,
  'src/components/TravelPlanner.tsx': 46,
  // Untouched in PR 2 by decision; its own PR switches it to tokens.
  'src/components/WhatsAppButton.tsx': 5,
  'src/components/WhyTravelEye.tsx': 11,
  'src/pages/AboutPage.tsx': 14,
  'src/pages/ArticlePage.tsx': 7,
  'src/pages/DestinationPage.tsx': 27,
  'src/pages/DestinationsPage.tsx': 12,
  'src/pages/ExperiencePage.tsx': 13,
  'src/pages/NotFoundPage.tsx': 11,
  'src/pages/PhotoCreditsPage.tsx': 8,
  'src/pages/TourPage.tsx': 23,
  'src/pages/UnsubscribePage.tsx': 9
};

function files(path: string): string[] {
  const full = join(REPO_ROOT, path);
  if (statSync(full).isFile()) return [path];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

test('no new hex colours in the public components and pages', () => {
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
