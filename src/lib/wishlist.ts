import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { useSiteContent } from '@/hooks/useSiteContent';
import { parseWishlist, sameItem, toggleItem, type WishlistItem } from '@shared/wishlist';

/**
 * The visitor's wishlist, kept only in this browser's localStorage: no account, nothing
 * on the server, no tracking. Where storage is blocked there is no wishlist:
 * `available` is false, and the buttons and links hide.
 */
const KEY = 'site:wishlist';
const PROBE = 'site:wishlist:probe';

let items: WishlistItem[] = [];
let loaded = false;
/** Unknown until the first look; turns false if a write ever fails. */
let available: boolean | null = null;
const listeners = new Set<() => void>();

function readStorage(): void {
  try {
    items = parseWishlist(window.localStorage.getItem(KEY));
  } catch {
    items = [];
    available = false;
  }
  loaded = true;
}

function isAvailable(): boolean {
  if (available === null) {
    try {
      const storage = window.localStorage;
      storage.setItem(PROBE, '1');
      storage.removeItem(PROBE);
      available = true;
    } catch {
      available = false;
    }
  }
  return available;
}

const notify = () => listeners.forEach((listener) => listener());

function write(next: WishlistItem[]): boolean {
  try {
    if (next.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(next));
    items = next;
  } catch {
    available = false;
    notify();
    return false;
  }
  notify();
  return true;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab's change.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY && event.key !== null) return;
    readStorage();
    notify();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function snapshot(): WishlistItem[] {
  if (!loaded) readStorage();
  return items;
}

const isStorageAvailable = () => isAvailable();

export interface Wishlist {
  /** False where the browser blocks storage. */
  available: boolean;
  /** Saved items the site still publishes, oldest first. Anything else is left out, quietly. */
  items: WishlistItem[];
  isSaved: (item: WishlistItem) => boolean;
  /** `full` when the list is at its limit, `unavailable` when storage refused it. */
  toggle: (item: WishlistItem) => 'added' | 'removed' | 'full' | 'unavailable';
  remove: (item: WishlistItem) => void;
  clear: () => void;
}

export function useWishlist(): Wishlist {
  const stored = useSyncExternalStore(subscribe, snapshot);
  const canStore = useSyncExternalStore(subscribe, isStorageAvailable);
  const { destinations, featuredExperiences, tours } = useSiteContent().content;

  const live = useMemo(() => {
    const keys = new Set<string>();
    for (const row of destinations) keys.add(`destination:${row.id}`);
    for (const row of featuredExperiences) keys.add(`experience:${row.id}`);
    for (const row of tours) keys.add(`tour:${row.id}`);
    return keys;
  }, [destinations, featuredExperiences, tours]);

  const isLive = useCallback((item: WishlistItem) => live.has(`${item.kind}:${item.id}`), [live]);

  return {
    available: canStore,
    items: useMemo(() => stored.filter(isLive), [stored, isLive]),
    isSaved: (item) => stored.some((other) => sameItem(other, item)),
    toggle: (item) => {
      if (!isAvailable()) return 'unavailable';
      const { result, items: next } = toggleItem(snapshot(), item, isLive);
      if (result === 'full') return 'full';
      return write(next) ? result : 'unavailable';
    },
    remove: (item) => void write(snapshot().filter((other) => !sameItem(other, item))),
    clear: () => void write([])
  };
}
