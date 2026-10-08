import { publicPhoto } from '@shared/public-photos';

/** Older databases can still serve the seed photo; preserve any admin replacement. */
export function destinationPhoto(id: string, image: string): string {
  return publicPhoto('destinations', id, image);
}
