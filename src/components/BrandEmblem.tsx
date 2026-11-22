import React from 'react';
import { EMBLEM } from '@shared/brand-files';

/**
 * The client's emblem (the sun, Sigiriya and the elephant), from public/brand/
 * (`npm run brand:assets`, docs/plans/brand-themes.md): WebP at 1x to 3x, a PNG
 * fallback. Decorative: wherever it appears the brand's name is beside it, or the
 * page says what it is, so its alt is empty and nothing is read twice.
 *
 * On a dark ground it gets a soft ivory circle behind it (`.te-emblem--backed`,
 * index.css), so the maroon ground line and palms don't vanish into the background.
 */
export const BrandEmblem: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`te-emblem ${className}`} aria-hidden="true">
    <picture>
      <source type="image/webp" srcSet={EMBLEM.webp} />
      <img src={EMBLEM.png} srcSet={EMBLEM.pngSet} width={EMBLEM.width} height={EMBLEM.height} alt="" decoding="async" />
    </picture>
  </span>
);
