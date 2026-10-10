/**
 * Contrast measured on what Chrome paints, for text anywhere on a page,
 * photos included (browser-contrast).
 *
 * Every photo is painted white, the worst case for the light text on it, and
 * the text and icons are hidden, so what is left is the real background
 * behind each piece of text: card fills, overlays and gradients over the
 * photo, any glass. The page is captured a screen at a time and each piece
 * of text is measured against every pixel behind it: 4.5:1 for text, 3:1 for
 * large text and for the icons of icon-only controls. An icon beside its own
 * text is decorative: the text carries it (WCAG 1.4.11).
 */
import type { Chrome, Page } from './chrome';

interface Target {
  what: string;
  /** [r, g, b, a], its opacity applied. */
  colour: [number, number, number, number];
  need: number;
  /** In page coordinates. */
  rects: { x: number; y: number; w: number; h: number }[];
}

/** In the page: the text and icons under `roots`, outside `skip`. */
const targets = (roots: string, skip: string) => `(() => {
  const probe = document.createElement('canvas').getContext('2d');
  const rgba = (css) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const skip = ${JSON.stringify(skip)};
  // A box as it shows: null if an ancestor that hides or scrolls its overflow cuts it at all (a chip scrolled
  // out of its strip, wholly or partly, isn't on screen to read; its rounded corners would show what's behind).
  const visible = (el, r) => {
    let box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const c = node.getBoundingClientRect();
      if (box.left < c.left - 0.5 || box.top < c.top - 0.5 || box.right > c.right + 0.5 || box.bottom > c.bottom + 0.5) return null;
    }
    return { x: box.left + scrollX, y: box.top + scrollY, w: box.right - box.left, h: box.bottom - box.top };
  };
  const out = [];
  for (const root of document.querySelectorAll(${JSON.stringify(roots)})) {
    for (const el of root.querySelectorAll('*')) {
      if ((skip && el.closest(skip)) || el.closest(':disabled, [aria-disabled="true"], .sr-only, [aria-hidden="true"]:not(svg)')) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      let opacity = 1;
      for (let node = el; node && node !== document.body; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity);
      if (opacity < 0.05) continue;
      if (el.tagName === 'svg') {
        const control = el.closest('a, button');
        if (el.getAttribute('aria-hidden') === 'true' && !(control && !control.textContent.trim())) continue;
        const r = el.getBoundingClientRect();
        const shown = r.width > 0 ? visible(el, r) : null;
        if (!shown) continue;
        const c = rgba(style.color);
        out.push({ what: 'icon: ' + (control?.getAttribute('aria-label') || el.parentElement.textContent.trim() || 'svg').slice(0, 40), colour: [c[0], c[1], c[2], c[3] * opacity], need: 3, rects: [shown] });
        continue;
      }
      const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
      if (texts.length === 0) continue;
      const rects = texts.flatMap((n) => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()]; })
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => visible(el, r))
        .filter(Boolean);
      if (rects.length === 0) continue;
      const size = parseFloat(style.fontSize), bold = parseInt(style.fontWeight, 10) >= 700;
      const c = rgba(style.color);
      out.push({ what: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40), colour: [c[0], c[1], c[2], c[3] * opacity], need: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5, rects });
    }
  }
  return out;
})()`;

/** Photos white, text and icons hidden, and the fixed controls out of the way. */
const BACKGROUND_ONLY = `
  img { filter: brightness(0) invert(1) !important; }
  * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }
  ::placeholder { color: transparent !important; }
  svg { visibility: hidden !important; }
  header, [data-whatsapp-button], [data-scroll-top] { visibility: hidden !important; }
`;

/** In the decoder page: each target's worst ratio against one screen's pixels. */
const MEASURE = `(async (png, targets, top, worst) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + png;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, img.width, img.height).data;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  targets.forEach((t, k) => {
    const [fr, fg, fb, fa] = t.colour;
    for (const r of t.rects) {
      const x0 = Math.max(0, Math.floor(r.x)), x1 = Math.min(img.width, Math.ceil(r.x + r.w));
      const y0 = Math.max(0, Math.floor(r.y - top)), y1 = Math.min(img.height, Math.ceil(r.y + r.h - top));
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
        const i = (y * img.width + x) * 4;
        const br = px[i], bg = px[i + 1], bb = px[i + 2];
        const tr = fr * fa + br * (1 - fa), tg = fg * fa + bg * (1 - fa), tb = fb * fa + bb * (1 - fa);
        const a = lum(tr, tg, tb), b = lum(br, bg, bb);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (ratio < worst[k]) worst[k] = ratio;
      }
    }
  });
  return worst;
})`;

/**
 * The shortfalls ("what: ratio < need") on the page `page` shows, under the
 * `roots` selector and outside `skip`. `decoder` is a blank page (the site's
 * CSP rightly refuses data: images).
 */
export async function shortfalls(page: Page, decoder: Page, options: { roots: string; skip?: string; viewportHeight: number }): Promise<string[]> {
  await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto', window.scrollTo(0, 0), true`);
  // A sticky element (a detail page's sidebar card) would move as the screens
  // below are captured, so its text would be compared with whatever pixels
  // end up at its old place. Pinned where it is at the top (sticky and
  // relative lay out the same until they stick), every rect stays true.
  await page.evaluate(`(() => { for (const el of document.querySelectorAll('*')) if (getComputedStyle(el).position === 'sticky') el.style.position = 'relative'; return true; })()`);
  const found = await page.evaluate<Target[]>(targets(options.roots, options.skip ?? ''));
  await page.evaluate(`(() => { const s = document.createElement('style'); s.id = 'background-only'; s.textContent = ${JSON.stringify(BACKGROUND_ONLY)}; document.head.append(s); return true; })()`);

  const height = await page.evaluate<number>('document.documentElement.scrollHeight');
  let worst = found.map(() => Infinity);
  for (let top = 0; top < height; top += options.viewportHeight) {
    await page.evaluate(`window.scrollTo(0, ${top}), true`);
    await new Promise((r) => setTimeout(r, 150));
    const actualTop = await page.evaluate<number>('scrollY');
    const { data } = (await page.send('Page.captureScreenshot', { format: 'png' })) as { data: string };
    const onScreen = found
      .map((t, k) => ({ t, k }))
      .filter(({ t }) => t.rects.some((r) => r.y + r.h > actualTop && r.y < actualTop + options.viewportHeight));
    if (onScreen.length === 0) continue;
    const part = await decoder.evaluate<number[]>(
      `${MEASURE}(${JSON.stringify(data)}, ${JSON.stringify(onScreen.map(({ t }) => t))}, ${actualTop}, ${JSON.stringify(onScreen.map(({ k }) => (Number.isFinite(worst[k]) ? worst[k] : 1e9)))})`
    );
    onScreen.forEach(({ k }, i) => (worst[k] = part[i]));
  }
  await page.evaluate(`document.getElementById('background-only').remove(), true`);
  const at = (t: Target) => `${Math.round(t.rects[0].x)},${Math.round(t.rects[0].y)}`;
  return found.flatMap((t, k) => (worst[k] < t.need ? [`${t.what} (at ${at(t)}): ${worst[k].toFixed(2)} < ${t.need}`] : []));
}

/** A blank page for decoding screenshots. */
export const newDecoder = (chrome: Chrome): Promise<Page> => chrome.newPage();
