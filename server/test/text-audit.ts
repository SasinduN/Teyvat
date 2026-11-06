/**
 * Expressions for `page.evaluate`, shared by the browser type tests.
 *
 * `body { overflow-x: hidden }` keeps a page from scrolling sideways even when
 * something is too wide, so the audit measures the text itself: each text
 * node's rectangles, against the window, the boxes that clip it and each other.
 */

/** Scrolls down and back, so the scroll-in animations have run and every section is at full opacity. */
export const SCROLL_THROUGH = `(async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(300, innerHeight * .8)) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await pause(60);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await pause(450);
  return true;
})()`;

/** What the audits below share: the visible text nodes, each with its element and rectangles. */
const VISIBLE_TEXT = `
  const IGNORED = '.sr-only, .ride-sr-only, .skip-link, .leaflet-marker-pane, .leaflet-tooltip-pane, [aria-hidden="true"], noscript, script, style, option';
  const shown = (el) => {
    if (el.closest(IGNORED)) return false;
    if (getComputedStyle(el).visibility !== 'visible') return false;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const textItems = (root) => {
    const items = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (!text) continue;
      const el = walker.currentNode.parentElement;
      if (!el || !shown(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length) items.push({ el, text, rects });
    }
    return items;
  };
`;

/**
 * Everything wrong with the text in the window: a page wider than the window,
 * text past its edges, text clipped by a box (a scroller is fine, and so is a
 * deliberate line clamp or ellipsis), and text overlapping other text.
 */
export const TEXT_AUDIT = `(() => {
  ${VISIBLE_TEXT}
  const problems = [];
  const vw = document.documentElement.clientWidth;
  const wide = document.documentElement.scrollWidth;
  if (wide > vw + 1) problems.push('the page is ' + wide + ' px wide in a ' + vw + ' px window');

  const label = (text) => JSON.stringify(text.slice(0, 40));
  const items = textItems(document.body);
  for (const { el, text, rects } of items) {
    let scrolls = false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (/auto|scroll/.test(s.overflowX + s.overflowY)) { scrolls = true; break; }
      if (!/hidden|clip/.test(s.overflowX + s.overflowY)) continue;
      if (s.webkitLineClamp !== 'none' || s.textOverflow === 'ellipsis') { scrolls = true; break; }
      const box = a.getBoundingClientRect();
      const out = rects.some((r) =>
        (/hidden|clip/.test(s.overflowX) && (r.left < box.left - 1.5 || r.right > box.right + 1.5)) ||
        (/hidden|clip/.test(s.overflowY) && (r.top < box.top - 1.5 || r.bottom > box.bottom + 1.5)));
      if (out) problems.push('clipped: ' + label(text) + ' by ' + a.tagName.toLowerCase() + '.' + String(a.className).split(' ').slice(0, 3).join('.'));
    }
    if (!scrolls && rects.some((r) => r.right > vw + 1 || r.left < -1)) problems.push('past the window: ' + label(text));
  }

  // What a browser draws inside a control isn't a text node: placeholders and a select's choice.
  const pen = document.createElement('canvas').getContext('2d');
  for (const field of document.querySelectorAll('input[placeholder], select')) {
    if (!shown(field) || field.getBoundingClientRect().width < 2) continue;
    const s = getComputedStyle(field);
    const isSelect = field.tagName === 'SELECT';
    const words = isSelect ? field.options[field.selectedIndex]?.text ?? '' : field.value ? '' : field.placeholder;
    pen.font = s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily;
    // From the rectangle: since Chrome 157 an input's clientWidth already leaves out its padding, unlike every other element's.
    const room = field.getBoundingClientRect().width - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth) - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - (isSelect ? 20 : 0);
    if (pen.measureText(words).width > room + 1) problems.push('cut off in a field: ' + label(words));
  }

  // A row that scrolls must start at its start: centred content can hang off the left, out of reach.
  for (const row of document.querySelectorAll('body *')) {
    if (!/auto|scroll/.test(getComputedStyle(row).overflowX) || row.scrollWidth <= row.clientWidth || !shown(row)) continue;
    const first = row.firstElementChild;
    if (first && first.getBoundingClientRect().left < row.getBoundingClientRect().left - 1 - row.scrollLeft) {
      problems.push('a scrolling row hides its start: ' + label(row.textContent.trim()));
    }
  }

  // Overlaps. The floating buttons sit over the page on purpose, and so does
  // the fixed header once the page has scrolled; at the top, it must not.
  const floating = window.scrollY > 0 ? '.te-floating-actions, .te-scroll-top, .te-nav' : '.te-floating-actions, .te-scroll-top';
  // What can be seen of a line: a clamped paragraph's hidden lines, or a place scrolled out of its row, don't count.
  const seen = (el, rect) => {
    let r = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const box = a.getBoundingClientRect();
      r = { left: Math.max(r.left, box.left), right: Math.min(r.right, box.right), top: Math.max(r.top, box.top), bottom: Math.min(r.bottom, box.bottom) };
    }
    return r;
  };
  // A line's box is taller than its letters: shrink it, so tight headings don't count.
  const inner = (r) => { const h = r.bottom - r.top; return { left: r.left, right: r.right, top: r.top + h * .18, bottom: r.bottom - h * .18 }; };
  const flat = items
    .filter((i) => !i.el.closest(floating))
    .map((i) => ({ ...i, rects: i.rects.map((r) => inner(seen(i.el, r))).filter((r) => r.right > r.left && r.bottom > r.top) }));
  for (let i = 0; i < flat.length; i += 1) {
    for (let j = i + 1; j < flat.length; j += 1) {
      const a = flat[i];
      const b = flat[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const hit = a.rects.some((r) => b.rects.some((t) =>
        Math.min(r.right, t.right) - Math.max(r.left, t.left) > 2 && Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top) > 2));
      if (hit) problems.push('overlap: ' + label(a.text) + ' and ' + label(b.text));
    }
  }
  return [...new Set(problems)].slice(0, 15);
})()`;

/** Each visible text node's size: [px, characters, text], smallest first. */
export const TEXT_SIZES_ON_PAGE = `(() => {
  ${VISIBLE_TEXT}
  return textItems(document.body)
    .filter((i) => !i.el.closest('.leaflet-container') || i.el.closest('.leaflet-control-attribution'))
    .map((i) => [parseFloat(getComputedStyle(i.el).fontSize), i.text.length, i.text.slice(0, 50)])
    .sort((a, b) => a[0] - b[0]);
})()`;
