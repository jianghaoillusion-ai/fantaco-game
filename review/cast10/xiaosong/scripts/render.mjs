import { chromium } from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, port, tag, ver, outdir] = process.argv;
const SC = {
  A:[['spirit','氣球精靈'],['bulu','布魯'],['jiejie','姐姐']],
  B:[['feifei','飛飛'],['spirit','氣球精靈'],['sika','西卡']],
  C:[['apiao','阿飄'],['hate','哈特'],['spirit','氣球精靈']],
  D:[['bulu','布魯'],['feifei','飛飛'],['jiejie','姐姐']],
  E:[['spirit','氣球精靈'],['mascot','眠花糖']],
  F:[['spirit','氣球精靈']],
};
const VP=[[1100,820],[1366,768],[1920,1080],[768,1024],[390,844],[360,640],[844,390]];
const browser=await chromium.launch({headless:true}); const out=[];
try{
 for(const [w,h] of VP) for(const [sk,cast] of Object.entries(SC)){
  const ctx=await browser.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'}); const page=await ctx.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message)); const reqs=[]; page.on('request',r=>{const u=r.url(); if(/chars\//.test(u)||/\.(js|css)(\?|$)/.test(u)) reqs.push(u.replace(/^https?:\/\/[^/]+/,''));});
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('#nick').fill('小頌檢查'); await page.locator('#nick-form button').click(); await page.locator('#title.on').waitFor();
  await page.evaluate(async({cast,ver})=>{const s=await import('/js/story.js?v='+ver); s.bindStory({show(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));document.querySelector('#'+id).classList.add('on');}});
    s.startStory(cast.map(([p,n])=>({speaker:n,portrait:p,text:'檢查地面線',expr:'happy'})));},{cast,ver});
  await page.waitForTimeout(700);
  await page.locator('#portraits img').evaluateAll(async imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>0))));
  await page.waitForTimeout(200);
  const rows=await page.evaluate(()=>[...document.querySelectorAll('#portraits .story-actor')].map(fig=>{const img=fig.querySelector('img'),r=img.getBoundingClientRect(),cs=getComputedStyle(fig);
    const anc=[];let e=img.parentElement;while(e&&e!==document.documentElement){const c=getComputedStyle(e);if(c.overflow!=='visible'||c.overflowX!=='visible'||c.overflowY!=='visible'||c.clipPath!=='none'){const b=e.getBoundingClientRect();anc.push({sel:(e.id?'#'+e.id:'')+'.'+String(e.className).split(' ')[0],ov:c.overflowX+'/'+c.overflowY,rect:[b.left,b.top,b.right,b.bottom]});}e=e.parentElement;}
    return {id:fig.dataset.id,cls:fig.className,side:fig.dataset.side,visible:cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0,src:img.getAttribute('src'),natural:[img.naturalWidth,img.naturalHeight],rect:[r.left,r.top,r.width,r.height],transform:cs.transform,imgTransform:getComputedStyle(img).transform,anc};}));
  await page.screenshot({path:`${outdir}/${tag}-${sk}-${w}x${h}.png`});
  await page.addStyleTag({content:'#story .bubble,#story-bubble{visibility:hidden!important}'}); await page.screenshot({path:`${outdir}/${tag}-${sk}-${w}x${h}-nobubble.png`});
  await page.addStyleTag({content:'html,body,#app,#story,#story *{background:none!important;background-color:transparent!important;box-shadow:none!important} html{background:#fff!important} #story::before,#story::after,#story *::before,#story *::after{display:none!important} #story .story-bg,#story .bubble,#story-bubble,#story .story-skip,#story button{display:none!important} #story .story-actor,#story .story-actor img{filter:none!important;opacity:1!important}'});
  for(const r of rows.filter(r=>r.visible)){
    await page.locator('#portraits .story-actor').evaluateAll((els,id)=>els.forEach(e=>e.style.setProperty('visibility',e.dataset.id===id?'visible':'hidden','important')),r.id);
    await page.screenshot({path:`${outdir}/px-${tag}-${sk}-${w}x${h}-${r.id}.png`});
  }
  out.push({vp:[w,h],sc:sk,errors,rows,reqs:[...new Set(reqs)].filter(u=>/spirit|jiejie|portraits|story|quality|app\.js/.test(u))}); await ctx.close();
 }
 fs.writeFileSync(`${outdir}/render-${tag}.json`,JSON.stringify(out,null,1));
} finally { await browser.close(); }
console.log('done',tag,out.length,'errors',out.reduce((a,o)=>a+o.errors.length,0));
