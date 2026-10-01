/**
 * How the map shows each destination: its category's colour and icon, from
 * the FIRST category in the destination's list, so the admin's order decides.
 *
 * Why an icon as well as a colour: on a map any two markers can sit side by
 * side, and seven colours can't all be told apart (checked with the dataviz
 * palette validator: worst pair ΔE 1.4 for colour-blind readers against a
 * target of 8). The icon carries identity for everyone; the colour supports
 * it. Colours are the site's palette, or darker steps of it, each with at
 * least 5:1 contrast for the white icon.
 *
 * Plain functions with no Leaflet or DOM, so they're unit-tested in Node.
 *
 * Icon geometry from Lucide (https://lucide.dev), ISC licence, the same
 * icons the legend renders through lucide-react.
 */
import type { CategoryType, Destination } from '@/types';

export type MapCategory = Exclude<CategoryType, 'All'>;

export interface MarkerStyle {
  /** Disc colour. */
  color: string;
  /** Icon stroke colour on the disc. */
  iconColor: string;
  /** SVG children, 24×24 viewBox, stroked. */
  svg: string;
}

const p = (d: string) => `<path d="${d}"/>`;
const c = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;

export const MAP_CATEGORY_STYLES: Record<MapCategory, MarkerStyle> = {
  Beaches: {
    color: '#2E6F6A',
    iconColor: '#FFFFFF',
    svg: p('M2 12q2.5 2 5 0t5 0 5 0 5 0') + p('M2 19q2.5 2 5 0t5 0 5 0 5 0') + p('M2 5q2.5 2 5 0t5 0 5 0 5 0')
  },
  Mountains: {
    color: '#1C4737',
    iconColor: '#FFFFFF',
    svg: p('m8 3 4 8 5-5 5 15H2L8 3z')
  },
  Culture: {
    color: '#8A6A2A',
    iconColor: '#FFFFFF',
    svg:
      p('M10 18v-7') +
      p('M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z') +
      p('M14 18v-7') + p('M18 18v-7') + p('M3 22h18') + p('M6 18v-7')
  },
  Wildlife: {
    color: '#4F7A2E',
    iconColor: '#FFFFFF',
    svg:
      c(11, 4, 2) + c(18, 8, 2) + c(20, 16, 2) +
      p('M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z')
  },
  Adventure: {
    color: '#A4502F',
    iconColor: '#FFFFFF',
    svg:
      c(12, 12, 10) +
      p('m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z')
  },
  Food: {
    color: '#7A3B2E',
    iconColor: '#FFFFFF',
    svg: p('M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2') + p('M7 2v20') + p('M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7')
  },
  'Hidden Gems': {
    color: '#0F2E23',
    iconColor: '#D4AF37',
    svg:
      p('M10.5 3 8 9l4 13 4-13-2.5-6') +
      p('M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z') +
      p('M2 9h20')
  }
};

/** Legend order: the same as the category filter bar. */
export const MAP_CATEGORIES: MapCategory[] = [
  'Beaches',
  'Mountains',
  'Culture',
  'Wildlife',
  'Adventure',
  'Food',
  'Hidden Gems'
];

/** For a destination with no category at all. */
export const FALLBACK_STYLE: MarkerStyle = {
  color: '#1C4737',
  iconColor: '#FFFFFF',
  svg: c(12, 10, 3) + p('M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0')
};

/** The category that styles a destination's marker: the first in its list. */
export function markerCategory(dest: Pick<Destination, 'category'>): MapCategory | null {
  const first = dest.category.find((cat): cat is MapCategory => cat !== 'All');
  return first ?? null;
}

export function markerStyle(dest: Pick<Destination, 'category'>): MarkerStyle {
  const category = markerCategory(dest);
  return category ? MAP_CATEGORY_STYLES[category] : FALLBACK_STYLE;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/**
 * The marker's HTML for Leaflet's `divIcon`. The name label and the pulse ring
 * are always in the DOM; CSS shows the label on hover/focus, for the active
 * marker and at zoom 9+, and the ring for the active marker only
 * (src/index.css). Becoming active is a class toggle, not a rebuild, so a
 * keyboard user's focus stays on the marker they just pressed.
 */
export function markerHtml(dest: Pick<Destination, 'name' | 'category'>, active: boolean): string {
  const style = markerStyle(dest);
  const category = markerCategory(dest) ?? '';
  return `
    <div class="map-marker${active ? ' is-active' : ''}" data-category="${escapeHtml(category)}">
      <div class="custom-marker-pulse" style="background-color: ${style.color}"></div>
      <div class="map-marker-disc" style="background-color: ${style.color}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="${style.iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${style.svg}</svg>
      </div>
      <div class="map-marker-label">${escapeHtml(dest.name)}</div>
    </div>`;
}

/**
 * A numbered stop on a tour's route: a cream disc with a dark-green number
 * and a green ring, so it can't be mistaken for a category marker. Its name
 * always shows (a route has few stops).
 */
export function routeStopHtml(number: number, name: string): string {
  return `
    <div class="route-stop">
      <div class="route-stop-disc">${number}</div>
      <div class="map-marker-label route-stop-label">${escapeHtml(name)}</div>
    </div>`;
}
