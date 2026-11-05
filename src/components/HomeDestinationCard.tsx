import type { Destination } from '@/types';
import { DestinationRevealCard } from './PageCards';

/** The home page's destination card: the photo-first card, sized by the asymmetric grid (editorial.css). */
export function HomeDestinationCard({ destination, lead }: { destination: Destination; lead?: boolean }) {
  return <DestinationRevealCard dest={destination} home sizes={lead ? '(min-width: 1024px) 58vw, 100vw' : '(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw'} />;
}
