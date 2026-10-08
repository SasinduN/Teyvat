import photographs from './travel-photos.json';
import legacyReferences from './legacy-photo-references.json';
import { PHOTO_CORRECTIONS } from './photo-corrections';

/** The same named corrections as migration 0010, for older content payloads. */
export function publicPhoto(table: string, id: string, image: string): string {
  const legacy = legacyReferences.find(row => row.table === table && row.id === id);
  if (!legacy || legacy.image !== image) return image;
  const photo = photographs.find(row => row.key === PHOTO_CORRECTIONS[table]?.[id]);
  if (!photo) return image;
  return id === 'jaffna' && table === 'destinations' ? photo.original : photo.image;
}

/** Correct only the old geographic labels associated with our credited photographs. */
export function photoStoryLocation(id: string, image: string, location: string): string {
  const correction = id === 'p6' ? { before: 'Hatton Tea Valleys', after: 'Nuwara Eliya' }
    : id === 'p7' ? { before: 'Koggala & Weligama', after: 'Ahangama' } : undefined;
  if (!correction || location !== correction.before) return location;
  const legacy = legacyReferences.find(row => row.table === 'photo_stories' && row.id === id);
  const credited = photographs.find(photo => photo.key === PHOTO_CORRECTIONS.photo_stories[id]);
  return legacy?.image === image || credited?.image === image || credited?.original === image ? correction.after : location;
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
  if (!before || before.length !== gallery.length || before.some((image, index) => image !== gallery[index])) return gallery;
  return (id === 'ella' ? ['ella', 'train'] : ['sigiriya']).map(key => photographs.find(row => row.key === key)!.image);
}
