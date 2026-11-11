import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const out=process.env.SCREENSHOT_DIR;
mkdirSync(out,{recursive:true});
try {
for(const [device,width,height] of [['iphone15',393,852],['iphone-se',375,667],['ipad',820,1180]]) {
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:18769');
 await page.waitForFunction(()=>window.__GAME);
 await page.fill('#nick','小夏驗收');await page.locator('#nick-form button').click();await page.waitForTimeout(500);await page.screenshot({path:`${out}/v13-${device}-home.png`});await page.click('#btn-play');await page.waitForTimeout(1500);if(await page.locator('#story.on').count())await page.screenshot({path:`${out}/v13-${device}-story.png`});
 const dismiss=async()=>{for(let i=0;i<12;i++){if(await page.locator('#story.on').count())await page.click('#btn-story-skip');else if(await page.locator('#discover-fx.on').count()){await page.locator('#discover-fx .discover-stage').tap({force:true});await page.waitForTimeout(500);}else if(await page.locator('#discover.on').count())await page.click('#btn-discover-ok');else if(await page.locator('#result.on').count()){await page.screenshot({path:`${out}/v13-${device}-result.png`});await page.click('#btn-result-ok');}else break;await page.waitForTimeout(150);}};
 await dismiss();await page.waitForTimeout(600);
 const shot=async(name)=>page.screenshot({path:`${out}/v13-${device}-${name}.png`});
 const state=()=>page.evaluate(()=>window.__GAME.save());
 assert.equal(await page.locator('#board .cell').count(),63);assert.equal(await page.locator('.orders-row .order').count(),4);
 await page.mouse.move(0,0);await page.waitForTimeout(400);await shot('board');
 const hud=await page.locator('#btn-hud-settings').boundingBox();assert.ok(hud.x+hud.width<=width);
 if(width<=430){
  const row=await page.locator('.orders-row').boundingBox();
  const touch=await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:row.x+row.width-15,y:row.y+40}]});
  for(let x=row.x+row.width-35;x>row.x+20;x-=20)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:row.y+40}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await page.waitForTimeout(600);
  assert.ok(await page.locator('.orders-row').evaluate(el=>el.scrollLeft>0));await shot('fourth-order');
  await page.locator('.orders-row').evaluate(el=>el.scrollLeft=0);
 }

 await page.locator('.daily-card').tap();await page.waitForTimeout(400);await shot('challenge');await page.click('#btn-challenge-close');
 await page.locator('#btn-events').tap();await page.waitForTimeout(400);await shot('events');await page.click('#btn-event-close');
 const rect=await page.locator('#board').boundingBox();assert.ok(rect.x>=0 && rect.x+rect.width<=width+1 && rect.y+rect.height<=height);
 // Main starts with a populated board; free one item cell for the generation scenario.
 await page.evaluate(()=>{const s=__GAME.save();const i=s.board.findIndex(x=>x?.kind==='item');s.board[i]=null;__GAME.refresh();});
 // Actual generator tap charges one energy; automatic generator tap charges none.
 let s=await state(),energy=s.energy,count=s.board.filter(Boolean).length;
 await page.locator(`#board [data-uid="${s.board.find(x=>x?.gen==='star').uid}"]`).tap({force:true});await dismiss();
 s=await state();assert.equal(s.energy,energy-1);assert.equal(s.board.filter(Boolean).length,count+1);
 await page.locator(`#board [data-uid="${s.board.find(x=>x?.gen==='garden').uid}"]`).tap({force:true});assert.equal((await state()).energy,s.energy);
 // Controlled fixtures shorten waiting; every transaction below runs through real UI events.
 await page.evaluate(()=>{const s=window.__GAME.save();s.board[s.board.findIndex(x=>x?.kind==='item')]=null;s.board.find(x=>x?.gen==='garden').autoAt=Date.now()+60000;s.coins=500;s.starSeeds=100;s.inventory=[{kind:'item',chain:'star',tier:2,uid:'bag-check'}];window.__GAME.refresh();});
 await page.click('#btn-bag');await page.waitForTimeout(500);await shot('bag');
 s=await state();await page.locator('.bag-unlock').first().tap({force:true});assert.equal((await state()).coins,s.coins);assert.equal((await state()).starSeeds,s.starSeeds-4);
 await page.locator('#inv-cells .piece').first().tap({force:true});await page.waitForTimeout(1000);assert.ok((await state()).board.some(x=>x?.uid==='bag-check'));assert.equal((await state()).inventory.length,0);await page.click('#btn-bag-close');
 await page.click('#btn-go-shop');await page.waitForTimeout(350);await shot('shop');
 assert.ok(await page.locator('#shop-list .shop-tile').count()>0);await page.locator('#shop-list .btn:not([disabled])').first().tap({force:true});await page.click('#btn-shop-close');
 await page.click('#btn-hud-settings');await page.locator('#tog-music').uncheck();await page.locator('#tog-sfx').uncheck();await shot('settings');await page.click('#btn-settings-close');
 assert.equal((await state()).settings.music,false);assert.equal((await state()).settings.sfx,false);
 // Locked cells still reject a drag.
 const drag=async(from,to,invalid=false)=>{
  const a=await page.locator(from).boundingBox(),b=await page.locator(to).boundingBox();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
  if(invalid){assert.ok(await page.locator('#board .cell.merge-bad').count());await shot('red-return');}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(600);
 };
 const before=JSON.stringify((await state()).board);
 s=await state();await drag(`#board [data-uid="${s.board.find(x=>x?.gen==='star').uid}"]`,'#board .cell[data-r="0"][data-c="0"]',true);
 assert.equal(JSON.stringify((await state()).board),before);assert.equal(await page.locator('#drag-float.on').count(),0);
 // Bottom bag button accepts a real board drag; stored UID stays reserved and retrievable.
 const storeUid=(await state()).board.find(x=>x?.kind==='item').uid;
 await drag(`#board [data-uid="${storeUid}"]`,'#btn-bag');
 assert.ok((await state()).inventory.some(x=>x?.uid===storeUid));
 await page.click('#btn-bag');await page.locator(`#inv-cells [data-uid="${storeUid}"]`).tap({force:true});await page.waitForTimeout(700);await page.click('#btn-bag-close');
 assert.ok((await state()).board.some(x=>x?.uid===storeUid));
 // Merge adjacent to locked border opens exactly one cell.
 await page.evaluate(()=>{const s=window.__GAME.save();s.board.find(x=>x?.gen==='garden').autoAt=Date.now()+60000;s.board[8]={kind:'item',chain:'star',tier:1,uid:'merge-a'};s.board[9]={kind:'item',chain:'star',tier:1,uid:'merge-b'};window.__GAME.refresh();});
 const unlocked=(await state()).unlockedCells.length;
 await drag('#board [data-uid="merge-b"]','#board [data-uid="merge-a"]');await dismiss();
 assert.equal((await state()).unlockedCells.length,unlocked+1);assert.equal((await state()).board[8].tier,2);await shot('merge-fog');
 // Fulfill through main's clickable order card; coin reward exactly once.
 await page.evaluate(()=>{const s=window.__GAME.save(),o=s.orders[0];s.coinsEarned=39;s.xp=39;s.level=1;s.board[10]={kind:'item',...o.need,uid:'order-check'};window.__GAME.refresh();});
 s=await state();const o=s.orders[0],coins=s.coins,done=s.ordersDone;
 await page.locator(`.order[data-id="${o.id}"]`).tap({force:true});await page.waitForSelector('.order.task-leave',{state:'attached'});await page.waitForTimeout(700);await dismiss();
 s=await state();assert.equal(s.ordersDone,done+1);assert.equal(s.coins,coins+(o.reward.coins??((o.reward.seeds||0)+4)));assert.equal(s.orders.length,4);
 // A queued order animation must not let a held item resurrect after consumption.
 await page.evaluate(()=>{const s=window.__GAME.save(),o=s.orders.find(x=>x.procedural);o.reward.xp=0;o.intro=null;o.outro=null;s.board[10]={kind:'item',...o.need,uid:'race-order'};window.__GAME.refresh();});
 s=await state();const raceOrder=s.orders.find(x=>x.procedural),raceUid=raceOrder.reservedUid;
 const held=await page.locator(`#board [data-uid="${raceUid}"]`).boundingBox();
 const target=await page.locator('#board .cell:not(.locked)').evaluateAll(cells=>{const c=cells.find(x=>!x.querySelector('.piece'));const r=c.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 await page.locator(`.order[data-id="${raceOrder.id}"]`).tap({force:true});
 const raceCdp=await context.newCDPSession(page);
 await raceCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:held.x+held.width/2,y:held.y+held.height/2}]});
 await raceCdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[target]});
 await page.waitForTimeout(650);
 await raceCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await raceCdp.detach();await page.waitForTimeout(300);
 assert.equal((await state()).board.some(x=>x?.uid===raceUid),false,'consumed order item must not resurrect');await dismiss();
 // Board swaps preserve UIDs through real touch events.
 await page.waitForTimeout(3000);await dismiss();
 await page.evaluate(()=>{const s=__GAME.save();s.board.find(x=>x?.gen==='garden').autoAt=Date.now()+60000;s.board[8]={kind:'item',chain:'star',tier:1,uid:'swap-a'};s.board[9]={kind:'item',chain:'garden',tier:1,uid:'swap-b'};__GAME.refresh();});
 await drag('#board [data-uid="swap-a"]','#board [data-uid="swap-b"]');
 s=await state();assert.equal(s.board[8].uid,'swap-b');assert.equal(s.board[9].uid,'swap-a');await shot('swap');
 // A first automatic discovery uses the same celebration, once only.
 await page.evaluate(()=>{const s=__GAME.save();delete s.discovered['garden:1'];s.board[30]=null;const g=s.board.find(x=>x?.gen==='garden');g.queue=[{chain:'garden',tier:1},{chain:'garden',tier:1}];g.autoAt=0;__GAME.refresh();});
 await dismiss();await page.waitForSelector('#discover-fx.on',{timeout:5000});await shot('auto-discovery');
 const seeds=(await state()).starSeeds;await dismiss();
 await page.evaluate(()=>{const s=__GAME.save();s.board[30]=null;s.board.find(x=>x?.gen==='garden').autoAt=0;});
 await page.waitForTimeout(1200);assert.equal((await state()).starSeeds,seeds);assert.equal(await page.locator('#discover-fx.on').count(),0);
 // Full board routes manual and auto output to the bag; both full blocks safely.
 await page.evaluate(()=>{const s=__GAME.save();for(const cell of document.querySelectorAll('#board .cell:not(.locked)')){const i=+cell.dataset.r*7+(+cell.dataset.c);if(!s.board[i])s.board[i]={kind:'item',chain:'star',tier:1,uid:'full-'+i};}s.inventory=[];s.board.find(x=>x?.gen==='garden').autoAt=Date.now()+60000;__GAME.refresh();});
 s=await state();energy=s.energy;
 await page.locator(`#board [data-uid="${s.board.find(x=>x?.gen==='star').uid}"]`).tap({force:true});await dismiss();
 assert.equal((await state()).energy,energy-1);assert.equal((await state()).inventory.length,1);
 await page.evaluate(()=>__GAME.save().board.find(x=>x?.gen==='garden').autoAt=0);
 await page.waitForFunction(()=>__GAME.save().inventory.length===2);await dismiss();
 await page.click('#btn-bag');await shot('full-board-bag');await page.click('#btn-bag-close');
 await page.evaluate(()=>{const s=__GAME.save();s.inventory=Array.from({length:s.inventorySlots},(_,i)=>({kind:'item',chain:'star',tier:1,uid:'fullbag-'+i}));s.board.find(x=>x?.gen==='garden').autoAt=0;__GAME.refresh();});
 s=await state();energy=s.energy;const inv=s.inventory.length;
 await page.locator(`#board [data-uid="${s.board.find(x=>x?.gen==='star').uid}"]`).tap({force:true});await page.waitForTimeout(1100);
 assert.equal((await state()).energy,energy);assert.equal((await state()).inventory.length,inv);assert.equal((await state()).board.find(x=>x?.gen==='garden').autoAt,0);await shot('both-full');
 // Public completion hook goes through fly-in and completion animation; repeated calls cannot double-pay.
 await page.evaluate(()=>{const s=__GAME.save(),o=s.orders[0];o.intro=null;o.outro=null;s.board[10]={kind:'item',...o.need,uid:'hook-order'};__GAME.refresh();});
 s=await state();const hookDone=s.ordersDone;
 await page.evaluate(()=>{__GAME.completeTopOrder();__GAME.completeTopOrder();});
 await page.waitForSelector('.order.task-glow');await shot('complete-hook');await page.waitForSelector('.order.task-leave',{state:'attached'});await page.waitForTimeout(700);await dismiss();assert.equal((await state()).ordersDone,hookDone+1);
 await page.click('#btn-hud-settings');await page.locator('#vol-music').evaluate(el=>{el.value=35;el.dispatchEvent(new Event('input',{bubbles:true}));});await page.click('#btn-settings-close');
 const uids=(await state()).board.filter(Boolean).map(x=>x.uid).sort();await page.reload();await page.waitForFunction(()=>window.__GAME);s=await state();assert.deepEqual(s.board.filter(Boolean).map(x=>x.uid).sort(),uids);assert.equal(s.settings.music,false);assert.equal(s.settings.sfx,false);assert.equal(s.version,4);
 // Older expanded bags expose all 24 owned items; no hidden overflow.
 await page.click('#btn-play');await dismiss();
 await page.evaluate(()=>{const s=window.__GAME.save();s.inventorySlots=24;s.inventory=Array.from({length:24},(_,i)=>({kind:'item',chain:'star',tier:1,uid:'legacy-'+i}));window.__GAME.refresh();});
 await page.click('#btn-bag');assert.equal(await page.locator('#inv-cells .piece').count(),24);await page.click('#btn-bag-close');
 await page.click('#btn-go-map');await page.waitForTimeout(500);await shot('map');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({device,viewport:[width,height],board:rect,checks:'swap / first-auto-discovery-once / full-board-bag / both-full / complete-hook / generation / bag-store-return / shop / settings / touch red-return / merge-fog / order / order-drag-race / auto / full-board / reload / legacy24 / map / challenge / events',errors}));
 await context.close();
}
} catch(error) {console.error(error);throw error;} finally {await browser.close();}
