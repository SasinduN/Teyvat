// Must be first: points the server at the test database and removes every
// R2_* and Resend variable, or refuses to run.
import './test-db';

/**
 * The colour themes in Chrome (docs/plans/brand-themes.md, PR B):
 *
 *   - no flash: with JavaScript off, the first paint is already in the saved theme (the
 *     attribute is in the HTML, the colours in the stylesheet);
 *   - the visitor's light/dark choice works in every theme;
 *   - nothing a visitor's browser holds changes the theme (storage, the address);
 *   - Admin → Settings → Site colour theme: three radio cards with light and dark
 *     previews in their own colours, usable from the keyboard; a save changes this tab at
 *     once, and every page after it, public and admin.
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
import { PALETTES, type Palette } from '../../shared/palette';
import { findChrome, launchChrome, saveTheme, type Chrome, type Page } from './chrome';
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

describe('the colour themes, in Chrome', { skip, timeout: 4 * 60_000 }, () => {
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
    await pool.query(`update public.site_settings set palette = 'sunset' where id`);
  }, HOOK_TIMEOUT);

  after(async () => {
    await resetContent();
    await chrome?.close();
    await app?.close();
    await pool.end();
  }, HOOK_TIMEOUT);

  const setPalette = (palette: Palette) => pool.query('update public.site_settings set palette = $1 where id', [palette]);

  async function poll(page: Page, expression: string, what: string, ms = 20_000): Promise<void> {
    const until = Date.now() + ms;
    for (;;) {
      if (await page.evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
      if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  async function open(path: string, options: { scripts?: boolean; theme?: 'light' | 'dark'; before?: string } = {}): Promise<Page> {
    const page = await chrome.newPage();
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    // Every tab saves its light or dark: storage is shared, so an earlier tab's choice would carry over.
    await saveTheme(page, options.theme ?? 'light');
    if (options.before) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: options.before });
    if (options.scripts === false) await page.send('Emulation.setScriptExecutionDisabled', { value: true });
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await poll(page, `document.readyState === 'complete'`, path);
    return page;
  }
  const close = (page: Page) => page.send('Page.close').catch(() => undefined);
  const pageColour = (page: Page) => page.evaluate<string>(`getComputedStyle(document.body).backgroundColor`);
  const palette = (page: Page) => page.evaluate<string | null>(`document.documentElement.getAttribute('data-palette')`);

  test('no flash: with JavaScript off, the first paint is already in the saved theme', async () => {
    for (const p of PALETTES) {
      await setPalette(p);
      const page = await open('/tours', { scripts: false });
      try {
        assert.equal(await page.evaluate<boolean>(`Boolean(document.querySelector('main h1'))`), false, 'no script ran: nothing rendered');
        assert.equal(await palette(page), p);
        assert.equal(await pageColour(page), PAGE[p].light, `${p}: the page colour`);
        assert.equal(await page.evaluate<string>(`getComputedStyle(document.documentElement).colorScheme`), 'light');
      } finally {
        await close(page);
      }
    }
  });

  test('the visitor’s light and dark work in every theme', async () => {
    for (const p of PALETTES) {
      await setPalette(p);
      for (const theme of ['light', 'dark'] as const) {
        const page = await open('/destinations/ella', { theme });
        try {
          await poll(page, `document.querySelector('main h1')`, `${p} ${theme}`);
          assert.equal(await page.evaluate<string>('document.documentElement.dataset.theme'), theme);
          assert.equal(await palette(page), p);
          assert.equal(await pageColour(page), PAGE[p][theme], `${p} ${theme}`);
          // The headings follow too: the theme's deep colour on light, ivory on dark.
          const heading = await page.evaluate<string>(`getComputedStyle(document.querySelector('main h2')).color`);
          assert.notEqual(heading, await pageColour(page));
        } finally {
          await close(page);
        }
      }
    }
  });

  test('nothing in the visitor’s browser changes it: storage and the address are ignored', async () => {
    await setPalette('ocean');
    const page = await open('/?palette=emerald&data-palette=sunset', {
      before: `try {
        for (const key of ['site:palette', 'palette', 'site:colour-theme', 'theme-palette']) localStorage.setItem(key, 'emerald');
        sessionStorage.setItem('site:palette', 'sunset');
        document.cookie = 'palette=emerald; path=/';
      } catch {}`
    });
    try {
      await poll(page, `document.querySelector('main h1')`, 'the home page');
      assert.equal(await palette(page), 'ocean');
      assert.equal(await pageColour(page), PAGE.ocean.light);
      // The theme switch is the visitor's only control, and it changes light and dark, never the theme.
      await page.evaluate(`document.querySelector('[aria-label^="Switch to dark"]').click(), true`);
      await poll(page, `document.documentElement.dataset.theme === 'dark'`, 'dark');
      assert.equal(await palette(page), 'ocean');
      assert.equal(await pageColour(page), PAGE.ocean.dark);
    } finally {
      await close(page);
    }
  });

  test('Admin → Settings: the picker, its previews, the keyboard, a save, the next page load', async () => {
    const page = await open('/admin/login');
    try {
      await poll(page, `document.querySelector('#admin-email')`, 'the sign-in form');
      const status = await page.evaluate<number>(`fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.test', password: ${JSON.stringify(PASSWORD)} })
      }).then((r) => r.status)`);
      assert.equal(status, 200);
      await page.send('Page.navigate', { url: `${app.baseUrl}/admin/settings` });
      await poll(page, `document.querySelector('[data-palette-field]')`, 'the picker');
      assert.equal(await palette(page), 'sunset', 'the admin follows the theme');

      const picker = await page.evaluate<{ legend: string; radios: { value: string; checked: boolean; name: string }[]; previews: Record<string, string> }>(`(() => {
        const field = document.querySelector('[data-palette-field]');
        const previews = {};
        for (const box of field.querySelectorAll('.te-palette-preview')) previews[box.dataset.palette + ' ' + box.dataset.theme] = getComputedStyle(box).backgroundColor;
        return {
          legend: field.querySelector('legend').textContent,
          radios: [...field.querySelectorAll('input[type=radio]')].map((r) => ({ value: r.value, checked: r.checked, name: r.name })),
          previews
        };
      })()`);
      assert.equal(picker.legend, 'Site colour theme');
      assert.deepEqual(picker.radios.map((r) => [r.value, r.checked]), [['sunset', true], ['emerald', false], ['ocean', false]]);
      assert.equal(new Set(picker.radios.map((r) => r.name)).size, 1, 'one radio group');
      for (const p of PALETTES) {
        assert.equal(picker.previews[`${p} light`], PAGE[p].light, `${p} light preview`);
        assert.equal(picker.previews[`${p} dark`], PAGE[p].dark, `${p} dark preview`);
      }
      assert.match(await page.evaluate<string>(`document.querySelector('[data-palette-field]').textContent`), /every visitor .* next page load/i);

      // The keyboard: focus the chosen radio, then an arrow key moves the choice.
      await page.evaluate(`document.querySelector('[data-palette-field] input[value="sunset"]').focus(), true`);
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
      await poll(page, `document.querySelector('[data-palette-field] input[value="emerald"]').checked`, 'the arrow key');
      assert.equal(await palette(page), 'sunset', 'choosing changes nothing until it is saved');
      await page.evaluate(`document.querySelector('[data-palette-field] input[value="ocean"]').click(), true`);

      await page.evaluate(`[...document.querySelectorAll('button[type="submit"]')].find((b) => /Save settings/.test(b.textContent)).click(), true`);
      await poll(page, `document.documentElement.dataset.palette === 'ocean'`, 'the saved theme, applied here');
      assert.equal(await pageColour(page), PAGE.ocean.light);
      assert.equal((await pool.query('select palette from public.site_settings')).rows[0].palette, 'ocean');

      for (const path of ['/', '/destinations/ella', '/admin/settings']) {
        await page.send('Page.navigate', { url: app.baseUrl + path });
        await poll(page, `document.readyState === 'complete' && (document.body.dataset.route || document.querySelector('[data-palette-field]'))`, path);
        assert.equal(await palette(page), 'ocean', path);
      }
      assert.equal(await page.evaluate<boolean>(`document.querySelector('[data-palette-field] input[value="ocean"]').checked`), true, 'the form shows what is saved');
    } finally {
      await close(page);
    }
  });
});
