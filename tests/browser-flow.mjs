// Optional real-browser smoke test. Reuse an installed Playwright; no package installation.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL || 'http://127.0.0.1:18765');
 await page.waitForFunction(()=>window.__GAME);
 await page.fill('#nick','測試');await page.locator('#nick-form button').click();await page.click('#btn-play');
 const dismiss=async()=>{for(let n=0;n<8 && await page.locator('#story.on').count();n++)await page.click('#btn-story-skip');};
 await dismiss();await page.waitForTimeout(250);
 assert.equal(await page.locator('#board .cell:not(.fog)').count(),12);
 await page.locator('#board .piece.gen').first().click({force:true});
 assert.equal(await page.evaluate(()=>window.__GAME.save().energy),79);
 await page.locator('#board .piece.gen').first().click({force:true});
 assert.equal(await page.evaluate(()=>window.__GAME.save().energy),79);
 // Seed only the requested order item; transaction is performed through the real Give button.
 await page.evaluate(()=>{
  const s=window.__GAME.save(),order=s.orders[0],el=[...document.querySelectorAll('#board .cell:not(.fog)')].find(x=>!x.querySelector('.piece'));
  s.board[+el.dataset.r*s.boardCols+(+el.dataset.c)]={kind:'item',...order.need,uid:'browser-order'};window.__GAME.refresh();
 });
 await page.locator('.order-give:not([disabled])').first().click();await dismiss();
 assert.equal(await page.evaluate(()=>window.__GAME.save().challenge.orders),1);
 // Resource fixture avoids waiting for dozens of energy regenerations during browser checks.
 await page.evaluate(()=>{const s=window.__GAME.save();s.coins=500;s.starSeeds=100;s.magicBag.materials.wood=10;s.inventory.push({kind:'item',chain:'star',tier:2,uid:'repair-1'},{kind:'item',chain:'star',tier:3,uid:'repair-2'});window.__GAME.refresh();});
 await page.click('#btn-map-play');
 await page.locator('[data-region-id="village"] .repair-region').click();
 assert.equal(await page.evaluate(()=>window.__GAME.save().map.regions.village),1);
 await page.locator('[data-region-id="village"] .repair-region').click();
 assert.equal(await page.locator('[data-region-id="castle"]').getAttribute('data-step'),'0');
 assert.equal(await page.locator('[data-region-id="castle"] .repair-region').isEnabled(),true);
 await page.locator('#map [data-back="play"]').click();await dismiss();
 await page.waitForFunction(()=>document.querySelectorAll('#board .cell:not(.fog)').length===20);
 assert.equal(await page.locator('#board .cell:not(.fog)').count(),20);
 await page.click('#btn-shop');await page.locator('[data-offer-id="star-item"]').click();
 await page.locator('#shop [data-back="play"]').click();await dismiss();
 await page.click('#btn-inv-toggle');
 const before=await page.evaluate(()=>window.__GAME.save().inventory.length);
 await page.locator('#inv-cells .piece').first().click();
 assert.equal(await page.evaluate(()=>window.__GAME.save().inventory.length),before-1);
 await page.click('#btn-inv-toggle');
 // Expanded bag must be a floating panel, not consume the board's layout height.
 await page.evaluate(()=>{const s=window.__GAME.save();s.magicBag.capacity=24;for(let i=s.inventory.length;i<24;i++)s.inventory.push({kind:'item',chain:'star',tier:1,uid:'bag-'+i});window.__GAME.refresh();});
 await page.waitForTimeout(500);
 const boardBefore=await page.locator('#board').boundingBox();
 await page.click('#btn-inv-toggle');await page.waitForTimeout(500);
 const boardAfter=await page.locator('#board').boundingBox();
 assert.equal(boardAfter.height,boardBefore.height);assert.equal(boardAfter.y,boardBefore.y);
 await page.click('#btn-bag-close');
 const expected=await page.evaluate(()=>{const s=window.__GAME.save();return s.board.concat(s.inventory).filter(Boolean).map(x=>x.uid).sort();});
 for(const [width,height] of [[390,844],[820,1180],[1180,820],[375,667]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(500);
  const state=await page.evaluate(()=>({uids:window.__GAME.save().board.concat(window.__GAME.save().inventory).filter(Boolean).map(x=>x.uid).sort(),open:document.querySelectorAll('#board .cell:not(.fog)').length,rect:document.querySelector('#board').getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight,scroll:document.body.scrollWidth}));
  assert.deepEqual(state.uids,expected);assert.equal(state.open,20);assert.ok(state.rect.right<=width+1);assert.ok(state.rect.left>=0);assert.ok(state.scroll<=width);
  console.log(JSON.stringify({viewport:[width,height],board:state.rect,open:state.open}));
 }
 await page.reload();await page.waitForFunction(()=>window.__GAME);
 assert.equal(await page.evaluate(()=>window.__GAME.save().map.regions.village),2);
 assert.equal(await page.evaluate(()=>window.__GAME.save().challenge.orders),1);
 assert.deepEqual(await page.evaluate(()=>{const s=window.__GAME.save();return s.board.concat(s.inventory).filter(Boolean).map(x=>x.uid).sort();}),expected);
 assert.deepEqual(errors,[]);console.log('Browser flow PASS: generation/cooldown/order/repair/shop/bag/rotation/reload');
} finally {await browser.close();}
