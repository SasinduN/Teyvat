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
  markerStyle,
  SEASON_ICON_PATHS,
  seasonMarkerHtml,
  seasonPopupHtml,
  spreadApart
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

describe('/when-to-go markers', () => {
  test('each state has its own icon, and its name and text are escaped', () => {
    assert.equal(new Set(Object.values(SEASON_ICON_PATHS).map((paths) => paths.join())).size, 4);
    const html = seasonMarkerHtml('Galle <Fort> & "Bay"', 'great');
    assert.ok(html.includes('data-suitability="great"'));
    assert.ok(html.includes('Galle &lt;Fort&gt; &amp; &quot;Bay&quot;'));
    assert.ok(html.includes(SEASON_ICON_PATHS.great[0]));
    const popup = seasonPopupHtml({ name: 'A<b>', bestTime: 'May <i>', href: '/destinations/a' }, 'ok', 3);
    assert.ok(popup.includes('OK in March'));
    assert.ok(popup.includes('Best time: May &lt;i&gt;'));
    assert.ok(!popup.includes('<b>') && !popup.includes('<i>'));
    const unset = seasonPopupHtml({ name: 'A', bestTime: 'Dry season', href: '/destinations/a' }, 'not-set', 3);
    assert.ok(unset.includes('Not set'));
    assert.ok(!unset.includes('Dry season'), 'no best time for a place with no months');
  });

  test('spreadApart moves only what would overlap, the same way every time', () => {
    const far = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    assert.deepEqual(spreadApart(far, 36), far);
    const close = spreadApart([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 200, y: 0 }], 36);
    assert.ok(Math.hypot(close[1].x - close[0].x, close[1].y - close[0].y) >= 35.99);
    assert.deepEqual(close[2], { x: 200, y: 0 });
    const onOneSpot = [{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }];
    const spread = spreadApart(onOneSpot, 36);
    assert.deepEqual(spread, spreadApart(onOneSpot, 36));
    assert.ok(Math.hypot(spread[1].x - spread[0].x, spread[1].y - spread[0].y) >= 35.99);
  });
});

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
