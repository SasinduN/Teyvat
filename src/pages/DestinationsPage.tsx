import { useSearchParams } from 'react-router-dom';
import { PageHero } from '@/components/PageHero';
import { DestinationCard } from '@/components/PageCards';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useDestinations } from '@/hooks/useSiteContent';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import type { CategoryType } from '@/types';
import { Section } from './Section';

/** The filter chips, in the map's order. */
const CATEGORIES: Exclude<CategoryType, 'All'>[] = [
  'Beaches',
  'Mountains',
  'Culture',
  'Wildlife',
  'Adventure',
  'Food',
  'Hidden Gems'
];

/**
 * `/destinations`: every published destination, not only the six featured.
 * The category filter lives in the URL (`?category=Beaches`), so a filtered
 * list can be shared; an unknown category shows everything.
 */
export function DestinationsPage() {
  usePageTitle(PAGE_TITLES.destinations);
  const all = useDestinations();
  const [params, setParams] = useSearchParams();
  const asked = params.get('category');
  const category = CATEGORIES.find((c) => c === asked) ?? 'All';
  const shown = category === 'All' ? all : all.filter((d) => d.category.includes(category));

  const choose = (next: CategoryType) =>
    setParams(next === 'All' ? {} : { category: next }, { replace: true, preventScrollReset: true });

  return (
    <>
      <PageHero
        compact
        image={all.find((d) => d.featured)?.image ?? all[0]?.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'Destinations' }]}
        eyebrow="Places Worth Getting Lost In"
        title="Destinations"
        subtitle={PAGE_DESCRIPTIONS.destinations}
      />

      <Section name="DestinationsList">
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="no-scrollbar mb-8 flex items-center gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter by category">
              {(['All', ...CATEGORIES] as CategoryType[]).map((c) => {
                const selected = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => choose(c)}
                    aria-pressed={selected}
                    className={`flex items-center space-x-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 sm:text-sm ${
                      selected
                        ? 'scale-105 border border-[#368E6B] bg-[#0F2E23] text-[#D4AF37] shadow-md'
                        : 'border border-[#D4C3B5]/50 bg-white text-[#1A1A1A]/80 hover:bg-[#1C4737] hover:text-white'
                    }`}
                  >
                    <span>{c}</span>
                    {c !== 'All' && (
                      <span className={`rounded-full px-1.5 font-sans text-[10px] ${selected ? 'bg-[#368E6B] text-white' : 'bg-[#F5EFEB] text-[#1A1A1A]'}`}>
                        {all.filter((d) => d.category.includes(c)).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mb-6 text-sm text-[#1A1A1A]/60" role="status">
              Showing <strong className="text-[#0F2E23]">{shown.length}</strong>{' '}
              {shown.length === 1 ? 'destination' : 'destinations'}
              {category !== 'All' && <> for <strong className="text-[#0F2E23]">{category}</strong></>}
            </p>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((d) => (
                <DestinationCard key={d.id} dest={d} />
              ))}
            </div>
          </div>
        </section>
      </Section>
    </>
  );
}
