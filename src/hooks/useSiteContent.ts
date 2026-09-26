import { useQuery } from '@tanstack/react-query';
import { EMPTY_CONTENT, fetchSiteContent, type SiteContent } from '@/lib/api/content';
import { queryKeys } from '@/lib/queryClient';

/**
 * Loads every piece of public site content once and shares it through React
 * Query's cache, so all the approved components read from a single fetch.
 *
 * This is what let those components stay untouched: each one used to hold or
 * import its content as a constant, and now does
 * `const DESTINATIONS = useDestinations()` under the same name. No JSX changed.
 */

export interface SiteContentResult {
  content: SiteContent;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSiteContent(): SiteContentResult {
  const query = useQuery({
    queryKey: queryKeys.siteContent,
    queryFn: fetchSiteContent
  });

  return {
    content: query.data ?? EMPTY_CONTENT,
    loading: query.isPending,
    error: query.error ? query.error.message || 'Something went wrong.' : null,
    reload: () => void query.refetch()
  };
}

/* ------------------------------------------------------------------- hooks */
/* One per content collection, named for the constant each component used.  */

export const useDestinations = () => useSiteContent().content.destinations;
export const useExperienceCategories = () => useSiteContent().content.experienceCategories;
export const useFeaturedExperiences = () => useSiteContent().content.featuredExperiences;
export const useTours = () => useSiteContent().content.tours;
export const useArticles = () => useSiteContent().content.articles;
export const useHiddenGems = () => useSiteContent().content.hiddenGems;
export const usePhotoStories = () => useSiteContent().content.photoStories;
export const useHeroSlides = () => useSiteContent().content.heroSlides;
export const usePillars = () => useSiteContent().content.pillars;
export const useSiteSettings = () => useSiteContent().content.siteSettings;
