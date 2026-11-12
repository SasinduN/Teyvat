import React from 'react';
import { wordmarkLines } from '@shared/brand';
import { useBrand } from '@/hooks/useSiteContent';

interface LogoProps {
  /** `light`: on a dark background (the footer). `dark`: on a light one. `auto`: follows the header's colour. */
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * The brand's logo, from `shared/brand.ts`. With the two SVG files set
 * (`BRAND_ASSETS.logo`), the one for this background; otherwise the wordmark:
 * the short name large ("SERENDIB LUXE") and the rest small underneath
 * ("TOURS"), in DM Sans. The large line takes the colour the header or footer
 * gives it; the small one is `--logo-accent`, a gold chosen per background
 * for AA (index.css). Both follow a name saved in Admin → Settings.
 *
 * The name is real text (or the image's alt), so a link around it is named by it,
 * the full name. Capitals are CSS, so screen readers read words, not letters.
 */
export const Logo: React.FC<LogoProps> = ({ variant = 'auto', className = '', size = 'md' }) => {
  const siteBrand = useBrand();
  const sizeClasses = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };
  const { onLight, onDark } = siteBrand.logo;

  if (onLight && onDark) {
    return (
      <span className={`te-logo te-logo--image inline-flex items-center select-none ${className}`} data-variant={variant} data-size={size}>
        <img src={onLight} alt={siteBrand.name} className="te-logo-file te-logo-file--on-light" />
        <img src={onDark} alt={siteBrand.name} className="te-logo-file te-logo-file--on-dark" />
      </span>
    );
  }

  const { main, sub } = wordmarkLines(siteBrand);
  const colour =
    variant === 'dark' ? 'text-[var(--brand-primary)]' : variant === 'light' ? 'text-white' : 'text-current';
  return (
    <span
      className={`te-logo te-logo--text inline-flex flex-col items-start leading-none whitespace-nowrap select-none ${className}`}
      data-variant={variant}
      data-size={size}
    >
      <span className={`te-logo-main font-heading font-bold uppercase ${sizeClasses[size]} ${colour}`}>{main}</span>
      {sub && ' '}
      {sub && <span className="te-logo-sub font-sans font-semibold uppercase">{sub}</span>}
    </span>
  );
};
