/**
 * The map's marker rules (src/lib/mapMarkers.ts): pure functions, no browser.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  FALLBACK_STYLE,
  MAP_CATEGORIES,
  MAP_CATEGORY_STYLES,
  markerCategory,
  markerHtml,
  markerStyle
} from '../../src/lib/mapMarkers';

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('map markers', () => {
  test("the FIRST category in a destination's list decides its marker", () => {
    assert.equal(markerCategory({ category: ['Mountains', 'Adventure', 'Hidden Gems'] }), 'Mountains');
    assert.equal(markerCategory({ category: ['Hidden Gems', 'Mountains'] }), 'Hidden Gems');
    assert.equal(markerStyle({ category: ['Culture', 'Beaches'] }), MAP_CATEGORY_STYLES.Culture);
    // Reordering in the admin changes the marker.
    assert.notEqual(
      markerStyle({ category: ['Beaches', 'Culture'] }).color,
      markerStyle({ category: ['Culture', 'Beaches'] }).color
    );
  });

  test('a destination with no category gets the fallback, not an error', () => {
    assert.equal(markerCategory({ category: [] }), null);
    assert.equal(markerStyle({ category: [] }), FALLBACK_STYLE);
  });

  test('every category has its own colour and its own icon', () => {
    assert.equal(MAP_CATEGORIES.length, 7);
    const colours = MAP_CATEGORIES.map((c) => MAP_CATEGORY_STYLES[c].color);
    const icons = MAP_CATEGORIES.map((c) => MAP_CATEGORY_STYLES[c].svg);
    assert.equal(new Set(colours).size, 7, 'colours repeat');
    assert.equal(new Set(icons).size, 7, 'icons repeat');
  });

  test('every icon is readable on its disc, and every disc stands out from the tiles', () => {
    for (const cat of MAP_CATEGORIES) {
      const { color, iconColor } = MAP_CATEGORY_STYLES[cat];
      assert.ok(contrast(iconColor, color) >= 4.5, `${cat}: icon ${contrast(iconColor, color).toFixed(2)}:1`);
      assert.ok(contrast(color, '#F2EFE8') >= 3, `${cat}: disc vs tiles ${contrast(color, '#F2EFE8').toFixed(2)}:1`);
    }
  });

  test('the marker HTML carries the category, its colour and icon, and an escaped name', () => {
    const html = markerHtml({ name: 'Galle <Fort> & "Bay"', category: ['Culture', 'Beaches'] }, true);
    assert.match(html, /class="map-marker is-active" data-category="Culture"/);
    assert.ok(html.includes(MAP_CATEGORY_STYLES.Culture.color));
    assert.ok(html.includes(MAP_CATEGORY_STYLES.Culture.svg));
    assert.ok(html.includes('Galle &lt;Fort&gt; &amp; &quot;Bay&quot;'));
    assert.ok(!html.includes('<Fort>'));
    assert.match(markerHtml({ name: 'X', category: ['Food'] }, false), /class="map-marker" data-category="Food"/);
  });
});
