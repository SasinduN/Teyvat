/**
 * What the floating buttons' tests measure, in the page. The selectors are written out
 * again here on purpose, not imported from the component: the test holds the buttons to
 * the list, whatever the component's list says.
 */

/** Every floating box a visitor can see: the buttons and any showing label. */
const FLOATING_BOXES = `[...document.querySelectorAll('[data-floating-actions] a, [data-floating-actions] .te-floating-label')]
  .filter((el) => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none'; })
  .map((el) => el.getBoundingClientRect())`;

/**
 * What the buttons may never sit on once the page has stopped: the hero's slide arrows, the
 * map's zoom buttons and credit and Quick Jump, the scroll-to-top button, the footer's last
 * row. By name, empty when clear. Anything else may pass underneath: it scrolls away.
 */
export const COVERED = `(() => {
  const floating = ${FLOATING_BOXES};
  const covered = [];
  for (const el of document.querySelectorAll('.te-hero-controls, .te-hero-controls button, .leaflet-control, #explore-map [data-keep-clear], [data-scroll-top], [data-footer-last-row], [data-footer-last-row] a')) {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (floating.some((f) => r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top)) {
      covered.push((el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40) || el.className) + ' @' + Math.round(r.top));
    }
  }
  return covered;
})()`;

/** Each button's state: seen, on screen under the header, and taking a tap at its middle. Nothing is pressed. */
export const BUTTON_STATES = `[...document.querySelectorAll('[data-floating-actions] a')].map((a) => {
  const s = getComputedStyle(a);
  const r = a.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {
    name: a.getAttribute('aria-label'),
    shown: a.dataset.state === 'shown' && s.visibility === 'visible' && Number(s.opacity) === 1 && !a.inert,
    onScreen: r.top >= document.querySelector('.te-nav').getBoundingClientRect().bottom && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    clickable: hit?.closest('a') === a,
    on: hit ? hit.tagName + '.' + String(hit.className).slice(0, 60) : 'nothing',
    width: r.width,
    height: r.height
  };
})`;

/** How far the stack has risen, read from its transform once it arrives. */
export const LIFT = `Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-floating-actions]')).transform).m42)`;

/** Where the stack has settled: the value it was told, not one read mid-move. */
export const TARGET_LIFT = `parseFloat(document.querySelector('[data-floating-actions]').style.getPropertyValue('--te-float-lift') || '0')`;

/**
 * Scrolls the whole page a little every frame, with no pause long enough to count as stopping,
 * and resolves with every position the top button took on the way and how many frames it ran.
 * A real page's height can grow as photos load, so it goes until it's truly at the end.
 */
export const SCROLL_CONTINUOUSLY = (stepPx: number) => `new Promise((resolve) => {
  const top = () => document.querySelector('[data-floating-actions] a').getBoundingClientRect().top;
  const seen = [];
  let frames = 0;
  let last = null;
  const tick = () => {
    frames += 1;
    const now = Math.round(top() * 10) / 10;
    if (now !== last) { seen.push({ top: now, scrollY: Math.round(scrollY) }); last = now; }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 1) return resolve({ seen, frames });
    window.scrollBy(0, ${stepPx});
    requestAnimationFrame(tick);
  };
  tick();
})`;
