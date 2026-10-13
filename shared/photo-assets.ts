import photographs from './travel-photos.json';
import optimized from './optimized-photos.json';

/** URL aliases describe the same photograph; names never select an unrelated fallback. */
const assets = new Map<string, { alt: string; position: string; srcSet?: string }>();
for (const photo of photographs) {
  const srcSet = (optimized as Record<string, string>)[photo.image];
  const metadata = { alt: photo.alt, position: photo.position, srcSet };
  for (const src of [photo.image, photo.original, ...(srcSet?.split(',').map(candidate => candidate.trim().split(/\s+/)[0]) ?? [])]) assets.set(src, metadata);
}
export const photoAsset = (src: string) => assets.get(src);

/** Match only a known seed photo, including resized/reordered Unsplash parameters. */
export function sameSeedPhoto(image: string, seed: string): boolean {
  if (image === seed) return true;
  try {
    const actual = new URL(image), previous = new URL(seed);
    return actual.protocol === 'https:' && previous.protocol === 'https:'
      && actual.hostname === 'images.unsplash.com' && actual.hostname === previous.hostname
      && actual.pathname === previous.pathname;
  } catch { return false; }
}
