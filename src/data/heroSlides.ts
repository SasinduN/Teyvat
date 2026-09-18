import { HeroSlide } from '../types';

/**
 * Seed source of truth for `public.hero_slides`.
 *
 * Copied verbatim from the `HERO_IMAGES` literal in
 * `src/components/HeroSection.tsx`. That component still holds its own copy;
 * Phase 2 deletes it and reads these rows from the database instead.
 */
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'ella-highlands',
    url: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=2000',
    title: 'Ella Central Highlands',
    caption: 'Misty Mountains & Tea Valleys'
  },
  {
    id: 'sigiriya-citadel',
    url: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=2000',
    title: 'Sigiriya Ancient Rock Citadel',
    caption: '2,500 Years of Sacred History'
  },
  {
    id: 'mirissa-shoreline',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000',
    title: 'Mirissa Palm Shoreline',
    caption: 'Indian Ocean Sunset Bay'
  }
];
