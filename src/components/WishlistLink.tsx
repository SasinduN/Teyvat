import { Heart } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useWishlist } from '@/lib/wishlist';
import { paths } from '@shared/site-paths';
import { SiteLink } from './SiteLink';

/** The header's wishlist: a heart, filled once something is saved, and a count ("9+" above 9). Not shown where the browser blocks storage. */
export function WishlistIcon({ className = '', onClick }: { className?: string; onClick?: () => void }) {
  const { available, items } = useWishlist();
  const { pathname } = useLocation();
  if (!available) return null;
  const label = items.length === 0 ? 'Wishlist, nothing saved' : `Wishlist, ${items.length} saved`;
  return (
    <SiteLink
      to={paths.wishlist}
      onClick={onClick}
      className={`te-button te-button--icon te-wish-icon ${className}`}
      aria-label={label}
      aria-current={pathname === paths.wishlist ? 'page' : undefined}
      title="Wishlist"
      data-wishlist-icon
    >
      <Heart className="w-5 h-5" aria-hidden="true" />
      {items.length > 0 && <span className="te-wish-count" aria-hidden="true">{items.length > 9 ? '9+' : items.length}</span>}
    </SiteLink>
  );
}

/** A plain text link to the wishlist, for /plan, /explore and the destination pages. */
export function WishlistTextLink({ text }: { text: string }) {
  const { available } = useWishlist();
  if (!available) return null;
  return <SiteLink to={paths.wishlist} className="te-ed-link" data-wishlist-link>{text}</SiteLink>;
}
