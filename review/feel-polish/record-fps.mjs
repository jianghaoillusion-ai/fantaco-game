import {chromium} from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
import fs from 'node:fs';import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({headless:true}),results=[];
for(const version of ['before','after']) {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3,recordVideo:{dir:process.env.TMPDIR,size:{width:390,height:844}}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${version==='before'?8914:8913}`);await page.waitForFunction(()=>window.__GAME);
 await page.evaluate(()=>{const g=__GAME,s=g.save();s.profile={nickname:'手感測試'};s.unlockedClumps=['all'];s.flags={seenOpen:true,'seen-intro-v1':true};s.discovered={'star:1':1,'star:2':1,'star:3':1,'star:4':1};s.board=Array(63).fill(null);s.board[24]={uid:'a',kind:'item',chain:'star',tier:1};s.board[25]={uid:'b',kind:'item',chain:'star',tier:1};s.board[31]={uid:'gen',kind:'gen',gen:'star',tier:1};g.show('play');});await page.waitForTimeout(700);
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const start=()=>page.evaluate(()=>new Promise(resolve=>{window.frameTimes=[];window.collect=true;const tick=t=>{frameTimes.push(t);if(frameTimes.length===1)resolve();if(collect)requestAnimationFrame(tick)};requestAnimationFrame(tick);}));
 const stop=async action=>{const times=await page.evaluate(()=>{collect=false;return frameTimes});const ds=times.slice(1).map((t,i)=>t-times[i]);results.push({version,action,cpuRate:4,meanFps:1000/(ds.reduce((a,b)=>a+b,0)/ds.length),minFps:1000/Math.max(...ds),droppedFrames:ds.reduce((n,d)=>n+Math.max(0,Math.round(d/(1000/60))-1),0),intervalsMs:ds,errors});};
 const a=await page.locator('[data-uid="a"]').boundingBox(),b=await page.locator('[data-uid="b"]').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2,id:1}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+a.width/2+(b.x-a.x)*i/12,y:a.y+a.height/2,id:1}]});await page.waitForTimeout(25);}
 await start();await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);await stop('merge');
 const merged=await page.evaluate(()=>__GAME.save().board[25]?.tier);if(merged!==2)throw Error('merge did not commit');
 await page.waitForTimeout(300);await start();await page.locator('[data-uid="gen"]').tap({force:true});await page.waitForTimeout(600);await stop('generate');
 await page.waitForTimeout(400);
 // Make one known, non-story order for repeat-submit / native-label verification.
 await page.evaluate(()=>{const s=__GAME.save();s.orders=[{id:'feel-order',npc:'xiaoka',need:{chain:'star',tier:2},reward:{coins:1,seeds:0,diamonds:0}}];__GAME.refresh();});
 const give=page.locator('.order[data-id="feel-order"] .give');if(await give.count()){await give.tap({force:true});await page.waitForTimeout(800);}
 await page.waitForTimeout(500);await context.close();await page.video().saveAs(fileURLToPath(new URL(`${version}.webm`,import.meta.url)));await page.video().delete();
}
fs.writeFileSync(new URL('fps.json',import.meta.url),JSON.stringify({environment:'macOS headless Chromium, 390×844, DPR3; Playwright video on; no iPhone hardware',definition:'rAF intervals across action incl synchronous update, 4x CPU; minimum=1000/max interval; drops=sum(round(dt/16.667)-1)',results},null,2));await browser.close();console.log(results.map(({intervalsMs,...r})=>r));
