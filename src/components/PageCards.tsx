import { TravelImage } from '@/components/TravelImage';
import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Info, MapPin, Star, X } from 'lucide-react';
import { paths } from '@shared/site-paths';
import type { Article, Destination, ExperienceItem, TourPackage } from '@/types';

/** A section heading on the new pages: the home page's badge-and-title style. */
export const SectionHead: React.FC<{ eyebrow: string; title: string; text?: string }> = ({ eyebrow, title, text }) => (
  <div className="te-section-header">
    <div>
      <span className="mb-3 inline-block rounded-full bg-[var(--brand-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
        {eyebrow}
      </span>
      <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">{title}</h2>
    </div>
    {text && <p className="mt-4 max-w-md text-sm font-light text-[var(--text-primary)]/70 md:mt-0">{text}</p>}
  </div>
);

/**
 * A destination card. The spotlight (the default) is one link to the page,
 * its caption on dark glass; the gallery (/destinations) is the photo-first
 * card that reveals its description and link (DestinationRevealCard).
 */
export const DestinationCard: React.FC<{ dest: Destination; variant?: 'spotlight' | 'gallery' }> = ({ dest, variant }) =>
  variant === 'gallery' ? <DestinationRevealCard dest={dest} /> : <DestinationSpotlightCard dest={dest} />;

/**
 * Photo first: the rating, region and name over the photo. The description
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
        event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus();
        setExpanded(false);
        setHovered(false);
        event.stopPropagation();
      }}
    >
      <TravelImage src={dest.image} alt={dest.name} sizes={sizes} loading="lazy" decoding="async" className="destination-card__image" />
      <span className="destination-card__rating" aria-label={`Rating ${dest.rating} out of 5`}>
        <Star size={14} aria-hidden="true" /> {dest.rating}
      </span>
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

const DestinationSpotlightCard: React.FC<{ dest: Destination }> = ({ dest }) => (
  <Link
    to={paths.destination(dest.id)}
    className="te-card te-content-card te-content-card--photo group relative flex h-[360px] flex-col justify-end overflow-hidden bg-[var(--inverse-surface)]"
  >
    <TravelImage
      src={dest.image}
      alt={dest.name}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[var(--inverse-surface)] via-[var(--inverse-surface)]/60 via-45% to-transparent" />
    <div className="te-card-badge te-card-badge--photo absolute left-4 top-4">
      <Star className="h-3.5 w-3.5 fill-[var(--accent)]" aria-hidden="true" /> {dest.rating}
    </div>
    <div className="glass glass--inverse glass--card glass--3d te-destination-caption relative z-10 m-3 space-y-2 p-5">
      <p className="te-card-accent text-[10px] font-semibold uppercase tracking-widest">{dest.region} Region</p>
      <h3 className="te-card-title font-heading text-2xl font-bold">{dest.name}</h3>
      <p className="te-card-description line-clamp-2 text-xs">{dest.shortDescription}</p>
      <span className="te-card-action flex items-center gap-1 pt-1 text-xs font-bold">
        Explore {dest.name} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </div>
  </Link>
);

export const TourCard: React.FC<{ tour: TourPackage }> = ({ tour }) => (
  <Link
    to={paths.tour(tour.id)}
    className="te-card te-content-card group flex flex-col overflow-hidden"
  >
    <div className="te-card-photo relative h-48 overflow-hidden">
      <TravelImage src={tour.image} alt={tour.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/70 via-40% to-transparent to-75%" />
      <div className="te-card-badge te-card-badge--photo absolute left-4 top-4">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{tour.days} Days</span>
      </div>
      <h3 className="te-card-title absolute bottom-4 left-4 right-4 font-heading text-xl font-bold">{tour.title}</h3>
    </div>
    <div className="flex items-center justify-between gap-3 p-5 text-xs">
      <span className="te-card-meta">
        From <strong className="text-[var(--text-primary)]">${tour.priceFrom}</strong>
      </span>
      <span className="te-card-action flex items-center gap-1 font-bold">
        View journey <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </div>
  </Link>
);

export const ExperienceCard: React.FC<{ item: ExperienceItem }> = ({ item }) => (
  <Link
    to={paths.experience(item.id)}
    className="te-card te-content-card group flex flex-col overflow-hidden"
  >
    <div className="relative h-48 overflow-hidden">
      <TravelImage src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
      <div className="te-card-badge te-card-badge--photo absolute left-4 top-4">
        <Star className="h-3.5 w-3.5 fill-[var(--accent)]" aria-hidden="true" />
        <span>{item.rating}</span>
      </div>
    </div>
    <div className="space-y-2 p-5">
      <div className="te-card-meta flex flex-wrap items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-[var(--accent-text)]" aria-hidden="true" />
        {item.location}
        <span className="text-[var(--text-primary)]/30" aria-hidden="true">•</span>
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {item.duration}
      </div>
      <h3 className="te-card-title font-heading text-xl font-bold">{item.title}</h3>
    </div>
  </Link>
);

export const ArticleCard: React.FC<{ art: Article }> = ({ art }) => (
  <Link
    to={paths.article(art.id)}
    className="te-card group flex flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)]/40 bg-[var(--surface)] shadow-md transition-shadow duration-300 hover:shadow-xl"
  >
    <div className="relative h-48 overflow-hidden">
      <TravelImage src={art.image} alt={art.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
      <div className="absolute left-4 top-4 rounded-full bg-[var(--inverse-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] shadow-md">
        {art.category}
      </div>
    </div>
    <div className="space-y-2 p-5">
      <p className="text-xs text-[var(--text-secondary)]">
        {art.date} • {art.readTime}
      </p>
      <h3 className="font-heading text-lg font-bold leading-snug text-[var(--brand-primary)]">{art.title}</h3>
    </div>
  </Link>
);
