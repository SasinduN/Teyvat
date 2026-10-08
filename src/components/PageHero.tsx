import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  /** Left out for the current page. */
  to?: string;
}

interface PageHeroProps {
  image?: string;
  crumbs: Crumb[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Small badges above the eyebrow (rating, region, days, price). */
  chips?: React.ReactNode;
  /** Shorter, for the list pages and About. */
  compact?: boolean;
}

/**
 * The header of every page but the home page: a full-bleed photo under the
 * fixed Navbar, a breadcrumb, and the page's one `<h1>`. The dark gradient
 * keeps the Navbar's white links readable.
 */
export const PageHero: React.FC<PageHeroProps> = ({ image, crumbs, eyebrow, title, subtitle, chips, compact }) => (
  <section
    className={`relative w-full overflow-hidden bg-[#0F2E23] ${
      compact ? 'h-[46vh] min-h-[380px]' : 'h-[68vh] min-h-[480px] sm:min-h-[560px]'
    }`}
  >
    {/* Decorative: the heading names the page. */}
    {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
    <div className="absolute inset-0 bg-gradient-to-t from-[#0F2E23] via-[#0F2E23]/45 to-black/45" />

    <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-white/70">
          {crumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />}
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-white">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-[#D4AF37]">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {chips && <div className="mb-4 flex flex-wrap items-center gap-2">{chips}</div>}
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">{eyebrow}</p>
      )}
      <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-6xl">{title}</h1>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/85 sm:text-lg">{subtitle}</p>
      )}
    </div>
  </section>
);

/** A badge in a page header: gold on green (a rating, the days), or frosted. */
export const HeroChip: React.FC<{ children: React.ReactNode; gold?: boolean }> = ({ children, gold }) => (
  <span
    className={
      gold
        ? 'flex items-center gap-1 rounded-full border border-[#D4AF37]/30 bg-[#0F2E23]/90 px-3.5 py-1 text-xs font-bold text-[#D4AF37] shadow-md'
        : 'rounded-full border border-white/20 bg-white/20 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md'
    }
  >
    {children}
  </span>
);
