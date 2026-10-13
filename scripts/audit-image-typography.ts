import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { launchChrome, findChrome, saveTheme, type Page } from '../server/test/chrome';
import { setTimeout as sleep } from 'node:timers/promises';
const out='docs/qa-results/image-typography'; await mkdir(out,{recursive:true});
const origin=process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:8103';
const chrome=await launchChrome(findChrome()!);
const report: any={bookingFixture:'Browser-only guest session and empty history; real catalogue/account; no booking submission',layouts:[],selections:[],errors:[],assets:[],interactions:[],zoom:[]};
const resume=process.argv.includes('--resume-interactions');
if(resume){const prior=JSON.parse(await readFile(out+'/browser-audit.json','utf8'));Object.assign(report,prior,{previousAttemptErrors:prior.errors,errors:[],interactions:[],zoom:[],resumedInteractions:true});}
async function wait(page:Page,expr:string){for(let i=0;i<450;i++){if(await page.evaluate<boolean>(`(()=>{try{return Boolean(${expr})}catch{return false}})()`))return;await sleep(100)}throw Error('Timeout: '+expr)}
let page:Page | undefined;
try{
 page=await chrome.newPage(); await page.send('Page.enable');
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:"const realFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;if(path==='/api/bookings/session')return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));if(path==='/api/bookings')return Promise.resolve(new Response(JSON.stringify({bookings:[]}),{status:200,headers:{'Content-Type':'application/json'}}));return realFetch(input,init)};window.__qaErrors=[];addEventListener('error',e=>{if(e.message)window.__qaErrors.push(e.message)});addEventListener('unhandledrejection',e=>window.__qaErrors.push(String(e.reason)));addEventListener('securitypolicyviolation',e=>window.__qaErrors.push('CSP '+e.violatedDirective+' '+e.blockedURI));"});
 await page.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await page.send('Page.navigate',{url:origin+'/booking'});await wait(page,"document.querySelector('.ride-page h1')");
 await page.evaluate('document.fonts.ready.then(()=>true)');
 await wait(page,"document.querySelector('.ride-form #ride-passengers')");
 const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(out+'/booking-current.png',Buffer.from(shot.data as string,'base64'));
 console.log('Browser loaded booking');
 if(!resume) { for(const theme of ['light','dark'] as const){await saveTheme(page,theme);
 for(const route of ['/','/explore','/destinations','/experiences','/tours','/booking','/journal','/about','/about#contact']){
 await page.send('Page.navigate',{url:origin+route});await wait(page,"document.querySelector('main h1')");await page.evaluate('document.fonts.ready.then(()=>true)');
 if(route==='/booking') await wait(page,"document.querySelector('.ride-form #ride-passengers')");
 for(const width of [320,375,390,768,1024,1440,1920]){
 await page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await sleep(60);
 report.layouts.push(await page.evaluate(`(()=>{const h=document.querySelector('main h1'),s=getComputedStyle(h),r=h.getBoundingClientRect();return {route:location.pathname+location.hash,theme:document.documentElement.dataset.theme,width:innerWidth,text:h.textContent,font:s.fontFamily,weight:s.fontWeight,size:s.fontSize,lineHeight:s.lineHeight,tracking:s.letterSpacing,color:s.color,overflow:document.documentElement.scrollWidth>innerWidth+1,headingClipped:r.left<0||r.right>innerWidth+1,fontLoaded:document.fonts.check('700 32px "Playfair Display"')&&[...document.fonts].some(f=>f.family.includes('Playfair Display')&&f.status==='loaded')}})()`));
 }
 if(route==='/booking'){ const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(out+'/booking-'+theme+'-1920.png',Buffer.from(shot.data as string,'base64')); }
 report.errors.push(...await page.evaluate<string[]>('window.__qaErrors'));
 console.log(theme,route,'widths checked');
 }
 }
 }
 await page.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await page.send('Page.navigate',{url:origin+'/explore'}); await wait(page,"document.querySelector('#explore-map button[aria-pressed]')");
 const content=await (await fetch(origin+'/api/content')).json();
 if(!resume || process.argv.includes('--refresh-selections')) { report.selections=[]; for(const dest of [...content.destinations,content.destinations.find((d:any)=>d.id==='mirissa'),content.destinations.find((d:any)=>d.id==='ella')]){
 await page.evaluate(`[...document.querySelectorAll('#explore-map button[aria-pressed]')].find(b=>b.textContent.trim()===${JSON.stringify(dest.name)}).click(),true`);
 await sleep(450);
 report.selections.push(await page.evaluate(`(async()=>{const imgs=[...document.querySelectorAll('#explore-map img')].filter(i=>i.getAttribute('src')===${JSON.stringify(dest.image)});for(const img of imgs){await Promise.race([img.decode().catch(()=>{}),new Promise(r=>setTimeout(r,4000))]);}return {id:${JSON.stringify(dest.id)},expected:${JSON.stringify(dest.image)},images:imgs.map(i=>({src:i.getAttribute('src'),current:i.currentSrc,alt:i.alt,decoded:i.complete&&i.naturalWidth>0,visible:i.getBoundingClientRect().width>0&&i.getBoundingClientRect().height>0})),selected:[...document.querySelectorAll('#explore-map button[aria-pressed="true"]')].map(b=>b.textContent.trim())}})()`));console.log('Selected',dest.id);
 }

 }
 // Injected image failure: verify a new selection does not inherit a previous source's retry state.
 await page.evaluate(`document.querySelector('#explore-map img[src*=ella]').dispatchEvent(new Event('error')),true`);await sleep(100);
 await page.evaluate(`document.querySelector('#explore-map img[src*=ella]').dispatchEvent(new Event('error')),true`);await sleep(100);
 for(const name of ['Mirissa','Ella']){await page.evaluate(`[...document.querySelectorAll('#explore-map [role=group] button')].find(b=>b.textContent.trim()===${JSON.stringify(name)}).click(),true`);await sleep(400);}
 report.interactions.push(await page.evaluate("({action:'simulated-error-selection-reset',states:[...document.querySelectorAll('#explore-map img[src*=ella]')].map(i=>i.dataset.imageState)})"));
 // Observe every selected mobile thumbnail while it is actually visible.
 report.mobileSelections=[];
 await page.send('Emulation.setDeviceMetricsOverride',{width:375,height:1000,deviceScaleFactor:1,mobile:false});
 for(const dest of content.destinations){
 await page.evaluate(`[...document.querySelectorAll('#explore-map [role=group] button')].find(b=>b.textContent.trim()===${JSON.stringify(dest.name)}).click(),true`);await sleep(350);
 report.mobileSelections.push(await page.evaluate(`(async()=>{const img=[...document.querySelectorAll('#explore-map img')].find(i=>i.getAttribute('src')===${JSON.stringify(dest.image)}&&i.getBoundingClientRect().width>0);if(!img)return {id:${JSON.stringify(dest.id)},decoded:false};img.scrollIntoView({block:'center'});try{await img.decode()}catch{}return {id:${JSON.stringify(dest.id)},src:img.getAttribute('src'),decoded:img.naturalWidth>0,alt:img.alt}})()`));
 }
 await page.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 // Every published destination/editorial photo decodes under the built server's CSP.
 const urls=[...new Set(['destinations','experienceCategories','featuredExperiences','tours','articles','hiddenGems','photoStories','heroSlides'].flatMap(key=>content[key].flatMap((row:any)=>[row.image,...(row.gallery??[])])))];
 for(const url of urls){const http=await fetch(new URL(url,origin));const decoded=await page.evaluate<boolean>(`(async()=>{const i=new Image();i.src=${JSON.stringify(url)};try{await i.decode();return i.naturalWidth>0}catch{return false}})()`);report.assets.push({url,status:http.status,decoded});}
 // Filter actual markers, select a Leaflet marker, restore all locations, then refresh.
 await page.evaluate("document.querySelector('#explore-map').scrollIntoView(),true");await wait(page,"document.querySelector('#explore-map .leaflet-marker-icon')");
 await page.evaluate("[...document.querySelectorAll('#explore-map button[aria-pressed]')].find(b=>b.textContent.trim().startsWith('Beaches')).click(),true");await sleep(400);
 report.interactions.push(await page.evaluate("({action:'beach-filter',names:[...document.querySelectorAll('#explore-map .leaflet-marker-icon')].map(m=>m.getAttribute('aria-label'))})"));
 await page.evaluate("document.querySelector('#explore-map .leaflet-marker-icon[aria-label=\"Mirissa\"]').click(),true");await sleep(450);
 report.interactions.push(await page.evaluate("({action:'mirissa-marker',selected:document.querySelector('#explore-map [role=group] button[aria-pressed=true]')?.textContent.trim()})"));
 await page.evaluate("[...document.querySelectorAll('#explore-map button[aria-pressed]')].find(b=>b.textContent.trim().startsWith('All')).click(),true");await sleep(1800);
 const beforeTiles=await page.evaluate<string[]>("[...document.querySelectorAll('#explore-map .leaflet-tile')].map(i=>{const u=new URL(i.src);return u.hostname+u.pathname.split('/').slice(0,-3).join('/')})");
 await page.evaluate("document.querySelector('button[aria-label*=\"Switch to\"]').click(),true");await sleep(200);
 const afterTiles=await page.evaluate<string[]>("[...document.querySelectorAll('#explore-map .leaflet-tile')].map(i=>{const u=new URL(i.src);return u.hostname+u.pathname.split('/').slice(0,-3).join('/')})");
 report.interactions.push({action:'theme-keeps-light-map',sameTiles:JSON.stringify([...new Set(beforeTiles)])===JSON.stringify([...new Set(afterTiles)])});
 await page.send('Page.reload');await wait(page,"document.querySelector('#explore-map img[src*=ella]')");report.interactions.push({action:'refresh-ella',passed:true});
 await page.evaluate("document.querySelector('#explore-map').scrollIntoView(),true");await wait(page,"document.querySelector('#explore-map img[src*=ella]')?.naturalWidth>0 && document.querySelectorAll('#explore-map .leaflet-marker-icon').length===20");await sleep(1200);
 const mapShot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(out+'/explore-final.png',Buffer.from(mapShot.data as string,'base64'));
 await page.send('Page.navigate',{url:origin+'/destinations/ella'});await wait(page,"document.querySelector('main h1')?.textContent==='Ella'");
 await page.send('Page.navigate',{url:origin+'/destinations/mirissa'});await wait(page,"document.querySelector('main h1')?.textContent==='Mirissa'");
 await page.send('Page.navigate',{url:origin+'/destinations/ella'});await wait(page,"document.querySelector('main h1')?.textContent==='Ella'");
 report.interactions.push(await page.evaluate("({action:'destination-route-switch',src:document.querySelector('.te-page-hero img')?.getAttribute('src')})"));
 for(const theme of ['light','dark'] as const){await saveTheme(page,theme);for(const width of [375,1440]){
 await page.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await page.send('Page.navigate',{url:origin+'/booking'});await wait(page,"document.querySelector('.ride-form #ride-passengers')");await page.evaluate('document.fonts.ready.then(()=>true)');
 const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(out+'/booking-'+theme+'-'+width+'.png',Buffer.from(shot.data as string,'base64'));
 await page.evaluate("document.documentElement.style.fontSize='200%',true");
 report.zoom.push(await page.evaluate("({kind:'200-percent-root-text',theme:document.documentElement.dataset.theme,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,headingClipped:document.querySelector('h1').getBoundingClientRect().right>innerWidth+1})"));
 await page.evaluate("document.documentElement.style.fontSize='',true");
 }}
 assert.ok(report.layouts.every((x:any)=>!x.overflow&&!x.headingClipped&&x.fontLoaded),'heading layout/font failures');
 assert.ok(report.layouts.filter((x:any)=>x.route!=='/').every((x:any)=>x.weight==='700'),'inner H1 weights');
 assert.ok(report.selections.every((x:any)=>x.images.length===2&&x.images.every((i:any)=>(i.visible===false||i.decoded)&&i.src===x.expected)),'selection images');
 assert.ok(report.mobileSelections.length===20&&report.mobileSelections.every((x:any)=>x.decoded),'visible mobile selections');
 assert.ok(report.assets.every((x:any)=>x.status===200&&x.decoded),'image loading');
 assert.ok(report.zoom.every((x:any)=>!x.overflow&&!x.headingClipped),'enlarged text layout');
 assert.ok(report.interactions.find((x:any)=>x.action==='beach-filter').names.every((name:string)=>content.destinations.some((d:any)=>d.name===name&&d.category.includes('Beaches'))),'beach markers');
 assert.equal(report.interactions.find((x:any)=>x.action==='mirissa-marker').selected,'Mirissa');
 assert.equal(report.interactions.find((x:any)=>x.action==='theme-keeps-light-map').sameTiles,true);
 assert.ok(report.interactions.find((x:any)=>x.action==='simulated-error-selection-reset').states.every((x:string)=>x==='ready'));
 assert.equal(report.errors.length,0,'runtime/CSP errors');
 console.log('Final assertions passed');


}catch(e){report.errors.push(String(e));console.error(e);if(page){await writeFile(out+'/failure.json',JSON.stringify(await page.evaluate('({body:document.body.innerText,errors:window.__qaErrors,href:location.href})'),null,2));const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(out+'/failure.png',Buffer.from(shot.data as string,'base64'));}process.exitCode=1}
finally{await writeFile(out+'/browser-audit.json',JSON.stringify(report,null,2));await chrome.close()}
