import photographs from './travel-photos.json';
import optimized from './optimized-photos.json';

/** One photograph's files, by width. From `media` once it is in R2 (`npm run images:migrate-assets`). */
export interface PhotoVariant {
  width: number;
  url: string;
}
export type PhotoSets = Readonly<Record<string, readonly PhotoVariant[]>>;

/** The width only a full-width hero may ask for. */
export const FULL_WIDTH = 1920;
/** A set's main file: what `src` and the rows hold. */
export const PRIMARY_WIDTH = 1280;
/** Their 1920 px files were upscaled from smaller sources, so they are never offered. */
export const UPSCALED_AT_FULL_WIDTH: ReadonlySet<string> = new Set(['jaffna', 'udawalawe']);

/** The widths worth offering, narrowest first. */
export function usableVariants(key: string, variants: readonly PhotoVariant[]): PhotoVariant[] {
  return variants
    .filter(v => !(v.width === FULL_WIDTH && UPSCALED_AT_FULL_WIDTH.has(key)))
    .sort((a, b) => a.width - b.width);
}

const toSrcSet = (variants: readonly PhotoVariant[]) => variants.map(v => `${v.url} ${v.width}w`).join(', ');

/** The files a `srcset` string lists. */
const parseSrcSet = (srcSet: string): PhotoVariant[] => srcSet.split(',').map(candidate => {
  const [url, width] = candidate.trim().split(/\s+/);
  return { url, width: parseInt(width, 10) };
});

/** Every file in public/assets/ for a photograph, as `/assets/…` paths; the upscaled widths too. */
export function committedVariants(image: string): PhotoVariant[] {
  const srcSet = (optimized as Record<string, string>)[image];
  return srcSet ? parseSrcSet(srcSet) : [];
}

interface PhotoAsset {
  key: string;
  alt: string;
  position: string;
  srcSet?: string;
}

/** URL aliases describe the same photograph; names never select an unrelated fallback. */
const assets = new Map<string, PhotoAsset>();
for (const photo of photographs) {
  const variants = committedVariants(photo.image);
  const usable = usableVariants(photo.key, variants);
  const metadata: PhotoAsset = { key: photo.key, alt: photo.alt, position: photo.position, srcSet: usable.length ? toSrcSet(usable) : undefined };
  for (const src of [photo.image, photo.original, ...variants.map(v => v.url)]) assets.set(src, metadata);
}
export const photoAsset = (src: string) => assets.get(src);

/**
 * Teaches this page the R2 URLs from `GET /api/content`, so `photoAsset` knows
 * them as it knows the committed paths. Both keep working: nothing breaks while
 * rows still hold the old URLs.
 */
export function registerPhotoSets(sets: PhotoSets = {}): void {
  for (const [key, variants] of Object.entries(sets)) {
    const photo = photographs.find(row => row.key === key);
    if (!photo) continue;
    const metadata: PhotoAsset = { key, alt: photo.alt, position: photo.position, srcSet: toSrcSet(usableVariants(key, variants)) };
    for (const { url } of variants) assets.set(url, metadata);
  }
}

/** A srcset without its 1920 px candidate: for everything but a full-width hero. */
export function withoutFullWidth(srcSet: string | undefined): string | undefined {
  return srcSet && toSrcSet(parseSrcSet(srcSet).filter(v => v.width !== FULL_WIDTH));
}

/** A URL's full srcset, whichever kind of URL it is. For the server, which has `sets` to hand. */
export function fullSrcSet(src: string, sets: PhotoSets): string | undefined {
  for (const [key, variants] of Object.entries(sets)) {
    if (variants.some(v => v.url === src)) return toSrcSet(usableVariants(key, variants));
  }
  return photoAsset(src)?.srcSet;
}

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
