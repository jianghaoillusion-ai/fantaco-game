import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8893');await page.waitForFunction(()=>window.__GAME);
await page.evaluate(()=>{const s=__GAME.save();s.profile={nickname:'驗收'};s.settings.music=false;s.settings.sfx=false;__GAME.show('play');__GAME.refresh();});
assert.equal(await page.evaluate(()=>__GAME.save().board.filter(Boolean).length),3);
assert.ok(await page.evaluate(()=>__GAME.save().orders.every(o=>o.need.chain==='star')));
const cdp=await page.context().newCDPSession(page);
// Double tap a neutral area, then a real multi-touch pinch.
const scale=await page.evaluate(()=>visualViewport.scale);
for(let i=0;i<2;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:265}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:270,id:1},{x:240,y:270,id:2}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:90,y:270,id:1},{x:290,y:270,id:2}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.equal(await page.evaluate(()=>visualViewport.scale),scale);
await page.screenshot({path:'review/mobile-fix/after-no-zoom.png'});
// Regression: a delegated div must receive both rapid taps (story/bag pattern).
await page.evaluate(()=>{window.tapCount=0;const div=document.createElement('div');div.id='tap-probe';div.style.cssText='position:fixed;inset:250px 100px auto;height:30px;z-index:99999';div.onclick=()=>tapCount++;document.body.append(div);});
for(let i=0;i<2;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:265}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
assert.equal(await page.evaluate(()=>tapCount),2);await page.locator('#tap-probe').evaluate(e=>e.remove());
// Record animation frames during real CDP touch movement, no screenshots in the measured interval.
const stars=await page.locator('#board .piece:not(.gen)').all();const a=await stars[0].boundingBox(),b=await stars[1].boundingBox();
const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
await page.evaluate(()=>{window.dragFrames=[];window.recordDrag=true;function frame(t){const e=document.querySelector('#drag-float.on');if(e)dragFrames.push({t,transform:e.style.transform,left:e.style.left,top:e.style.top});if(recordDrag)requestAnimationFrame(frame);}requestAnimationFrame(frame);});
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
for(let i=1;i<=30;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/30+Math.sin(i/30*Math.PI)*30,y:y+(ty-y)*i/30}]});await page.waitForTimeout(16);}
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
const frames=await page.evaluate(()=>{recordDrag=false;return dragFrames;});
const gaps=frames.slice(1).map((f,i)=>f.t-frames[i].t).sort((a,b)=>a-b);
assert.ok(frames.length>=15);assert.ok(frames.every(f=>f.transform.startsWith('translate3d(')&&!f.left&&!f.top));
assert.equal(await page.evaluate(()=>__GAME.save().board.filter(c=>c?.chain==='star'&&c.tier===2).length),1);
fs.writeFileSync('review/mobile-fix/drag-frames.json',JSON.stringify({environment:'headless Chromium CDP touch, not iPhone',count:frames.length,medianMs:gaps[Math.floor(gaps.length/2)],p95Ms:gaps[Math.floor(gaps.length*.95)],frames},null,2));
await page.locator('#discover-fx.on').click();
await page.waitForTimeout(500);
// Real first delivery by dragging the merged star onto the story card.
const merged=await page.locator('#board .piece:not(.gen)').first().boundingBox();const order=await page.locator('.order[data-id="v1"]').boundingBox();
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:merged.x+20,y:merged.y+20}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:order.x+30,y:order.y+30}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__GAME.save().ordersDone),1);
// Simulate milestone states; production path is still the app's refresh/unlock logic.
for(const level of [2,5]){
 await page.evaluate(n=>{__GAME.save().restore.village=n;__GAME.show('play');__GAME.refresh();},level);
 assert.ok(await page.evaluate(id=>__GAME.save().board.some(c=>c?.gen===id),level===2?'garden':'forest'));
}
// Full legacy board stays intact, unavailable generators wait visibly and survive reload.
await page.evaluate(()=>{const s=__GAME.save();s.unlockedClumps=['all'];s.board=s.board.map((c,i)=>c||{kind:'item',chain:'goods',tier:1,uid:'legacy-'+i});s.board=s.board.map((c,i)=>c.gen==='forest'?{kind:'item',chain:'goods',tier:1,uid:'legacy-'+i}:c);s.inventory=[{kind:'item',chain:'goods',tier:2,uid:'bag-goods'}];__GAME.refresh();localStorage.setItem('fantaco.mianhuatang.save.v2',JSON.stringify(s));});
assert.equal(await page.locator('#btn-claim-generators').isVisible(),true);
const legacy=await page.evaluate(()=>JSON.stringify(__GAME.save().board));await page.reload();await page.waitForFunction(()=>window.__GAME);
assert.equal(await page.evaluate(()=>JSON.stringify(__GAME.save().board)),legacy);
await page.evaluate(()=>{__GAME.show('play');__GAME.refresh();const item=__GAME.save().board.find(c=>c?.chain==='goods');__GAME.selectUid(item.uid);});
assert.equal(await page.locator('#btn-sell').textContent(),'回收此系列');
await page.waitForTimeout(700);
await page.screenshot({path:'review/mobile-fix/recycle-demo.png'});
const value=await page.evaluate(()=>[...__GAME.save().board,...__GAME.save().inventory].filter(c=>c?.chain==='goods').reduce((n,c)=>n+(c.tier===1?1:c.tier*2),0));
const coins=await page.evaluate(()=>__GAME.save().coins);await page.locator('#btn-sell').click();
assert.ok(await page.evaluate(()=>![...__GAME.save().board,...__GAME.save().inventory].some(c=>c?.chain==='goods')));
assert.equal(await page.evaluate(()=>__GAME.save().coins),coins+value);
await page.locator('#btn-claim-generators').click();assert.ok(await page.evaluate(()=>__GAME.save().board.some(c=>c?.gen==='forest')));
assert.equal(await page.locator('#btn-claim-generators').isVisible(),false);
// Tier 1 regular sale via real UI.
await page.evaluate(()=>{const s=__GAME.save();const i=s.board.findIndex(c=>!c);s.board[i]={kind:'item',chain:'star',tier:1,uid:'sale-one'};__GAME.refresh();__GAME.selectUid('sale-one');});
assert.equal(await page.locator('#btn-sell').isEnabled(),true);await page.locator('#btn-sell').click();assert.ok(await page.evaluate(()=>!__GAME.save().board.some(c=>c?.uid==='sale-one')));
assert.deepEqual(errors,[]);const result={passed:true,frames:frames.length,medianMs:gaps[Math.floor(gaps.length/2)],p95Ms:gaps[Math.floor(gaps.length*.95)],errors};fs.writeFileSync('review/mobile-fix/mobile2-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
await browser.close();
