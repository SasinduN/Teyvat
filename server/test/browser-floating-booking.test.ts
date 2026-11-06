import './test-db';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { findChrome, launchChrome, type Chrome, type Page } from './chrome';
import { COVERED_CONTROLS, LIFT } from './floating';
import { assertConnectedToTestDatabase, listen, migrateTestDatabase, resetContent, type RunningApp } from './helpers';
import { HOOK_TIMEOUT } from './timeouts';

const executable = findChrome();
const root = resolve('.');
const skip = !executable ? 'Chrome unavailable' : !existsSync(join(root, 'dist/index.html')) ? 'run build first' : false;
const CTA = '[data-floating-booking]';
const WA = '[data-whatsapp-button]';

describe('clean hero and floating ride CTA in Chrome', { skip, timeout: 240_000 }, () => {
  let on: RunningApp, off: RunningApp, chrome: Chrome;
  before(async () => {
    migrateTestDatabase(); await assertConnectedToTestDatabase(); await resetContent();
    // A same-origin image for every slide, each URL its own, in this guarded test DB:
    // carousel readiness must not depend on an external request succeeding.
    await pool.query(`update public.hero_slides set image='/images/photo-unavailable.svg?qa-carousel=' || id`);
    on = await listen(createApp({ media: null, bookings: true })); off = await listen(createApp({ media: null, bookings: false }));
    chrome = await launchChrome(executable!);
  }, HOOK_TIMEOUT);
  after(async () => { await chrome?.close(); await Promise.all([on?.close(), off?.close()]); await pool.end(); }, HOOK_TIMEOUT);
  async function wait(page: Page, expression: string, label: string) {
    const end = Date.now() + 20_000;
    while (Date.now() < end) { if (await page.evaluate<boolean>(`Boolean(${expression})`)) return; await sleep(80); }
    const state=await page.evaluate(`({visibility:document.visibilityState,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,focused:document.activeElement?.getAttribute('aria-label')||document.activeElement?.tagName,hovered:document.querySelector('#hero')?.matches(':hover'),busy:document.querySelector('#hero')?.getAttribute('aria-busy'),slides:[...document.querySelectorAll('.te-hero-slide')].map(el=>({active:el.dataset.active,src:el.querySelector('img')?.getAttribute('src'),width:el.querySelector('img')?.naturalWidth})),errors:window.__qaErrors})`);
    throw new Error(`Timed out: ${label}; ${JSON.stringify(state)}`);
  }
  async function open(path = '/', app = on) {
    const page = await chrome.newPage(); await page.send('Page.enable');
    await page.send('Emulation.setFocusEmulationEnabled',{enabled:true});
    await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__qaErrors=[]; addEventListener('error',e=>window.__qaErrors.push(e.message)); addEventListener('unhandledrejection',e=>window.__qaErrors.push(String(e.reason))); const original=console.error; console.error=(...args)=>{window.__qaErrors.push(args.map(String).join(' ')); original(...args);};` });
    await page.send('Page.navigate', { url: app.baseUrl + path });
    await wait(page, `document.querySelector('main h1') && document.querySelector('footer')`, path);
    await page.evaluate(`document.documentElement.style.scrollBehavior='auto'; true`);
    return page;
  }
  const shown = (selector: string) => `document.querySelector('${selector}')?.dataset.state === 'shown'`;

  test('hero loses only the requested text; photographs, arrows, pause and both CTAs work', async () => {
    const page = await open();
    assert.equal(await page.evaluate<boolean>(`/The Premium Sri Lanka Experience|Currently featured:/.test(document.querySelector('#hero').textContent)`), false);
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('.te-hero-badge,.te-hero-caption').length`), 0);
    assert.match(await page.evaluate<string>(`document.querySelector('#hero h1').textContent`), /See Sri Lanka Through a/);
    assert.deepEqual(await page.evaluate<string[]>(`[...document.querySelectorAll('.te-hero-actions a')].map(a=>a.getAttribute('href'))`), ['/explore','/plan']);
    await wait(page, `document.querySelector('.te-hero-slide[data-active=true] img')?.naturalWidth > 0`, 'initial photograph');
    const first = await page.evaluate<string>(`document.querySelector('.te-hero-slide[data-active=true] img').getAttribute('src')`);
    // Reading/focus within the hero deliberately suspends automatic playback.
    await page.evaluate(`document.querySelector('header a').focus(); true`);
    await page.evaluate(`document.querySelector('[aria-label="Pause slideshow"]').click(); true`);
    assert.equal(await page.evaluate<string>(`document.querySelector('[aria-label="Resume slideshow"]').getAttribute('aria-pressed')`), 'true');
    await page.evaluate(`document.querySelector('[aria-label="Next featured destination"]').click(); true`);
    await wait(page, `document.querySelector('.te-hero-slide[data-active=true] img')?.naturalWidth > 0 && document.querySelector('.te-hero-slide[data-active=true] img')?.getAttribute('src') !== ${JSON.stringify(first)} && document.querySelector('#hero').getAttribute('aria-busy') === 'false'`, 'next loaded photograph');
    await page.evaluate(`document.querySelector('[aria-label="Previous featured destination"]').click(); true`);
    await wait(page, `document.querySelector('.te-hero-slide[data-active=true] img')?.getAttribute('src') === ${JSON.stringify(first)}`, 'previous photograph');
    await sleep(7300);
    assert.equal(await page.evaluate<string>(`document.querySelector('.te-hero-slide[data-active=true] img').getAttribute('src')`),first,'pause holds the photograph');
    await page.evaluate(`document.querySelector('[aria-label="Resume slideshow"]').click(); true`);
    await page.evaluate(`document.querySelector('header a').focus(); true`);
    assert.equal(await page.evaluate<string>(`document.querySelector('[aria-label="Pause slideshow"]').getAttribute('aria-pressed')`), 'false');
    await wait(page, `document.querySelector('.te-hero-slide[data-active=true] img')?.naturalWidth > 0 && document.querySelector('.te-hero-slide[data-active=true] img')?.getAttribute('src') !== ${JSON.stringify(first)}`, 'automatic resumed slide');
    const directory=join(root,'docs/qa-results/content-cleanup');
    mkdirSync(directory,{recursive:true});
    const shot=await page.send('Page.captureScreenshot',{format:'png'});writeFileSync(join(directory,'home-clean.png'),Buffer.from(shot.data as string,'base64'));
    await page.evaluate(`document.querySelector('.te-hero-actions a[href="/explore"]').click(); true`);
    await wait(page,`location.pathname==='/explore' && document.querySelector('main h1')?.textContent==='Explore Sri Lanka'`,'hero Explore CTA');
    await page.send('Page.navigate',{url:on.baseUrl+'/'}); await wait(page,`document.querySelector('.te-hero-actions')`,'home again');
    await page.evaluate(`document.querySelector('.te-hero-actions a[href="/plan"]').click(); true`);
    await wait(page,`location.pathname==='/plan' && document.querySelector('main h1')?.textContent==='Plan Your Trip'`,'hero Plan CTA');
    assert.deepEqual(await page.evaluate<string[]>('window.__qaErrors'), []);
  });

  test('nine widths: shared fixed stack, labels, 56px icons and 12px WhatsApp gap', async () => {
    const page = await open('/about');
    await wait(page, shown(CTA), 'CTA'); await sleep(1200);
    for (const width of [320,375,390,430,768,1024,1280,1440,1920]) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      await sleep(180); await wait(page, shown(CTA), `${width} CTA`); await wait(page, shown(WA), `${width} WhatsApp`);
      const geometry = await page.evaluate<{gap:number; right:number; inside:boolean; overflow:boolean; width:number; height:number; text:string; labelInside:boolean; labelShown:boolean; position:string}>(`(() => {const link=document.querySelector('${CTA}'); const label=link.querySelector('.te-floating-label'); const l=label.getBoundingClientRect(); const a=link.getBoundingClientRect(), b=document.querySelector('${WA}').getBoundingClientRect(); return {gap:b.top-a.bottom,right:a.right-b.right,inside:a.left>=0&&a.right<=innerWidth&&a.top>=0&&b.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,width:a.width,height:a.height,text:label.textContent,labelInside:l.left>=0,labelShown:getComputedStyle(label).visibility==='visible',position:getComputedStyle(document.querySelector('[data-floating-actions]')).position};})()`);
      assert.equal(geometry.overflow,false,`${width} no overflow`); assert.equal(geometry.inside,true,`${width} inside viewport`);
      assert.ok(Math.abs(geometry.gap-12)<=1.1,`${width} gap ${geometry.gap}`); assert.ok(Math.abs(geometry.right)<1,`${width} aligned`);
      assert.ok(geometry.width>=55.9&&geometry.height>=55.9,`${width} icon size`); assert.equal(geometry.position,'fixed');
      assert.equal(geometry.text,'Book a ride'); assert.ok(geometry.labelInside,`${width} label inside`);
      if(width>=768) assert.ok(geometry.labelShown,`${width} label always shows`);
      for (const theme of ['light','dark']) {
        await page.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}; true`);
        const appearance=await page.evaluate(`(() => {const link=document.querySelector('${WA}'),s=getComputedStyle(link),r=link.getBoundingClientRect(),parent=getComputedStyle(link.parentElement);return {background:s.backgroundColor,color:s.color,filter:s.filter,textShadow:s.textShadow,border:s.borderTopWidth,radius:s.borderTopLeftRadius,animation:s.animationName,icon:getComputedStyle(link.querySelector('svg')).fill,before:getComputedStyle(link,'::before').animationName,after:getComputedStyle(link,'::after').animationName,parentShadow:parent.boxShadow,parentFilter:parent.filter,takesTap:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('a')===link};})()`);
        assert.deepEqual(appearance,{background:'rgb(37, 211, 102)',color:'rgb(255, 255, 255)',filter:'none',textShadow:'none',border:'0px',radius:'999px',animation:'none',icon:'rgb(255, 255, 255)',before:'te-chat-pulse',after:'te-chat-pulse-idle',parentShadow:'none',parentFilter:'none',takesTap:true},`${width} ${theme} WhatsApp appearance: its pulse only on the ring, and an independent tap`);
        await page.evaluate(`document.querySelector('${WA}').focus(); true`);
        assert.equal(await page.evaluate<string>(`getComputedStyle(document.querySelector('${WA}')).boxShadow`),'none','focus has no glow');
        assert.ok(await page.evaluate<number>(`parseFloat(getComputedStyle(document.querySelector('${WA}')).outlineWidth)`)>=3,'visible focus outline');
        await page.evaluate(`document.querySelector('${WA}').blur(); true`);
        const directory=join(root,'docs/qa-results/whatsapp-flat');mkdirSync(directory,{recursive:true});
        const screenshot=await page.send('Page.captureScreenshot',{format:'png'});
        writeFileSync(join(directory,`${theme}-${width}.png`),Buffer.from(screenshot.data as string,'base64'));
      }
      const controls=await page.evaluate<{name:string;left:number;right:number;height:number}[]>(`[...document.querySelectorAll('.te-nav-phone-actions a,.te-nav-phone-actions button')].filter(el=>el.getBoundingClientRect().width>0).map(el=>{const r=el.getBoundingClientRect();return {name:el.getAttribute('aria-label'),left:r.left,right:r.right,height:r.height};})`);
      assert.ok(controls.every(r=>r.left>=0&&r.right<=width&&r.height>=44),`${width} mobile navigation controls fit: ${JSON.stringify(controls)}`);
      const shot = await page.send('Page.captureScreenshot', { format:'png' });
      const directory=join(root,'docs/qa-results/content-cleanup'); mkdirSync(directory,{recursive:true}); writeFileSync(join(directory,`cta-${width}.png`),Buffer.from(shot.data as string,'base64'));
    }
    const anchored=`document.querySelector('[data-floating-actions]').getBoundingClientRect().bottom + (${LIFT})`;
    const before=await page.evaluate<number>(anchored);
    assert.equal(await page.evaluate<boolean>(`(() => {const main=document.querySelector('main');const before=JSON.stringify(main.getBoundingClientRect().toJSON());const link=document.querySelector('${CTA}');link.style.display='none';const after=JSON.stringify(main.getBoundingClientRect().toJSON());link.style.removeProperty('display');return before===after;})()`),true,'floating insertion does not change page geometry');
    await page.evaluate(`scrollTo(0,400); true`); await sleep(300);
    assert.equal(await page.evaluate<number>(anchored),before,'fixed stack during scroll: only its lift moves');
    await page.send('Emulation.setDeviceMetricsOverride',{width:320,height:240,deviceScaleFactor:1,mobile:true}); await sleep(200);
    assert.equal(await page.evaluate<boolean>(`document.querySelector('${CTA}').getBoundingClientRect().bottom<=innerHeight`),true,'short viewport remains inside');
    // Too short for a column under the header: a row, still on screen and clear of the navigation.
    await page.send('Emulation.setDeviceMetricsOverride',{width:320,height:180,deviceScaleFactor:1,mobile:true}); await wait(page,`document.querySelector('${CTA}').dataset.state==='shown' && document.querySelector('${CTA}').getBoundingClientRect().top>=document.querySelector('.te-nav').getBoundingClientRect().bottom && document.querySelector('${WA}').getBoundingClientRect().bottom<=innerHeight`,'short viewport avoids navigation');
  });

  test('public routes, light/dark AA contrast, reduced motion and keyboard navigation to the real ride page', async () => {
    const page=await open('/destinations');
    for(const path of ['/','/explore','/destinations','/experiences','/tours','/journal','/about','/about#contact']) {
      await page.send('Page.navigate',{url:on.baseUrl+path}); await wait(page,`document.querySelector('${CTA}') && document.querySelector('main h1')`,path);
      assert.equal(await page.evaluate<string>(`document.querySelector('${CTA}').getAttribute('href')`),'/booking');
      assert.equal(await page.evaluate<number>(`document.querySelectorAll('${CTA}').length`),1);
      assert.deepEqual(await page.evaluate<string[]>('window.__qaErrors'),[],`${path} JS errors`);
    }
    await page.send('Page.navigate',{url:on.baseUrl+'/about'}); await wait(page,shown(CTA),'visible CTA'); await wait(page,shown(WA),'visible WhatsApp');
    for(const theme of ['light','dark']) {
      await page.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}; true`); await sleep(250);
      const contrast=await page.evaluate<number>(`(() => { const s=getComputedStyle(document.querySelector('${CTA}')); const lum=c=>{const v=c.match(/[0-9.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];}; const a=lum(s.color),b=lum(s.backgroundColor); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); })()`);
      assert.ok(contrast>=4.5,`${theme} contrast ${contrast}`);
    }
    await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await page.evaluate<string>(`getComputedStyle(document.querySelector('${CTA}')).animationName`),'none');
    assert.equal(await page.evaluate<string>(`getComputedStyle(document.querySelector('${WA}')).transitionDuration`),'0s','chat respects reduced motion');
    const restingShadow=await page.evaluate<string>(`getComputedStyle(document.querySelector('${WA}')).boxShadow`);
    const chatRect=await page.evaluate<{x:number;y:number}>(`(() => {const r=document.querySelector('${WA}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',...chatRect});await sleep(200);
    assert.equal(await page.evaluate<string>(`getComputedStyle(document.querySelector('${WA}')).boxShadow`),restingShadow,'hover adds no glow');
    assert.equal(await page.evaluate<string>(`getComputedStyle(document.querySelector('${WA}')).transform`),'none','hover does not scale');
    await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
    await page.evaluate(`document.querySelector('${CTA}').focus(); true`);
    await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await page.evaluate<boolean>(`document.activeElement===document.querySelector('${WA}')`),true,'Tab reaches independent WhatsApp');
    assert.match(await page.evaluate<string>(`document.querySelector('${WA}').getAttribute('href')`),/^https:\/\/wa.me\/94771236478\?/);
    await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
    await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
    assert.equal(await page.evaluate<boolean>(`document.activeElement===document.querySelector('${CTA}')`),true,'Shift Tab reaches booking');
    assert.ok(await page.evaluate<number>(`parseFloat(getComputedStyle(document.querySelector('${CTA}')).outlineWidth)`)>0,'visible keyboard outline');
    await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await wait(page,`location.pathname==='/booking' && document.querySelector('main h1')?.textContent==='Book Your Ride'`,'ride navigation');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('${CTA}').length`),0,'no redundant CTA on booking');
    await wait(page,`document.querySelector('.ride-form')`,'ride catalog loaded');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('.ride-form input:not([type=radio]),.ride-form select').length`),6,'ride form unchanged');
    await page.send('Page.navigate',{url:on.baseUrl+'/booking/?tour=island-in-7-days'});
    await wait(page,`document.querySelector('main h1')`,'booking URL variant');
    assert.equal(await page.evaluate<number>(`document.querySelectorAll('${CTA}').length`),0,'booking trailing slash/query hidden');
  });

  test('rises above submit buttons, inputs and cookie banners, hides only for modals, and works without WhatsApp', async () => {
    const page=await open('/about'); await wait(page,shown(CTA),'CTA');
    for(const kind of ['form','input','cookie','modal']) {
      await page.evaluate(`(() => {const box=document.createElement('div');box.id='qa-obstruction';box.style='position:fixed;right:0;bottom:0;width:250px;height:190px;z-index:70';box.innerHTML=${JSON.stringify(kind==='input'?'<form><input aria-label="Important contact input" /></form>':'<form><button type="submit">Important submit</button></form>')}; if(${JSON.stringify(kind)}==='cookie')box.dataset.cookieBanner='';if(${JSON.stringify(kind)}==='modal'){box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');} if(['form','input'].includes(${JSON.stringify(kind)}))box.querySelector('button,input').style='position:absolute;right:20px;bottom:100px;width:200px;height:50px';(${JSON.stringify(kind)}==='input'?document.querySelector('main'):document.body).append(box);return true;})()`);
      if(kind==='modal'){
        await wait(page,`document.querySelector('${CTA}').dataset.state==='hidden'`,'modal hides it');
        assert.equal(await page.evaluate<number>(`document.querySelector('${CTA}').tabIndex`),-1);
      } else {
        const target=kind==='cookie'?'#qa-obstruction':'#qa-obstruction button,#qa-obstruction input';
        await wait(page,`(() => {const t=document.querySelector(${JSON.stringify(target)}).getBoundingClientRect();return [...document.querySelectorAll('[data-floating-actions] a,[data-floating-actions] .te-floating-label')].every(el=>{const r=el.getBoundingClientRect();return r.bottom<=t.top||r.left>=t.right||r.right<=t.left||r.top>=t.bottom;})&&document.querySelector('${CTA}').dataset.state==='shown';})()`,`${kind} protected, and the buttons still shown`);
      }
      await page.evaluate(`document.querySelector('#qa-obstruction').remove(); true`); await wait(page,`${shown(CTA)} && ${LIFT}===0`,'CTA back in place');
    }
    await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await page.evaluate(`document.querySelector('[aria-label="Open menu"]').click(); true`);
    await wait(page,`document.querySelector('${CTA}').dataset.state==='hidden' && document.querySelector('${WA}').dataset.state==='hidden'`,'both links clear of actual mobile menu');
    await page.evaluate(`document.querySelector('#mobile-navigation [aria-label="Close menu"]').click(); true`);
    await wait(page,shown(CTA),'menu closed');
    const disabled=await open('/destinations',off); assert.equal(await disabled.evaluate<number>(`document.querySelectorAll('${CTA}').length`),0,'feature off');
    await pool.query('update public.site_settings set whatsapp_number=null where id');
    const noWA=await open('/about'); await wait(noWA,shown(CTA),'independent CTA');
    assert.equal(await noWA.evaluate<number>(`document.querySelectorAll('${WA}').length`),0);
    assert.equal(await noWA.evaluate<number>(`document.querySelector('[data-floating-actions]').children.length`),1,'no empty chat placeholder');
  });

  test('a control arriving under a focused button: the stack rises as one, the focus stays and the control takes the tap', async () => {
    await pool.query("update public.site_settings set whatsapp_number='94771236478' where id");
    const page=await open('/about'); await wait(page,shown(CTA),'unobstructed booking link');
    const gap=`document.querySelector('${WA}').getBoundingClientRect().top-document.querySelector('${CTA}').getBoundingClientRect().bottom`;
    await page.evaluate(`(() => {const a=document.querySelector('${CTA}');a.focus();const r=a.getBoundingClientRect(),card=document.createElement('article');card.id='qa-card';card.className='te-card';card.style=\`position:fixed;z-index:44;left:\${r.left}px;top:\${r.top}px;width:\${r.width}px;height:\${r.height}px\`;card.innerHTML='<button>Discover</button>';card.firstChild.style.cssText='display:block;width:56px;height:56px;overflow:hidden';document.querySelector('main').append(card);return true;})()`);
    await wait(page,`${LIFT}>0 && (() => {const r=document.querySelector('#qa-card button').getBoundingClientRect();return Boolean(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#qa-card'));})()`,'the stack above the control');
    assert.equal(await page.evaluate<boolean>(`document.activeElement===document.querySelector('${CTA}')`),true,'focus stays on the button');
    assert.equal(await page.evaluate<boolean>(`document.querySelector('${CTA}').inert`),false,'never out of reach');
    assert.equal(await page.evaluate<number>(gap),12,'the two move together');
    await page.evaluate(`document.querySelector('#qa-card').remove(); true`);await wait(page,`${LIFT}===0`,'back down after the control');
  });

  test("scrolling catalogue cards: their controls stay unobstructed at nine widths, and the buttons stay", async () => {
    const page=await open('/experiences');
    for(const route of ['/experiences','/destinations','/tours']) {
      await page.send('Page.navigate',{url:on.baseUrl+route});await wait(page,`document.querySelector('main .te-card,main .destination-card')`,route);
      // Loaded and settled first: shrinking the window from 1920 px while the page still loads can leave the buttons late by more than the 350 ms below (they do step aside). A visitor can't do that.
      await wait(page,`document.readyState==='complete'&&document.body.dataset.route===${JSON.stringify(route)}`,route);await sleep(500);
      for(const width of [320,375,390,430,768,1024,1280,1440,1920]) {
        await page.send('Emulation.setDeviceMetricsOverride',{width,height:650,deviceScaleFactor:1,mobile:width<768});
        await page.evaluate(`document.querySelector('main .te-card,main .destination-card').scrollIntoView({block:'center',behavior:'instant'}); true`);await sleep(350);
        // The cards themselves can be under the buttons, which stay on screen: a phone's cards fill its width, so nothing could do both. Every control in them stays clear (COVERED_CONTROLS).
        const result=await page.evaluate<{overflow:boolean;collisions:string[];touch:boolean;shown:boolean}>(`(() => {const floats=[...document.querySelectorAll('[data-floating-actions] a')];return {overflow:document.documentElement.scrollWidth>innerWidth,collisions:${COVERED_CONTROLS},touch:floats.every(f=>{const r=f.getBoundingClientRect();return r.width>=55.9&&r.height>=55.9;}),shown:floats.every(f=>f.dataset.state==='shown'&&!f.inert)};})()`);
        assert.equal(result.overflow,false,route+' '+width);assert.deepEqual(result.collisions,[],route+' '+width);assert.ok(result.touch);assert.ok(result.shown,route+' '+width);
      }
    }
  });

});
