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
 * The controls the shown buttons sit on, by name: empty when none. A link the size of a
 * whole card (over 160 px both ways) isn't counted, as there's no way past one on a phone:
 * the visitor presses the rest of it. Nor are map markers, which the map moves.
 */
export const COVERED_CONTROLS = `(() => {
  const floating = ${FLOATING_BOXES};
  const important = '.leaflet-control, [data-keep-clear], [data-scroll-top], [data-footer-last-row], form button[type="submit"]';
  const controls = 'main a, main button, main input, main select, main textarea, form button, form input, form select, form textarea, footer a, footer button, footer input';
  const covered = [];
  for (const el of document.querySelectorAll(important + ',' + controls)) {
    if (el.closest('[data-floating-actions], [inert], [aria-hidden="true"]')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.matches(important) ? r.height > innerHeight / 2 : r.width > 160 && r.height > 160) continue;
    if (floating.some((f) => r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top)) {
      covered.push((el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40) || el.tagName) + ' @' + Math.round(r.top));
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
