// Run with NODE_PATH pointing to the existing Playwright installation.
const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push(String(e)));
  await page.addInitScript(() => {
   window.probe={starts:0,stops:0,live:0,maxLive:0,contexts:[]};
   const original=AudioContext.prototype.createBufferSource;
   AudioContext.prototype.createBufferSource=function(...args) {
    if(!window.probe.contexts.includes(this))window.probe.contexts.push(this);
    const s=original.apply(this,args), start=s.start.bind(s), stop=s.stop.bind(s);
    s.start=(...a)=>{window.probe.starts++;window.probe.live++;window.probe.maxLive=Math.max(window.probe.maxLive,window.probe.live);return start(...a)};
    s.stop=(...a)=>{window.probe.stops++;return stop(...a)};
    s.addEventListener('ended',()=>window.probe.live--);
    return s;
   };
  });
  await page.goto('http://127.0.0.1:8936/loop-test.html');
  assert.equal(await page.evaluate(()=>window.probe.starts),0);
  const report={browser:browser.version(),files:[],ui:{}};
  await page.evaluate(shifts=>{window.loopShifts=shifts},JSON.parse(fs.readFileSync(__dirname+'/validation.json')).map(s=>s.origin_shift_samples));
  report.files=await page.evaluate(async()=>{
   const names=['cute-a-glock-bubbles','cute-b-uke-hop','cute-c-whistle-parade'];
   const sizes=[2304000,2468571,2160000], results=[];
   for (const rate of [48000,44100]) for(let i=0;i<3;i++) for(const ext of ['mp3','ogg']) {
    const name=names[i]+'.'+ext, bytes=await (await fetch(name)).arrayBuffer();
    const decode=new OfflineAudioContext(2,1,rate), b=await decode.decodeAudioData(bytes);
    const expected=Math.round(sizes[i]/48000*rate);
    const frames=Math.min(expected,b.length);
    const render=new OfflineAudioContext(2,frames*2,rate), s=render.createBufferSource();
    s.buffer=b;s.loop=true;s.loopStart=0;s.loopEnd=frames/rate;s.connect(render.destination);s.start();
    const output=await render.startRendering();let error=0,jump=0;
    for(let c=0;c<2;c++) { const x=output.getChannelData(c),original=b.getChannelData(c);
     for(let k=0;k<x.length;k++) error=Math.max(error,Math.abs(x[k]-original[k%frames]));
     jump=Math.max(jump,Math.abs(x[frames]-x[frames-1]));
    }
    const hashes=[];
    if(rate===48000 && ext==='ogg') for(let c=0;c<2;c++) {
      const pcm=b.getChannelData(c).slice(0,expected);
      hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pcm.buffer)),v=>v.toString(16).padStart(2,'0')).join(''));
    }
    const db=(q,w)=>{
      let power=0;
      for(let c=0;c<2;c++) {const x=b.getChannelData(c);for(let k=0;k<w;k++)power+=x[((q+k)%frames+frames)%frames]**2;}
      return 10*Math.log10(Math.max(1e-24,power/(2*w)));
    };
    const dip=q=>{
      const w=Math.round(.002*rate), values=[];
      for(let k=-6;k<=6;k+=.5)values.push(db(q+Math.round(k*rate/1000)-Math.floor(w/2),w));
      return Math.max(0,Math.min(values[0],values.at(-1))-Math.min(...values));
    };
    const bpm=[120,112,128][i], shifts=window.loopShifts;
    const inner=Array.from({length:23},(_,bar)=>dip(Math.round((bar+1)*240/bpm*rate-shifts[i]/48000*rate)));
    const seam_dip_db=dip(0), inner_max_dip_db=Math.max(...inner),tail_100ms_dbfs=db(frames-Math.round(rate*.1),Math.round(rate*.1));
    results.push({name,rate,pcm_sha256:hashes,seam_dip_db,inner_max_dip_db,tail_100ms_dbfs,samples:b.length,expected,loop_frames:frames,trimmed_tail:b.length-frames,two_cycles_max_error:error,seam_jump:jump});
   }
   return results;
  });
  for(const r of report.files){assert.ok(r.samples-r.expected>=-2 && r.samples-r.expected<=(r.name.endsWith('.ogg')?2048:2),JSON.stringify(r));assert.ok(r.two_cycles_max_error<1e-5,JSON.stringify(r));assert.ok(r.seam_dip_db<=r.inner_max_dip_db+1,JSON.stringify(r));assert.ok(r.tail_100ms_dbfs>=-35,JSON.stringify(r))}
  report.ogg_full_alignment=[];
  for(const r of report.files.filter(r=>r.rate===48000 && r.name.endsWith('.ogg'))) {
   const pcm=execFileSync(process.env.HOME+'/media-tools/bin/ffmpeg',['-v','error','-i',__dirname+'/'+r.name,'-f','f32le','-ar','48000','-ac','2','-'],{maxBuffer:30*1024*1024});
   assert.equal(pcm.length,r.expected*8);
   for(let c=0;c<2;c++) {
    const channel=Buffer.alloc(r.expected*4);
    for(let k=0;k<r.expected;k++) pcm.copy(channel,k*4,k*8+c*4,k*8+c*4+4);
    const hash=createHash('sha256').update(channel).digest('hex');
    assert.equal(hash,r.pcm_sha256[c]);
   }
   const bytes=fs.readFileSync(__dirname+'/'+r.name);let at=0,granule;
   while(at<bytes.length) {
    assert.equal(bytes.toString('ascii',at,at+4),'OggS');
    granule=Number(bytes.readBigInt64LE(at+6));const segments=bytes[at+26];
    let body=0;for(let k=0;k<segments;k++)body+=bytes[at+27+k];
    at+=27+segments+body;
   }
   assert.equal(granule,r.expected);
   report.ogg_full_alignment.push({name:r.name,channels:2,compared_samples_per_channel:r.expected,exact_match:true,final_granule:granule,sha256:r.pcm_sha256});
  }
  for(const ext of ['mp3','ogg']) {
   await page.selectOption('#format',ext);
   for(let i=0;i<3;i++) {
    await page.click(`[data-song="${i}"]`);
    await page.waitForFunction(({ext,i})=>document.querySelector('#status').textContent.includes(ext.toUpperCase())&&document.querySelector(`[data-song="${i}"]`).getAttribute('aria-pressed')==='true',{ext,i});
   }
  }
  const before=await page.evaluate(()=>window.probe.starts);
  await page.click('[data-song="2"]');
  assert.equal(await page.evaluate(()=>window.probe.starts),before,'same song restarted');
  await page.click('#stop');
  await page.waitForFunction(()=>window.probe.live===0);
  // Force a delayed fetch, then stop before it completes: no late playback.
  await page.reload();
  await page.route('**/cute-a-glock-bubbles.ogg',async route=>{await new Promise(r=>setTimeout(r,300));await route.continue()});
  await page.click('[data-song="0"]');await page.click('#stop');
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(()=>window.probe.starts),0);
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/cute-b-uke-hop.ogg',route=>route.fulfill({status:404,body:'missing'}));
  await page.click('[data-song="1"]');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('404'));
  await page.unrouteAll({behavior:'wait'});
  await page.reload();
  await page.click('[data-song="0"]');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('循環播放中'));
  await page.route('**/cute-b-uke-hop.ogg',async route=>{await new Promise(r=>setTimeout(r,300));await route.continue()});
  await page.click('[data-song="1"]');await page.click('[data-song="0"]');
  await page.waitForTimeout(500);
  assert.ok((await page.locator('#status').textContent()).includes('循環播放中'));
  assert.equal(await page.evaluate(()=>window.probe.starts),1);
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/cute-c-whistle-parade.ogg',route=>route.fulfill({status:404,body:'missing'}));
  await page.click('[data-song="2"]');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('404'));
  await page.selectOption('#format','mp3');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('A · 鐵琴泡泡 · MP3'));
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  await page.waitForFunction(()=>window.probe.contexts.every(c=>c.state==='closed'));
  // Closed contexts need not emit ended for scheduled stops. Reset the test counter.
  await page.evaluate(()=>{window.probe.live=0});
  await page.click('[data-song="0"]');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('循環播放中'));
  await page.click('#stop');
  await page.waitForFunction(()=>window.probe.live===0);
  report.ui={no_autoplay:true,six_choices:true,same_song_no_restart:true,stop_during_fetch:true,fetch_error_visible:true,return_to_active_during_fetch:true,format_after_error:true,rebuild_after_pagehide:true,page_errors:errors};
  assert.deepEqual(errors,[]);
  fs.writeFileSync(__dirname+'/browser-validation.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
