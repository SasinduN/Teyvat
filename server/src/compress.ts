/**
 * Text responses, compressed when the browser accepts it: `/api/content` (about
 * 60 KB of JSON, 15 KB as Brotli) and the page shell. Vite's JS and CSS are
 * compressed at build time instead (`/assets` in app.ts).
 *
 * Node's own zlib, so no new dependency; Brotli at quality 5, which takes a few
 * milliseconds for the content payload (11, the default, takes far longer for
 * little gain). Express still adds the ETag, over the compressed bytes, which
 * are the same every time for the same body and encoding, so a revalidation
 * still gets its 304.
 */
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

import type { Request, Response } from 'express';

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

/** Below this, compressing saves less than the headers cost. */
const MIN_BYTES = 1024;

export async function sendText(req: Request, res: Response, body: string, type: 'json' | 'html'): Promise<void> {
  res.vary('Accept-Encoding');
  res.type(type);
  const raw = Buffer.from(body, 'utf8');
  const encoding = raw.length < MIN_BYTES ? false : req.acceptsEncodings('br', 'gzip');
  if (encoding === 'br') {
    const compressed = await brotli(raw, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 5, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length }
    });
    res.set('Content-Encoding', 'br').send(compressed);
  } else if (encoding === 'gzip') {
    res.set('Content-Encoding', 'gzip').send(await gzipAsync(raw));
  } else {
    res.send(raw);
  }
}
