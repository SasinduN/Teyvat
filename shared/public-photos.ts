import photographs from './travel-photos.json';
import legacyReferences from './legacy-photo-references.json';
import { PHOTO_CORRECTIONS } from './photo-corrections';
import optimized from './optimized-photos.json';
import { sameSeedPhoto } from './photo-assets';

/** Prefer the existing same-origin photograph when a verified variant exists. */
export function localPhoto(image: string): string {
  const variants = (optimized as Record<string, string>)[image];
  if (!variants) return image;
  const candidates = variants.split(',').map(value => value.trim().split(/\s+/));
  return (candidates.find(([, width]) => width === '1280w') ?? candidates[candidates.length - 1])[0];
}

/** The same named corrections as migration 0010, for older content payloads. */
export function publicPhoto(table: string, id: string, image: string): string {
  // Ella's primary image is a protected geographic invariant. Older DB rows
  // and admin-edited URLs have repeatedly restored a coastal photo here;
  // resolve by stable destination ID before considering any stored URL.
  if (table === 'destinations' && id === 'ella') {
    const photoKey = PHOTO_CORRECTIONS.destinations.ella;
    const photo = photographs.find(row => row.key === photoKey);
    return photo ? localPhoto(photo.image) : '/images/photo-unavailable.svg';
  }
  if (table === 'hidden_gems' && id === 'gal-oya') {
    const previous = photographs.find(photo => photo.key === 'gal-oya')!;
    const replacement = photographs.find(photo => photo.key === 'gal-oya-park')!;
    if ([previous.image, previous.original, localPhoto(previous.image)].includes(image)) return localPhoto(replacement.image);
  }
  const legacy = legacyReferences.find(row => row.table === table && row.id === id);
  if (!legacy || !sameSeedPhoto(image, legacy.image)) return localPhoto(image);
  // No licensed, identified Belilena photo is available: never show a stock landmark.
  if (table === 'hidden_gems' && id === 'belilena') return '/images/photo-unavailable.svg';
  const photo = photographs.find(row => row.key === PHOTO_CORRECTIONS[table]?.[id]);
  if (!photo) return image;
  return localPhoto(id === 'jaffna' && table === 'destinations' ? photo.original : photo.image);
}

/** Correct only the old geographic labels associated with our credited photographs. */
export function photoStoryLocation(id: string, image: string, location: string): string {
  const correction = id === 'p1' ? { before: 'Ella & Nuwara Eliya', after: 'Ella' }
    : id === 'p6' ? { before: 'Hatton Tea Valleys', after: 'Nuwara Eliya' }
    : id === 'p7' ? { before: 'Koggala & Weligama', after: 'Ahangama' } : undefined;
  if (!correction || location !== correction.before) return location;
  const legacy = legacyReferences.find(row => row.table === 'photo_stories' && row.id === id);
  const credited = photographs.find(photo => photo.key === PHOTO_CORRECTIONS.photo_stories[id]);
  return (legacy && sameSeedPhoto(image, legacy.image)) || credited?.image === image || credited?.original === image ? correction.after : location;
}

/** Only replace the exact old seeded galleries; never overwrite curated admin galleries. */
export function publicGallery(id: string, gallery: string[]): string[] {
  const legacy: Record<string, string[]> = {
    ella: [
      'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800'
    ],
    sigiriya: [
      'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800'
    ]
  };
  const before = legacy[id];
  if (!before || before.length !== gallery.length || before.some((image, index) => !sameSeedPhoto(gallery[index], image))) return gallery;
  return (id === 'ella' ? ['ella', 'train'] : ['sigiriya']).map(key => localPhoto(photographs.find(row => row.key === key)!.image));
}

/** Correct inaccurate scene captions only while the known photo and original copy match. */
export function photoStoryCopy(id: string, image: string, title: string, caption: string): { title: string; caption: string } {
  const legacy = legacyReferences.find(row => row.table === 'photo_stories' && row.id === id);
  const photo = photographs.find(row => row.key === PHOTO_CORRECTIONS.photo_stories[id]);
  if (!photo || !(legacy && sameSeedPhoto(image, legacy.image) || [photo.image, photo.original, localPhoto(photo.image)].includes(image))) return { title, caption };
  const corrections: Record<string, { beforeTitle?: string; title?: string; beforeCaption?: string; caption?: string }> = {
    p1: { beforeTitle: 'Highland Mist & Blue Trains', title: 'Nine Arch Bridge in Ella', beforeCaption: 'The legendary highland express winding across mountain viaducts through morning fog.', caption: 'Nine Arch Bridge framed by forested hills in Ella.' },
    p2: { beforeCaption: 'An ancient granite palace fortress rising 200m above the jungle canopy at sunrise.', caption: 'Sigiriya Rock Fortress rising above the surrounding forest.' },
    p3: { beforeCaption: 'Swaying coconut palms against fiery amber and magenta ocean skies.', caption: 'Sunset over the coastline of Mirissa.' },
    p4: { beforeCaption: 'A Sri Lankan leopard resting upon a sun-warmed granite outcrop in Yala.', caption: 'A Sri Lankan leopard walking through the forest in Yala National Park.' },
    p5: { beforeTitle: 'Colonial Ramparts at Dusk', title: 'Galle Fort Lighthouse', beforeCaption: 'Waves crashing against 17th-century Dutch stone bastions as dusk settles.', caption: 'An aerial view of Galle Fort lighthouse and the coastal ramparts.' },
    p7: { beforeTitle: 'Stilt Fishermen at Dawn', title: 'Stilt Fishermen of Ahangama' },
    p8: { beforeTitle: 'Northern Temple Glow', title: 'Nallur Kovil in Jaffna', beforeCaption: 'Golden gopurams of Nallur Kovil lit during evening incense rituals.', caption: 'Temple towers and courtyard at Nallur Kovil in Jaffna.' }
  };
  const correction = corrections[id];
  return { title: correction?.beforeTitle === title ? correction.title! : title,
    caption: correction?.beforeCaption === caption ? correction.caption! : caption };
}
