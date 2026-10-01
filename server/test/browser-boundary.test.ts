/**
 * The error boundaries in a real browser: one broken part of a page must not
 * take the rest with it. Uses the real `ErrorBoundary` and the admin's real
 * `PageCrash`, bundled with esbuild and rendered by React in headless Chrome.
 *
 * Skipped, with a message saying why, when no Chrome is installed.
 */
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

import { build } from 'esbuild';

import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { HOOK_TIMEOUT } from './timeouts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const executable = findChrome();

/** Test scenes, exposed as `window.scene(name)`. */
const ENTRY = `
  import React, { useState } from 'react';
  import { createRoot } from 'react-dom/client';
  import { MemoryRouter, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
  import { ErrorBoundary } from '@/lib/ErrorBoundary';
  import { PageCrash } from '@/admin/components/PageCrash';

  const Broken = () => { throw new Error('section exploded'); };
  const Section = ({ name, children }) =>
    React.createElement(ErrorBoundary, { name, fallback: null }, children);

  // The public page's pattern: sections side by side, one of them broken.
  const PublicLike = () => React.createElement('main', { id: 'page' },
    React.createElement(Section, { name: 'Hero' }, React.createElement('section', { id: 'hero' }, 'hero')),
    React.createElement(Section, { name: 'Map' }, React.createElement(Broken)),
    React.createElement(Section, { name: 'Footer' }, React.createElement('footer', { id: 'footer' }, 'footer')));

  // The admin's pattern: a boundary around the routed page, keyed by path.
  const Nav = () => {
    const navigate = useNavigate();
    return React.createElement('nav', null,
      React.createElement('button', { id: 'go-ok', onClick: () => navigate('/admin/ok') }, 'ok page'));
  };
  const Layout = () => {
    const location = useLocation();
    return React.createElement('div', null,
      React.createElement(Nav),
      React.createElement(ErrorBoundary, {
        name: 'admin page', resetKey: location.pathname,
        fallback: (reset) => React.createElement(PageCrash, { onRetry: reset })
      }, React.createElement(Routes, null,
        React.createElement(Route, { path: '/admin/broken', element: React.createElement(Broken) }),
        React.createElement(Route, { path: '/admin/ok', element: React.createElement('p', { id: 'ok-page' }, 'fine') }))));
  };
  const AdminLike = () => React.createElement(MemoryRouter, { initialEntries: ['/admin/broken'] }, React.createElement(Layout));

  // Retry: the child throws until told not to.
  let shouldThrow = true;
  const Flaky = () => { if (shouldThrow) throw new Error('flaky'); return React.createElement('p', { id: 'recovered' }, 'ok'); };
  // Inside a router, as in the app: PageCrash links back to the dashboard.
  const RetryLike = () => React.createElement(MemoryRouter, null, React.createElement(ErrorBoundary, {
    name: 'retry', fallback: (reset) => React.createElement(PageCrash, { onRetry: () => { shouldThrow = false; reset(); } })
  }, React.createElement(Flaky)));

  // Healthy children: the boundary renders exactly them, nothing added.
  const Healthy = () => React.createElement('div', { id: 'wrap' },
    React.createElement(ErrorBoundary, { name: 'x', fallback: null }, React.createElement('b', null, 'hi')));

  const scenes = { PublicLike, AdminLike, RetryLike, Healthy };
  window.scene = (name) => {
    document.body.innerHTML = '<div id="root"></div>';
    createRoot(document.getElementById('root')).render(React.createElement(scenes[name]));
  };
`;

async function bundle(): Promise<string> {
  const result = await build({
    stdin: { contents: ENTRY, resolveDir: REPO_ROOT, loader: 'tsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    write: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    alias: { '@': resolve(REPO_ROOT, 'src'), '@shared': resolve(REPO_ROOT, 'shared') },
    logLevel: 'silent'
  });
  return result.outputFiles[0].text;
}

describe('error boundaries, in Chrome', { skip: executable ? false : 'no Chrome found; set CHROME_PATH to run these' }, () => {
  let chrome: Chrome;
  let page: Page;

  const show = async (scene: string) => {
    await page.evaluate(`(window.scene(${JSON.stringify(scene)}), true)`);
    await sleep(200);
  };
  const text = (selector: string) =>
    page.evaluate<string | null>(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);

  before(async () => {
    chrome = await launchChrome(executable!);
    page = await chrome.newPage();
    await page.evaluate(await bundle());
  }, HOOK_TIMEOUT);

  after(async () => {
    await chrome?.close();
  }, HOOK_TIMEOUT);

  test('public: a section that throws disappears; its neighbours stay', async () => {
    await show('PublicLike');
    assert.equal(await text('#hero'), 'hero');
    assert.equal(await text('#footer'), 'footer');
    // Nothing rendered where the broken section was: no error box, no gap filler.
    assert.equal(await page.evaluate<number>(`document.querySelector('#page').children.length`), 2);
  });

  test('admin: a page that throws shows the card; navigating away recovers', async () => {
    await show('AdminLike');
    assert.match((await page.evaluate<string>('document.body.innerText')) ?? '', /This page hit an error/);
    assert.ok(await text('nav'), 'the navigation still works');

    await page.evaluate(`document.querySelector('#go-ok').click(), true`);
    await sleep(200);
    assert.equal(await text('#ok-page'), 'fine');
    assert.doesNotMatch((await page.evaluate<string>('document.body.innerText')) ?? '', /hit an error/);
  });

  test('admin: "Try again" renders the page again', async () => {
    await show('RetryLike');
    assert.match((await page.evaluate<string>('document.body.innerText')) ?? '', /This page hit an error/);
    await page.evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Try again')).click(), true`);
    await sleep(200);
    assert.equal(await text('#recovered'), 'ok');
  });

  test('a boundary adds no markup around healthy children', async () => {
    await show('Healthy');
    assert.equal(await page.evaluate<string>(`document.querySelector('#wrap').innerHTML`), '<b>hi</b>');
  });
});
