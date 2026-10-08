import optimized from './optimized-photos.json';
import photographs from './travel-photos.json';

/** Preserve the photograph and crop while requesting only the required pixels. */
export function responsiveImage(src: string): string | undefined {
  const local = (optimized as Record<string, string>)[src];
  if (local) return local;
  try {
    const credited = photographs.find(photo => photo.original === src);
    const url = new URL(credited?.image ?? src);
    if (url.hostname === 'images.unsplash.com') {
      return [480, 768, 1280, 1920].map(width => {
        const variant = new URL(url);
        variant.searchParams.set('w', String(width));
        variant.searchParams.set('auto', 'format');
        variant.searchParams.set('q', '80');
        return `${variant} ${width}w`;
      }).join(', ');
    }
    if (url.hostname === 'upload.wikimedia.org' && /\/commons\/thumb\//.test(url.pathname)) {
      const match = url.pathname.match(/\/1280px-([^/]+)$/);
      if (match) return [480, 768, 1280].map(width => {
        const variant = new URL(url);
        variant.pathname = url.pathname.replace(/\/1280px-[^/]+$/, `/${width}px-${match[1]}`);
        return `${variant} ${width}w`;
      }).join(', ');
    }
  } catch { /* Local assets and unsupported hosts retain their source. */ }
  return undefined;
}
