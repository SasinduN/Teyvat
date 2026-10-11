import type { Destination } from '@/types';
import { DestinationRevealCard } from './PageCards';

/** The home page's destination card: the photo-first card, a little shorter (home-destinations.css). */
export function HomeDestinationCard({ destination }: { destination: Destination }) {
  return <DestinationRevealCard dest={destination} home sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" />;
}
