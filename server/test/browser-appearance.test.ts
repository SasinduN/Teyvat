// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * Admin → Appearance and a first visit's light or dark, in Chrome (handoff Task 7):
 *
 *   - first visit: the default mode (light, dark, or auto by the device) is on <html> before
 *     the body exists, so nothing flashes; Auto follows the device until the visitor chooses;
 *   - the visitor's saved choice beats the default; nothing else in the browser or the
 *     address changes it;
 *   - the top bar's panel: the button's attributes, open, Escape, a click outside, focus back
 *     on the button, the radiogroups' roving tabindex and arrow keys, a preview that saves
 *     nothing, Cancel and closing put the page back, a save persists, and the next page load
 *     shows it; its thumbnails and swatches in each theme's real colours;
 *   - Admin → Settings: the same panel inline, the radio-card picker gone, the form's own save
 *     keeping the appearance;
 *   - a bottom sheet at 375 px;
 *   - AA contrast of the open panel in all six colour sets.
 *
 * Needs `npm run build` and Chrome; skipped otherwise.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, beforeEach, describe, test } from 'node:test';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { DEFAULT_MODES, resolveTheme, type DefaultMode } from '../../shared/default-mode';
import { PALETTES, type Palette } from '../../shared/palette';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
import { newDecoder, shortfalls } from './contrast-capture';
import { assertConnectedToTestDatabase, createUser, listen, migrateTestDatabase, PASSWORD, resetAuthTables, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const executable = findChrome();
const skip = !executable
  ? 'no Chrome found; set CHROME_PATH to run these'
  : !existsSync(join(ROOT, 'dist', 'index.html'))
    ? 'no build; run `npm run build` first'
    : false;

/** Each theme's page colour, light and dark (tokens.css: --palette-frosted-pearl, --palette-night). */
const PAGE: Record<Palette, { light: string; dark: string }> = {
  sunset: { light: 'rgb(252, 248, 243)', dark: 'rgb(26, 15, 18)' },
  emerald: { light: 'rgb(250, 251, 248)', dark: 'rgb(16, 31, 27)' },
  ocean: { light: 'rgb(249, 247, 242)', dark: 'rgb(11, 26, 32)' }
};

const SAVED_MESSAGE = 'Appearance saved. Visitors see it on their next page load.';

/** Records <html data-theme> when the body is first inserted, before anything is painted. */
const RECORD_FIRST_THEME = `(() => {
  window.__atBody = undefined;
  const seen = () => {
    if (document.body && window.__atBody === undefined) {
      window.__atBody = document.documentElement.getAttribute('data-theme');
      window.__schemeAtBody = document.documentElement.style.colorScheme;
      return true;
    }
    return false;
  };
  const observer = new MutationObserver(() => { if (seen()) observer.disconnect(); });
  observer.observe(document, { childList: true, subtree: true });
})();`;

/** No saved light or dark: a first visit (storage is shared by every tab of this Chrome). */
const FORGET_CHOICE = `try { localStorage.removeItem('site:theme'); } catch {}`;

const KEYS: Record<string, number> = { ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40, ArrowUp: 38, Home: 36, End: 35, Escape: 27, Tab: 9 };

describe('Admin → Appearance and the default mode, in Chrome', { skip, timeout: 10 * 60_000 }, () => {
  let app: RunningApp;
  let chrome: Chrome;

  before(async () => {
    migrateTestDatabase();
    await assertConnectedToTestDatabase();
    await resetContent();
    await resetAuthTables();
    await createUser();
    app = await listen(createApp({ media: null }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);

  beforeEach(async () => {
    await pool.query(`update public.site_settings set palette = 'sunset', default_mode = 'light' where id`);
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  const setSaved = (palette: Palette, mode: DefaultMode) =>
    pool.query('update public.site_settings set palette = $1, default_mode = $2 where id', [palette, mode]);
  const stored = async () => (await pool.query('select palette, default_mode from public.site_settings')).rows[0] as { palette: string; default_mode: string };

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  const scheme = (page: Page, value: 'light' | 'dark') =>
    page.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value },
        { name: 'prefers-reduced-motion', value: 'reduce' }
      ]
    });

  /** `theme`: the visitor's saved choice; null for a first visit. */
  async function open(
    path: string,
    options: { theme?: 'light' | 'dark' | null; device?: 'light' | 'dark'; width?: number; before?: string } = {}
  ): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    const width = options.width ?? 1280;
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 700 ? 812 : 900, deviceScaleFactor: 1, mobile: width < 700 });
    await scheme(page, options.device ?? 'light');
    if (options.theme === null) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: FORGET_CHOICE });
    else await saveTheme(page, options.theme ?? 'light');
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORD_FIRST_THEME });
    if (options.before) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: options.before });
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.readyState === 'complete'`, path);
    return page;
  }
  const close = (page: Page) => page.send('Page.close').catch(() => undefined);
  const attr = (page: Page, name: string) => page.evaluate<string | null>(`document.documentElement.getAttribute(${JSON.stringify(name)})`);
  const pageColour = (page: Page) => page.evaluate<string>(`getComputedStyle(document.body).backgroundColor`);

  async function press(page: Page, key: string, shift = false): Promise<void> {
    const base = { key, code: key, windowsVirtualKeyCode: KEYS[key], modifiers: shift ? 8 : 0 };
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
  async function clickAt(page: Page, x: number, y: number): Promise<void> {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  }
  async function click(page: Page, selector: string): Promise<void> {
    const point = await page.evaluate<{ x: number; y: number } | null>(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    assert.ok(point, `nothing matches ${selector}`);
    await clickAt(page, point.x, point.y);
  }
  const focused = (page: Page) =>
    page.evaluate<string>(`(() => { const el = document.activeElement; return el ? (el.dataset.mode ?? el.dataset.paletteOption ?? (el.hasAttribute('data-appearance-button') ? 'button' : el.tagName)) : ''; })()`);

  async function signIn(page: Page): Promise<void> {
    const status = await page.evaluate<number>(`fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
    }).then((r) => r.status)`);
    assert.equal(status, 200);
  }

  /** An admin page, signed in, the admin's own light or dark saved. */
  async function admin(path: string, options: { theme?: 'light' | 'dark'; width?: number; device?: 'light' | 'dark' } = {}): Promise<Page> {
    const page = await open('/admin/login', { theme: options.theme ?? 'light', width: options.width, device: options.device });
    // Signed in by an earlier test (cookies are shared by every tab), /admin/login goes on to
    // the dashboard: either is the same origin, which is all the sign-in request needs.
    await poll(page, `document.querySelector('#admin-email, [data-appearance-button]')`, 'the sign-in form or the admin');
    await signIn(page);
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.querySelector('[data-appearance-button]') && !document.querySelector('[aria-label="Loading"]')`, `${path}, signed in`);
    return page;
  }
  async function openPanel(page: Page): Promise<void> {
    await click(page, '[data-appearance-button]');
    await poll(page, `document.querySelector('[data-appearance-popover] [data-appearance-modes]')`, 'the panel');
    await poll(page, `document.activeElement && document.activeElement.closest('[data-appearance-popover]') && document.activeElement.getAttribute('role') === 'radio'`, 'focus on the chosen mode');
  }
  const checked = (page: Page, group: 'modes' | 'themes', root = '[data-appearance-popover]') =>
    page.evaluate<{ value: string; checked: string; tabIndex: number }[]>(`[...document.querySelectorAll('${root} [data-appearance-${group}] [role=radio]')].map((el) => ({
      value: el.dataset.mode ?? el.dataset.paletteOption, checked: el.getAttribute('aria-checked'), tabIndex: el.tabIndex
    }))`);

  /* ------------------------------------------------------------ first visits */

  test('first visit: light, dark and auto honoured, set before the body exists (no flash)', async () => {
    for (const mode of DEFAULT_MODES) {
      await setSaved('sunset', mode);
      for (const device of ['light', 'dark'] as const) {
        const expected = resolveTheme(null, mode, device === 'dark');
        const page = await open('/tours', { theme: null, device });
        try {
          await poll(page, `document.querySelector('main h1')`, `${mode} ${device}`);
          assert.equal(await attr(page, 'data-default-mode'), mode);
          assert.equal(await page.evaluate<string | null>('window.__atBody'), expected, `${mode} on a ${device} device: before the body`);
          assert.equal(await page.evaluate<string>('window.__schemeAtBody'), expected);
          assert.equal(await attr(page, 'data-theme'), expected, `${mode} on a ${device} device`);
          assert.equal(await pageColour(page), PAGE.sunset[expected]);
          assert.equal(await page.evaluate<string | null>(`localStorage.getItem('site:theme')`), null, 'nothing saved for the visitor');
        } finally {
          await close(page);
        }
      }
    }
  });

  test('auto follows the device when it switches, until the visitor chooses', async () => {
    await setSaved('ocean', 'auto');
    const page = await open('/destinations/ella', { theme: null, device: 'light' });
    try {
      await poll(page, `document.querySelector('main h1')`, 'the page');
      assert.equal(await attr(page, 'data-theme'), 'light');
      await scheme(page, 'dark');
      await poll(page, `document.documentElement.dataset.theme === 'dark'`, 'the device switched to dark');
      assert.equal(await pageColour(page), PAGE.ocean.dark);
      // The visitor chooses light: from now on the device doesn't count.
      await page.evaluate(`document.querySelector('[data-theme-toggle]').click(), true`);
      await poll(page, `document.documentElement.dataset.theme === 'light'`, 'the visitor’s light');
      await scheme(page, 'light');
      await scheme(page, 'dark');
      await sleep(300);
      assert.equal(await attr(page, 'data-theme'), 'light');
    } finally {
      await close(page);
    }
  });

  test('the visitor’s saved choice beats the default mode', async () => {
    const cases: [DefaultMode, 'light' | 'dark', 'light' | 'dark'][] = [
      ['dark', 'light', 'dark'],
      ['light', 'dark', 'light'],
      ['auto', 'light', 'dark'],
      ['auto', 'dark', 'light']
    ];
    for (const [mode, saved, device] of cases) {
      await setSaved('emerald', mode);
      const page = await open('/journal', { theme: saved, device });
      try {
        assert.equal(await page.evaluate<string | null>('window.__atBody'), saved, `${mode}, saved ${saved}, a ${device} device`);
        await poll(page, `document.querySelector('main h1')`, 'the page');
        assert.equal(await attr(page, 'data-theme'), saved);
        assert.equal(await pageColour(page), PAGE.emerald[saved]);
      } finally {
        await close(page);
      }
    }
  });

  test('nothing in the visitor’s browser or the address changes the default mode', async () => {
    await setSaved('sunset', 'light');
    const page = await open('/?default_mode=dark&default-mode=dark&mode=auto&theme=dark', {
      theme: null,
      device: 'dark',
      before: `try {
        for (const key of ['site:default-mode', 'default_mode', 'site:mode', 'default-mode', 'site:appearance']) localStorage.setItem(key, 'dark');
        sessionStorage.setItem('site:theme', 'dark');
        sessionStorage.setItem('site:default-mode', 'dark');
        document.cookie = 'default_mode=dark; path=/';
        document.cookie = 'site:theme=dark; path=/';
      } catch {}`
    });
    try {
      await poll(page, `document.querySelector('main h1')`, 'the home page');
      assert.equal(await attr(page, 'data-default-mode'), 'light');
      assert.equal(await page.evaluate<string | null>('window.__atBody'), 'light');
      assert.equal(await attr(page, 'data-theme'), 'light');
      assert.equal(await pageColour(page), PAGE.sunset.light);
      // The public site has no Appearance panel: only the light/dark button.
      assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-appearance-button], [data-appearance-panel]'))`), false);
    } finally {
      await close(page);
    }
  });

  /* ------------------------------------------------------------ the panel */

  /** The popover's close button: its label, target and place (top right, inside the panel). */
  const closeButton = (page: Page) =>
    page.evaluate<{ label: string | null; size: number[]; topRight: boolean; visible: boolean } | null>(`(() => {
      const d = document.querySelector('[data-appearance-popover]'), b = d && d.querySelector('[data-appearance-close]');
      if (!b) return null;
      const p = d.getBoundingClientRect(), r = b.getBoundingClientRect(), cs = getComputedStyle(b);
      return { label: b.getAttribute('aria-label'), size: [Math.round(r.width), Math.round(r.height)],
        topRight: r.top >= p.top && r.top - p.top < 24 && r.right <= p.right && p.right - r.right < 24,
        visible: cs.visibility === 'visible' && cs.display !== 'none' && r.width > 0 };
    })()`);

  test('the top bar’s button opens the panel; Escape, a click outside and its close button close it, focus back on the button', async () => {
    const page = await admin('/admin');
    try {
      const button = await page.evaluate<{ label: string | null; popup: string | null; expanded: string | null; target: number[]; circle: number[] }>(`(() => {
        const b = document.querySelector('[data-appearance-button]');
        const r = b.getBoundingClientRect(), c = b.querySelector('.te-appearance-button__circle').getBoundingClientRect();
        return { label: b.getAttribute('aria-label'), popup: b.getAttribute('aria-haspopup'), expanded: b.getAttribute('aria-expanded'),
          target: [r.width, r.height], circle: [c.width, c.height, parseFloat(getComputedStyle(b.querySelector('.te-appearance-button__circle')).borderRadius) >= 20 ? 1 : 0] };
      })()`);
      assert.deepEqual([button.label, button.popup, button.expanded], ['Appearance', 'dialog', 'false']);
      assert.ok(button.target[0] >= 44 && button.target[1] >= 44, `a 44 px target: ${button.target}`);
      assert.deepEqual(button.circle, [40, 40, 1], 'a 40 px circle');

      await openPanel(page);
      const dialog = await page.evaluate<{ role: string | null; modal: string | null; title: string; expanded: string | null; desktop: boolean }>(`(() => {
        const d = document.querySelector('[data-appearance-popover]');
        const b = document.querySelector('[data-appearance-button]').getBoundingClientRect(), r = d.getBoundingClientRect();
        return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), title: document.getElementById(d.getAttribute('aria-labelledby')).textContent,
          expanded: document.querySelector('[data-appearance-button]').getAttribute('aria-expanded'),
          desktop: r.top >= b.bottom && r.top - b.bottom < 16 && Math.abs(r.right - b.right) < 2 };
      })()`);
      assert.deepEqual(dialog, { role: 'dialog', modal: 'true', title: 'Appearance', expanded: 'true', desktop: true });
      assert.equal(await focused(page), 'light', 'focus starts on the chosen mode');
      const text = await page.evaluate<string>(`document.querySelector('[data-appearance-popover]').textContent`);
      for (const words of ['Default mode for visitors', 'Light', 'Dark', 'Auto', 'Theme', 'showing light versions', 'Sunset', 'Emerald', 'Ocean',
        'Applies to every visitor on their next page load. Visitors can still switch between light and dark. Only admins can change these.']) {
        assert.ok(text.includes(words), `the panel says “${words}”`);
      }
      assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-appearance-footer]'))`), false, 'no Save until something changes');

      await press(page, 'Escape');
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'Escape closes it');
      assert.equal(await focused(page), 'button', 'focus back on the button');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-appearance-button]').getAttribute('aria-expanded')`), 'false');

      await openPanel(page);
      await clickAt(page, 300, 600);
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'a click outside closes it');
      assert.equal(await focused(page), 'button');

      // A visible close button, top right, a 44 px target.
      await openPanel(page);
      assert.deepEqual(await closeButton(page), { label: 'Close', size: [44, 44], topRight: true, visible: true });
      await click(page, '[data-appearance-close]');
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'the close button closes it');
      assert.equal(await focused(page), 'button', 'focus back on the button');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-appearance-button]').getAttribute('aria-expanded')`), 'false');
    } finally {
      await close(page);
    }
  });

  test('the keyboard: roving tabindex, arrows move and preview, Tab between groups; nothing saved; Cancel and closing put it back', async () => {
    const page = await admin('/admin');
    try {
      await openPanel(page);
      assert.deepEqual(await checked(page, 'modes'), [
        { value: 'light', checked: 'true', tabIndex: 0 },
        { value: 'dark', checked: 'false', tabIndex: -1 },
        { value: 'auto', checked: 'false', tabIndex: -1 }
      ]);
      assert.deepEqual((await checked(page, 'themes')).map((o) => [o.value, o.checked, o.tabIndex]), [['sunset', 'true', 0], ['emerald', 'false', -1], ['ocean', 'false', -1]]);
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('[data-appearance-popover] [role=radiogroup]').length`), 2);

      await press(page, 'ArrowRight');
      assert.equal(await focused(page), 'dark');
      assert.deepEqual((await checked(page, 'modes')).map((o) => o.checked), ['false', 'true', 'false']);
      assert.equal(await attr(page, 'data-theme'), 'dark', 'previewed on the admin at once');
      assert.equal(await pageColour(page), PAGE.sunset.dark);
      assert.match(await page.evaluate<string>(`document.querySelector('[data-appearance-hint]').textContent`), /showing dark versions/);
      assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('[data-appearance-footer]'))`), true, 'Save and Cancel appear');
      await press(page, 'ArrowDown');
      assert.equal(await focused(page), 'auto');
      await press(page, 'ArrowRight');
      assert.equal(await focused(page), 'light', 'wraps round');
      await press(page, 'End');
      assert.equal(await focused(page), 'auto');
      await press(page, 'Home');
      assert.equal(await focused(page), 'light');
      await press(page, 'ArrowLeft');
      assert.equal(await focused(page), 'auto', 'wraps the other way');

      // Tab goes to the other group's chosen option, not through every option.
      await press(page, 'Tab');
      assert.equal(await focused(page), 'sunset');
      await press(page, 'ArrowDown');
      assert.equal(await focused(page), 'emerald');
      assert.equal(await attr(page, 'data-palette'), 'emerald', 'the theme previewed at once');
      await press(page, 'Tab', true);
      assert.equal(await focused(page), 'auto', 'Shift+Tab back to the chosen mode');

      assert.deepEqual(await stored(), { palette: 'sunset', default_mode: 'light' }, 'a preview saves nothing');
      const other = await open('/tours', { theme: null });
      try {
        assert.equal(await attr(other, 'data-palette'), 'sunset', 'visitors don’t see a preview');
        assert.equal(await attr(other, 'data-default-mode'), 'light');
      } finally {
        await close(other);
      }

      // Cancel: everything back, the panel closed.
      await click(page, '[data-appearance-footer] button:first-child');
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'Cancel closes it');
      assert.equal(await attr(page, 'data-palette'), 'sunset');
      assert.equal(await attr(page, 'data-theme'), 'light', 'the admin’s own light again');
      assert.equal(await focused(page), 'button');

      // Closing without saving puts it back too.
      await openPanel(page);
      await click(page, '[data-appearance-popover] [data-palette-option="ocean"]');
      await click(page, '[data-appearance-popover] [data-mode="dark"]');
      assert.deepEqual([await attr(page, 'data-palette'), await attr(page, 'data-theme')], ['ocean', 'dark']);
      await press(page, 'Escape');
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'closed');
      assert.deepEqual([await attr(page, 'data-palette'), await attr(page, 'data-theme')], ['sunset', 'light']);
      await openPanel(page);
      assert.deepEqual((await checked(page, 'themes')).map((o) => o.checked), ['true', 'false', 'false'], 'reopened: the saved choice');

      // So does the close button.
      await click(page, '[data-appearance-popover] [data-palette-option="emerald"]');
      await click(page, '[data-appearance-popover] [data-mode="dark"]');
      assert.deepEqual([await attr(page, 'data-palette'), await attr(page, 'data-theme')], ['emerald', 'dark']);
      await click(page, '[data-appearance-close]');
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'closed by its button');
      assert.deepEqual([await attr(page, 'data-palette'), await attr(page, 'data-theme')], ['sunset', 'light']);
      assert.deepEqual(await stored(), { palette: 'sunset', default_mode: 'light' });
    } finally {
      await close(page);
    }
  });

  test('its thumbnails and swatches are each theme’s real colours', async () => {
    await setSaved('emerald', 'light');
    const page = await admin('/admin');
    try {
      await openPanel(page);
      for (const palette of PALETTES) {
        await click(page, `[data-appearance-popover] [data-palette-option="${palette}"]`);
        const thumbs = await page.evaluate<Record<string, string[]>>(`(() => {
          const out = {};
          for (const thumb of document.querySelectorAll('[data-appearance-popover] [data-mode-thumb]')) {
            out[thumb.dataset.modeThumb] = [...thumb.querySelectorAll('.te-mode-thumb__layer')].map((l) => getComputedStyle(l).backgroundColor);
          }
          return out;
        })()`);
        assert.deepEqual(thumbs, { light: [PAGE[palette].light], dark: [PAGE[palette].dark], auto: [PAGE[palette].light, PAGE[palette].dark] }, palette);
      }
      for (const mode of ['light', 'dark'] as const) {
        await click(page, `[data-appearance-popover] [data-mode="${mode}"]`);
        const swatches = await page.evaluate<{ palette: string; swatch: string; expected: string }[]>(`[...document.querySelectorAll('[data-appearance-popover] .te-theme-swatch')].map((s) => {
          const probe = document.createElement('span');
          probe.dataset.palette = s.dataset.palette; probe.dataset.theme = ${JSON.stringify(mode)};
          probe.style.background = 'var(--button-primary-bg)';
          document.body.append(probe);
          const expected = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return { palette: s.dataset.palette, swatch: getComputedStyle(s).backgroundColor, expected };
        })`);
        for (const s of swatches) assert.equal(s.swatch, s.expected, `${s.palette} ${mode}`);
        assert.equal(new Set(swatches.map((s) => s.swatch)).size, 3, 'three different swatches');
        const check = await page.evaluate<string[]>(`[...document.querySelectorAll('[data-appearance-popover] .te-theme-swatch')].filter((s) => s.querySelector('svg')).map((s) => s.dataset.palette)`);
        assert.deepEqual(check, ['ocean'], 'the check mark only on the chosen theme');
      }
    } finally {
      await close(page);
    }
  });

  test('Save for all visitors persists both; this tab and the next page load show it', async () => {
    const page = await admin('/admin', { theme: 'light' });
    try {
      await openPanel(page);
      await click(page, '[data-appearance-popover] [data-palette-option="ocean"]');
      await click(page, '[data-appearance-popover] [data-mode="dark"]');
      await click(page, '[data-appearance-footer] button:last-child');
      await poll(page, `document.body.textContent.includes(${JSON.stringify(SAVED_MESSAGE)})`, 'the toast');
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'saving closes it');
      assert.deepEqual(await stored(), { palette: 'ocean', default_mode: 'dark' });
      assert.equal(await attr(page, 'data-palette'), 'ocean', 'this tab takes the theme');
      assert.equal(await attr(page, 'data-default-mode'), 'dark');
      assert.equal(await attr(page, 'data-theme'), 'light', 'the admin’s own saved light still wins for them');

      // The next page load: a first visit gets Ocean dark; the admin keeps their light.
      const visitor = await open('/destinations/ella', { theme: null });
      try {
        await poll(visitor, `document.querySelector('main h1')`, 'a visitor’s page');
        assert.deepEqual([await attr(visitor, 'data-palette'), await attr(visitor, 'data-theme')], ['ocean', 'dark']);
        assert.equal(await pageColour(visitor), PAGE.ocean.dark);
      } finally {
        await close(visitor);
      }
      await page.send('Page.navigate', { url: `${app.baseUrl}/admin` });
      await poll(page, `document.querySelector('[data-appearance-button]')`, 'the admin again');
      assert.deepEqual([await attr(page, 'data-palette'), await attr(page, 'data-default-mode'), await attr(page, 'data-theme')], ['ocean', 'dark', 'light']);
      await openPanel(page);
      assert.deepEqual((await checked(page, 'modes')).map((o) => o.checked), ['false', 'true', 'false']);
      assert.deepEqual((await checked(page, 'themes')).map((o) => o.checked), ['false', 'false', 'true']);
    } finally {
      await close(page);
    }
  });

  test('Admin → Settings: the same panel inline, the radio-card picker gone, the form’s save keeps the appearance', async () => {
    const page = await admin('/admin/settings');
    try {
      await poll(page, `document.querySelector('[data-appearance-panel="inline"]')`, 'the Appearance section');
      const old = await page.evaluate<{ field: boolean; radios: number; legend: boolean; previews: number }>(`({
        field: Boolean(document.querySelector('[data-palette-field]')),
        radios: document.querySelectorAll('main input[type=radio][value="sunset"], main input[type=radio][value="emerald"], main input[type=radio][value="ocean"]').length,
        legend: [...document.querySelectorAll('legend')].some((l) => /colour theme/i.test(l.textContent)),
        previews: document.querySelectorAll('.te-palette-preview').length
      })`);
      assert.deepEqual(old, { field: false, radios: 0, legend: false, previews: 0 }, 'the radio-card picker is gone');
      assert.equal(await page.evaluate<string>(`document.querySelector('[data-appearance-panel="inline"] h2').textContent`), 'Appearance');

      await click(page, '[data-appearance-panel="inline"] [data-mode="auto"]');
      await click(page, '[data-appearance-panel="inline"] [data-palette-option="emerald"]');
      assert.equal(await attr(page, 'data-palette'), 'emerald');
      await click(page, '[data-appearance-panel="inline"] [data-appearance-footer] button:last-child');
      await poll(page, `document.body.textContent.includes(${JSON.stringify(SAVED_MESSAGE)})`, 'the toast');
      await poll(page, `!document.querySelector('[data-appearance-panel="inline"] [data-appearance-footer]')`, 'saved: no footer');
      assert.deepEqual(await stored(), { palette: 'emerald', default_mode: 'auto' });

      // The form's own save, straight after: no conflict, and the appearance stays.
      await page.evaluate(`[...document.querySelectorAll('button[type="submit"]')].find((b) => /Save settings/.test(b.textContent)).click(), true`);
      await poll(page, `document.body.textContent.includes('Settings saved')`, 'the form saved');
      assert.deepEqual(await stored(), { palette: 'emerald', default_mode: 'auto' });

      // Leaving the page with a preview puts it back.
      await click(page, '[data-appearance-panel="inline"] [data-palette-option="ocean"]');
      assert.equal(await attr(page, 'data-palette'), 'ocean');
      await page.evaluate(`document.querySelector('a[href="/admin"]').click(), true`);
      await poll(page, `!document.querySelector('[data-appearance-panel="inline"]')`, 'the dashboard');
      assert.equal(await attr(page, 'data-palette'), 'emerald');
    } finally {
      await close(page);
    }
  });

  test('a bottom sheet at 375 px: full width, at the bottom, at most 85% high, scrolls; the scrim and its close button close it', async () => {
    const page = await admin('/admin', { width: 375 });
    try {
      await openPanel(page);
      await click(page, '[data-appearance-popover] [data-mode="dark"]');
      const sheet = await page.evaluate<{ left: number; width: number; bottom: number; maxHeight: number; overflowY: string; scrim: string }>(`(() => {
        const d = document.querySelector('[data-appearance-popover]'), r = d.getBoundingClientRect(), cs = getComputedStyle(d);
        return { left: r.left, width: r.width, bottom: Math.round(r.bottom), maxHeight: parseFloat(cs.maxHeight), overflowY: cs.overflowY,
          scrim: getComputedStyle(document.querySelector('.te-appearance-scrim')).display };
      })()`);
      assert.deepEqual([sheet.left, sheet.width, sheet.bottom], [0, 375, 812]);
      assert.ok(Math.abs(sheet.maxHeight - 812 * 0.85) < 1, `max-height ${sheet.maxHeight}`);
      assert.equal(sheet.overflowY, 'auto');
      assert.equal(sheet.scrim, 'block');
      // Every option and the footer's buttons are at least 44 px, and the footer can be reached.
      const small = await page.evaluate<string[]>(`[...document.querySelectorAll('[data-appearance-popover] button')].filter((b) => {
        const r = b.getBoundingClientRect(); return r.height < 44 || r.width < 44;
      }).map((b) => b.textContent.trim())`);
      assert.deepEqual(small, []);
      await page.evaluate(`document.querySelector('[data-appearance-footer]').scrollIntoView({ block: 'end' }), true`);
      const footer = await page.evaluate<number>(`document.querySelector('[data-appearance-footer]').getBoundingClientRect().bottom`);
      assert.ok(footer <= 812, `the footer is on screen: ${footer}`);
      assert.equal(await page.evaluate<number>(`document.documentElement.scrollWidth`), 375, 'no sideways scroll');
      await clickAt(page, 187, 40);
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'the scrim closes it');
      assert.equal(await attr(page, 'data-theme'), 'light', 'and ends the preview');

      // Phones have no Escape key: a visible close button at the sheet's top right.
      await openPanel(page);
      await click(page, '[data-appearance-popover] [data-mode="dark"]');
      await page.evaluate(`document.querySelector('[data-appearance-popover]').scrollTop = 0, true`);
      assert.deepEqual(await closeButton(page), { label: 'Close', size: [44, 44], topRight: true, visible: true });
      await click(page, '[data-appearance-close]');
      await poll(page, `!document.querySelector('[data-appearance-popover]')`, 'the close button closes it');
      assert.equal(await attr(page, 'data-theme'), 'light', 'and ends the preview');
      assert.equal(await focused(page), 'button');
    } finally {
      await close(page);
    }
  });

  /* ------------------------------------------------------------ contrast */

  test('the open panel is AA, and the top bar opaque, in all six colour sets', async () => {
    const decoder = await newDecoder(chrome);
    try {
      for (const palette of PALETTES) {
        for (const theme of ['light', 'dark'] as const) {
          // Saved as Auto, on a device in `theme`: choosing `theme` changes nothing on screen
          // but shows the footer, so its buttons are measured too.
          await setSaved(palette, 'auto');
          const page = await admin('/admin', { theme, device: theme });
          try {
            // The top bar is solid: the page scrolling under it never shows through.
            const bar = await page.evaluate<{ alpha: number; blur: string; colour: string; page: string }>(`(() => {
              const bar = document.querySelector('.te-admin-toolbar'), cs = getComputedStyle(bar);
              const probe = document.createElement('canvas').getContext('2d');
              probe.fillStyle = cs.backgroundColor; probe.fillRect(0, 0, 1, 1);
              return { alpha: probe.getImageData(0, 0, 1, 1).data[3], blur: cs.backdropFilter, colour: cs.backgroundColor,
                page: getComputedStyle(document.querySelector('.te-admin')).backgroundColor };
            })()`);
            assert.deepEqual(bar, { alpha: 255, blur: 'none', colour: bar.page, page: bar.page }, `${palette} ${theme}: an opaque top bar`);
            await openPanel(page);
            await click(page, `[data-appearance-popover] [data-mode="${theme}"]`);
            await poll(page, `document.querySelector('[data-appearance-footer]')`, 'the footer');
            assert.deepEqual([await attr(page, 'data-palette'), await attr(page, 'data-theme')], [palette, theme], 'precondition');
            await page.evaluate(`document.fonts.ready.then(() => true)`);
            // The panel is fixed: measured in one screen at the top (the capture scrolls a page a
            // screen at a time and would compare it with pixels from further down).
            const height = await page.evaluate<number>('document.documentElement.scrollHeight');
            const found = await shortfalls(page, decoder, { roots: '[data-appearance-popover]', viewportHeight: Math.max(900, height) });
            assert.deepEqual([...new Set(found)], [], `${palette} ${theme}`);
          } finally {
            await close(page);
          }
        }
      }
    } finally {
      await close(decoder);
    }
  });
});
