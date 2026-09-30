/**
 * Images in the admin panel: getting a photo ready in the browser, uploading
 * it through `/api/admin/media`, and the media library's API.
 *
 * The browser never talks to R2. It resizes and re-encodes the file, then
 * sends the bytes to our server, which checks them again and stores them.
 */
import {
  API_ROUTES,
  type ApiErrorPayload,
  type MediaItem,
  type MediaLibraryPayload,
  type MediaUsage
} from '@shared/api';
import { SNIFF_BYTES, sniffImage, SVG_REFUSED, TYPE_REFUSED } from '@shared/image-sniff';
import { MAX_CANVAS_AREA, MAX_WIDTH, targetSize } from '@shared/image-size';
import { ApiRequestError, getJson } from '@/lib/api/http';

/** What the server accepts in one upload (after resizing). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * What the browser will try to resize. Phone photos are often 12–25 MB; they
 * come out of the resize far under 10 MB.
 */
export const MAX_INPUT_BYTES = 40 * 1024 * 1024;

/** For the `accept` attribute. The bytes decide, not this. */
export const ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif';

const QUALITY = 0.85;

export const HEIC_UNREADABLE =
  'This is a HEIC photo, which this browser can’t read. Export it as JPEG first ' +
  '(on an iPhone: Settings → Camera → Formats → Most Compatible, or share the photo ' +
  'and save it as JPEG), then upload that.';

export const TOO_LARGE_TO_PROCESS =
  'This photo is too large for this browser to process. Try a smaller export, or use a desktop browser.';

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export class ImagePrepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImagePrepError';
  }
}

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  /** False only when the browser couldn't decode an AVIF and the original goes up as-is. */
  reencoded: boolean;
}

export interface PrepareOptions {
  maxWidth?: number;
  /** The canvas area limit. Tests lower it to exercise the large-photo path. */
  maxArea?: number;
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type AnyContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function encode(canvas: AnyCanvas, type: string): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality: QUALITY }).catch(() => null);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** iOS frees canvas memory only when the canvas shrinks; it counts it page-wide. */
function release(canvas: AnyCanvas): void {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * A full-size decode, then, if that runs out of memory (a 48 MP photo on a
 * phone), a decode the browser downsamples as it goes. `from-image` applies
 * the EXIF orientation to the pixels, so a portrait photo stays portrait
 * once the EXIF is gone.
 */
async function decode(file: Blob, maxWidth: number): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      return await createImageBitmap(file, {
        imageOrientation: 'from-image',
        resizeWidth: maxWidth,
        resizeQuality: 'high'
      });
    } catch {
      return null;
    }
  }
}

/**
 * iOS Safari doesn't throw when a canvas is over its memory budget: it draws
 * nothing. From a source that can't be transparent, a fully transparent
 * result means that happened.
 */
function drewNothing(ctx: AnyContext, width: number, height: number): boolean {
  const points: Array<[number, number]> = [
    [0.5, 0.5],
    [0.1, 0.1],
    [0.9, 0.1],
    [0.1, 0.9],
    [0.9, 0.9]
  ];
  return points.every(([fx, fy]) => {
    const x = Math.min(width - 1, Math.floor(width * fx));
    const y = Math.min(height - 1, Math.floor(height * fy));
    return ctx.getImageData(x, y, 1, 1).data[3] === 0;
  });
}

/**
 * Gets a file ready to upload: checks what it really is, applies its EXIF
 * rotation, scales it to at most 2000 px wide (and within the canvas area
 * iOS allows), and re-encodes it as WebP, or JPEG where WebP encoding isn't
 * available. Re-encoding drops the EXIF metadata, including any GPS location.
 *
 * Every failure is an `ImagePrepError` with a message for the admin. Nothing
 * fails silently, and nothing uploads a blank image.
 */
export async function prepareImage(file: Blob, options: PrepareOptions = {}): Promise<PreparedImage> {
  const maxWidth = options.maxWidth ?? MAX_WIDTH;
  const maxArea = options.maxArea ?? MAX_CANVAS_AREA;

  if (file.size > MAX_INPUT_BYTES) {
    throw new ImagePrepError(`That file is ${mb(file.size)}. The most this can take is ${mb(MAX_INPUT_BYTES)}.`);
  }

  const sniffed = sniffImage(new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()));
  if (sniffed.kind === 'svg') throw new ImagePrepError(SVG_REFUSED);
  if (sniffed.kind === 'unknown') throw new ImagePrepError(TYPE_REFUSED);

  const bitmap = await decode(file, maxWidth);

  if (!bitmap) {
    if (sniffed.kind === 'heic') throw new ImagePrepError(HEIC_UNREADABLE);
    // Every browser decodes JPEG, PNG and WebP, so failing on one means it
    // was too big. An AVIF may just be one this browser can't read: send it
    // as it is, and the server checks it.
    if (sniffed.type === 'image/avif' && file.size <= MAX_UPLOAD_BYTES) {
      return { blob: file, width: 0, height: 0, reencoded: false };
    }
    throw new ImagePrepError(TOO_LARGE_TO_PROCESS);
  }

  const size = targetSize({ width: bitmap.width, height: bitmap.height }, { maxWidth, maxArea });
  const canvas = makeCanvas(size.width, size.height);

  try {
    const ctx = canvas.getContext('2d') as AnyContext | null;
    if (!ctx) throw new ImagePrepError(TOO_LARGE_TO_PROCESS);

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();

    const opaqueSource = sniffed.kind === 'heic' || sniffed.type === 'image/jpeg';
    if (opaqueSource && drewNothing(ctx, size.width, size.height)) {
      throw new ImagePrepError(TOO_LARGE_TO_PROCESS);
    }

    let blob = await encode(canvas, 'image/webp');
    // A browser that can't encode WebP hands back a PNG instead of failing.
    if (!blob || blob.type !== 'image/webp') {
      // JPEG has no transparency: paint white behind what's there.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size.width, size.height);
      blob = await encode(canvas, 'image/jpeg');
    }

    if (!blob || blob.size === 0) throw new ImagePrepError(TOO_LARGE_TO_PROCESS);
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new ImagePrepError(`Even after resizing this image is ${mb(blob.size)}; the limit is 10 MB.`);
    }

    return { blob, width: size.width, height: size.height, reencoded: true };
  } finally {
    release(canvas);
  }
}

/* ----------------------------------------------------------------- upload */

function errorFrom(status: number, text: string): ApiRequestError {
  try {
    const body = JSON.parse(text) as ApiErrorPayload;
    if (typeof body.error?.message === 'string') {
      return new ApiRequestError(status, body.error.code, body.error.message, body.error.fields);
    }
  } catch {
    // Not our JSON; fall through.
  }
  return new ApiRequestError(status, 'unreachable', 'The upload failed. Please try again.');
}

/**
 * Uploads prepared bytes. `XMLHttpRequest` rather than fetch because only it
 * reports upload progress. `onProgress` gets 0..1.
 */
export function uploadImage(
  blob: Blob,
  folder: string,
  onProgress?: (fraction: number) => void
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_ROUTES.admin.media}?folder=${encodeURIComponent(folder)}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status === 201) {
        onProgress?.(1);
        resolve(JSON.parse(xhr.responseText) as MediaItem);
      } else {
        reject(errorFrom(xhr.status, xhr.responseText));
      }
    };
    xhr.onerror = () =>
      reject(new ApiRequestError(0, 'unreachable', 'The server could not be reached. Please try again.'));

    xhr.send(blob);
  });
}

/** Prepare, then upload: what every upload button does. */
export async function prepareAndUpload(
  file: File,
  folder: string,
  onProgress?: (fraction: number) => void
): Promise<MediaItem> {
  const prepared = await prepareImage(file);
  return uploadImage(prepared.blob, folder, onProgress);
}

/* ---------------------------------------------------------------- library */

export function listMedia(): Promise<MediaLibraryPayload> {
  return getJson<MediaLibraryPayload>(API_ROUTES.admin.media);
}

export type DeleteMediaResult = { deleted: true } | { deleted: false; usedBy: MediaUsage[] };

/** Without `force`, an image in use is not deleted and its users come back. */
export async function deleteMedia(id: string, force = false): Promise<DeleteMediaResult> {
  let res: Response;
  try {
    res = await fetch(`${API_ROUTES.admin.media}/${encodeURIComponent(id)}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    });
  } catch {
    throw new ApiRequestError(0, 'unreachable', 'The server could not be reached. Please try again.');
  }

  if (res.status === 204) return { deleted: true };
  const text = await res.text();
  if (res.status === 409) {
    const body = JSON.parse(text) as { usedBy?: MediaUsage[] };
    return { deleted: false, usedBy: body.usedBy ?? [] };
  }
  throw errorFrom(res.status, text);
}
