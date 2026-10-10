/**
 * Contrast measured in Chrome, on the colours the browser actually computes
 * (browser-glass, browser-contrast). A translucent background is composited
 * over both a white and a black backdrop, the extremes a photo can put
 * behind it, and the worse of the two counts: 4.5:1 for text (or the
 * minimum given), 3:1 for large text and for icons.
 */
/**
 * In the page: `window.__contrast(root, minimumForText, skip?)` → the elements
 * under `root` whose text (or, for an svg icon, its colour) falls short.
 */
export const CONTRAST = `(() => {
  const probe = document.createElement('canvas').getContext('2d');
  // Any CSS colour → [r, g, b, a] in 0–255 / 0–1, via the canvas's own parser.
  const rgba = (css) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  // The element's background as the stack of its and its ancestors' colours, over a backdrop.
  const background = (el, backdrop) => {
    const layers = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const c = rgba(getComputedStyle(node).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 1) break;
    }
    return layers.reverse().reduce((under, layer) => over(layer, under), backdrop);
  };
  // \`skip\`: a selector for areas measured elsewhere (photo headers, map tiles). Disabled controls are exempt (WCAG 1.4.3).
  window.__contrast = (root, minimum, skip) => {
    const failures = [];
    const els = [...root.querySelectorAll('*')].filter((el) => {
      if ((skip && el.closest(skip)) || el.closest(':disabled, [aria-disabled="true"]')) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return false;
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      return ownText || el.tagName === 'svg';
    });
    for (const el of els) {
      const style = getComputedStyle(el);
      const size = parseFloat(style.fontSize), bold = parseInt(style.fontWeight, 10) >= 700;
      const isIcon = el.tagName === 'svg';
      const need = isIcon || size >= 24 || (bold && size >= 18.66) ? 3 : minimum;
      const colour = rgba(isIcon ? style.color : style.color);
      // Text opacity (opacity on the element or its ancestors) fades it into the background.
      let opacity = 1;
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity);
      const worst = Math.min(...[[255, 255, 255, 1], [0, 0, 0, 1]].map((backdrop) => {
        const bg = background(el, backdrop);
        const fg = over([colour[0], colour[1], colour[2], colour[3] * opacity], bg);
        return ratio(fg, bg);
      }));
      if (worst < need) {
        failures.push((el.getAttribute('aria-label') || el.textContent.trim() || el.tagName).slice(0, 40) + ': ' + worst.toFixed(2) + ' < ' + need);
      }
    }
    return failures;
  };
  return true;
})()`;
