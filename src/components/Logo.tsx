import React from 'react';
import { wordmarkLines, type Brand } from '@shared/brand';
import { useBrand } from '@/hooks/useSiteContent';
import { BrandEmblem } from '@/components/BrandEmblem';

type Variant = 'light' | 'dark' | 'auto';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface LogoMarkProps {
  brand: Pick<Brand, 'name' | 'shortName' | 'logo'>;
  /** `light`: on a dark background (the footer, the admin). `dark`: on a light one. `auto`: follows the header's colour. */
  variant?: Variant;
  className?: string;
  size?: Size;
}

/**
 * The brand's logo (docs/plans/brand-themes.md): the client's emblem beside the name
 * as live text. "SERENDIB LUXE" in the heading serif, "TOURS" small and spaced in DM
 * Sans, both in the colours the background gives them (never the artwork's maroon
 * lettering, which vanishes on dark backgrounds). The small line is `--logo-accent`,
 * a gold picked per background for AA (index.css). A name saved in Admin → Settings
 * shows here as it's saved; the emblem stays.
 *
 * With the two logo files set (`BRAND_ASSETS.logo`), the one for this background instead.
 *
 * The name is real text, so a link around it is named by it. Capitals are CSS, so
 * screen readers read words, not letters.
 */
export const LogoMark: React.FC<LogoMarkProps> = ({ brand, variant = 'auto', className = '', size = 'md' }) => {
  const { onLight, onDark } = brand.logo;
  if (onLight && onDark) {
    return (
      <span className={`te-logo te-logo--image inline-flex items-center select-none ${className}`} data-variant={variant} data-size={size}>
        <img src={onLight} alt={brand.name} className="te-logo-file te-logo-file--on-light" />
        <img src={onDark} alt={brand.name} className="te-logo-file te-logo-file--on-dark" />
      </span>
    );
  }

  const { main, sub } = wordmarkLines(brand);
  // Utilities, as before the emblem: the header's narrower rules (index.css) keep overriding them.
  const sizeClasses: Record<Size, string> = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl', xl: 'text-3xl' };
  const colour =
    variant === 'dark' ? 'text-[var(--brand-primary)]' : variant === 'light' ? 'text-white' : 'text-current';
  return (
    <span className={`te-logo te-logo--text inline-flex items-center select-none ${className}`} data-variant={variant} data-size={size}>
      <BrandEmblem className="te-logo-emblem" />
      <span className={`te-logo-words inline-flex flex-col items-start leading-none whitespace-nowrap ${colour}`}>
        <span className={`te-logo-main font-heading font-semibold uppercase ${sizeClasses[size]}`}>{main}</span>
        {sub && ' '}
        {sub && <span className="te-logo-sub font-sans font-semibold uppercase">{sub}</span>}
      </span>
    </span>
  );
};

/** The logo with the brand from `/api/content` (the public site). The admin passes its own to `LogoMark`. */
export const Logo: React.FC<Omit<LogoMarkProps, 'brand'>> = (props) => <LogoMark brand={useBrand()} {...props} />;
