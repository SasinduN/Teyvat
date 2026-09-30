/**
 * Where uploaded images live: a Cloudflare R2 bucket, through its S3 API.
 *
 * Behind a three-method interface so the tests can use `memoryStore()` and
 * never touch a real bucket, and so `r2Store` itself can be tested against a
 * local HTTP server standing in for Cloudflare.
 */
import { AwsClient } from 'aws4fetch';

import type { StoredImageType } from '../../../shared/image-sniff';
import type { R2Config } from '../env';

export interface ObjectStore {
  put(key: string, bytes: Uint8Array, contentType: StoredImageType): Promise<void>;
  delete(key: string): Promise<void>;
  /** Whether the bucket answers at all. For `/api/health`, informational only. */
  ping(): Promise<boolean>;
}

/**
 * Keys never repeat (`<folder>/<timestamp>-<random>.<ext>`), so an object's
 * bytes never change and browsers and Cloudflare can keep it for a year.
 */
export const OBJECT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export interface R2StoreOptions extends Pick<R2Config, 'accessKeyId' | 'secretAccessKey' | 'bucket'> {
  /** `https://<account>.r2.cloudflarestorage.com` in production; a local URL in tests. */
  endpoint: string;
  /** aws4fetch retries 5xx answers with backoff. Its default is 10. */
  retries?: number;
}

export function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export class ObjectStoreError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ObjectStoreError';
  }
}

export function r2Store(options: R2StoreOptions): ObjectStore {
  const client = new AwsClient({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    // Stated, not inferred: aws4fetch guesses both from the hostname, which
    // for a test server is 127.0.0.1.
    service: 's3',
    region: 'auto',
    retries: options.retries ?? 2
  });

  const objectUrl = (key: string) =>
    `${options.endpoint}/${encodeURIComponent(options.bucket)}/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;

  async function send(url: string, init: RequestInit, what: string): Promise<Response> {
    const res = await client.fetch(url, init);
    if (!res.ok) {
      // R2's error body is XML naming the problem; keep it for the log only.
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      throw new ObjectStoreError(`R2 ${what} failed with ${res.status}: ${detail}`, res.status);
    }
    return res;
  }

  return {
    async put(key, bytes, contentType) {
      await send(
        objectUrl(key),
        {
          method: 'PUT',
          // Node's Buffers sit on a plain ArrayBuffer, never a shared one;
          // the DOM typings just can't know that.
          body: bytes as Uint8Array<ArrayBuffer>,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': OBJECT_CACHE_CONTROL
          }
        },
        `PUT ${key}`
      );
    },

    async delete(key) {
      // S3 answers 204 for a key that doesn't exist, which is what we want.
      await send(objectUrl(key), { method: 'DELETE' }, `DELETE ${key}`);
    },

    async ping() {
      try {
        const res = await client.fetch(
          `${options.endpoint}/${encodeURIComponent(options.bucket)}`,
          { method: 'HEAD' }
        );
        return res.ok;
      } catch {
        return false;
      }
    }
  };
}

export interface StoredObject {
  bytes: Uint8Array;
  contentType: string;
  cacheControl: string;
}

/** For tests: objects in a Map, with switches to make calls fail. */
export function memoryStore() {
  const objects = new Map<string, StoredObject>();
  const failures = { put: false, delete: false };

  const store: ObjectStore & { objects: typeof objects; failures: typeof failures } = {
    objects,
    failures,
    async put(key, bytes, contentType) {
      if (failures.put) throw new ObjectStoreError('memory store: put refused', 500);
      objects.set(key, { bytes, contentType, cacheControl: OBJECT_CACHE_CONTROL });
    },
    async delete(key) {
      if (failures.delete) throw new ObjectStoreError('memory store: delete refused', 500);
      objects.delete(key);
    },
    async ping() {
      return true;
    }
  };
  return store;
}
