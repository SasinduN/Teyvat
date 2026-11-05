import { TravelImage } from '@/components/TravelImage';
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

      <section className="scroll-mt-[var(--header-height)] bg-[var(--background)] py-16 sm:py-20" data-photo-credits>
        <div className="te-container">
          {credits.length > 0 && (
            <p className="mx-auto mb-10 max-w-2xl scroll-mt-[calc(var(--header-height)+1rem)] text-center text-[var(--text-primary)]/70" data-photo-adaptations>
              Photos may be resized, re-encoded or cropped for this site. Each keeps the licence shown here.
            </p>
          )}
          {credits.length === 0 ? (
            <p className="mx-auto max-w-2xl text-center text-[var(--text-primary)]/70">
              None of the photos on the site currently need a credit.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {credits.map((credit) => (
                <li key={credit.url} className="te-card min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  <TravelImage
                    src={credit.url}
                    alt={`Photo by ${credit.author}`}
                    loading="lazy"
                    className="h-48 w-full object-cover"
                  />
                  <div className="space-y-1.5 p-5 text-sm">
                    <p className="font-semibold text-[var(--brand-primary)]">{credit.author}</p>
                    <p className="text-[var(--text-primary)]/70">
                      {credit.licenseUrl ? (
                        <a
                          href={credit.licenseUrl}
                          target="_blank"
                          rel="noopener noreferrer license"
                          className="text-[var(--brand-primary)] underline underline-offset-2 hover:text-[var(--brand-primary)]"
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
                        className="inline-flex items-center gap-1 text-sm text-[var(--brand-primary)] underline underline-offset-2 hover:text-[var(--brand-primary)]"
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
