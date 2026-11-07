/**
 * The wishlist's rules, with no browser in them: what a stored list may hold, what
 * adding to it does, and the enquiry it turns into. `src/lib/wishlist.ts` keeps the list
 * in the visitor's browser; it never goes to the server unless they send the enquiry.
 */

export const WISHLIST_MAX = 30;

export const WISHLIST_KINDS = ['destination', 'attraction', 'experience', 'tour'] as const;
export type WishlistKind = (typeof WISHLIST_KINDS)[number];

export interface WishlistItem {
  kind: WishlistKind;
  id: string;
}

export const sameItem = (a: WishlistItem, b: WishlistItem): boolean => a.kind === b.kind && a.id === b.id;

/**
 * A stored list, whatever is in it: anything but an array of real items is dropped,
 * with no duplicates and never more than the limit. The ids are checked against the
 * content later, so one that's gone doesn't count as an error.
 */
export function parseWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const items: WishlistItem[] = [];
  for (const entry of value) {
    const { kind, id } = (entry ?? {}) as Partial<WishlistItem>;
    if (typeof id !== 'string' || !id || !WISHLIST_KINDS.includes(kind as WishlistKind)) continue;
    const item = { kind: kind as WishlistKind, id };
    if (!items.some((other) => sameItem(other, item))) items.push(item);
    if (items.length === WISHLIST_MAX) break;
  }
  return items;
}

export type WishlistToggle = { result: 'added' | 'removed'; items: WishlistItem[] } | { result: 'full'; items: WishlistItem[] };

/**
 * Saves or unsaves `item`. An item the site no longer publishes doesn't count towards
 * the limit, and is kept until its space is needed, so a row unpublished for an edit
 * comes back when it's published again.
 */
export function toggleItem(current: readonly WishlistItem[], item: WishlistItem, isLive: (item: WishlistItem) => boolean): WishlistToggle {
  if (current.some((other) => sameItem(other, item))) {
    return { result: 'removed', items: current.filter((other) => !sameItem(other, item)) };
  }
  const live = current.filter(isLive);
  if (live.length >= WISHLIST_MAX) return { result: 'full', items: [...current] };
  return { result: 'added', items: [...(current.length >= WISHLIST_MAX ? live : current), item] };
}

/** The enquiry form's message limit (`shared/inquiry-schema.ts`). */
const MESSAGE_MAX = 5000;

export interface WishlistGroup {
  heading: string;
  names: string[];
}

/** The subject of an enquiry about a wishlist. */
export const wishlistSubject = (count: number): string => `Wishlist: ${count} saved ${count === 1 ? 'item' : 'items'}`;

/** The saved items, listed under their headings, for the visitor to read and edit. */
export function wishlistMessage(groups: readonly WishlistGroup[]): string {
  const blocks = groups
    .filter((group) => group.names.length > 0)
    .map((group) => [group.heading, ...group.names.map((name) => `- ${name}`)].join('\n'));
  const message = ['I would like to ask about these saved items:', ...blocks].join('\n\n');
  if (message.length <= MESSAGE_MAX) return message;
  // Only with very long names: whole lines, so the form accepts it and nothing is cut mid-name.
  const lines = message.split('\n');
  while (lines.join('\n').length > MESSAGE_MAX - 40) lines.pop();
  return [...lines, '', '(The rest of my list is on my wishlist.)'].join('\n');
}
