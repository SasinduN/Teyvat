/**
 * `npm run brand:assets`: every shipped logo file, made from the client's originals.
 *
 * The originals (design/brand/, docs/plans/brand-themes.md) are Canva exports: each SVG
 * wraps one 1024 px RGB PNG and a 1024 px luminance mask, applied with an SVG <mask>.
 * `logo.svg` shows the whole picture (the emblem and the lettering); `logo1.svg` draws
 * the same picture clipped to the emblem. So this script:
 *
 *   1. decodes both embedded PNGs from `logo.svg` and uses the mask as the alpha;
 *   2. reads the emblem's rows from `logo1.svg`'s own clip path and transform;
 *   3. trims each picture to what isn't transparent;
 *   4. writes public/brand/ (the exact list `no-committed-images` allows), and fails if
 *      any file is over its budget, so a budget can't drift quietly.
 *
 * Run by hand after the originals change; the output is committed. The build never runs
 * it, and `sharp` is a dev dependency only (`brand-assets.test`).
 */
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { BRAND_FILES } from '../shared/brand-files';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'design', 'brand');
const OUT = join(ROOT, 'public', 'brand');

/** The page colour icons sit on where transparency isn't allowed (iOS, maskable): a warm ivory. */
const IVORY = { r: 252, g: 248, b: 243, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

interface Picture {
  data: Buffer;
  width: number;
  height: number;
}

/** The embedded PNGs of a Canva SVG, in document order. */
function embeddedPngs(svg: string): Buffer[] {
  return [...svg.matchAll(/<image\b[^>]*?href="data:image\/png;base64,([^"]+)"/g)].map((m) => Buffer.from(m[1], 'base64'));
}

/** The colour picture with the mask as its alpha, as raw RGBA. */
async function composite(svg: string): Promise<Picture> {
  const pngs = embeddedPngs(svg);
  if (pngs.length !== 2) throw new Error(`Expected 2 embedded PNGs, found ${pngs.length}.`);
  const metas = await Promise.all(pngs.map((p) => sharp(p).metadata()));
  // The mask is the one-channel (greyscale) image; the colour picture has three.
  const maskIndex = metas.findIndex((m) => m.channels === 1);
  if (maskIndex === -1) throw new Error('No greyscale mask among the embedded images.');
  const colour = await sharp(pngs[1 - maskIndex]).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = await sharp(pngs[maskIndex]).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = colour.info;
  if (colour.info.channels !== 3 || mask.info.width !== width || mask.info.height !== height) {
    throw new Error('The colour picture and its mask differ in size or shape.');
  }
  // RGBA by hand (sharp's joinChannel ignores a raw buffer): the mask is the alpha, and the
  // colour under fully transparent pixels is zeroed, which no one sees and halves the files.
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const alpha = mask.data[i];
    data[i * 4 + 3] = alpha;
    if (alpha === 0) continue;
    data[i * 4] = colour.data[i * 3];
    data[i * 4 + 1] = colour.data[i * 3 + 1];
    data[i * 4 + 2] = colour.data[i * 3 + 2];
  }
  return { data, width, height };
}

/** The emblem's last row in the picture, from logo1.svg's clip path (in viewBox units) and the image's transform. */
function emblemRows(svg: string): number {
  const clip = /<clipPath[^>]*>\s*<path d="M [\d.]+ ([\d.]+) L [\d.]+ [\d.]+ L [\d.]+ ([\d.]+)/.exec(svg);
  const matrix = /transform="matrix\(([\d.]+), 0, 0, ([\d.]+), [\d.]+, ([\d.]+)\)"/.exec(svg);
  if (!clip || !matrix) throw new Error('logo1.svg: no clip path or transform found.');
  const [, , bottom] = clip.map(Number);
  const [, , scaleY, offsetY] = matrix.map(Number);
  return Math.floor((bottom - offsetY) / scaleY);
}

/** The smallest box holding every pixel that isn't fully transparent. */
function trim(p: Picture, rows = p.height): Picture {
  let top = rows, bottom = -1, left = p.width, right = -1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < p.width; x++) {
      if (p.data[(y * p.width + x) * 4 + 3] > 8) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  const width = right - left + 1;
  const height = bottom - top + 1;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    p.data.copy(data, y * width * 4, ((top + y) * p.width + left) * 4, ((top + y) * p.width + right + 1) * 4);
  }
  return { data, width, height };
}

const raw = (p: Picture) => sharp(p.data, { raw: { width: p.width, height: p.height, channels: 4 } });

/** Scaled to a height, keeping its shape. */
async function toHeight(p: Picture, height: number): Promise<Picture> {
  const { data, info } = await raw(p).resize({ height, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Centred on a square canvas, `pad` px clear on every side, on `background` (transparent if omitted). */
async function square(p: Picture, side: number, pad: number, background?: typeof IVORY): Promise<sharp.Sharp> {
  const inner = side - 2 * pad;
  const fitted = await raw(p).resize({ width: inner, height: inner, fit: 'inside', kernel: 'lanczos3' }).png().toBuffer();
  return sharp({ create: { width: side, height: side, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, gravity: 'centre' }]);
}

/**
 * A palette PNG. Small files keep 256 colours; the big ones (the 512 icons, the email logo)
 * use 128 with dithering (above 128, sharp keeps all 256), which keeps the sun's gradient smooth (checked by eye at full
 * size) at a third of the bytes.
 */
const palettePng = (s: sharp.Sharp, colours = 256) => s.png({ palette: true, colours, dither: 0.8, effort: 10, compressionLevel: 9 });

/** A .ico holding PNG images (allowed since Windows Vista; every browser reads it). */
function ico(images: { side: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ side, png }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(side % 256, at);
    header.writeUInt8(side % 256, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.png)]);
}

async function main(): Promise<void> {
  const full = readFileSync(join(SOURCE, 'logo.svg'), 'utf8');
  const emblemSvg = readFileSync(join(SOURCE, 'logo1.svg'), 'utf8');
  const picture = await composite(full);
  const emblem = trim(picture, emblemRows(emblemSvg));
  const whole = trim(picture);
  mkdirSync(OUT, { recursive: true });
  const write = async (name: string, content: Buffer | sharp.Sharp) => {
    writeFileSync(join(OUT, name), Buffer.isBuffer(content) ? content : await content.toBuffer());
  };

  // The header, footer and admin emblem: 40 px tall at 1x, 2x and 3x.
  for (const height of [40, 80, 120]) {
    const e = await toHeight(emblem, height);
    await write(`emblem-${height}.webp`, raw(e).webp({ quality: 88, effort: 6, alphaQuality: 100 }));
    await write(`emblem-${height}.png`, palettePng(raw(e)));
  }

  // Favicons: the emblem alone, square, transparent.
  const fav16 = await palettePng(await square(emblem, 16, 0)).toBuffer();
  const fav32 = await palettePng(await square(emblem, 32, 1)).toBuffer();
  await write('favicon-32.png', fav32);
  await write('favicon.ico', ico([{ side: 16, png: fav16 }, { side: 32, png: fav32 }]));

  // iOS fills transparency with black, and maskable icons are cut to any shape: both on ivory.
  await write('apple-touch-icon.png', palettePng(sharp(await (await square(emblem, 180, 18, IVORY)).png().toBuffer()).flatten({ background: IVORY })));
  await write('icon-192.png', palettePng(await square(emblem, 192, 8), 128));
  await write('icon-512.png', palettePng(await square(emblem, 512, 20), 128));
  // The safe zone is the central circle, 80% across: 82 px each side keeps the emblem inside it.
  await write('icon-maskable-512.png', palettePng(sharp(await (await square(emblem, 512, 82, IVORY)).png().toBuffer()).flatten({ background: IVORY }), 128));

  // Emails: the whole logo, 240 px wide, on white (clients don't show SVG, and some mishandle transparency).
  const emailPicture = await raw(whole).resize({ width: 240, kernel: 'lanczos3' }).png().toBuffer();
  await write('email-logo.png', palettePng(sharp(emailPicture).flatten({ background: WHITE }), 128));

  // The default share image: 1200 x 630, the whole logo centred on ivory.
  const shareLogo = await raw(whole).resize({ width: 1000, height: 520, fit: 'inside', kernel: 'lanczos3' }).png().toBuffer();
  await write(
    'og-default.jpg',
    sharp({ create: { width: 1200, height: 630, channels: 4, background: IVORY } })
      .composite([{ input: shareLogo, gravity: 'centre' }])
      .flatten({ background: IVORY })
      .jpeg({ quality: 85, mozjpeg: true, progressive: true })
  );

  const over: string[] = [];
  for (const file of BRAND_FILES) {
    const bytes = statSync(join(OUT, file.name)).size;
    const meta = await sharp(join(OUT, file.name), { pages: 1 }).metadata().catch(() => null);
    const size = meta ? `${meta.width}x${meta.height}` : '(ico)';
    console.log(`${file.name.padEnd(24)} ${size.padEnd(10)} ${(bytes / 1024).toFixed(1).padStart(6)} KB  (budget ${file.budgetKb} KB)`);
    if (bytes > file.budgetKb * 1024) over.push(`${file.name}: ${(bytes / 1024).toFixed(1)} KB > ${file.budgetKb} KB`);
  }
  if (over.length) throw new Error(`Over budget:\n  ${over.join('\n  ')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
