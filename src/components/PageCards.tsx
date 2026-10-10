import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, MapPin, Star } from 'lucide-react';
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

/** The spotlight card, as a link to the destination's page. */
export const DestinationCard: React.FC<{ dest: Destination }> = ({ dest }) => (
  <Link
    to={paths.destination(dest.id)}
    className="te-card group relative flex h-[360px] flex-col justify-end overflow-hidden rounded-3xl border border-[var(--border-strong)]/40 bg-[var(--inverse-surface)] shadow-lg transition-shadow duration-500 hover:shadow-2xl"
  >
    <img
      src={dest.image}
      alt={dest.name}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[var(--inverse-surface)] via-[var(--inverse-surface)]/40 to-transparent" />
    <div className="glass glass--inverse absolute left-4 top-4 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-[var(--accent-text)]">
      <Star className="h-3.5 w-3.5 fill-[var(--accent)]" aria-hidden="true" /> {dest.rating}
    </div>
    <div className="glass glass--inverse te-destination-caption relative z-10 space-y-2 p-6 text-white">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent-text)]">{dest.region} Region</p>
      <h3 className="font-heading text-2xl font-bold">{dest.name}</h3>
      <p className="line-clamp-2 text-xs font-light text-white/80">{dest.shortDescription}</p>
      <span className="flex items-center gap-1 pt-1 text-xs font-bold text-[var(--accent-text)]">
        Explore {dest.name} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </div>
  </Link>
);

export const TourCard: React.FC<{ tour: TourPackage }> = ({ tour }) => (
  <Link
    to={paths.tour(tour.id)}
    className="te-card group flex flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)]/50 bg-[var(--surface)] shadow-lg transition-shadow duration-500 hover:shadow-2xl"
  >
    <div className="relative h-48 overflow-hidden">
      <img src={tour.image} alt={tour.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="glass glass--inverse absolute left-4 top-4 flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-bold text-[var(--accent-text)]">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{tour.days} Days</span>
      </div>
      <h3 className="absolute bottom-4 left-4 right-4 font-heading text-xl font-bold text-white">{tour.title}</h3>
    </div>
    <div className="flex items-center justify-between p-5 text-xs">
      <span className="text-[var(--text-primary)]/70">
        From <strong className="text-[var(--brand-primary)]">${tour.priceFrom}</strong>
      </span>
      <span className="flex items-center gap-1 font-bold text-[var(--brand-primary)]">
        View journey <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </div>
  </Link>
);

export const ExperienceCard: React.FC<{ item: ExperienceItem }> = ({ item }) => (
  <Link
    to={paths.experience(item.id)}
    className="te-card group flex flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)]/50 bg-[var(--surface)] shadow-lg transition-shadow duration-500 hover:shadow-2xl"
  >
    <div className="relative h-48 overflow-hidden">
      <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
      <div className="glass glass--inverse absolute left-4 top-4 flex items-center space-x-1 rounded-full px-3 py-1 text-xs font-bold text-[var(--accent-text)]">
        <Star className="h-3.5 w-3.5 fill-[var(--accent)]" aria-hidden="true" />
        <span>{item.rating}</span>
      </div>
    </div>
    <div className="space-y-2 p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--brand-primary)]">
        <MapPin className="h-3.5 w-3.5 text-[var(--accent-text)]" aria-hidden="true" />
        {item.location}
        <span className="text-[var(--text-primary)]/30" aria-hidden="true">•</span>
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {item.duration}
      </div>
      <h3 className="font-heading text-xl font-bold text-[var(--brand-primary)]">{item.title}</h3>
    </div>
  </Link>
);

export const ArticleCard: React.FC<{ art: Article }> = ({ art }) => (
  <Link
    to={paths.article(art.id)}
    className="te-card group flex flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)]/40 bg-[var(--surface)] shadow-md transition-shadow duration-300 hover:shadow-xl"
  >
    <div className="relative h-48 overflow-hidden">
      <img src={art.image} alt={art.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
      <div className="absolute left-4 top-4 rounded-full bg-[var(--inverse-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] shadow-md">
        {art.category}
      </div>
    </div>
    <div className="space-y-2 p-5">
      <p className="text-xs text-[var(--text-primary)]/50">
        {art.date} • {art.readTime}
      </p>
      <h3 className="font-heading text-lg font-bold leading-snug text-[var(--brand-primary)]">{art.title}</h3>
    </div>
  </Link>
);
