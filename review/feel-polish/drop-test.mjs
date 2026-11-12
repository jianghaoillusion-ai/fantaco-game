import {chromium} from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out=new URL('./',import.meta.url),browser=await chromium.launch({headless:true});const results=[];
for(const [name,width,height,dpr,scroll,zoom] of [
 ['iPhone 13',390,844,3,0,1],['iPhone 15 Pro',393,852,3,0,1],['iPhone SE',375,667,2,0,1],
 ['scroll 80 / DPR2',390,844,2,80,1]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8913');await page.waitForFunction(()=>window.__GAME);
 await page.evaluate(()=>{const g=__GAME,s=g.save();s.profile={nickname:'測試'};s.unlockedClumps=['all'];s.flags={seenOpen:true,'seen-intro-v1':true};s.discovered={'star:1':1,'star:2':1};g.show('play');});await page.waitForTimeout(300);
 if(scroll)await page.addStyleTag({content:'html,body{overflow:auto!important;height:1800px!important}#play{position:absolute!important;top:80px!important;height:844px!important}'});
 if(scroll)await page.evaluate(y=>window.scrollTo(0,y),scroll);
 const cdp=await context.newCDPSession(page);if(zoom!==1)await page.evaluate(()=>document.querySelector('meta[name=viewport]').content='width=device-width,initial-scale=1,maximum-scale=3,user-scalable=yes');if(zoom!==1)await page.waitForTimeout(200);if(zoom!==1)await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:zoom});
 const samples=[];
 for(let dest=0;dest<63;dest++){
  const src=dest===24?25:24;
  await page.evaluate(src=>{const s=__GAME.save();s.board=Array(63).fill(null);s.board[src]={uid:'drag-test',kind:'item',chain:'star',tier:1};__GAME.refresh();},src);
  await page.waitForTimeout(20);
  const coords=await page.evaluate(({src,dest})=>{const rect=i=>document.querySelector(`.cell[data-r="${Math.floor(i/7)}"][data-c="${i%7}"]`).getBoundingClientRect();const a=rect(src),b=rect(dest);return {a:{x:a.x+a.width/2,y:a.y+a.height/2},b:{x:b.x+b.width/2,y:b.y+b.height/2},scale:visualViewport.scale,scroll:scrollY};},{src,dest});
  // CDP touch coordinates are visual viewport CSS px; its scaling is handled by the renderer.
  const send=async(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:p.x,y:p.y,radiusX:1,radiusY:1,id:1}]});
  await send('touchStart',coords.a);
  for(let step=1;step<=4;step++)await send('touchMove',{x:coords.a.x+(coords.b.x-coords.a.x)*step/4,y:coords.a.y+(coords.b.y-coords.a.y)*step/4});
  await page.waitForTimeout(25);
  const visual=await page.evaluate(()=>{const f=document.querySelector('#drag-float'),r=f?.getBoundingClientRect(),hot=document.querySelector('.cell.merge-hot');return {x:r?.x+r?.width/2,y:r?.y+r?.height/2,hot:hot?+hot.dataset.r*7+(+hot.dataset.c):null};});
  await send('touchEnd');await page.waitForTimeout(20);
  const actual=await page.evaluate(()=>__GAME.save().board.findIndex(x=>x?.uid==='drag-test'));
  samples.push({dest,actual,hot:visual.hot,misclassified:dest!==actual,floatErrorPx:Math.hypot(visual.x-coords.b.x,visual.y-(coords.b.y-32)),...coords});
 }
 const vals=samples.map(s=>s.floatErrorPx).filter(Number.isFinite);
 const row={name,width,height,dpr,requestedScroll:scroll,requestedScale:zoom,observed:await page.evaluate(()=>({scrollY,scale:visualViewport.scale,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop})),meanPx:vals.reduce((a,b)=>a+b,0)/vals.length,maxPx:Math.max(...vals),misclassified:samples.filter(s=>s.misclassified).length,errors,samples};results.push(row);console.log(name,row.meanPx,row.maxPx,row.misclassified,row.observed);await context.close();
}
await browser.close();fs.writeFileSync(new URL('drop-accuracy.json',out),JSON.stringify(results,null,2));
