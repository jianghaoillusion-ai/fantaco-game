import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
const phase=process.argv[2]||'before';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
if(phase==='before') await page.route('http://127.0.0.1:8893/**',async route=>{
 const path=decodeURIComponent(new URL(route.request().url()).pathname).slice(1)||'index.html';
 const type=path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.png')?'image/png':path.endsWith('.webp')?'image/webp':undefined;
 try {await route.fulfill({body:execFileSync('git',['show',`22a7d6d:${path}`],{maxBuffer:20*1024*1024}),contentType:type});} catch {await route.continue();}
});
await page.goto('http://127.0.0.1:8893');
await page.waitForFunction(()=>window.__GAME);
await page.evaluate(()=>{
 const s=__GAME.save();s.profile={nickname:'驗收'};s.settings.music=false;s.settings.sfx=false;s.unlockedClumps=['all'];
 s.board=Array(63).fill(null);s.board[24]={kind:'item',chain:'star',tier:1,uid:'test-a'};s.board[25]={kind:'item',chain:'star',tier:1,uid:'test-b'};
 s.orders=['feifei','spirit','jiejie'].map((npc,i)=>({id:'review-'+i,npc,need:{chain:'garden',tier:2},reward:{coins:10,seeds:2}}));
 __GAME.show('play');__GAME.refresh();
 document.querySelector('.daily-timer').textContent='19小時 6分';
});
await page.waitForTimeout(700);
await page.locator('.daily-timer').evaluate(el=>el.textContent='19小時 6分');
await page.screenshot({path:`review/mobile-fix/${phase}-delivery.png`});
await page.locator('.daily-timer').evaluate(el=>el.textContent='19小時 6分');
await page.locator('.orders-head').screenshot({path:`review/mobile-fix/${phase}-statusbar.png`});
const a=await page.locator('[data-uid="test-a"]').boundingBox();const b=await page.locator('[data-uid="test-b"]').boundingBox();
const cdp=await page.context().newCDPSession(page);
const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2;
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y}]});
await page.waitForTimeout(100);
await page.screenshot({path:`review/mobile-fix/${phase}-drag.png`});
if(phase==='after') {
 assert.equal(await page.locator('.cell.merge-target').count(),1);
 assert.notEqual(await page.locator('.cell.merge-target').evaluate(el=>getComputedStyle(el).boxShadow),'none');
 assert.equal(await page.locator('.cell.merge-target').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(230, 248, 207)');
}
const pos=await page.locator('#drag-float').boundingBox();
console.log(JSON.stringify({phase,finger:{x:tx,y},float:pos,aboveFinger:pos.y+pos.height<y}));
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForTimeout(100);
console.log('merged',await page.evaluate(()=>__GAME.save().board[25]?.tier));
if(phase==='after') {
 assert.ok(pos.y+pos.height<y);assert.equal(await page.evaluate(()=>__GAME.save().board[25]?.tier),2);
 await page.locator('.daily-timer').evaluate(el=>el.textContent='23小時 59分');
 const timer=await page.locator('.daily-timer').boundingBox();const bar=await page.locator('.daily-bar-track').boundingBox();assert.ok(timer.y+timer.height<=bar.y);
 const daily=await page.locator(".daily-card").boundingBox();assert.ok(timer.x>=daily.x && timer.x+timer.width<=daily.x+daily.width);
 await page.evaluate(()=>document.querySelector('#btn-hud-settings').click());
 await page.locator('#tog-haptics').uncheck();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fantaco.mianhuatang.save.v2')).settings.haptics),false);
 await page.locator('#btn-settings-close').click();
 // Real mouse path stays centered and invalid drop returns without throwing.
 const m=await page.locator('[data-uid]').first().boundingBox();
 await page.mouse.move(m.x+m.width/2,m.y+m.height/2);await page.mouse.down();await page.mouse.move(m.x+70,m.y+20);
 await page.waitForTimeout(50);const f=await page.locator('#drag-float').boundingBox();assert.ok(Math.abs(f.y+f.height/2-(m.y+20))<1);
 await page.mouse.move(2,2);await page.mouse.up();await page.waitForTimeout(400);assert.equal(await page.locator('#drag-float.on').count(),0);
 // Cancel a touch drag without changing the board.
 const old=await page.evaluate(()=>JSON.stringify(__GAME.save().board));
 const z=await page.locator('[data-uid]').first().boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:z.x+10,y:z.y+10}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:z.x+60,y:z.y+10}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert.equal(await page.evaluate(()=>JSON.stringify(__GAME.save().board)),old);
 await page.reload();await page.waitForFunction(()=>window.__GAME);assert.equal(await page.evaluate(()=>__GAME.save().settings.haptics),false);
 console.log('PASS: touch lift, merge targets, merge, mouse center, invalid drop, cancel, timer separation, setting persistence');
}

await browser.close();
assert.deepEqual(errors,[], 'no browser runtime errors');
