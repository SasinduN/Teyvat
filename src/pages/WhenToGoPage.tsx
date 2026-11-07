import { useId, useMemo, useState, type CSSProperties } from 'react';

import { DestinationCard } from '@/components/PageCards';
import { PageHero } from '@/components/PageHero';
import { SeasonMap } from '@/components/SeasonMap';
import { WishlistTextLink } from '@/components/WishlistLink';
import { usePageTitle } from '@/context/PublicSiteContext';
import { useDestinations, useSiteSettings } from '@/hooks/useSiteContent';
import { SEASON_ICON_PATHS } from '@/lib/mapMarkers';
import {
  explainerParagraphs,
  MONTH_NAMES,
  monthInColombo,
  monthName,
  suitability,
  SUITABILITIES,
  SUITABILITY_LABELS,
  SUITABILITY_MEANINGS,
  type Suitability
} from '@shared/best-months';
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '@shared/page-meta';
import { paths } from '@shared/site-paths';
import type { Destination } from '@/types';
import { Section } from './Section';
import '../styles/when-to-go.css';

/** A marker's look, for the legend: the same fill, ring and icon as on the map. */
function SeasonIcon({ value }: { value: Suitability }) {
  return (
    <span className="te-season-disc" data-suitability={value}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {SEASON_ICON_PATHS[value].map((d) => <path key={d} d={d} />)}
      </svg>
    </span>
  );
}

/**
 * The month: a native range input, so the arrow keys, Home, End and Page Up and Down all work,
 * with the month's name for screen readers (`aria-valuetext`) and on screen.
 */
function MonthSlider({ month, onChange }: { month: number; onChange: (month: number) => void }) {
  const id = useId();
  return (
    <div className="te-month-slider" data-month-slider>
      <label htmlFor={id} className="te-ed-label">Month</label>
      <p className="te-month-slider__value font-heading" data-month-name>{monthName(month)}</p>
      <input
        id={id}
        className="te-month-slider__input"
        type="range"
        min={1}
        max={12}
        step={1}
        value={month}
        aria-valuetext={monthName(month)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="te-month-slider__ticks" aria-hidden="true">
        {MONTH_NAMES.map((name, i) => (
          <span key={name} className="te-month-slider__tick" style={{ '--i': i } as CSSProperties} data-current={month === i + 1}>
            <span className="te-month-slider__tick-long">{name.slice(0, 3)}</span>
            <span className="te-month-slider__tick-short">{name[0]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PlaceGrid({ places }: { places: Destination[] }) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {places.map((place) => <DestinationCard key={place.id} dest={place} />)}
    </div>
  );
}

/**
 * `/when-to-go`: a month, the island map by how each place suits it, the best places for that
 * month, and the monsoons explained. It opens on this month in Sri Lanka, wherever the visitor
 * is. Places with no best months say "not set" on the map and stay out of the lists.
 */
export function WhenToGoPage() {
  usePageTitle(PAGE_TITLES.whenToGo);
  const destinations = useDestinations();
  const { whenToGoExplainer } = useSiteSettings();
  const [month, setMonth] = useState(() => monthInColombo());

  const byFit = useMemo(() => {
    const groups: Record<Suitability, Destination[]> = { great: [], ok: [], 'not-ideal': [], 'not-set': [] };
    for (const place of destinations) groups[suitability(place.bestMonths, month)].push(place);
    return groups;
  }, [destinations, month]);

  const name = monthName(month);
  const paragraphs = explainerParagraphs(whenToGoExplainer);

  return (
    <>
      <PageHero
        compact
        image={destinations.find((d) => d.featured)?.image ?? destinations[0]?.image}
        crumbs={[{ label: 'Home', to: paths.home }, { label: 'When to go' }]}
        title="When to go"
        subtitle={PAGE_DESCRIPTIONS.whenToGo}
      />

      <section className="te-ed-section te-ed-section--tint">
        <div className="te-container">
          <MonthSlider month={month} onChange={setMonth} />
          {/* The slider reads out the month; this adds what changed. */}
          <p role="status" className="sr-only" data-season-status>
            {name}: {byFit.great.length} great, {byFit.ok.length} OK.
          </p>

          <ul className="te-season-legend" aria-label="What the markers mean" data-season-legend>
            {SUITABILITIES.map((value) => (
              <li key={value} data-legend={value}>
                <SeasonIcon value={value} />
                <span><strong>{SUITABILITY_LABELS[value]}:</strong> {SUITABILITY_MEANINGS[value]}</span>
              </li>
            ))}
          </ul>

          <Section name="SeasonMap">
            <SeasonMap destinations={destinations} month={month} />
          </Section>
        </div>
      </section>

      <section className="te-ed-section" data-best-places="great">
        <div className="te-container">
          <h2 className="te-ed-title font-heading mb-6">Best places in {name}</h2>
          {byFit.great.length > 0 ? (
            <PlaceGrid places={byFit.great} />
          ) : (
            <p className="te-ed-lead">No place has {name} as one of its best months yet.</p>
          )}
        </div>
      </section>

      {byFit.ok.length > 0 && (
        <section className="te-ed-section te-ed-section--tint" data-best-places="ok">
          <div className="te-container">
            <h2 className="te-ed-title font-heading mb-2">Also OK in {name}</h2>
            <p className="te-ed-meta mb-6">{name} is next to one of their best months.</p>
            <PlaceGrid places={byFit.ok} />
          </div>
        </section>
      )}

      {paragraphs.length > 0 && (
        <section className="te-ed-section" data-monsoon-explainer>
          <div className="te-container">
            <div className="te-reading-column">
              <h2 className="te-ed-title font-heading mb-4">The monsoons, by region</h2>
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="te-prose te-season-paragraph">{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      <p className="te-container te-wishlist-aside"><WishlistTextLink text="See the places you saved" /></p>
    </>
  );
}
