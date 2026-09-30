/**
 * What kind of image a file really is, from its first bytes.
 *
 * Used by the server to decide what it will store (the filename and the
 * request's Content-Type are never consulted) and by the admin page to say
 * something useful before uploading. The two can't disagree, because they are
 * the same function.
 */

/** The types R2 may hold. */
export const STORED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export type StoredImageType = (typeof STORED_IMAGE_TYPES)[number];

export const EXTENSION_BY_TYPE: Record<StoredImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};

export type SniffResult =
  | { kind: 'image'; type: StoredImageType }
  /** A phone photo. The browser may be able to decode and re-encode it; the server never stores it. */
  | { kind: 'heic' }
  /** Refused everywhere: SVG can carry scripts. */
  | { kind: 'svg' }
  | { kind: 'unknown' };

/** How many leading bytes `sniffImage` needs. */
export const SNIFF_BYTES = 512;

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  signature.every((b, i) => bytes[offset + i] === b);

const AVIF_BRANDS = new Set(['avif', 'avis']);
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
/** Generic HEIF brands: HEIC unless an AVIF brand is also present. */
const HEIF_BRANDS = new Set(['mif1', 'msf1']);

/**
 * The `ftyp` box's major and compatible brands. The box's own size bounds how
 * far this reads, so a malformed size can't send it past the buffer.
 */
function ftypBrands(bytes: Uint8Array): string[] | null {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== 'ftyp') return null;
  const size = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const end = Math.min(size >>> 0, bytes.length);
  const brands = [ascii(bytes, 8, 4)];
  for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(ascii(bytes, offset, 4));
  return brands;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, SNIFF_BYTES));
  text = text.replace(/^﻿/, '').trimStart().toLowerCase();
  return text.startsWith('<svg') || text.startsWith('<?xml') || /^<!doctype svg/.test(text);
}

export function sniffImage(bytes: Uint8Array): SniffResult {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { kind: 'image', type: 'image/jpeg' };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'image', type: 'image/png' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return { kind: 'image', type: 'image/webp' };
  }

  const brands = ftypBrands(bytes);
  if (brands) {
    if (brands.some((b) => AVIF_BRANDS.has(b))) return { kind: 'image', type: 'image/avif' };
    if (brands.some((b) => HEIC_BRANDS.has(b) || HEIF_BRANDS.has(b))) return { kind: 'heic' };
    return { kind: 'unknown' };
  }

  if (looksLikeSvg(bytes)) return { kind: 'svg' };
  return { kind: 'unknown' };
}

export const SVG_REFUSED = 'SVG isn’t accepted, because it can carry scripts. Use JPEG, PNG, WebP or AVIF.';
export const TYPE_REFUSED = 'Only JPEG, PNG, WebP and AVIF images are accepted.';
