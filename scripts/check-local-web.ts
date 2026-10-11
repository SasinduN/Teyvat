import { findChrome, launchChrome } from '../server/test/chrome';
import { setTimeout as sleep } from 'node:timers/promises';

const executable = findChrome();
if (!executable) throw new Error('Chrome not found');
const chrome = await launchChrome(executable);
try {
  const page = await chrome.newPage();
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.webErrors = [];
    window.addEventListener('error', e => { if (e.message) window.webErrors.push(e.message); });
    window.addEventListener('unhandledrejection', e => window.webErrors.push(String(e.reason)));
    const originalError = console.error;
    console.error = (...args) => { window.webErrors.push(args.map(String).join(' ')); originalError(...args); };
  ` });
  const routes = process.argv.slice(2);
  for (const route of (routes.length ? routes : ['/', '/explore', '/destinations', '/destinations/ella', '/experiences', '/tours', '/journal', '/photo-credits', '/booking', '/admin'])) {
    await page.send('Page.navigate', { url: `http://127.0.0.1:5173${route}` });
    await sleep(2500);
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline && !(await page.evaluate<boolean>(`document.body.innerText.length > 100 && !document.body.innerText.includes('Loading…')`))) await sleep(250);
    await sleep(1000);
    if (route === '/explore') {
      await page.evaluate(`document.querySelector('#explore-map')?.scrollIntoView(), true`);
      await sleep(15000);
    }
    await page.evaluate(`Promise.all([...document.images].filter(i => !i.classList.contains('leaflet-tile')).map(i => {
      i.loading = 'eager';
      return Promise.race([i.decode().catch(() => null), new Promise(r => setTimeout(r, 12000))]);
    }))`);
    console.log(route, await page.evaluate(`JSON.stringify({
      title: document.title, text: document.body.innerText.slice(0,120),
      errors: window.webErrors,
      loadedImages: [...document.images].filter(i => !i.classList.contains('leaflet-tile') && i.complete && i.naturalWidth>0).length,
      failedImages: [...document.images].filter(i => !i.classList.contains('leaflet-tile') && (!i.complete || !i.naturalWidth)).map(i => i.currentSrc || i.src),
      markers: document.querySelectorAll('.leaflet-marker-icon').length,
      tiles: [...document.querySelectorAll('.leaflet-tile')].map(i => ({src:i.src,loaded:i.complete && i.naturalWidth>0}))
    })`));
  }
} finally {
  await chrome.close();
}
