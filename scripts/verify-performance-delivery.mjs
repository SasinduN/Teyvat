import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:8082';
const contentResponse = await fetch(`${base}/api/content`);
assert.equal(contentResponse.status, 200);
const content = await contentResponse.json();
const routes = ['/', '/explore', '/destinations', '/experiences', '/tours', '/about', '/plan', '/journal', '/photo-credits',
  ...content.destinations.map(row => `/destinations/${row.id}`),
  ...content.featuredExperiences.map(row => `/experiences/${row.id}`),
  ...content.tours.map(row => `/tours/${row.id}`), ...content.articles.map(row => `/journal/${row.id}`)];
const checks = await Promise.all(routes.map(async route => {
  const result = await fetch(base + route);
  assert.equal(result.status, 200, route);
  assert.equal(result.headers.get('cache-control'), 'no-cache', route);
  const html = await result.text();
  if (route === '/') {
    assert.equal((html.match(/rel="preload" as="image"/g) ?? []).length, content.heroSlides.length ? 1 : 0);
    assert.ok(html.includes('imagesizes="100vw"'));
    assert.ok(html.includes('id="travel-eye-fonts" media="print"'));
  }
  return { route, status: result.status, cacheControl: result.headers.get('cache-control') };
}));
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = Object.values(manifest).find(chunk => chunk.isEntry);
const delivery = [];
for (const file of [entry.file, ...entry.css]) {
  const identity = await fetch(`${base}/${file}`, { headers: { 'Accept-Encoding': 'identity' } });
  const gzip = await fetch(`${base}/${file}`, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(gzip.headers.get('content-encoding'), 'gzip');
  assert.ok(gzip.headers.get('cache-control')?.includes('immutable'));
  assert.ok(gzip.headers.get('vary')?.includes('Accept-Encoding'));
  assert.equal(await identity.text(), await gzip.text(), 'Compression must preserve the response');
  delivery.push({ file, identityBytes: Number(identity.headers.get('content-length')),
    gzipBytes: Number(gzip.headers.get('content-length')), cacheControl: gzip.headers.get('cache-control'),
    contentType: gzip.headers.get('content-type'), decompressedEqual: true });
}
const llms = await fetch(`${base}/llms.txt`);
assert.equal(llms.status, 200);
assert.ok((await llms.text()).startsWith('# Travel Eye Sri Lanka'));
const health = await (await fetch(`${base}/api/health`)).json();
assert.equal(health.database, 'up');
const report = { base, date: new Date().toISOString(), scope: 'Production HTTP delivery; no browser rendering or Lighthouse metrics',
  health, routes: checks, assets: delivery, llmsStatus: llms.status };
writeFileSync(process.argv[3] ?? 'docs/qa-results/performance/delivery-after.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ routesPassed: checks.length, assets: delivery, database: health.database }, null, 2));
