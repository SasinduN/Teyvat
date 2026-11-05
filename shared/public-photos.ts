import photographs from './travel-photos.json';
import legacyReferences from './legacy-photo-references.json';
import { PHOTO_CORRECTIONS } from './photo-corrections';
import { photoAsset, PRIMARY_WIDTH, sameSeedPhoto, type PhotoSets } from './photo-assets';

const PHOTO_UNAVAILABLE = '/images/photo-unavailable.svg';

/** A photo's main file in R2, if it has one. */
function primaryFile(sets: PhotoSets, key: string | undefined): string | undefined {
  return key ? sets[key]?.find(variant => variant.width === PRIMARY_WIDTH)?.url : undefined;
}

/**
 * The photo rules for one request. `sets` is what `media` holds. A photo in it
 * resolves to its R2 file. One that isn't, as in a local or CI database with no
 * R2 rows, shows what the row stores, or the placeholder if the row stores nothing.
 */
export function photoResolver(sets: PhotoSets = {}) {

/** A known photograph's R2 file; any other URL stays as it is. */
function resolvedPhoto(image: string): string {
  return primaryFile(sets, photoAsset(image)?.key) ?? image;
}

/** The verified photo a row is pinned or corrected to, while it is in R2. */
const verifiedPhoto = (key: string | undefined, stored: string) => primaryFile(sets, key) ?? (stored || PHOTO_UNAVAILABLE);

/** Verified destination covers, plus guarded corrections for older content payloads. */
function publicPhoto(table: string, id: string, image: string): string {
  // The owner requires each existing destination cover to show its named place.
  // Resolve by stable ID even when a CMS URL is not a recognizable seed photo.
  // Newly added destinations and curated galleries retain their stored images.
  if (table === 'destinations' && Object.prototype.hasOwnProperty.call(PHOTO_CORRECTIONS.destinations, id)) {
    return verifiedPhoto(PHOTO_CORRECTIONS.destinations[id], image);
  }
  if (table === 'hidden_gems' && id === 'gal-oya') {
    const previous = photographs.find(photo => photo.key === 'gal-oya')!;
    if ([previous.image, previous.original].includes(image)) return verifiedPhoto('gal-oya-park', image);
  }
  const legacy = legacyReferences.find(row => row.table === table && row.id === id);
  if (!legacy || !sameSeedPhoto(image, legacy.image)) return resolvedPhoto(image) || PHOTO_UNAVAILABLE;
  // No licensed, identified Belilena photo is available: never show a stock landmark.
  if (table === 'hidden_gems' && id === 'belilena') return PHOTO_UNAVAILABLE;
  return verifiedPhoto(PHOTO_CORRECTIONS[table]?.[id], image);
}

/** Correct only the old geographic labels associated with our credited photographs. */
function photoStoryLocation(id: string, image: string, location: string): string {
  const correction = id === 'p1' ? { before: 'Ella & Nuwara Eliya', after: 'Ella' }
    : id === 'p6' ? { before: 'Hatton Tea Valleys', after: 'Nuwara Eliya' }
    : id === 'p7' ? { before: 'Koggala & Weligama', after: 'Ahangama' } : undefined;
  if (!correction || location !== correction.before) return location;
  const legacy = legacyReferences.find(row => row.table === 'photo_stories' && row.id === id);
  const credited = photographs.find(photo => photo.key === PHOTO_CORRECTIONS.photo_stories[id]);
  return (legacy && sameSeedPhoto(image, legacy.image)) || credited?.image === image || credited?.original === image || (credited && resolvedPhoto(credited.image) === image) ? correction.after : location;
}

/** Only replace the exact old seeded galleries; never overwrite curated admin galleries. */
function publicGallery(id: string, gallery: string[]): string[] {
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
  const files = (id === 'ella' ? ['ella', 'train'] : ['sigiriya']).map(key => primaryFile(sets, key));
  return files.every(file => file !== undefined) ? files as string[] : gallery;
}

/** Correct inaccurate scene captions only while the known photo and original copy match. */
function photoStoryCopy(id: string, image: string, title: string, caption: string): { title: string; caption: string } {
  const legacy = legacyReferences.find(row => row.table === 'photo_stories' && row.id === id);
  const photo = photographs.find(row => row.key === PHOTO_CORRECTIONS.photo_stories[id]);
  if (!photo || !(legacy && sameSeedPhoto(image, legacy.image) || [photo.image, photo.original, resolvedPhoto(photo.image)].includes(image))) return { title, caption };
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

return { resolvedPhoto, publicPhoto, publicGallery, photoStoryLocation, photoStoryCopy };
}
