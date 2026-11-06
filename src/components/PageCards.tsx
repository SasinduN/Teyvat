import { TravelImage } from '@/components/TravelImage';
import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, X } from 'lucide-react';
import { paths } from '@shared/site-paths';
import type { WishlistKind } from '@shared/wishlist';
import { SaveButton } from './SaveButton';
import type { Article, Destination, ExperienceItem, TourPackage } from '@/types';

/** A section heading: the heading and, if it needs one, a line under it. */
export const SectionHead: React.FC<{ title: string; text?: string }> = ({ title, text }) => (
  <div className="te-section-header te-ed-head">
    <h2 className="te-ed-title font-heading">{title}</h2>
    {text && <p>{text}</p>}
  </div>
);

/** A card with a Save button over its photo: a sibling of the link, because a link can't hold a button. */
const Saveable: React.FC<{ kind: WishlistKind; id: string; name: string; saveable: boolean; children: React.ReactElement }> = ({ kind, id, name, saveable, children }) =>
  saveable ? (
    <div className="te-save-card">
      {children}
      <SaveButton kind={kind} id={id} name={name} />
    </div>
  ) : children;

/**
 * A destination card. The spotlight (the default) is one link to the page, its
 * caption under the photo; the gallery (/destinations) is the photo-first card
 * that reveals its description and link (DestinationRevealCard).
 */
export const DestinationCard: React.FC<{ dest: Destination; variant?: 'spotlight' | 'gallery'; saveable?: boolean }> = ({ dest, variant, saveable = true }) =>
  variant === 'gallery' ? <DestinationRevealCard dest={dest} /> : <DestinationSpotlightCard dest={dest} saveable={saveable} />;

/**
 * Photo first: the region and name over the photo. The description
 * and the link to the page slide up while a pointer is over the card, while
 * keyboard focus is in it, or after the info button (touch); Escape hides
 * them again. Hidden, they're inert, so Tab skips them.
 */
export function DestinationRevealCard({ dest, home, sizes }: { dest: Destination; home?: boolean; sizes?: string }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const revealed = expanded || hovered;
  return (
    <article
      className={`destination-card${home ? ' destination-card--home' : ''}`}
      aria-labelledby={`${id}-title`}
      data-revealed={revealed}
      onMouseEnter={() => { if (matchMedia('(hover: hover) and (pointer: fine)').matches) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.target.matches(':focus-visible')) setExpanded(true);
      }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false); }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.currentTarget.querySelector<HTMLButtonElement>('.destination-card__toggle')?.focus();
        setExpanded(false);
        setHovered(false);
        event.stopPropagation();
      }}
    >
      <TravelImage src={dest.image} alt={dest.name} sizes={sizes} loading="lazy" decoding="async" className="destination-card__image" />
      <button
        type="button"
        className="destination-card__toggle"
        aria-expanded={revealed}
        aria-controls={`${id}-details`}
        aria-label={`${revealed ? 'Hide' : 'Show'} information about ${dest.name}`}
        onClick={() => { setExpanded(!revealed); setHovered(false); }}
      >
        {revealed ? <X size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
      </button>
      <SaveButton kind="destination" id={dest.id} name={dest.name} />
      <div className="destination-card__content">
        <p className="destination-card__region">{dest.region} Region</p>
        <h3 id={`${id}-title`} className="destination-card__title font-heading">{dest.name}</h3>
        <div id={`${id}-details`} className="destination-card__reveal" inert={!revealed} aria-hidden={!revealed}>
          <div className="destination-card__reveal-inner">
            <div className="destination-card__details" tabIndex={revealed ? 0 : -1} role="region" aria-label={`About ${dest.name}`}>
              <p className="destination-card__description">{dest.shortDescription}</p>
              <Link to={paths.destination(dest.id)} className="destination-card__explore">
                Explore {dest.name} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

const DestinationSpotlightCard: React.FC<{ dest: Destination; saveable: boolean }> = ({ dest, saveable }) => (
  <Saveable kind="destination" id={dest.id} name={dest.name} saveable={saveable}>
    <Link to={paths.destination(dest.id)} className="te-card te-ed-card">
      <div className="te-ed-photo">
        <TravelImage src={dest.image} alt={dest.name} sizes="(min-width: 768px) 33vw, 100vw" />
      </div>
      <div className="te-ed-card__body">
        <p className="te-ed-label">{dest.region} region</p>
        <h3 className="te-ed-card__title font-heading">{dest.name}</h3>
        <p className="te-ed-card__text">{dest.shortDescription}</p>
      </div>
    </Link>
  </Saveable>
);

export const TourCard: React.FC<{ tour: TourPackage; saveable?: boolean }> = ({ tour, saveable = true }) => (
  <Saveable kind="tour" id={tour.id} name={tour.title} saveable={saveable}>
    <Link to={paths.tour(tour.id)} className="te-card te-ed-card">
      <div className="te-ed-photo">
        <TravelImage src={tour.image} alt={tour.title} sizes="(min-width: 768px) 33vw, 100vw" />
      </div>
      <div className="te-ed-card__body">
        <h3 className="te-ed-card__title font-heading">{tour.title}</h3>
        <p className="te-ed-meta mt-1">{tour.days} days, from ${tour.priceFrom}</p>
      </div>
    </Link>
  </Saveable>
);

export const ExperienceCard: React.FC<{ item: ExperienceItem; saveable?: boolean }> = ({ item, saveable = true }) => (
  <Saveable kind="experience" id={item.id} name={item.title} saveable={saveable}>
    <Link to={paths.experience(item.id)} className="te-card te-ed-card">
      <div className="te-ed-photo">
        <TravelImage src={item.image} alt={item.title} sizes="(min-width: 768px) 33vw, 100vw" />
      </div>
      <div className="te-ed-card__body">
        <p className="te-ed-label">{item.location}</p>
        <h3 className="te-ed-card__title font-heading">{item.title}</h3>
        <p className="te-ed-meta mt-1">{item.duration}</p>
      </div>
    </Link>
  </Saveable>
);

export const ArticleCard: React.FC<{ art: Article }> = ({ art }) => (
  <Link to={paths.article(art.id)} className="te-card te-ed-card">
    <div className="te-ed-photo">
      <TravelImage src={art.image} alt={art.title} sizes="(min-width: 768px) 33vw, 100vw" />
    </div>
    <div className="te-ed-card__body">
      <p className="te-ed-label">{art.category}</p>
      <h3 className="te-ed-card__title font-heading">{art.title}</h3>
      <p className="te-ed-meta mt-1">{art.date}. {art.readTime}.</p>
    </div>
  </Link>
);
