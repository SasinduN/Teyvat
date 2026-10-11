import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapTileConfig, OSM_TILE_URL, OSM_ATTRIBUTION, CARTO_ATTRIBUTION } from '../../shared/map-tiles';
import { contentSecurityPolicy } from '../src/security-headers';

test('missing and whitespace keys use real OSM tiles in both themes', () => {
  for (const theme of ['light', 'dark'] as const) for (const key of [undefined, null, '', '  ']) {
    assert.deepEqual(mapTileConfig(theme, key), { url: OSM_TILE_URL, attribution: OSM_ATTRIBUTION });
  }
});
test('configured CARTO key preserves theme styles and encodes the key', () => {
  for (const theme of ['light', 'dark'] as const) {
    const config = mapTileConfig(theme, ' a+b/c ');
    assert.ok(config.url.includes(theme === 'dark' ? '/dark_all/' : '/voyager/'));
    assert.ok(config.url.endsWith('?key=a%2Bb%2Fc'));
    assert.equal(config.attribution, CARTO_ATTRIBUTION);
  }
});
test('production CSP permits the selected tile provider without image wildcards', () => {
  const imgSrc = contentSecurityPolicy(null).split('; ').find(d => d.startsWith('img-src '))!.split(' ');
  for (const key of [undefined, 'key']) {
    const origin = new URL(mapTileConfig('light', key).url.replace(/\{[a-z]\}/g, '0')).origin;
    assert.ok(imgSrc.includes(origin));
  }
  assert.ok(!imgSrc.includes('*'));
});
