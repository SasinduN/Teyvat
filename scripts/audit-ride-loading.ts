import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { launchChrome, findChrome } from '../server/test/chrome';
const chrome=await launchChrome(findChrome()!);
try {
 const page=await chrome.newPage(); await page.send('Page.enable');
 await page.send('Page.navigate',{url:'http://127.0.0.1:5173/booking'});
 let state:any;
 for(let i=0;i<200;i++) { await sleep(100); state=await page.evaluate<any>("({text:document.querySelector('main')?.innerText||'',fields:document.querySelectorAll('main input,main select').length})"); if(state.fields>4 && !state.text.includes('Loading ride options'))break; }
 assert.ok(state.fields>4,'ride form should load');assert.ok(!state.text.includes('Something went wrong'),'no initialization error');assert.ok(!state.text.includes('Loading ride options'),'catalogue ready');
 const api=await page.evaluate<any>("(async()=>{const s=await fetch('/api/bookings/session',{method:'POST'});const b=await fetch('/api/bookings');return {session:s.status,history:b.status}})()");assert.equal(api.session,200);assert.equal(api.history,200);
 const enabled=await page.evaluate<any>("(async()=>{const c=await(await fetch('/api/bookings/catalog')).json();return {vehicles:c.vehicles,buttonEnabled:!document.querySelector('.ride-submit').disabled}})()");assert.ok(enabled.buttonEnabled);for(const id of ['car','suv']){const v=enabled.vehicles.find((v:any)=>v.id===id);assert.equal(v.passengerCapacity,5);assert.equal(v.luggageCapacity,3);assert.equal(v.acceptingRequests,true);}console.log(JSON.stringify({state,api,enabled}));await writeFile('docs/qa-results/image-typography/ride-live-loading.json',JSON.stringify({state,api,enabled},null,2));
}finally{await chrome.close()}
