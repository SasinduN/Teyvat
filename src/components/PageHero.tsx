import { TravelImage } from '@/components/TravelImage';
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
 * The header of every page but the home page: a full-bleed photo below the
 * solid fixed Navbar, a breadcrumb, and the page's one `<h1>`. Text sits directly
 * over a directional gradient; badges are plain text without glass.
 */
export const PageHero: React.FC<PageHeroProps> = ({ image, crumbs, eyebrow, title, subtitle, chips, compact }) => (
  <section
    className={`te-page-hero relative w-full overflow-hidden bg-[var(--inverse-surface)] ${
      compact ? 'te-page-hero--compact' : 'te-page-hero--detail'
    }`}
  >
    {/* Decorative: the heading names the page. */}
    {image && <TravelImage loading="eager" fetchPriority="high" sizes="100vw" src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
    <div className="te-page-hero-overlay absolute inset-0" />

    <div className="te-container te-page-hero-content relative z-10">
      <div className="te-page-hero-copy">
        <nav aria-label="Breadcrumb" className="te-page-breadcrumbs mb-5">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-white/85">
            {crumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="transition-colors hover:text-white">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-[var(--accent-text)]">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {chips && <div className="mb-4 flex flex-wrap items-center gap-2">{chips}</div>}
        {eyebrow && (
          <p className="te-page-eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-text)]">{eyebrow}</p>
        )}
        <h1 className="te-page-title font-heading font-bold tracking-tight text-white">{title}</h1>
        {subtitle && (
          <p className="te-page-description mt-4 text-lg leading-relaxed text-white/85">{subtitle}</p>
        )}
      </div>
    </div>
  </section>
);

/** Readable inline metadata with no photographic diffusion or glass surface. */
export const HeroChip: React.FC<{ children: React.ReactNode; gold?: boolean }> = ({ children, gold }) => (
  <span
    className={
      gold
        ? 'te-hero-chip flex items-center gap-1 text-xs font-bold text-[var(--accent-text)]'
        : 'te-hero-chip text-xs font-semibold text-white'
    }
  >
    {children}
  </span>
);
