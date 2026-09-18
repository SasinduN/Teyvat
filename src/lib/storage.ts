/**
 * Supabase Storage helpers for admin image uploads.
 *
 * The DB never stores a third-party URL typed by hand — the admin picks a file,
 * it lands in the public `media` bucket, and the returned public URL is what
 * gets written to the content row.
 */
import { supabase } from '@/lib/supabase';

export const MEDIA_BUCKET = 'media';

/** Mirrors `allowed_mime_types` on the bucket. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif'
] as const;

/** Mirrors `file_size_limit` on the bucket (10 MB). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',');

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif'
};

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return 'Unsupported file type. Use JPEG, PNG, WebP, AVIF or GIF.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
  }
  return null;
}

/**
 * Uploads to `media/<folder>/<timestamp>-<random>.<ext>`.
 *
 * A fresh key per upload means replacing an image never has to bust a CDN
 * cache, and an accidental re-upload cannot clobber an image another record is
 * still pointing at.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const problem = validateImage(file);
  if (problem) throw new Error(problem);

  const ext = EXTENSION_BY_TYPE[file.type] ?? 'bin';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${folder}/${unique}.${ext}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Recovers the object path from a public URL so an image can be deleted.
 * Returns null for URLs that do not live in our bucket (e.g. the original
 * Unsplash seed images), which are left untouched.
 */
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  return decodeURIComponent(url.slice(at + marker.length));
}

export function isStorageUrl(url: string): boolean {
  return storagePathFromPublicUrl(url) !== null;
}

/** Best-effort cleanup; a failed delete must not block saving a record. */
export async function deleteImageByUrl(url: string): Promise<void> {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
