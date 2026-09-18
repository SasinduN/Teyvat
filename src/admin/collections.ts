/**
 * The admin panel is schema-driven: every list view and every edit form in
 * `/admin` is generated from the definitions below. Adding a column to a
 * content table means adding one entry here — no new page components.
 */
import {
  Camera,
  Compass,
  Gem,
  MapPin,
  Newspaper,
  Route,
  Sparkles,
  type LucideIcon
} from 'lucide-react';
import type { ContentTableName } from '@/lib/database.types';

export const CATEGORY_OPTIONS = [
  'Beaches',
  'Mountains',
  'Culture',
  'Wildlife',
  'Adventure',
  'Food',
  'Hidden Gems'
] as const;

export const REGION_OPTIONS = [
  'South',
  'Central',
  'East',
  'North',
  'Cultural Triangle',
  'West'
] as const;

export const TOUR_CATEGORY_OPTIONS = [
  'Luxury',
  'Culture',
  'Wildlife',
  'Adventure',
  'Full Island'
] as const;

export const ASPECT_OPTIONS = ['square', 'portrait', 'landscape'] as const;

/* --------------------------------------------------------------- field DSL */

interface FieldBase {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** How many columns of the 2-column form grid the control occupies. */
  span?: 1 | 2;
}

export type Field =
  | (FieldBase & { type: 'text' | 'textarea' | 'slug'; rows?: number })
  | (FieldBase & { type: 'number'; min?: number; max?: number; step?: number })
  | (FieldBase & { type: 'select'; options: readonly string[]; allowEmpty?: boolean })
  | (FieldBase & { type: 'multiselect'; options: readonly string[] })
  | (FieldBase & { type: 'image'; folder: string })
  | (FieldBase & { type: 'imageList'; folder: string })
  | (FieldBase & { type: 'stringList'; multiline?: boolean; placeholder?: string })
  | (FieldBase & { type: 'date' })
  | (FieldBase & { type: 'boolean' })
  | (FieldBase & { type: 'itinerary' });

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
  imageField: string;
  /** A short extra column in the list view. */
  metaField?: string;
  fields: Field[];
  /** Values for a brand-new record. */
  defaults: Record<string, unknown>;
}

/* ---------------------------------------------------------- shared fields */

const idField: Field = {
  name: 'id',
  label: 'URL slug (ID)',
  type: 'slug',
  required: true,
  span: 1,
  help: 'Lowercase, dashes only. Permanent once saved — other parts of the site reference it.'
};

const publishedField: Field = {
  name: 'published',
  label: 'Published',
  type: 'boolean',
  span: 1,
  help: 'Unpublished records stay in the database but disappear from the public site.'
};

const sortField: Field = {
  name: 'sort_order',
  label: 'Sort order',
  type: 'number',
  step: 1,
  span: 1,
  help: 'Lower numbers appear first. Use the arrows in the list view to reorder.'
};

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
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, span: 1 },
      idField,
      { name: 'region', label: 'Region', type: 'select', options: REGION_OPTIONS, required: true, span: 1 },
      { name: 'province', label: 'Province', type: 'text', required: true, span: 1 },
      { name: 'latitude', label: 'Latitude', type: 'number', step: 0.0001, min: -90, max: 90, required: true, span: 1 },
      { name: 'longitude', label: 'Longitude', type: 'number', step: 0.0001, min: -180, max: 180, required: true, span: 1 },
      { name: 'category', label: 'Categories', type: 'multiselect', options: CATEGORY_OPTIONS, span: 2, help: 'Drives the map filters and the category counts.' },
      { name: 'short_description', label: 'Short description', type: 'textarea', rows: 2, required: true, span: 2, help: 'One line, shown on cards and map popups.' },
      { name: 'long_description', label: 'Long description', type: 'textarea', rows: 5, required: true, span: 2 },
      { name: 'image', label: 'Cover image', type: 'image', folder: 'destinations', required: true, span: 2 },
      { name: 'gallery', label: 'Gallery', type: 'imageList', folder: 'destinations', span: 2, help: 'Optional. Shown inside the destination modal.' },
      { name: 'best_time', label: 'Best time to visit', type: 'text', required: true, span: 1 },
      { name: 'elevation', label: 'Elevation', type: 'text', span: 1, help: 'Optional, e.g. “1,041 m”.' },
      { name: 'rating', label: 'Rating', type: 'number', step: 0.01, min: 0, max: 5, required: true, span: 1 },
      { name: 'featured', label: 'Featured', type: 'boolean', span: 1 },
      { name: 'experiences', label: 'Things to do', type: 'stringList', span: 2, placeholder: 'e.g. Nine Arch Bridge Train Watch' },
      { name: 'highlights', label: 'Highlights', type: 'stringList', span: 2, placeholder: 'e.g. Ella Rock' },
      { name: 'ideal_for', label: 'Ideal for', type: 'stringList', span: 2, placeholder: 'e.g. Hikers' },
      sortField,
      publishedField
    ],
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
      elevation: '',
      rating: 4.8,
      featured: false,
      experiences: [],
      highlights: [],
      ideal_for: [],
      sort_order: 0,
      published: true
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
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
      idField,
      { name: 'category', label: 'Maps to category', type: 'select', options: CATEGORY_OPTIONS, required: true, span: 1, help: 'Clicking the tile filters the map by this category.' },
      { name: 'subtitle', label: 'Subtitle', type: 'text', required: true, span: 1 },
      { name: 'image', label: 'Image', type: 'image', folder: 'experiences', required: true, span: 2 },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, required: true, span: 2 },
      sortField,
      publishedField
    ],
    defaults: {
      title: '',
      id: '',
      category: 'Beaches',
      subtitle: '',
      image: '',
      description: '',
      sort_order: 0,
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
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
      idField,
      { name: 'subtitle', label: 'Subtitle', type: 'text', span: 2 },
      { name: 'location', label: 'Location', type: 'text', required: true, span: 1 },
      { name: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS, required: true, span: 1 },
      { name: 'duration', label: 'Duration', type: 'text', required: true, span: 1, help: 'e.g. “3–4 Hours”' },
      { name: 'recommended_time', label: 'Recommended time', type: 'text', span: 1, help: 'Optional, e.g. “5:30 AM – 8:30 AM”' },
      { name: 'image', label: 'Image', type: 'image', folder: 'experiences', required: true, span: 2 },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4, required: true, span: 2 },
      { name: 'highlights', label: 'Highlights', type: 'stringList', span: 2 },
      { name: 'rating', label: 'Rating', type: 'number', step: 0.01, min: 0, max: 5, required: true, span: 1 },
      sortField,
      publishedField
    ],
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
      sort_order: 0,
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
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
      idField,
      { name: 'subtitle', label: 'Subtitle', type: 'text', required: true, span: 2 },
      { name: 'days', label: 'Days', type: 'number', step: 1, min: 1, required: true, span: 1 },
      { name: 'price_from', label: 'Price from (USD)', type: 'number', step: 1, min: 0, required: true, span: 1 },
      { name: 'category', label: 'Category', type: 'select', options: TOUR_CATEGORY_OPTIONS, required: true, span: 1 },
      { name: 'image', label: 'Cover image', type: 'image', folder: 'tours', required: true, span: 2 },
      { name: 'short_desc', label: 'Short description', type: 'textarea', rows: 3, required: true, span: 2 },
      { name: 'full_desc', label: 'Full description', type: 'textarea', rows: 4, required: true, span: 2 },
      { name: 'route', label: 'Route', type: 'stringList', span: 2, placeholder: 'e.g. Colombo', help: 'Shown as the route chips on the tour card, in order.' },
      { name: 'highlights', label: 'Highlights', type: 'stringList', span: 2 },
      { name: 'included_places', label: 'Included places', type: 'stringList', span: 2 },
      { name: 'itinerary', label: 'Day-by-day itinerary', type: 'itinerary', span: 2 },
      sortField,
      publishedField
    ],
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
      route: [],
      highlights: [],
      included_places: [],
      itinerary: [],
      sort_order: 0,
      published: true
    }
  },

  {
    slug: 'articles',
    table: 'articles',
    label: 'Journal',
    singular: 'Article',
    description: 'Travel Eye Journal posts.',
    icon: Newspaper,
    titleField: 'title',
    subtitleField: 'snippet',
    imageField: 'image',
    metaField: 'category',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, span: 2 },
      idField,
      { name: 'category', label: 'Category label', type: 'text', required: true, span: 1, help: 'Shown uppercase on the card, e.g. “INSPIRATION”.' },
      { name: 'published_at', label: 'Publish date', type: 'date', required: true, span: 1 },
      { name: 'read_time', label: 'Read time', type: 'text', required: true, span: 1, help: 'e.g. “6 min read”' },
      { name: 'image', label: 'Cover image', type: 'image', folder: 'journal', required: true, span: 2 },
      { name: 'snippet', label: 'Snippet', type: 'textarea', rows: 3, required: true, span: 2 },
      { name: 'author_name', label: 'Author name', type: 'text', required: true, span: 1 },
      { name: 'author_role', label: 'Author role', type: 'text', required: true, span: 1 },
      { name: 'author_avatar', label: 'Author avatar', type: 'image', folder: 'authors', required: true, span: 2 },
      { name: 'content', label: 'Body paragraphs', type: 'stringList', multiline: true, span: 2, help: 'One entry per paragraph.' },
      sortField,
      publishedField
    ],
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
      sort_order: 0,
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
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, span: 2 },
      idField,
      { name: 'region', label: 'Region label', type: 'text', required: true, span: 1, help: 'Free text, e.g. “Central Highlands”.' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, span: 2, help: 'The small badge on the card, e.g. “Cloud Forest Peak”.' },
      { name: 'image', label: 'Image', type: 'image', folder: 'hidden-gems', required: true, span: 2 },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4, required: true, span: 2 },
      { name: 'why_visit', label: 'Why visit', type: 'textarea', rows: 2, required: true, span: 2 },
      sortField,
      publishedField
    ],
    defaults: {
      name: '',
      id: '',
      region: '',
      tag: '',
      image: '',
      description: '',
      why_visit: '',
      sort_order: 0,
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
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
      idField,
      { name: 'location', label: 'Location', type: 'text', required: true, span: 1 },
      { name: 'category', label: 'Category label', type: 'text', required: true, span: 1 },
      { name: 'aspect', label: 'Tile shape', type: 'select', options: ASPECT_OPTIONS, allowEmpty: true, span: 1, help: 'Controls how tall the tile is in the mosaic.' },
      { name: 'image', label: 'Photo', type: 'image', folder: 'photo-stories', required: true, span: 2 },
      { name: 'caption', label: 'Caption', type: 'textarea', rows: 3, required: true, span: 2 },
      sortField,
      publishedField
    ],
    defaults: {
      title: '',
      id: '',
      location: '',
      category: '',
      aspect: 'landscape',
      image: '',
      caption: '',
      sort_order: 0,
      published: true
    }
  }
];

export const findCollection = (slug: string | undefined): CollectionDef | undefined =>
  COLLECTIONS.find((c) => c.slug === slug);
