import { ExternalLink } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useHeroSlides, useImageCredits } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';

/**
 * `/photo-credits`: who took the photos the site shows, and their licences
 * (CC BY-SA requires the attribution). Linked from the Footer. Lists the
 * credits `GET /api/content` sends: those for photos a published row uses.
 * Edited under Admin → Photo credits.
 */
export function PhotoCreditsPage() {
  usePageTitle(PAGE_TITLES.photoCredits);
  const credits = useImageCredits();
  const slides = useHeroSlides();

  return (
    <>
      <PageHero
        compact
        image={slides[0]?.url}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Photo Credits' }]}
        eyebrow="Thank You"
        title="Photo Credits"
        subtitle={PAGE_DESCRIPTIONS.photoCredits}
      />

      <section className="bg-[#FBF9F6] py-16 sm:py-20" data-photo-credits>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {credits.length === 0 ? (
            <p className="mx-auto max-w-2xl text-center font-light text-[#1A1A1A]/70">
              None of the photos on the site currently need a credit.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {credits.map((credit) => (
                <li key={credit.url} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
                  <img
                    src={credit.url}
                    alt={`Photo by ${credit.author}`}
                    loading="lazy"
                    className="h-48 w-full object-cover"
                  />
                  <div className="space-y-1.5 p-5 text-sm">
                    <p className="font-semibold text-[#0F2E23]">{credit.author}</p>
                    <p className="text-[#1A1A1A]/70">
                      {credit.licenseUrl ? (
                        <a
                          href={credit.licenseUrl}
                          target="_blank"
                          rel="noopener noreferrer license"
                          className="text-[#1C4737] underline underline-offset-2 hover:text-[#0F2E23]"
                        >
                          {credit.license}
                        </a>
                      ) : (
                        credit.license
                      )}
                    </p>
                    {credit.sourceUrl && (
                      <a
                        href={credit.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#1C4737] underline underline-offset-2 hover:text-[#0F2E23]"
                      >
                        Original
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
