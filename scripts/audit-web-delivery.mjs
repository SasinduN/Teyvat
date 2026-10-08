/** Read-only production routes/assets/protection audit; never submits a form. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:8082';
const expectations = [
  ['/_audit_missing_page', 404], ['/destinations/_audit_missing_destination', 404],
  ['/experiences/_audit_missing_experience', 404], ['/tours/_audit_missing_tour', 404], ['/journal/_audit_missing_article', 404],
  ['/api/_audit_missing_api', 404], ['/api/admin/content/destinations', 401], ['/api/admin/inquiries', 401],
  ['/admin', 200], ['/robots.txt', 200], ['/llms.txt', 200]
];
const checks = [];
for (const [path, status] of expectations) {
  const response = await fetch(base + path);
  assert.equal(response.status, status, path);
  if (path === '/admin') assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  checks.push({ path, status: response.status });
}
const redirect = await fetch(base + '/destinations?mapTour=island-in-7-days', { redirect: 'manual' });
assert.equal(redirect.status, 301);
assert.equal(redirect.headers.get('location'), '/explore?mapTour=island-in-7-days#explore-map');
checks.push({ path: '/destinations?mapTour=island-in-7-days', status: redirect.status, location: redirect.headers.get('location') });
const trailing = await fetch(base + '/explore/', { redirect: 'manual' });
assert.equal(trailing.status, 301);
assert.equal(trailing.headers.get('location'), '/explore');
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const files = new Set(Object.values(manifest).flatMap(chunk => [chunk.file, ...(chunk.css ?? [])]));
const assets = await Promise.all([...files].map(async file => {
  const response = await fetch(`${base}/${file}`);
  assert.equal(response.status, 200, file);
  const mime = response.headers.get('content-type');
  assert.ok(file.endsWith('.css') ? mime?.includes('text/css') : mime?.includes('javascript'), file);
  return { file, status: response.status, mime };
}));
writeFileSync('docs/qa-results/web-debug/routes-assets-protection.json', JSON.stringify({ base,
  scope: 'Read-only HTTP statuses, redirects, asset MIME and unauthenticated access; not rendered functionality', checks, assets }, null, 2));
console.log(JSON.stringify({ checksPassed: checks.length + 1, assetsPassed: assets.length }));
