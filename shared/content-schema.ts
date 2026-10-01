/**
 * What every content table's admin form contains, and how each value is
 * validated: one definition for the admin panel and the API.
 *
 * The admin builds its forms from `FIELDS_BY_TABLE` and validates them with
 * `schemaForTable` before sending. The API runs the same schema on what
 * arrives, and also uses the field list as its column allow-list: SQL column
 * names come from here, never from a request body.
 *
 * Plain data and Zod only. Icons, list-view columns and other UI settings live
 * in `src/admin/collections.ts`, because the server cannot import React.
 */
import { z } from './zod';

import {
  PILLAR_ICON_NAMES,
  type ContentTableName,
  type SiteSettingsRow
} from './database.types';
import { IMAGE_HOST_REFUSED, isAllowedImageUrl } from './image-hosts';

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
  | (FieldBase & { type: 'number'; min?: number; max?: number; step?: number; integer?: boolean })
  | (FieldBase & { type: 'select'; options: readonly string[]; allowEmpty?: boolean })
  | (FieldBase & { type: 'multiselect'; options: readonly string[] })
  | (FieldBase & { type: 'image'; folder: string })
  | (FieldBase & { type: 'imageList'; folder: string })
  | (FieldBase & { type: 'stringList'; multiline?: boolean; placeholder?: string })
  | (FieldBase & { type: 'date' })
  | (FieldBase & { type: 'boolean' })
  | (FieldBase & { type: 'itinerary' })
  | (FieldBase & { type: 'email' })
  /** An optional https:// link. Empty means "not set" and is stored as NULL. */
  | (FieldBase & { type: 'link' });

/* ---------------------------------------------------------------- slugs */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * `GET …/:table/count` and `PUT …/:table/order` share a path position with
 * `…/:table/:id`, so a row with either slug could never be opened or saved.
 */
export const RESERVED_SLUGS = ['count', 'order'] as const;

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

/** Shown on the Featured toggle and above the destinations list. */
export const SPOTLIGHT_NOTICE = 'Only the first 6 featured destinations are displayed.';

/* ------------------------------------------------------------ definitions */

/**
 * The editable columns of each table, in form order. `sort_order` is not
 * here: the list view's arrows own ordering, and a new row goes to the end.
 */
export const FIELDS_BY_TABLE: Record<ContentTableName, Field[]> = {
  destinations: [
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
    { name: 'featured', label: 'Featured', type: 'boolean', span: 1, help: `Shows the destination in the spotlight. ${SPOTLIGHT_NOTICE}` },
    { name: 'experiences', label: 'Things to do', type: 'stringList', span: 2, placeholder: 'e.g. Nine Arch Bridge Train Watch' },
    { name: 'highlights', label: 'Highlights', type: 'stringList', span: 2, placeholder: 'e.g. Ella Rock' },
    { name: 'ideal_for', label: 'Ideal for', type: 'stringList', span: 2, placeholder: 'e.g. Hikers' },
    publishedField
  ],

  experience_categories: [
    { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
    idField,
    { name: 'category', label: 'Maps to category', type: 'select', options: CATEGORY_OPTIONS, required: true, span: 1, help: 'Clicking the tile filters the map by this category.' },
    { name: 'subtitle', label: 'Subtitle', type: 'text', required: true, span: 1 },
    { name: 'image', label: 'Image', type: 'image', folder: 'experiences', required: true, span: 2 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, required: true, span: 2 },
    publishedField
  ],

  featured_experiences: [
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
    publishedField
  ],

  tours: [
    { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
    idField,
    { name: 'subtitle', label: 'Subtitle', type: 'text', required: true, span: 2 },
    { name: 'days', label: 'Days', type: 'number', step: 1, min: 1, integer: true, required: true, span: 1 },
    { name: 'price_from', label: 'Price from (USD)', type: 'number', step: 1, min: 0, required: true, span: 1 },
    { name: 'category', label: 'Category', type: 'select', options: TOUR_CATEGORY_OPTIONS, required: true, span: 1 },
    { name: 'image', label: 'Cover image', type: 'image', folder: 'tours', required: true, span: 2 },
    { name: 'short_desc', label: 'Short description', type: 'textarea', rows: 3, required: true, span: 2 },
    { name: 'full_desc', label: 'Full description', type: 'textarea', rows: 4, required: true, span: 2 },
    { name: 'route', label: 'Route', type: 'stringList', span: 2, placeholder: 'e.g. Colombo', help: 'Shown as the route chips on the tour card, in order.' },
    { name: 'highlights', label: 'Highlights', type: 'stringList', span: 2 },
    { name: 'included_places', label: 'Included places', type: 'stringList', span: 2 },
    { name: 'itinerary', label: 'Day-by-day itinerary', type: 'itinerary', span: 2 },
    publishedField
  ],

  articles: [
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
    publishedField
  ],

  hidden_gems: [
    { name: 'name', label: 'Name', type: 'text', required: true, span: 2 },
    idField,
    { name: 'region', label: 'Region label', type: 'text', required: true, span: 1, help: 'Free text, e.g. “Central Highlands”.' },
    { name: 'tag', label: 'Tag', type: 'text', required: true, span: 2, help: 'The small badge on the card, e.g. “Cloud Forest Peak”.' },
    { name: 'image', label: 'Image', type: 'image', folder: 'hidden-gems', required: true, span: 2 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 4, required: true, span: 2 },
    { name: 'why_visit', label: 'Why visit', type: 'textarea', rows: 2, required: true, span: 2 },
    publishedField
  ],

  photo_stories: [
    { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
    idField,
    { name: 'location', label: 'Location', type: 'text', required: true, span: 1 },
    { name: 'category', label: 'Category label', type: 'text', required: true, span: 1 },
    { name: 'aspect', label: 'Tile shape', type: 'select', options: ASPECT_OPTIONS, allowEmpty: true, span: 1, help: 'Controls how tall the tile is in the mosaic.' },
    { name: 'image', label: 'Photo', type: 'image', folder: 'photo-stories', required: true, span: 2 },
    { name: 'caption', label: 'Caption', type: 'textarea', rows: 3, required: true, span: 2 },
    publishedField
  ],

  hero_slides: [
    { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
    idField,
    { name: 'caption', label: 'Caption', type: 'textarea', rows: 2, required: true, span: 2 },
    { name: 'image', label: 'Background image', type: 'image', folder: 'hero', required: true, span: 2 },
    { ...publishedField, help: 'The hero needs at least one published slide.' }
  ],

  pillars: [
    { name: 'title', label: 'Title', type: 'text', required: true, span: 1 },
    idField,
    { name: 'icon', label: 'Icon', type: 'select', options: PILLAR_ICON_NAMES, required: true, span: 1 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, required: true, span: 2 },
    publishedField
  ]
};

/** The single `site_settings` row, as the settings page edits it. */
export const SITE_SETTINGS_FIELDS: Field[] = [
  { name: 'postal_address', label: 'Postal address', type: 'text', required: true, span: 2 },
  { name: 'phone', label: 'Phone', type: 'text', required: true, span: 1 },
  { name: 'contact_email', label: 'Contact email', type: 'email', required: true, span: 1, help: 'Shown in the footer. Visible to everyone.' },
  { name: 'instagram_url', label: 'Instagram', type: 'link', span: 1 },
  { name: 'facebook_url', label: 'Facebook', type: 'link', span: 1 },
  { name: 'tiktok_url', label: 'TikTok', type: 'link', span: 1 },
  { name: 'youtube_url', label: 'YouTube', type: 'link', span: 1 },
  { name: 'privacy_url', label: 'Privacy policy', type: 'link', span: 1 },
  { name: 'terms_url', label: 'Terms of service', type: 'link', span: 1 },
  { name: 'sustainability_url', label: 'Sustainability pledge', type: 'link', span: 2 }
];

export type SiteSettingsValues = Omit<SiteSettingsRow, 'id' | 'created_at' | 'updated_at'>;

/* ------------------------------------------------------------------ zod */

/** Zod needs a non-empty tuple; the option lists are `readonly string[]`. */
const asEnum = (options: readonly string[]) =>
  z.enum(options as unknown as [string, ...string[]]);

/** Number boxes hand over strings; an empty one is missing, not zero. */
const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const httpsUrl = (message: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .pipe(z.url({ protocol: /^https$/, error: message }));

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * The schema for one field. Also the coercion layer: text is trimmed,
 * optional blanks become `null` (so the mappers yield `undefined` and the
 * public components render as they did with hardcoded data), number strings
 * become numbers, blank list rows are dropped, itinerary days run 1..n.
 */
export interface SchemaOptions {
  /**
   * When given, image fields must point at one of these origins (see
   * `shared/image-hosts.ts`). The API always passes them; the admin form
   * doesn't know the R2 origin, so it relies on the API's field error.
   */
  imageOrigins?: readonly string[];
}

/** An https URL that, when origins are given, is on the image allow-list. */
const imageUrl = (message: string, options: SchemaOptions) => {
  const url = httpsUrl(message, 2000);
  const origins = options.imageOrigins;
  return origins ? url.refine((v) => isAllowedImageUrl(v, origins), IMAGE_HOST_REFUSED) : url;
};

function schemaForField(field: Field, options: SchemaOptions = {}): z.ZodTypeAny {
  switch (field.type) {
    case 'slug':
      return z
        .string()
        .trim()
        .min(1, 'A URL slug is required.')
        .max(60, 'Keep the slug under 60 characters.')
        .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single dashes only.')
        .refine((v) => !(RESERVED_SLUGS as readonly string[]).includes(v), {
          message: `“${RESERVED_SLUGS.join('” and “')}” are reserved. Choose another slug.`
        });

    case 'text':
      return field.required
        ? z.string().trim().min(1, `${field.label} is required.`).max(300, 'Keep it under 300 characters.')
        : z
            .string()
            .trim()
            .max(300, 'Keep it under 300 characters.')
            .nullable()
            .transform((v) => (v ? v : null));

    case 'textarea':
      return field.required
        ? z.string().trim().min(1, `${field.label} is required.`).max(5000, 'Keep it under 5000 characters.')
        : z
            .string()
            .trim()
            .max(5000, 'Keep it under 5000 characters.')
            .nullable()
            .transform((v) => (v ? v : null));

    case 'number': {
      let n = z.coerce.number({ error: `${field.label} must be a number.` });
      if (field.integer) n = n.int(`${field.label} must be a whole number.`);
      if (field.min !== undefined) n = n.min(field.min, `Minimum is ${field.min}.`);
      if (field.max !== undefined) n = n.max(field.max, `Maximum is ${field.max}.`);
      return z.preprocess(blankToUndefined, n);
    }

    case 'date':
      return z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.')
        .refine(isCalendarDate, 'Pick a real date.');

    case 'select':
      return field.allowEmpty
        ? z
            .union([asEnum(field.options), z.literal(''), z.null()])
            .transform((v) => (v === '' ? null : v))
        : asEnum(field.options);

    case 'multiselect':
      return z.array(asEnum(field.options));

    case 'boolean':
      return z.boolean();

    case 'image':
      return imageUrl(`${field.label} must be an https:// image URL.`, options);

    case 'imageList':
      return z
        .array(z.string())
        .transform((items) => items.map((s) => s.trim()).filter(Boolean))
        .pipe(z.array(imageUrl('Each image must be an https:// URL.', options)).max(50, 'At most 50 images.'));

    case 'stringList':
      // Blank rows the user left behind are dropped rather than rejected.
      return z
        .array(z.string())
        .transform((items) => items.map((s) => s.trim()).filter(Boolean))
        .pipe(z.array(z.string().max(5000, 'Keep each entry under 5000 characters.')).max(50, 'At most 50 entries.'));

    case 'itinerary':
      return z
        .array(
          z.object({
            day: z.coerce.number(),
            title: z.string().trim().min(1, 'Each day needs a title.').max(300),
            description: z.string().trim().max(5000),
            location: z.string().trim().max(300)
          })
        )
        .max(60, 'At most 60 days.')
        // Day numbers always run 1..n so the public tour view stays consistent.
        .transform((days) => days.map((d, i) => ({ ...d, day: i + 1 })));

    case 'email':
      return z.string().trim().pipe(z.email(`${field.label} must be a valid email address.`));

    case 'link':
      return z
        .string()
        .trim()
        .nullable()
        .transform((v) => (v ? v : null))
        .pipe(httpsUrl(`${field.label} must start with https://, or be left empty.`, 500).nullable());
  }
}

function objectSchema(fields: Field[], options: SchemaOptions = {}) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) shape[field.name] = schemaForField(field, options);
  return z.object(shape);
}

/**
 * `create` includes the slug; `update` leaves it out, because a slug is
 * permanent once the row exists.
 */
export function schemaForTable(
  table: ContentTableName,
  mode: 'create' | 'update',
  options: SchemaOptions = {}
) {
  const fields = FIELDS_BY_TABLE[table].filter((f) => mode === 'create' || f.type !== 'slug');
  return objectSchema(fields, options);
}

export const siteSettingsSchema = objectSchema(SITE_SETTINGS_FIELDS);

/** The column names a write may set, for building SQL. Never from a request. */
export function writableColumns(table: ContentTableName, mode: 'create' | 'update'): string[] {
  return FIELDS_BY_TABLE[table]
    .filter((f) => mode === 'create' || f.type !== 'slug')
    .map((f) => f.name);
}

export const SITE_SETTINGS_COLUMNS = SITE_SETTINGS_FIELDS.map((f) => f.name);

/** Columns stored as `jsonb`, which need a `::jsonb` cast and JSON encoding. */
export const JSONB_COLUMNS: ReadonlySet<string> = new Set(['itinerary']);

/**
 * Zod issues as `{ "itinerary.2.title": "Each day needs a title." }`: the
 * first message per path, which is what a form shows under each field.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.') || '_';
    if (!(path in fields)) fields[path] = issue.message;
  }
  return fields;
}
