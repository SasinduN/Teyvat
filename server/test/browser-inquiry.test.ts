/**
 * The enquiry modal and its form look exactly as approved: the modal at its
 * baseline commit (`InquiryModal` and `InquiryForm`, read with `git show`)
 * and as it is now are rendered in a real headless Chrome with the built
 * stylesheet, and no pixel may differ by more than 2 colour levels (see
 * TOLERANCE). A control renders the baseline twice, so the method proves
 * itself first.
 *
 * The honeypot (phase 6) must change nothing visible: the modal with it
 * removed from the page renders pixel for pixel the same. (Until redesign
 * PR 4 the baseline was faed6bc, the modal before the honeypot, which proved
 * the same thing.) A second test checks the honeypot can't be reached with
 * Tab.
 *
 * Needs `npm run build` first (for the CSS) and an installed Chrome; skipped
 * with a message otherwise. Offline on purpose: the site's Google Fonts are
 * not loaded, so both versions render in the same fallback fonts and no
 * network stall can hang the test. The honeypot's effect doesn't depend on
 * the typeface.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';

import { build, type Plugin } from 'esbuild';

import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The approved InquiryModal: the focus-trap PR's (d106be5), which opens it
 * with focus on its first control (the Close button, ringed when nothing
 * has been clicked yet). Before: redesign PR 4's 4e9942d, and before that
 * faed6bc, the last commit before phase 6 touched it.
 */
const BASELINE_COMMIT = 'd106be5';

const executable = findChrome();
const cssDir = join(REPO_ROOT, 'dist', 'assets');
const cssFile = existsSync(cssDir) ? readdirSync(cssDir).find((f) => /^index-.*\.css$/.test(f)) : undefined;

const skip = !executable
  ? 'no Chrome found; set CHROME_PATH to run these'
  : !cssFile
    ? 'no built CSS; run `npm run build` first'
    : false;

/** The files read from the baseline commit; the rest of the imports resolve from src/components. */
const BASELINE_FILES = ['InquiryModal', 'InquiryForm'];

/** Serves `baseline:InquiryModal`, and its `./InquiryForm`, from git. */
const baselinePlugin: Plugin = {
  name: 'baseline',
  setup(b) {
    b.onResolve({ filter: /^baseline:InquiryModal$/ }, () => ({ path: 'InquiryModal', namespace: 'baseline' }));
    b.onResolve({ filter: /^\.\/\w+$/ }, (args) =>
      args.namespace === 'baseline' && BASELINE_FILES.includes(args.path.slice(2))
        ? { path: args.path.slice(2), namespace: 'baseline' }
        : undefined
    );
    b.onLoad({ filter: /.*/, namespace: 'baseline' }, (args) => ({
      contents: execFileSync('git', ['show', `${BASELINE_COMMIT}:src/components/${args.path}.tsx`], {
        cwd: REPO_ROOT,
        encoding: 'utf8'
      }),
      loader: 'tsx',
      resolveDir: join(REPO_ROOT, 'src', 'components')
    }));
  }
};

/** A script that exposes `window.renderModal(subject?)` for one version of the modal. */
async function bundle(modalImport: string): Promise<string> {
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { InquiryModal } from '${modalImport}';
        window.renderModal = (subject) => {
          const props = { isOpen: true, onClose() {} };
          if (subject) props.prefilledSubject = subject;
          createRoot(document.getElementById('root')).render(React.createElement(InquiryModal, props));
        };
      `,
      resolveDir: REPO_ROOT,
      loader: 'tsx'
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    write: false,
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
    alias: { '@': resolve(REPO_ROOT, 'src'), '@shared': resolve(REPO_ROOT, 'shared') },
    plugins: [baselinePlugin],
    logLevel: 'silent'
  });
  return result.outputFiles[0].text;
}

const WIDTH = 1280;
const HEIGHT = 900;

/** A fresh page showing one version of the modal, animations finished; returns a PNG. */
async function screenshot(chrome: Chrome, script: string, css: string, subject?: string): Promise<{ page: Page; png: string }> {
  const page = await chrome.newPage();
  await page.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  await page.evaluate(`(() => {
    document.open();
    document.write(${JSON.stringify(`<!doctype html><html><head><meta charset="utf-8">
      <style>${css}</style></head><body><div id="root"></div></body></html>`)});
    document.close();
    return true;
  })()`);
  await page.evaluate(script);
  await page.evaluate(`(async () => {
    window.renderModal(${JSON.stringify(subject ?? '')});
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 1500)); // framer-motion's entrance, with room to spare
    return true;
  })()`);
  const { data } = (await page.send('Page.captureScreenshot', { format: 'png' })) as { data: string };
  return { page, png: data };
}

/**
 * Pixels that differ between two PNGs by more than `TOLERANCE` in any
 * channel, counted in the page.
 *
 * Why a tolerance at all: the same page rendered twice differs by exactly one
 * colour level in scattered pixels of the modal's large blurred shadow
 * (Chrome's rasteriser isn't bit-for-bit repeatable there). Measured: max
 * difference 1, only inside the shadow. A real change (moved text, a shifted
 * edge, a visible field) differs by tens or hundreds of levels, so 2 still
 * catches any of them.
 */
const TOLERANCE = 2;

async function differingPixels(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate<number>(`(async () => {
    const load = async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    };
    const [x, y] = await Promise.all([load(${JSON.stringify(a)}), load(${JSON.stringify(b)})]);
    if (x.width !== y.width || x.height !== y.height) return -1;
    let diff = 0;
    for (let i = 0; i < x.data.length; i += 4) {
      const d = Math.max(
        Math.abs(x.data[i] - y.data[i]),
        Math.abs(x.data[i + 1] - y.data[i + 1]),
        Math.abs(x.data[i + 2] - y.data[i + 2]),
        Math.abs(x.data[i + 3] - y.data[i + 3])
      );
      if (d > ${TOLERANCE}) diff++;
    }
    return diff;
  })()`);
}

describe('InquiryModal with the honeypot, in Chrome', { skip }, () => {
  let chrome: Chrome;
  let css: string;
  let baselineScript: string;
  let currentScript: string;

  before(async () => {
    chrome = await launchChrome(executable!);
    css = readFileSync(join(cssDir, cssFile!), 'utf8');
    baselineScript = await bundle('baseline:InquiryModal');
    currentScript = await bundle('@/components/InquiryModal');
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
  }, HOOK_TIMEOUT);

  for (const subject of [undefined, 'Experience: Safari in Yala']) {
    test(`looks identical: no pixel differs by more than 2 levels (${subject ? 'prefilled subject' : 'default subject'})`, async () => {
      const before = await screenshot(chrome, baselineScript, css, subject);
      const control = await screenshot(chrome, baselineScript, css, subject);
      const now = await screenshot(chrome, currentScript, css, subject);

      const keep = () => {
        const dir = mkdtempSync(join(tmpdir(), 'teyvat-modal-'));
        for (const [name, shot] of Object.entries({ before, control, now })) {
          writeFileSync(join(dir, `${name}.png`), Buffer.from(shot.png, 'base64'));
        }
        return dir;
      };

      // The method first: the baseline rendered twice must match itself
      // (within the rasteriser's one-level shadow jitter).
      const noise = await differingPixels(now.page, before.png, control.png);
      assert.equal(noise, 0, `the baseline differs from itself by ${noise} pixel(s): screenshots in ${noise ? keep() : ''}`);

      // Guard against comparing two blank pages: the modal really rendered.
      const heading = await now.page.evaluate<string>(`document.querySelector('form') ? 'form' : 'none'`);
      assert.equal(heading, 'form');
      const honeypots = await now.page.evaluate<number>(`document.querySelectorAll('[name="leave_blank_hp"]').length`);
      assert.equal(honeypots, 1, 'the current version has the honeypot');

      const diff = await differingPixels(now.page, before.png, now.png);
      assert.equal(diff, 0, `${diff} pixel(s) differ: screenshots in ${diff ? keep() : ''}`);

      // The honeypot changes no pixel: the same modal without it looks the same.
      await now.page.evaluate(`document.querySelector('[name="leave_blank_hp"]').closest('[aria-hidden="true"]').remove(), true`);
      await new Promise((r) => setTimeout(r, 300));
      const { data } = (await now.page.send('Page.captureScreenshot', { format: 'png' })) as { data: string };
      const withoutHoneypot = await differingPixels(now.page, now.png, data);
      assert.equal(withoutHoneypot, 0, `removing the honeypot changes ${withoutHoneypot} pixel(s)`);
    });
  }

  test('the honeypot is off-screen, hidden from screen readers, and never reached with Tab', async () => {
    const { page } = await screenshot(chrome, currentScript, css);
    const placement = await page.evaluate<{ right: number; hiddenFromAT: boolean; tabIndex: number }>(`(() => {
      const input = document.querySelector('[name="leave_blank_hp"]');
      return {
        right: input.getBoundingClientRect().right,
        hiddenFromAT: input.closest('[aria-hidden="true"]') !== null,
        tabIndex: input.tabIndex
      };
    })()`);
    assert.ok(placement.right < 0, `right edge at ${placement.right}`);
    assert.equal(placement.hiddenFromAT, true);
    assert.equal(placement.tabIndex, -1);

    // Walk the whole form with the Tab key, as a keyboard user would.
    await page.evaluate(`document.querySelector('form input:not([name="leave_blank_hp"])').focus(), true`);
    const visited: string[] = [];
    for (let i = 0; i < 20; i += 1) {
      visited.push(await page.evaluate<string>(`(() => {
        const el = document.activeElement;
        return (el && (el.getAttribute('name') || el.getAttribute('placeholder') || el.tagName)) || 'none';
      })()`));
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    }
    assert.ok(visited.length > 5 && new Set(visited).size > 3, `tabbing went nowhere: ${visited}`);
    assert.ok(!visited.includes('leave_blank_hp'), `the honeypot was reached: ${visited}`);
  });
});
