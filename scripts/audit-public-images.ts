/** Read-only inventory. A metadata match is not visual/geographic verification. */
import { writeFileSync } from 'node:fs';
import { fetchSiteContent } from '../src/lib/api/content';
import photographs from '../shared/travel-photos.json';
import { responsiveImage } from '../shared/responsive-image';

const base = process.argv[2] ?? 'http://127.0.0.1:8081';
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => nativeFetch(typeof input === 'string' && input.startsWith('/') ? base + input : input, init);
const content = await fetchSiteContent();
const inventory: Array<Record<string, unknown>> = [];
for (const [collection, records] of Object.entries(content)) {
  if (!Array.isArray(records)) continue;
  for (const item of records) {
    const row = item as unknown as Record<string, unknown>;
    const sources = [row.image, row.url, ...(Array.isArray(row.gallery) ? row.gallery : [])].filter((source): source is string => typeof source === 'string');
    for (const source of sources) {
      const credit = photographs.find(photo => source === photo.image || source === photo.original);
      inventory.push({ collection, id: row.id ?? null, label: row.name ?? row.title,
        description: row.shortDescription ?? row.description ?? row.caption ?? row.snippet,
        source, responsive: responsiveImage(source) ?? null, credit: credit ?? null,
        evidence: credit ? 'CREDIT_METADATA_PRESENT' : 'UNVERIFIED_SOURCE',
        visual: 'NEEDS MANUAL VERIFICATION', loadingAndCrop: 'NEEDS MANUAL VERIFICATION' });
    }
  }
}
writeFileSync('docs/qa-results/web-debug/image-inventory.json', JSON.stringify({ base, scope: 'Mapped live public content; no database writes or image decoding', inventory }, null, 2));
console.log(JSON.stringify({ imageReferences: inventory.length,
  credited: inventory.filter(row => row.credit).length,
  unverified: inventory.filter(row => !row.credit).map(row => ({ collection: row.collection, id: row.id, label: row.label, source: row.source })) }, null, 2));
