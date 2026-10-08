/** Read-only HTTP shell delivery, explicitly not browser navigation or production SEO QA. */
import { writeFileSync } from 'node:fs';
import type { SiteContentPayload } from '../shared/api';
const base = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:5175';
const response = await fetch(`${base}/api/content`);
if (!response.ok) throw Error(`Content API: ${response.status}`);
const content = await response.json() as SiteContentPayload;
const routes = ['/', '/plan', '/journal', '/destinations', '/experiences', '/tours', '/about', '/about#contact', '/photo-credits',
  ...content.destinations.map(row => `/destinations/${row.id}`),
  ...content.featuredExperiences.map(row => `/experiences/${row.id}`),
  ...content.tours.map(row => `/tours/${row.id}`), ...content.articles.map(row => `/journal/${row.id}`)];
const checks = await Promise.all(routes.map(async route => {
  const result = await fetch(`${base}${route}`);
  const type = result.headers.get('content-type');
  return { route, status: result.status, contentType: type, pass: result.status === 200 && Boolean(type?.includes('text/html')) };
}));
writeFileSync('docs/qa-results/restructure-route-delivery.json', JSON.stringify({ base, apiStatus: response.status,
  scope: 'Vite shell delivery plus proxied existing backend content; not browser rendering, clicks or production metadata', checks }, null, 2));
console.log(`${checks.filter(row => row.pass).length}/${checks.length} route shells delivered; content API ${response.status}`);
if (checks.some(row => !row.pass)) process.exitCode = 1;
