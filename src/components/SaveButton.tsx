import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

import { useWishlist } from '@/lib/wishlist';
import { WISHLIST_MAX, type WishlistKind } from '@shared/wishlist';

interface SaveButtonProps {
  kind: WishlistKind;
  id: string;
  /** What is being saved, for screen readers: "Save Ella". */
  name: string;
}

/**
 * "Save" / "Saved", on a card or a detail page. A button beside a card's link, never
 * inside it. It renders nothing where the browser blocks storage. A solid fill, so it
 * holds AA over any photo.
 */
export function SaveButton({ kind, id, name }: SaveButtonProps) {
  const { available, isSaved, toggle } = useWishlist();
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const timer = setTimeout(() => setFull(false), 6000);
    return () => clearTimeout(timer);
  }, [full]);

  if (!available) return null;
  const saved = isSaved({ kind, id });

  return (
    <span className="te-save-wrap">
      <button
        type="button"
        className="te-save"
        aria-pressed={saved}
        aria-label={`${saved ? 'Saved' : 'Save'} ${name}`}
        data-save={`${kind}:${id}`}
        onClick={() => setFull(toggle({ kind, id }) === 'full')}
      >
        <Heart aria-hidden="true" />
        <span>{saved ? 'Saved' : 'Save'}</span>
      </button>
      {/* Always there, so a screen reader announces it when it fills. */}
      <span role="status" className="te-save__note">
        {full ? `You've saved ${WISHLIST_MAX}. Remove one to add this.` : ''}
      </span>
    </span>
  );
}
