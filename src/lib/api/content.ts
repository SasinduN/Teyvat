/**
 * Public (anon-key) reads for the marketing site.
 *
 * Every query relies on the `public read published` RLS policy, so unpublished
 * rows are filtered server-side; the explicit `.eq('published', true)` keeps
 * the behaviour identical when an admin is signed in and browsing the public
 * site (admins can see drafts through RLS, but the public page should not
 * change shape just because someone is logged in).
 */
import { supabase } from '@/lib/supabase';
import {
  toArticle,
  toDestination,
  toExperienceCategory,
  toExperienceItem,
  toHiddenGem,
  toPhotoStory,
  toTourPackage,
  type ExperienceCategory
} from '@/lib/mappers';
import type {
  ArticleRow,
  DestinationRow,
  ExperienceCategoryRow,
  FeaturedExperienceRow,
  HiddenGemRow,
  PhotoStoryRow,
  TourRow
} from '@shared/database.types';
import type {
  Article,
  Destination,
  ExperienceItem,
  HiddenGem,
  PhotoStory,
  TourPackage
} from '@/types';

/** Everything the public site renders, fetched once at boot. */
export interface SiteContent {
  destinations: Destination[];
  experienceCategories: ExperienceCategory[];
  featuredExperiences: ExperienceItem[];
  tours: TourPackage[];
  articles: Article[];
  hiddenGems: HiddenGem[];
  photoStories: PhotoStory[];
}

export const EMPTY_CONTENT: SiteContent = {
  destinations: [],
  experienceCategories: [],
  featuredExperiences: [],
  tours: [],
  articles: [],
  hiddenGems: [],
  photoStories: []
};

/**
 * `sort_order` mirrors the index each record had in the original hardcoded
 * array, so ordering by it reproduces the approved page order exactly. `id` is
 * the tiebreaker so the order stays stable if two rows share a sort_order.
 */
async function selectPublished<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Loads all site content in parallel. Rejects if any table fails, so the
 * caller can show one coherent error instead of a half-rendered page.
 */
export async function fetchSiteContent(): Promise<SiteContent> {
  const [
    destinations,
    experienceCategories,
    featuredExperiences,
    tours,
    articles,
    hiddenGems,
    photoStories
  ] = await Promise.all([
    selectPublished<DestinationRow>('destinations'),
    selectPublished<ExperienceCategoryRow>('experience_categories'),
    selectPublished<FeaturedExperienceRow>('featured_experiences'),
    selectPublished<TourRow>('tours'),
    selectPublished<ArticleRow>('articles'),
    selectPublished<HiddenGemRow>('hidden_gems'),
    selectPublished<PhotoStoryRow>('photo_stories')
  ]);

  return {
    destinations: destinations.map(toDestination),
    experienceCategories: experienceCategories.map(toExperienceCategory),
    featuredExperiences: featuredExperiences.map(toExperienceItem),
    tours: tours.map(toTourPackage),
    articles: articles.map(toArticle),
    hiddenGems: hiddenGems.map(toHiddenGem),
    photoStories: photoStories.map(toPhotoStory)
  };
}
