import { Pillar } from '../types';

/**
 * Seed source of truth for `public.pillars`.
 *
 * Copied verbatim from the `pillars` literal in
 * `src/components/WhyTravelEye.tsx`, except that the lucide component
 * reference (`Users`) becomes its name (`'Users'`) — a database cannot store a
 * React component. The component resolves the name back through a lookup map.
 *
 * That component still holds its own copy; Phase 2 deletes it and reads these
 * rows from the database instead.
 */
export const PILLARS: Pillar[] = [
  {
    id: 'local-knowledge',
    icon: 'Users',
    title: 'Local Knowledge',
    desc: 'Discover Sri Lanka through the eyes of island natives who possess deep generational heritage, secret trails, and insider connections.'
  },
  {
    id: 'authentic-experiences',
    icon: 'Compass',
    title: 'Authentic Experiences',
    desc: 'Go beyond predictable tourist hotspots. Access secluded waterfalls, ancestral spice gardens, and private cultural encounters.'
  },
  {
    id: 'flexible-journeys',
    icon: 'Sliders',
    title: 'Flexible Journeys',
    desc: 'Build every day around your rhythm and curiosity—from high-energy mountain climbs to unhurried beach stays.'
  },
  {
    id: 'responsible-travel',
    icon: 'Leaf',
    title: 'Responsible Travel',
    desc: 'Explore while actively respecting wildlife habitats, conserving fragile ecosystems, and empowering rural island communities.'
  }
];
