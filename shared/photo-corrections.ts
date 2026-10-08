/** Exact named-record corrections, never a global stock-photo substitution. */
export const PHOTO_CORRECTIONS: Record<string, Record<string, string>> = {
  destinations: Object.fromEntries(['ella', 'sigiriya', 'galle', 'mirissa', 'kandy', 'jaffna', 'yala', 'nuwara-eliya', 'arugam-bay', 'trincomalee', 'anuradhapura', 'polonnaruwa', 'udawalawe', 'horton-plains', 'weligama', 'dambulla', 'colombo', 'knuckles', 'bentota', 'haputale'].map(id => [id, id])),
  experience_categories: { 'beach-escapes': 'mirissa', 'wild-sri-lanka': 'yala', 'ancient-sri-lanka': 'sigiriya', 'mountain-adventures': 'knuckles', 'food-and-culture': 'food', 'hidden-sri-lanka': 'riverston' },
  featured_experiences: { 'sunrise-ella': 'ella', 'safari-yala': 'yala', 'sunset-mirissa': 'mirissa-sunset', 'walk-galle-fort': 'galle' },
  tours: { 'island-in-7-days': 'sigiriya', 'cultural-sri-lanka': 'polonnaruwa', 'wild-sri-lanka': 'yala', 'southern-escape': 'mirissa' },
  articles: { 'sunrise-locations-sri-lanka': 'ella', 'ultimate-ella-guide': 'train', 'best-beaches-sri-lanka': 'mirissa', 'guide-sri-lankan-food': 'food', 'wildlife-safaris-where-to-go': 'yala', 'hidden-gems-visit': 'riverston' },
  hidden_gems: { riverston: 'riverston', 'gal-oya': 'gal-oya', 'delft-island': 'delft-island', bambarakanda: 'bambarakanda', madulsima: 'madulsima', kudumbigala: 'kudumbigala', kalpitiya: 'kalpitiya' },
  photo_stories: { p1: 'train', p2: 'sigiriya', p3: 'mirissa-sunset', p4: 'yala', p5: 'galle', p6: 'tea-workers', p7: 'fishermen', p8: 'jaffna' },
  hero_slides: { 'ella-highlands': 'ella', 'sigiriya-citadel': 'sigiriya', 'mirissa-shoreline': 'mirissa-sunset' }
};
