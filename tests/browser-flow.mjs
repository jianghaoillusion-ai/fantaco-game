// Reuse installed Playwright; no installation. TEST_URL and SCREENSHOT_DIR are optional.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const out=process.env.SCREENSHOT_DIR;
if(out)await mkdir(out,{recursive:true});
try {
 for(const [device,width,height] of [['iphone15',393,852],['ipad',820,1180]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:18765');
  await page.waitForFunction(()=>window.__GAME);
  await page.fill('#nick','測試');await page.locator('#nick-form button').click();await page.click('#btn-play');
  const dismiss=async()=>{for(let n=0;n<8 && await page.locator('#story.on').count();n++)await page.click('#btn-story-skip');};
  const shot=async(name)=>{await page.waitForTimeout(400);if(out)await page.screenshot({path:`${out}/v4-${device}-${name}.png`});};
  await dismiss();await page.waitForTimeout(400);
  assert.equal(await page.locator('#board .cell').count(),63);
  assert.equal(await page.locator('#board .cell:not(.locked)').count(),13);
  const rect=await page.locator('#board').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,JSON.stringify(rect));
  assert.deepEqual(await page.evaluate(()=>[window.__GAME.save().boardCols,window.__GAME.save().boardRows]),[7,9]);
  await shot('board-fog');
  await page.locator('#board .piece.gen').first().click({force:true});
  assert.equal(await page.evaluate(()=>window.__GAME.save().energy),99);
  if(await page.locator('#discover.on').count())await page.click('#btn-discover-ok');
  // Resource fixture skips farming time; all transactions use actual buttons.
  await page.evaluate(()=>{const s=window.__GAME.save();s.coins=500;s.starSeeds=100;window.__GAME.refresh();});
  await page.click('#btn-go-map');await shot('map-locked');
  await page.locator('[data-building-id="stage"] button').click();
  assert.equal(await page.evaluate(()=>window.__GAME.save().buildings.stage),1);
  await page.locator('[data-region-id="castle"] button').click();await page.click('#btn-region-ok');await dismiss();
  assert.ok(await page.evaluate(()=>window.__GAME.save().unlockedRegions.includes('castle')));
  await page.click('#btn-go-map');await shot('map-unlocked');
  await page.click('#btn-map-shop');
  await page.locator('[data-offer-id="star-1"] button').click();
  assert.equal(await page.evaluate(()=>window.__GAME.save().inventory.length),1);
  await page.evaluate(()=>{window.__GAME.save().energy=0});
  await page.locator('[data-offer-id="energy-20"] button').click();
  assert.equal(await page.evaluate(()=>window.__GAME.save().energy),20);await shot('shop');
  await page.reload();await page.waitForFunction(()=>window.__GAME);
  assert.equal(await page.evaluate(()=>window.__GAME.save().buildings.stage),1);
  assert.ok(await page.evaluate(()=>window.__GAME.save().unlockedRegions.includes('castle')));
  assert.equal(await page.evaluate(()=>window.__GAME.save().inventory.length),1);
  await page.click('#btn-play');await dismiss();await page.waitForTimeout(200);await shot('board-restored');
  assert.ok(await page.locator('#board .cell:not(.locked)').count()>13);
  const uids=await page.evaluate(()=>window.__GAME.save().board.concat(window.__GAME.save().inventory).filter(Boolean).map(x=>x.uid).sort());
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(()=>[window.__GAME.save().boardCols,window.__GAME.save().boardRows]),[7,9]);
  assert.deepEqual(await page.evaluate(()=>window.__GAME.save().board.concat(window.__GAME.save().inventory).filter(Boolean).map(x=>x.uid).sort()),uids);
  assert.deepEqual(errors,[]);console.log(`${device} PASS: 7x9, fog, repair, unlock, shop, reload, rotation; ${JSON.stringify(rect)}`);
  await page.close();
 }
} finally {await browser.close();}
