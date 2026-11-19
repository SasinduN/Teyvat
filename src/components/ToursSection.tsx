import { TravelImage } from '@/components/TravelImage';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTourCategories, useTours } from '@/hooks/useSiteContent';
import { paths } from '@shared/site-paths';
import { hasTourPrice, PRICE_ON_REQUEST } from '@shared/tour-price';
import { TourPackage } from '../types';
import { SaveButton } from './SaveButton';

interface ToursSectionProps {
  onOpenInquiry: (tourTitle: string) => void;
  /** Shows the tour's route on the map (and scrolls there). */
  onViewRoute?: (tour: TourPackage) => void;
  /** The tours to list: a category's (its page). Left out: every published tour. */
  tours?: TourPackage[];
  /** The section's heading and the line under it, when not the full list's. */
  title?: string;
  lead?: string;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Each tour as a photo beside its text, swapping sides down the page.
 *
 * On phones (below 768 px, editorial.css) the list is a row to swipe: native horizontal
 * scrolling with scroll-snap, one card a view and the next peeking in, a "2 / 6" counter and
 * dots under it. The dots are for pointers only (out of the Tab order, hidden from screen
 * readers); keyboard and screen-reader users have the Previous and Next buttons, the counter
 * and a live region. Nothing advances on its own. Wider screens hide the controls, and the
 * list lays out as it always has.
 */
export const ToursSection: React.FC<ToursSectionProps> = ({
  onOpenInquiry,
  onViewRoute,
  tours: listed,
  title = 'Routes around the island',
  lead = 'Multi-day routes planned by local experts. Dates, hotels and pace can all change.'
}) => {
  const all = useTours();
  const tours = listed ?? all;
  const categories = useTourCategories();
  /** The card's label: the tour's first category (0030), none when it has none. */
  const labelOf = (tour: TourPackage) => categories.find((c) => c.id === tour.categoryIds[0])?.name;
  const listId = useId();
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  // The card most in view is the active one: the counter and the dots follow it.
  useEffect(() => {
    const root = list.current;
    if (!root || tours.length === 0) return;
    const cards = [...root.children] as HTMLElement[];
    const ratios = cards.map(() => 0);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) ratios[cards.indexOf(entry.target as HTMLElement)] = entry.intersectionRatio;
      const most = Math.max(...ratios);
      if (most > 0) setActive(ratios.indexOf(most));
    }, { root, threshold: [0, .25, .5, .75, .9, 1] });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [tours.length]);

  /** Brings card `index` to the row's start, where it snaps. Does nothing where the row doesn't scroll. */
  const scrollToCard = useCallback((index: number) => {
    const root = list.current;
    const card = root?.children[index] as HTMLElement | undefined;
    if (!root || !card || root.scrollWidth <= root.clientWidth) return;
    const padding = parseFloat(getComputedStyle(root).scrollPaddingLeft) || 0;
    const left = root.scrollLeft + card.getBoundingClientRect().left - root.getBoundingClientRect().left - padding;
    root.scrollTo({ left, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(tours.length - 1, index));
    scrollToCard(next);
    setActive(next);
    setAnnouncement(`Tour ${next + 1} of ${tours.length}: ${tours[next].title}`);
  };

  return (
    <section id="tours" className="te-ed-section">
      <div className="te-container">
        <div className="te-section-header te-ed-head">
          <h2 className="te-ed-title font-heading">{title}</h2>
          <p>{lead}</p>
        </div>

        <ul ref={list} id={listId} className="te-tour-list" aria-label="Tour packages">
          {tours.map((tour, index) => (
            <li key={tour.id} className="te-tour-item" onFocus={() => scrollToCard(index)}>
              <article className="group te-card te-tour-row">
                <div className="te-ed-photo">
                  <TravelImage
                    src={tour.image}
                    alt={tour.title}
                    sizes="(min-width: 900px) 58vw, (min-width: 768px) 100vw, (min-width: 490px) 26rem, 85vw"
                  />
                </div>
                <div className="te-tour-row__body">
                  {labelOf(tour) && <p className="te-ed-label te-tour-row__label">{labelOf(tour)}</p>}
                  <h3 className="font-heading">{tour.title}</h3>
                  <p className="te-ed-meta mt-2">
                    {tour.days} days, {tour.days - 1} nights. {hasTourPrice(tour.priceFrom) ? `From $${tour.priceFrom} USD.` : `${PRICE_ON_REQUEST}.`}
                  </p>
                  <p className="te-tour-row__desc">{tour.shortDesc}</p>
                  <p className="te-tour-row__route"><strong>Route:</strong> {tour.route.join(', ')}</p>
                  <div className="te-ed-actions te-tour-row__actions">
                    <Link to={paths.tour(tour.id)} className="te-button te-button--secondary te-button--sm">View Full Journey</Link>
                    <button type="button" onClick={() => onOpenInquiry(tour.title)} className="te-button te-button--primary te-button--sm">Inquire</button>
                    <SaveButton kind="tour" id={tour.id} name={tour.title} />
                    {onViewRoute && tour.stops.length > 0 && (
                      <button type="button" onClick={() => onViewRoute(tour)} className="te-ed-link te-tour-row__map">View route on map</button>
                    )}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {tours.length > 1 && (
          <div className="te-tour-swipe" data-tour-swipe>
            <button
              type="button"
              className="te-tour-swipe__arrow te-button te-button--icon"
              aria-label="Previous tour"
              aria-controls={listId}
              aria-disabled={active === 0}
              onClick={() => active > 0 && goTo(active - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <p className="te-tour-swipe__count">
              <span aria-hidden="true">{active + 1} / {tours.length}</span>
              <span className="sr-only">Tour {active + 1} of {tours.length}</span>
            </p>
            <button
              type="button"
              className="te-tour-swipe__arrow te-button te-button--icon"
              aria-label="Next tour"
              aria-controls={listId}
              aria-disabled={active === tours.length - 1}
              onClick={() => active < tours.length - 1 && goTo(active + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <div className="te-tour-swipe__dots" aria-hidden="true">
              {tours.map((tour, index) => (
                <button
                  key={tour.id}
                  type="button"
                  tabIndex={-1}
                  className="te-tour-swipe__dot"
                  data-active={index === active || undefined}
                  title={tour.title}
                  // A tap shouldn't leave focus inside the hidden group.
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
          </div>
        )}
      </div>
    </section>
  );
};
