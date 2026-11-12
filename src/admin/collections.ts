/**
 * The admin panel is schema-driven: every list view and every edit form in
 * `/admin` is generated from the definitions below.
 *
 * The fields themselves (and their validation) live in
 * `shared/content-schema.ts`, because the API validates with the same
 * definitions. This file adds what only the browser needs: icons, labels and
 * the list view's columns. Adding a column to a content table means adding one
 * field there, and nothing here unless the list view should show it.
 */
import {
  Camera,
  Compass,
  Gem,
  Images,
  Landmark,
  MapPin,
  Newspaper,
  Route,
  Sparkles,
  ThumbsUp,
  type LucideIcon
} from 'lucide-react';
import { FIELDS_BY_TABLE, type Field } from '@shared/content-schema';
import type { ContentTableName } from '@shared/database.types';

export {
  ASPECT_OPTIONS,
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
  TOUR_CATEGORY_OPTIONS,
  SPOTLIGHT_NOTICE,
  type Field
} from '@shared/content-schema';

export interface CollectionDef {
  /** URL segment: /admin/<slug> */
  slug: string;
  table: ContentTableName;
  label: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  /** Column shown as the row title in list views, and the slug source. */
  titleField: string;
  subtitleField?: string;
  /** Thumbnail column in list views. Pillars have none. */
  imageField?: string;
  /** A short extra column in the list view. */
  metaField?: string;
  /**
   * A column the list can be filtered by, and that a new record starts with when the
   * list is filtered (`/new?destination_id=…`). Attractions: by destination.
   */
  filterBy?: { field: string; table: 'destinations'; label: string };
  /** A map under the latitude and longitude fields: a click sets both. */
  locationPicker?: boolean;
  fields: Field[];
  /** Values for a brand-new record. */
  defaults: Record<string, unknown>;
}

/* ------------------------------------------------------------ definitions */

export const COLLECTIONS: CollectionDef[] = [
  {
    slug: 'destinations',
    table: 'destinations',
    label: 'Destinations',
    singular: 'Destination',
    description: 'Map pins, spotlight cards, search results and destination detail modals.',
    icon: MapPin,
    titleField: 'name',
    subtitleField: 'short_description',
    imageField: 'image',
    metaField: 'region',
    fields: FIELDS_BY_TABLE.destinations,
    defaults: {
      name: '',
      id: '',
      region: 'Central',
      province: '',
      latitude: 7.8731,
      longitude: 80.7718,
      category: [],
      short_description: '',
      long_description: '',
      image: '',
      gallery: [],
      best_time: '',
      best_months: [],
      elevation: '',
      travel_time_from_airport: '',
      rating: 4.8,
      featured: false,
      experiences: [],
      highlights: [],
      ideal_for: [],
      published: true
    }
  },

  {
    slug: 'attractions',
    table: 'attractions',
    label: 'Attractions',
    singular: 'Attraction',
    description: 'Places near a destination: the “Nearby” cards on its page, and the small markers on the maps.',
    icon: Landmark,
    titleField: 'name',
    subtitleField: 'short_description',
    imageField: 'image',
    metaField: 'destination_id',
    filterBy: { field: 'destination_id', table: 'destinations', label: 'Destination' },
    locationPicker: true,
    fields: FIELDS_BY_TABLE.attractions,
    defaults: {
      name: '',
      id: '',
      destination_id: '',
      category: 'Culture',
      short_description: '',
      latitude: '',
      longitude: '',
      image: '',
      best_months: [],
      // A draft until someone has checked it.
      published: false
    }
  },

  {
    slug: 'experience-categories',
    table: 'experience_categories',
    label: 'Experience Types',
    singular: 'Experience Type',
    description: 'The “What kind of journey” tiles that filter the interactive map.',
    icon: Compass,
    titleField: 'title',
    subtitleField: 'subtitle',
    imageField: 'image',
    metaField: 'category',
    fields: FIELDS_BY_TABLE.experience_categories,
    defaults: {
      title: '',
      id: '',
      category: 'Beaches',
      subtitle: '',
      image: '',
      description: '',
      published: true
    }
  },

  {
    slug: 'featured-experiences',
    table: 'featured_experiences',
    label: 'Featured Experiences',
    singular: 'Featured Experience',
    description: 'The “Unforgettable Moments” cards. Clicking one opens a pre-filled enquiry.',
    icon: Sparkles,
    titleField: 'title',
    subtitleField: 'location',
    imageField: 'image',
    metaField: 'category',
    fields: FIELDS_BY_TABLE.featured_experiences,
    defaults: {
      title: '',
      id: '',
      subtitle: '',
      location: '',
      category: 'Mountains',
      duration: '',
      recommended_time: '',
      image: '',
      description: '',
      highlights: [],
      rating: 4.8,
      published: true
    }
  },

  {
    slug: 'tours',
    table: 'tours',
    label: 'Tours',
    singular: 'Tour',
    description: 'Multi-day packages with a day-by-day itinerary.',
    icon: Route,
    titleField: 'title',
    subtitleField: 'subtitle',
    imageField: 'image',
    metaField: 'category',
    fields: FIELDS_BY_TABLE.tours,
    defaults: {
      title: '',
      id: '',
      subtitle: '',
      days: 7,
      price_from: 1000,
      category: 'Full Island',
      image: '',
      short_desc: '',
      full_desc: '',
      stops: [],
      highlights: [],
      included_places: [],
      itinerary: [],
      published: true
    }
  },

  {
    slug: 'articles',
    table: 'articles',
    label: 'Journal',
    singular: 'Article',
    description: 'Journal posts.',
    icon: Newspaper,
    titleField: 'title',
    subtitleField: 'snippet',
    imageField: 'image',
    metaField: 'category',
    fields: FIELDS_BY_TABLE.articles,
    defaults: {
      title: '',
      id: '',
      category: 'INSPIRATION',
      published_at: new Date().toISOString().slice(0, 10),
      read_time: '5 min read',
      image: '',
      snippet: '',
      author_name: '',
      author_role: '',
      author_avatar: '',
      content: [],
      published: true
    }
  },

  {
    slug: 'hidden-gems',
    table: 'hidden_gems',
    label: 'Hidden Gems',
    singular: 'Hidden Gem',
    description: 'The editorial off-the-beaten-path collection.',
    icon: Gem,
    titleField: 'name',
    subtitleField: 'tag',
    imageField: 'image',
    metaField: 'region',
    fields: FIELDS_BY_TABLE.hidden_gems,
    defaults: {
      name: '',
      id: '',
      region: '',
      tag: '',
      image: '',
      description: '',
      why_visit: '',
      published: true
    }
  },

  {
    slug: 'photo-stories',
    table: 'photo_stories',
    label: 'Photo Stories',
    singular: 'Photo Story',
    description: 'The photography mosaic gallery.',
    icon: Camera,
    titleField: 'title',
    subtitleField: 'caption',
    imageField: 'image',
    metaField: 'category',
    fields: FIELDS_BY_TABLE.photo_stories,
    defaults: {
      title: '',
      id: '',
      location: '',
      category: '',
      aspect: 'landscape',
      image: '',
      caption: '',
      published: true
    }
  },

  {
    slug: 'hero-slides',
    table: 'hero_slides',
    label: 'Hero Slides',
    singular: 'Hero Slide',
    description: 'The full-screen rotating images at the top of the home page.',
    icon: Images,
    titleField: 'title',
    subtitleField: 'caption',
    imageField: 'image',
    fields: FIELDS_BY_TABLE.hero_slides,
    defaults: {
      title: '',
      id: '',
      caption: '',
      image: '',
      published: true
    }
  },

  {
    slug: 'pillars',
    table: 'pillars',
    label: 'Why us',
    singular: 'Pillar',
    description: 'The “Why us” value propositions on the About page, each with an icon.',
    icon: ThumbsUp,
    titleField: 'title',
    subtitleField: 'description',
    metaField: 'icon',
    fields: FIELDS_BY_TABLE.pillars,
    defaults: {
      title: '',
      id: '',
      icon: 'Compass',
      description: '',
      published: true
    }
  }
];

export const findCollection = (slug: string | undefined): CollectionDef | undefined =>
  COLLECTIONS.find((c) => c.slug === slug);
