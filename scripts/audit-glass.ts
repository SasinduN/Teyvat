/** Read-only glass viewport audit; writes evidence even when browser startup fails. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { findChrome, launchChrome, type Chrome } from '../server/test/chrome';
import type { SiteContentPayload } from '../shared/api';

const base = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:5175';
const response = await fetch(`${base}/api/content`);
if (!response.ok) throw Error(`Content API returned ${response.status}`);
const content = await response.json() as SiteContentPayload;
const routes = ['/', '/plan', '/journal', '/destinations', '/tours', '/experiences', '/about', '/about#contact', '/photo-credits',
  ...content.destinations.map(row => `/destinations/${row.id}`),
  ...content.tours.map(row => `/tours/${row.id}`),
  ...content.featuredExperiences.map(row => `/experiences/${row.id}`),
  ...content.articles.map(row => `/journal/${row.id}`)];
const widths = [320, 375, 430, 768, 1024, 1440, 1920];
const browsers = [
  { name: 'Chrome', executable: findChrome() },
  { name: 'Edge', executable: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' }
];
const report: Array<Record<string, unknown>> = [];
for (const browser of browsers) {
  let chrome: Chrome | undefined;
  try {
    if (!browser.executable || !existsSync(browser.executable)) throw Error('Browser not installed.');
    chrome = await launchChrome(browser.executable);
    const page = await chrome.newPage();
    await page.send('Page.enable');
    for (const route of routes) for (const width of widths) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      await page.send('Page.navigate', { url: `${base}${route}` });
      const deadline = Date.now() + 15000;
      while (!await page.evaluate('Boolean(document.querySelector("main h1"))')) {
        if (Date.now() > deadline) throw Error(`Page heading did not load: ${route}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const result = await page.evaluate<Record<string, unknown>>(`(async () => {
        await document.fonts.ready;
        const quiet = document.createElement('style');
        quiet.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}[data-reveal]{opacity:1!important;transform:none!important}';
        document.head.append(quiet);
        const samples = [];
        for (const theme of ['light', 'dark']) {
          document.documentElement.dataset.theme = theme;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const panels = [...document.querySelectorAll('.te-nav, .te-hero-panel, .te-cta-group, .te-card')];
          samples.push({theme, heading: document.querySelector('main h1')?.textContent,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            geometry: panels.map(panel => {const r = panel.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];}),
            blur: [...document.querySelectorAll('.te-hero-panel')].map(panel => getComputedStyle(panel).backdropFilter),
            scrollbar: getComputedStyle(document.documentElement).scrollbarWidth});
        }
        const shift = samples[0].geometry.some((r, i) => r.some((v,j) => Math.abs(v - samples[1].geometry[i][j]) > 1));
        quiet.remove();
        return { samples, themeLayoutShift: shift, status: samples.some(s => !s.heading || s.overflow) || shift ? 'FAIL' : 'PASS' };
      })()`);
      report.push({ browser: browser.name, route, width, ...result });
    }
    await page.send('Page.navigate', { url: `${base}/` });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const interaction = await page.evaluate(`(async () => {
      window.scrollTo({top: 1100, behavior: 'instant'});
      await new Promise(resolve => setTimeout(resolve, 400));
      const button = document.querySelector('.te-scroll-top');
      const visible = button?.dataset.visible === 'true';
      button?.click();
      await new Promise(resolve => setTimeout(resolve, 100));
      return {visibleAfterScrolling: visible, scrollY: window.scrollY, headingFocused: document.activeElement === document.querySelector('main h1')};
    })()`);
    report.push({ browser: browser.name, interaction });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    report.push({ browser: browser.name, status: 'BLOCKED', routes, widths, themes: ['light', 'dark'], reason });
    console.error(`${browser.name}: ${reason}`);
  } finally {
    await chrome?.close();
  }
}
report.push({ browser: 'Firefox / Safari', status: 'NOT TESTED', reason: 'Not available in this Windows workspace.' });
mkdirSync('docs/qa-results', { recursive: true });
writeFileSync('docs/qa-results/glass-audit.json', JSON.stringify(report, null, 2));
console.log(`Glass audit: ${report.filter(row => row.status === 'PASS').length} viewport checks passed; ${report.filter(row => row.status === 'BLOCKED').length} browsers blocked.`);
if (report.some(row => row.status === 'FAIL' || row.status === 'BLOCKED')) process.exitCode = 1;
