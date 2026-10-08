/** Read-only route and viewport audit. Run after build/API startup: node --import tsx scripts/audit-site.ts */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findChrome, launchChrome, type Chrome } from '../server/test/chrome';
import { paths, NAV_LINKS } from '../shared/site-paths';
import type { SiteContentPayload } from '../shared/api';

const base = process.env.AUDIT_BASE_URL ?? 'http://localhost:8081';
const output = 'docs/qa-results';
mkdirSync(output, { recursive: true });
const response = await fetch(`${base}/api/content`);
if (!response.ok) throw Error(`Content API returned ${response.status}`);
const content = await response.json() as SiteContentPayload;
const publicRoutes = [...new Set([
  ...NAV_LINKS.map(link => link.to), '/#planner', '/#journal', '/photo-credits', '/destinations?category=Wildlife',
  ...content.destinations.map(row => paths.destination(row.id)),
  ...content.featuredExperiences.map(row => paths.experience(row.id)),
  ...content.tours.map(row => paths.tour(row.id)), ...content.articles.map(row => paths.article(row.id))
])];
const collections = ['destinations', 'experience-categories', 'featured-experiences', 'tours', 'articles', 'hidden-gems', 'photo-stories', 'hero-slides', 'pillars'];
const adminRoutes = ['/admin', '/admin/login', '/admin/inquiries', '/admin/media', '/admin/settings',
  ...collections.flatMap(slug => [`/admin/${slug}`, `/admin/${slug}/new`])];
const contentKeys: Record<string, keyof SiteContentPayload> = {
  destinations: 'destinations', 'experience-categories': 'experienceCategories', 'featured-experiences': 'featuredExperiences',
  tours: 'tours', articles: 'articles', 'hidden-gems': 'hiddenGems', 'photo-stories': 'photoStories', 'hero-slides': 'heroSlides', pillars: 'pillars'
};
for (const slug of collections) {
  const rows = content[contentKeys[slug]];
  if (Array.isArray(rows)) for (const row of rows) adminRoutes.push(`/admin/${slug}/${encodeURIComponent(row.id)}`);
}
const routeChecks: Array<{ route: string; status: number; expected: number; result: string }> = [];
for (const route of [...publicRoutes, ...adminRoutes, '/missing-route', '/destinations/missing-slug', '/experiences/missing-slug', '/tours/missing-slug', '/journal/missing-slug']) {
  const res = await fetch(`${base}${route}`, { redirect: 'manual' });
  const expected = route.includes('missing-') ? 404 : 200;
  routeChecks.push({ route, status: res.status, expected, result: res.status === expected ? 'PASS' : 'FAIL' });
}
for (const route of ['/api/admin/content/destinations', '/api/admin/site-settings', '/api/admin/media', '/api/admin/inquiries']) {
  const res = await fetch(`${base}${route}`);
  routeChecks.push({ route, status: res.status, expected: 401, result: res.status === 401 ? 'PASS' : 'FAIL' });
}
for (const route of [`/?tour=${content.tours[0].id}`, `/?destination=${content.destinations[0].id}`]) {
  const res = await fetch(`${base}${route}`, { redirect: 'manual' });
  routeChecks.push({ route, status: res.status, expected: 301, result: res.status === 301 ? 'PASS' : 'FAIL' });
}
writeFileSync(join(output, 'route-checks.json'), JSON.stringify(routeChecks, null, 2));
console.log(`HTTP route/protection checks: ${routeChecks.filter(row => row.result === 'PASS').length}/${routeChecks.length}`);

const images: Array<{ collection: string; record: string; field: string; image: string }> = [];
function collect(value: unknown, collection: string, record: string, field: string) {
  if (typeof value === 'string' && /^https:\/\//.test(value) && /unsplash|\.r2\.|\.(?:jpg|jpeg|png|webp|avif)(?:\?|$)/i.test(value)) images.push({ collection, record, field, image: value });
  else if (Array.isArray(value)) value.forEach((item, i) => collect(item, collection, record, `${field}[${i}]`));
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) collect(item, collection, record, field ? `${field}.${key}` : key);
}
for (const [collection, rows] of Object.entries(content)) if (Array.isArray(rows)) for (const row of rows) collect(row, collection, String(row.id), '');
writeFileSync(join(output, 'image-inventory.json'), JSON.stringify(images, null, 2));

const widths = [320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const matrix: Array<Record<string, unknown>> = [];
let chrome: Chrome | undefined;
try {
  const executable = findChrome(); if (!executable) throw Error('No Chrome found.');
  chrome = await launchChrome(executable);
  const page = await chrome.newPage();
  await page.send('Page.enable');
  for (const theme of ['light', 'dark']) for (const route of publicRoutes) {
    for (const width of widths) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      await page.send('Page.navigate', { url: `${base}${route}` });
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (await page.evaluate('Boolean(document.querySelector("main h1"))')) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await new Promise(resolve => setTimeout(resolve, 800));
      await page.evaluate(`document.documentElement.dataset.theme = "${theme}"`);
      const metrics = await page.evaluate<Record<string, unknown>>(`({
        h1: document.querySelector('main h1')?.textContent,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        brokenImages: [...document.images].filter(i => i.dataset.imageState === "failed" || i.complete && !i.naturalWidth && i.currentSrc).map(i => i.currentSrc),
        unnamedControls: [...document.querySelectorAll('button,input:not([tabindex="-1"]),select,textarea')].filter(e => !e.textContent.trim() && !e.getAttribute('aria-label') && !e.labels?.length && !e.getAttribute('aria-labelledby')).map(e => e.outerHTML.slice(0,200)),
        inertLinks: [...document.querySelectorAll('a')].filter(a => !a.hasAttribute('href')).length,
        grid: [...document.querySelectorAll('.te-nav .te-container, main .te-container, footer .te-container')].map(e => { const r=e.getBoundingClientRect(); return { x:r.x, width:r.width, y:r.y }; }),
        scrollY: window.scrollY
      })`);
      const themeGeometry = await page.evaluate<{ shift: boolean }>(`(async () => {
        await document.fonts.ready;
        const quiet=document.createElement('style');
        quiet.textContent='[data-reveal]{transform:none!important}*,*::before,*::after{transition:none!important;animation:none!important}';
        document.head.append(quiet);
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const elements = [...document.querySelectorAll('.te-nav, .te-container, main h1, .te-section-header h2, .te-cta-group > *, .te-button, input, select, textarea')];
        const measure = () => elements.map(e => { const r=e.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; });
        const before=measure(); const original=document.documentElement.dataset.theme;
        document.documentElement.dataset.theme=original === 'dark' ? 'light' : 'dark';
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const after=measure(); document.documentElement.dataset.theme=original; quiet.remove();
        return { shift: before.some((r,i)=>r.some((v,j)=>Math.abs(v-after[i][j])>1)) };
      })()`);
      matrix.push({ route, width, theme, ...metrics, themeGeometry,
 status: themeGeometry.shift || metrics.overflow || !metrics.h1 || (metrics.brokenImages as string[]).length ? 'FAIL' : 'PASS', visualReview: 'NEEDS MANUAL VERIFICATION' });
      if (['/', '/about', '/tours', '/destinations'].includes(route) && [375, 1440].includes(width)) {
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(output, `${route.slice(1) || 'home'}-${theme}-${width}.png`), Buffer.from(String(shot.data), 'base64'));
      }
    }
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Browser audit blocked: ${reason}`);
  for (const route of [...publicRoutes, ...adminRoutes]) for (const width of widths) for (const theme of ['light', 'dark']) matrix.push({ route, width, theme, status: 'NEEDS MANUAL VERIFICATION', reason });
} finally {
  await chrome?.close();
  writeFileSync(join(output, 'responsive-checks.json'), JSON.stringify(matrix, null, 2));
}
if (routeChecks.some(row => row.result === 'FAIL') || matrix.some(row => row.status !== 'PASS')) process.exitCode = 1;
