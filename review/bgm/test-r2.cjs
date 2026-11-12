const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.mp3':'audio/mpeg','.ogg':'audio/ogg','.css':'text/css'};
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURI(req.url.split('?')[0]));if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))});
function probeMusic(){window.live=0;window.max=0;window.starts=0;window.lastDuration=0;const mk=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const s=mk.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let on=false;s.start=(...a)=>{if(s.loop){on=true;live++;starts++;lastDuration=s.loopEnd;max=Math.max(max,live)}return start(...a)};s.stop=(...a)=>{if(on){on=false;live--}return stop(...a)};return s}}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({headless:true});const results={browser:browser.version(),platform:process.platform,checks:{}};
 try{
  const page=await browser.newPage();await page.addInitScript(probeMusic);let requests=0;
  page.on('request',r=>{if(/assets\/audio\/bgm-/.test(r.url()))requests++});
  await page.goto(base+'index.html');
  await page.waitForFunction(()=>window.__GAME);
  await page.evaluate(async()=>{window.a=await import([...document.querySelectorAll('script[src]')].find(s=>s.src.includes('app.js')).src.replace('app.js','audio.js'));a.setAudioSettings({music:false,sfx:false});a.unlockAudio();await a.playMusic('hate')});
  await page.waitForTimeout(200);results.checks.muted_entry_no_download=requests===0;
  await page.evaluate(()=>a.setAudioSettings({music:true}));
  await page.waitForTimeout(900);results.checks.enable_downloads_wanted=requests===1;
  const before=requests;
  await page.evaluate(async()=>{a.setAudioSettings({music:false});await a.playMusic('bagvalley')});
  await page.waitForTimeout(200);results.checks.muted_switch_no_download=requests===before;
  await page.evaluate(()=>a.setAudioSettings({music:true}));await page.waitForTimeout(900);
  results.checks.enable_after_switch_downloads=requests===before+1;
  const previousStarts=await page.evaluate(()=>starts);
  await page.evaluate(async()=>{a.setAudioSettings({music:false});await a.playMusic('hate');await a.playMusic('theater');a.setAudioSettings({music:true})});
  await page.waitForFunction(()=>Math.abs(lastDuration-80*60/104)<.001);
  results.checks.muted_multi_switch_only_latest=await page.evaluate(n=>starts===n+1&&live===1&&max===1,previousStarts);
  const toggleStarts=await page.evaluate(()=>starts);
  await page.evaluate(()=>{for(let i=0;i<6;i++){a.setAudioSettings({music:false});a.unlockAudio();a.setAudioSettings({music:true});a.unlockAudio()}});
  await page.waitForTimeout(200);results.checks.rapid_mute_unlock_no_restart=await page.evaluate(n=>starts===n&&live===1&&max===1,toggleStarts);
  await page.close();
  const fallback=await browser.newPage();
  await fallback.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;window.voices=[];const A=window.Audio;window.Audio=function(){const e=new A();voices.push(e);return e}});
  await fallback.goto(base+'index.html');await fallback.waitForFunction(()=>window.__GAME);
  await fallback.evaluate(async()=>{window.a=await import([...document.querySelectorAll('script[src]')].find(s=>s.src.includes('app.js')).src.replace('app.js','audio.js'));a.unlockAudio();await a.playMusic('village');a.setAudioSettings({music:false})});
  results.checks.fallback_muted=await fallback.evaluate(()=>voices.find(e=>e.src)?.muted===true);
  await fallback.evaluate(()=>a.setAudioSettings({music:true,musicVol:0}));
  results.checks.fallback_zero_volume_muted=await fallback.evaluate(()=>voices.find(e=>e.src)?.muted===true);
  await fallback.evaluate(()=>a.setAudioSettings({musicVol:.72}));
  results.checks.fallback_unmuted=await fallback.evaluate(()=>voices.find(e=>e.src)?.muted===false);
  await fallback.close();
  const audition=await browser.newPage();
  await audition.addInitScript(probeMusic);
  await audition.goto(base+'review/bgm/loop-test.html');
  results.checks.default_mp3=await audition.inputValue('#format')==='mp3';
  for(let i=0;i<3;i++){await audition.click(`[data-song="${i}"]`);await audition.waitForFunction(i=>document.querySelector(`[data-song="${i}"]`).getAttribute('aria-pressed')==='true',i)}
  await audition.evaluate(async()=>{document.querySelector('[data-song="0"]').click();await new Promise(r=>setTimeout(r,10));document.querySelector('[data-song="1"]').click()});
  await audition.waitForTimeout(200);results.checks.rapid_audition_no_overlap=await audition.evaluate(()=>max===1&&live===1);
  await audition.evaluate(async()=>{for(const i of [1,2,1,3,3,4,0]){document.querySelector(`[data-song="${i}"]`).click();await new Promise(r=>setTimeout(r,15))}});
  await audition.waitForFunction(()=>document.querySelector('[data-song="0"]').getAttribute('aria-pressed')==='true');
  results.checks.seven_rapid_auditions_only_latest=await audition.evaluate(()=>max===1&&live===1&&lastDuration===48);
  await audition.close();
  const app=fs.readFileSync(root+'/js/app.js','utf8');
  results.checks.release_gestures=['pointerup','touchend','click'].every(e=>app.includes('"'+e+'"'));
  results.pass=Object.values(results.checks).every(Boolean);
  fs.writeFileSync(process.env.R2_OUT||__dirname+'/validation-r2.json',JSON.stringify(results,null,2)+'\n');console.log(results);assert.ok(results.pass);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
