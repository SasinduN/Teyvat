/**
 * `prepareImage` (src/lib/media.ts) in a real headless Chrome: what happens
 * to a phone photo before it is uploaded. None of this can be tested in Node,
 * because it is the browser's decoder and canvas doing the work.
 *
 * Skipped, with a message saying why, when no Chrome is installed. Set
 * CHROME_PATH to point at one.
 */
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';

import { build } from 'esbuild';

import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();

/** `src/lib/media.ts` as a script, exposed on `window.teyvatMedia`. */
async function bundleMediaModule(): Promise<string> {
  const result = await build({
    entryPoints: [resolve(REPO_ROOT, 'src/lib/media.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'teyvatMedia',
    platform: 'browser',
    target: 'es2022',
    write: false,
    alias: { '@': resolve(REPO_ROOT, 'src'), '@shared': resolve(REPO_ROOT, 'shared') }
  });
  return result.outputFiles[0].text;
}

/**
 * Page-side helpers, defined once:
 *   solidJpeg / halvesJpeg  build test photos with a canvas
 *   withOrientation         splices an EXIF APP1 segment into a JPEG
 *   pixel                   reads one pixel of a decoded blob
 */
const PAGE_HELPERS = `
window.t = {
  async halvesJpeg(width, height) {
    const c = new OffscreenCanvas(width, height);
    const x = c.getContext('2d');
    x.fillStyle = '#ff0000'; x.fillRect(0, 0, width / 2, height);
    x.fillStyle = '#0000ff'; x.fillRect(width / 2, 0, width / 2, height);
    return new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: 1 })).arrayBuffer());
  },
  async solidJpeg(width, height) {
    const c = new OffscreenCanvas(width, height);
    const x = c.getContext('2d');
    x.fillStyle = '#10a040'; x.fillRect(0, 0, width, height);
    return new Blob([await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 })], { type: 'image/jpeg' });
  },
  // APP1 "Exif", big-endian TIFF, one IFD entry: Orientation (0x0112) = n.
  withOrientation(jpeg, n) {
    const app1 = [0xff, 0xe1, 0x00, 0x22,
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
      0x00, 0x01,
      0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, n, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00];
    const out = new Uint8Array(jpeg.length + app1.length);
    out.set(jpeg.subarray(0, 2), 0);
    out.set(app1, 2);
    out.set(jpeg.subarray(2), 2 + app1.length);
    return new Blob([out], { type: 'image/jpeg' });
  },
  async pixel(blob, fx, fy) {
    const b = await createImageBitmap(blob);
    const c = new OffscreenCanvas(b.width, b.height);
    const x = c.getContext('2d');
    x.drawImage(b, 0, 0);
    const d = x.getImageData(Math.floor(b.width * fx), Math.floor(b.height * fy), 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  },
  // The stored pixel size, from the JPEG's SOF0/SOF2 header: what the file
  // holds before any orientation is applied.
  async jpegStoredSize(blob) {
    const b = new Uint8Array(await blob.arrayBuffer());
    for (let i = 2; i < b.length - 9; ) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const length = (b[i + 2] << 8) | b[i + 3];
      if (marker === 0xc0 || marker === 0xc2) {
        return [(b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]];
      }
      i += 2 + length;
    }
    return null;
  },
  async bytesContain(blob, text) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const needle = [...text].map((ch) => ch.charCodeAt(0));
    outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
      return true;
    }
    return false;
  }
};
true;
`;

const isRed = ([r, g, b]: number[]) => r > 200 && g < 60 && b < 60;
const isBlue = ([r, g, b]: number[]) => b > 200 && r < 60 && g < 60;

describe('prepareImage in Chrome', { skip: executable ? false : 'no Chrome found; set CHROME_PATH to run these' }, () => {
  let chrome: Chrome;
  let page: Page;

  before(async () => {
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.evaluate(await bundleMediaModule());
    await page.evaluate(PAGE_HELPERS);
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
  }, HOOK_TIMEOUT);

  test('a portrait phone photo (EXIF orientation 6) stays portrait, and loses its EXIF', async () => {
    const result = await page.evaluate<{
      stored: [number, number];
      width: number;
      height: number;
      type: string;
      top: number[];
      bottom: number[];
      inputHasExif: boolean;
      outputHasExif: boolean;
    }>(`(async () => {
      // Stored as 60x40 landscape, red left, blue right. Orientation 6 means
      // "rotate 90 degrees clockwise to view": a portrait photo, red on top.
      const photo = t.withOrientation(await t.halvesJpeg(60, 40), 6);

      const out = await teyvatMedia.prepareImage(photo);
      return {
        stored: await t.jpegStoredSize(photo),
        width: out.width, height: out.height, type: out.blob.type,
        top: await t.pixel(out.blob, 0.5, 0.15),
        bottom: await t.pixel(out.blob, 0.5, 0.85),
        inputHasExif: await t.bytesContain(photo, 'Exif'),
        outputHasExif: await t.bytesContain(out.blob, 'Exif')
      };
    })()`);

    // The test photo really is stored landscape with EXIF...
    assert.deepEqual(result.stored, [60, 40]);
    assert.equal(result.inputHasExif, true);
    // ...and comes out portrait, the right way up, with no EXIF left.
    assert.deepEqual([result.width, result.height], [40, 60]);
    assert.ok(isRed(result.top), `top should be red, got ${result.top}`);
    assert.ok(isBlue(result.bottom), `bottom should be blue, got ${result.bottom}`);
    assert.equal(result.type, 'image/webp');
    assert.equal(result.outputHasExif, false);
  });

  test('control: the same photo without EXIF stays landscape, red on the left', async () => {
    const result = await page.evaluate<{ width: number; height: number; left: number[]; right: number[] }>(`(async () => {
      const photo = new Blob([await t.halvesJpeg(60, 40)], { type: 'image/jpeg' });
      const out = await teyvatMedia.prepareImage(photo);
      return {
        width: out.width, height: out.height,
        left: await t.pixel(out.blob, 0.15, 0.5),
        right: await t.pixel(out.blob, 0.85, 0.5)
      };
    })()`);
    assert.deepEqual([result.width, result.height], [60, 40]);
    assert.ok(isRed(result.left), `left should be red, got ${result.left}`);
    assert.ok(isBlue(result.right), `right should be blue, got ${result.right}`);
  });

  test('a HEIC this browser can’t decode gets the "export as JPEG" message', async () => {
    const message = await page.evaluate<string>(`(async () => {
      const heic = new Uint8Array(4096);
      heic.set([0, 0, 0, 24, ...'ftypheic'].map((c) => typeof c === 'string' ? c.charCodeAt(0) : c));
      heic.set([...'mif1heic'].map((c) => c.charCodeAt(0)), 16);
      try {
        await teyvatMedia.prepareImage(new Blob([heic], { type: 'image/heic' }));
        return 'uploaded';
      } catch (e) {
        return e.name + ': ' + e.message;
      }
    })()`);
    assert.match(message, /^ImagePrepError: This is a HEIC photo/);
    assert.match(message, /Export it as JPEG/);
  });

  test('a 48 MP photo comes out at most 2000 px wide, as a real image', async () => {
    const result = await page.evaluate<{ width: number; height: number; centre: number[]; type: string }>(`(async () => {
      const photo = await t.solidJpeg(8000, 6000);
      const out = await teyvatMedia.prepareImage(photo);
      return { width: out.width, height: out.height, type: out.blob.type, centre: await t.pixel(out.blob, 0.5, 0.5) };
    })()`);
    assert.deepEqual([result.width, result.height], [2000, 1500]);
    assert.equal(result.type, 'image/webp');
    // Not a blank canvas: the photo's green, fully opaque.
    assert.ok(result.centre[1] > 120 && result.centre[0] < 60 && result.centre[3] === 255, `${result.centre}`);
  });

  test('with a tight canvas limit, a large photo is scaled to fit it, never blank', async () => {
    const result = await page.evaluate<{ width: number; height: number; centre: number[] }>(`(async () => {
      const photo = await t.solidJpeg(8000, 6000);
      const out = await teyvatMedia.prepareImage(photo, { maxArea: 1000000 });
      return { width: out.width, height: out.height, centre: await t.pixel(out.blob, 0.5, 0.5) };
    })()`);
    assert.ok(result.width * result.height <= 1_000_000, `${result.width}x${result.height}`);
    assert.ok(Math.abs(result.width / result.height - 4 / 3) < 0.01);
    assert.equal(result.centre[3], 255);
  });

  test('SVG and unknown files are refused before anything is decoded', async () => {
    const messages = await page.evaluate<string[]>(`(async () => {
      const attempt = async (blob) => {
        try { await teyvatMedia.prepareImage(blob); return 'uploaded'; }
        catch (e) { return e.message; }
      };
      return [
        await attempt(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'])),
        await attempt(new Blob(['GIF89a' + '\\0'.repeat(64)]))
      ];
    })()`);
    assert.match(messages[0], /scripts/);
    assert.match(messages[1], /Only JPEG, PNG, WebP and AVIF/);
  });
});
