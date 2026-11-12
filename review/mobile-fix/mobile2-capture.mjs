import { chromium } from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
const phase=process.argv[2]||'before';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
await page.goto('http://127.0.0.1:8893');await page.waitForFunction(()=>window.__GAME);
await page.evaluate(()=>{const s=__GAME.save();s.profile={nickname:'驗收'};s.settings.music=false;s.settings.sfx=false;__GAME.show('play');__GAME.refresh();});
await page.waitForTimeout(400);await page.screenshot({path:`review/mobile-fix/${phase}-level1-open.png`});
console.log(await page.evaluate(()=>__GAME.save().board.filter(Boolean).map(c=>`${c.kind}:${c.chain||c.gen}:${c.tier}`)));
await browser.close();
