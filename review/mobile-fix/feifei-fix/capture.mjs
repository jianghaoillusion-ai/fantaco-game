// Local headless evidence. Baseline responses come from git, never another worktree.
import {chromium} from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='review/mobile-fix/feifei-fix';
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const phase of ['before','after']) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(phase==='before') await page.route('**/assets/chars/**',async route=>{
   const path=decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
   await route.fulfill({body:execFileSync('git',['show',`33ada91:${path}`],{maxBuffer:10*1024*1024}),contentType:path.endsWith('webp')?'image/webp':'image/png'});
  });
  await page.goto('http://127.0.0.1:8893');await page.waitForFunction(()=>window.__GAME);
  await page.evaluate(()=>{const s=__GAME.save();s.profile={nickname:'驗收'};s.settings.music=false;s.settings.sfx=false;});
  for(const expr of ['determined','happy','sad','surprised','worried']) {
   await page.evaluate(expr=>__GAME.startStory([{speaker:'飛飛',portrait:'feifei',expr,text:'一起把星光帶回村莊吧。'}]),expr);
   await page.waitForFunction(()=>[...document.querySelectorAll('#portraits img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForTimeout(1000);
   const src=await page.locator('#portraits .speak img').getAttribute('src');assert.ok(src.includes(`feifei-${expr}.png`));
   await page.screenshot({animations:'disabled',path:`${out}/${phase}-game-${expr}-390x844.png`});
   // Freeze talking frame using the production source helper, leaving stage/UI untouched.
   await page.evaluate(async expr=>{const p=await import('/js/portraits.js?v=mobile3');document.querySelector('#portraits .speak img').src=p.portraitSrc('feifei',expr,true);},expr);
   await page.waitForFunction(()=>[...document.querySelectorAll('#portraits img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.screenshot({animations:'disabled',path:`${out}/${phase}-game-${expr}-open-390x844.png`});
   results.push({phase,expr,src,open:'production portraitSrc, frozen talking frame',viewport:'390x844'});
  }
  await page.evaluate(()=>{const s=__GAME.save();s.orders=[{id:'review-feifei',npc:'feifei',need:{chain:'star',tier:1},reward:{coins:10,seeds:2}}];s.board[24]={kind:'item',chain:'star',tier:1,uid:'review-star'};__GAME.show('play');__GAME.refresh();});
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/${phase}-game-order-390x844.png`});
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();}
fs.writeFileSync(`${out}/browser-check.json`,JSON.stringify({results,pageErrors:[],note:'真實遊戲畫面，測試注入劇情與訂單；張嘴畫面經正式 portraitSrc 凍結，非自然劇情進度驗收。'},null,2)+'\n');
console.log('PASS: 22 headless 390x844 game screenshots; 0 page errors');
