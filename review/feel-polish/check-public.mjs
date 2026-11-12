import {chromium} from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';import fs from 'node:fs';
const base=process.argv[2];if(!base)throw Error('Pass pinned base URL');const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const results=[];
for(const path of ['review/feel-polish/haptic-test.html','index.html']){
const page=await context.newPage(),errors=[],failed=[],responses=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('requestfailed',r=>{failed.push({url:r.url(),error:r.failure()?.errorText});console.log('FAILED',r.url(),r.failure()?.errorText)});page.on('response',r=>{if(r.status()>=400){responses.push({url:r.url(),status:r.status()});console.log('HTTP',r.status(),r.url())}});let response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:60000});
let notice=false;
if(await page.getByRole('button',{name:'Open the page',exact:true}).count()){notice=true;[response]=await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:60000}),page.getByRole('button',{name:'Open the page',exact:true}).click()]);}
const noticeFailures=failed.splice(0);
if(path==='index.html'){try{await page.waitForFunction(()=>window.__GAME,{},{timeout:30000});}catch(e){errors.push(e.message)};if(await page.evaluate(()=>!!window.__GAME))await page.evaluate(()=>{__GAME.save().profile={nickname:'測試'};__GAME.show('play')});await page.waitForTimeout(5000);}
else await page.locator('button').first().tap();
results.push({url:base+path,status:response.status(),notice,noticeFailures,title:await page.title(),errors,failed,httpErrors:responses,boardCells:path==='index.html'?await page.locator('#board .cell').count():null});await page.close();}
await browser.close();fs.writeFileSync(new URL(process.argv[3]||'public-check.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status!==200||r.errors.length||r.httpErrors.length))process.exitCode=1;
