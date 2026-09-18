import { useQuery } from '@tanstack/react-query';
import { EMPTY_CONTENT, fetchSiteContent, type SiteContent } from '@/lib/api/content';
import { queryKeys } from '@/lib/queryClient';
import { describeError, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Loads every piece of public site content once and shares it through React
 * Query's cache, so all the approved components read from a single fetch.
 *
 * This is what let those components stay untouched: each one used to do
 * `import { DESTINATIONS } from '../data/destinations'` and now does
 * `const DESTINATIONS = useDestinations()`. No JSX changed.
 */

const MISSING_CONFIG =
  'Supabase is not configured. Copy .env.example to .env.local and set ' +
  'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

export interface SiteContentResult {
  content: SiteContent;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSiteContent(): SiteContentResult {
  const query = useQuery({
    queryKey: queryKeys.siteContent,
    queryFn: fetchSiteContent,
    // Without credentials there is nothing to fetch; surface one clear message
    // instead of a cascade of failed requests.
    enabled: isSupabaseConfigured
  });

  return {
    content: query.data ?? EMPTY_CONTENT,
    loading: isSupabaseConfigured && query.isPending,
    error: !isSupabaseConfigured
      ? MISSING_CONFIG
      : query.error
        ? describeError(query.error)
        : null,
    reload: () => void query.refetch()
  };
}

/* ------------------------------------------------------------------- hooks */
/* Drop-in replacements for the old `src/data` constants.                    */

export const useDestinations = () => useSiteContent().content.destinations;
export const useExperienceCategories = () => useSiteContent().content.experienceCategories;
export const useFeaturedExperiences = () => useSiteContent().content.featuredExperiences;
export const useTours = () => useSiteContent().content.tours;
export const useArticles = () => useSiteContent().content.articles;
export const useHiddenGems = () => useSiteContent().content.hiddenGems;
export const usePhotoStories = () => useSiteContent().content.photoStories;
