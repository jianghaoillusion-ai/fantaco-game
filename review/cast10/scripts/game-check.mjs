import { chromium } from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const out='review/cast10';
const browser=await chromium.launch({headless:true});const results=[];
const control=process.argv.includes('--without-spirit');
const suffix=control?'-without-spirit':'';
try {
 for(const [width,height] of (control?[[1100,820]]:[[1100,820],[390,844],[844,390]])){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8799/');
  await page.locator('#nick').fill('cast10測試');await page.locator('#nick-form button').click();await page.locator('#title.on').waitFor();
  await page.evaluate(async(control)=>{const s=await import('/js/story.js?v=cast10');s.bindStory({show(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));const e=document.querySelector('#'+id);e.classList.add('on');}});s.startStory((control?[{speaker:'布魯',portrait:'bulu',text:'無精靈對照',expr:'happy'},{speaker:'姐姐',portrait:'jiejie',text:'同地面',expr:'happy'}]:[{speaker:'氣球精靈',portrait:'spirit',text:'cast10 對齊檢查',expr:'happy'},{speaker:'布魯',portrait:'bulu',text:'同一地面線',expr:'happy'},{speaker:'姐姐',portrait:'jiejie',text:'腰身微調',expr:'happy'}]));},control);
  await page.waitForTimeout(600);await page.locator('#portraits img').evaluateAll(async imgs=>Promise.all(imgs.map(i=>i.decode())));
  const rows=await page.evaluate(async()=>{const {metricsFor}=await import('/js/portraits.js?v=cast10');return [...document.querySelectorAll('#portraits .story-actor')].map(fig=>{const img=fig.querySelector('img'),r=img.getBoundingClientRect(),m=metricsFor(fig.dataset.id,img.src),s=r.height/m.h;return {id:fig.dataset.id,visible:getComputedStyle(fig).visibility!=='hidden',display:getComputedStyle(fig).display,opacity:getComputedStyle(fig).opacity,imgOpacity:getComputedStyle(img).opacity,clip:getComputedStyle(fig.parentElement).overflow,rect:[r.x,r.y,r.width,r.height],ancestors:[fig,fig.parentElement,fig.parentElement.parentElement,fig.parentElement.parentElement.parentElement].map(e=>({id:e.id,class:e.className,overflow:getComputedStyle(e).overflow,opacity:getComputedStyle(e).opacity,rect:[e.getBoundingClientRect().x,e.getBoundingClientRect().y,e.getBoundingClientRect().width,e.getBoundingClientRect().height]})),src:new URL(img.src).pathname+new URL(img.src).search,natural:[img.naturalWidth,img.naturalHeight],scale:s,foot:r.top+m.feet*s,top:r.top+m.bboxTop*s,left:r.left+m.contentL*s,right:r.left+m.contentR*s};});});
  await page.screenshot({path:`${out}/game-${width}x${height}${suffix}.png`});
  // Diagnostic only: reveal the existing bubble-covered soles, not production CSS.
  await page.addStyleTag({content:'#story .bubble{visibility:hidden!important}'});await page.screenshot({path:`${out}/game-${width}x${height}${suffix}-feet.png`});
  // Pixel diagnostic keeps layout and image dimensions unchanged, removes only
  // background/UI/shadows, then captures each actor independently.
  await page.addStyleTag({content:'#story,#story .story-stage,#story #portraits{background:white!important} #story::before,#story .story-bg,#story .bubble,#story .story-skip{display:none!important} #story .story-actor,#story .story-actor img{filter:none!important}'});
  for(const row of rows.filter(r=>r.visible)){
   await page.locator('#portraits .story-actor').evaluateAll((els,id)=>els.forEach(e=>e.style.setProperty('visibility',e.dataset.id===id?'visible':'hidden','important')),row.id);
   await page.screenshot({path:path.join(process.env.TMPDIR,`pixels-${width}x${height}-${row.id}.png`)});
  }
  results.push({viewport:[width,height],errors,rows});await context.close();
 }
 fs.writeFileSync(out+`/game-check${suffix}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
