const {chromium}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');const {createHash}=require('node:crypto');
const scores=JSON.parse(fs.readFileSync(__dirname+'/scores-bgm3.json'));
(async()=>{
 const browser=await chromium.launch({headless:true});
 const report={browser:browser.version(),audio:scores,decoded:[],game:{},limitations:['Safari/iPhone/Android 未實機測試','未人耳聆聽；主觀可愛度由使用者驗收']};
 try{
 const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8938/review/bgm/loop-test.html');
 if(!process.env.GAME_ONLY) report.decoded=await page.evaluate(async scores=>{
  const {prepareLoopBuffer}=await import("../../js/audio.js?v=bgm3");
  const results=[];
  for(const rate of [48000,44100])for(const song of scores)for(const ext of ['mp3','ogg']){
   const bytes=await(await fetch('../../assets/audio/bgm-'+song.id+'.'+ext)).arrayBuffer();
   const b=await new OfflineAudioContext(2,1,rate).decodeAudioData(bytes);
   const expected=Math.round(song.encoded_samples/48000*rate),n=Math.round(song.samples/48000*rate),offset=Math.round(song.loop_start_samples/48000*rate);
   const render=new OfflineAudioContext(2,n*2,rate),src=render.createBufferSource();
   const prepared=prepareLoopBuffer(b,n,offset,render),actualOffset=prepared.codecOrigin;
   src.buffer=prepared.buffer;src.loop=true;src.loopStart=0;src.loopEnd=n/rate;src.connect(render.destination);src.start();
   const out=await render.startRendering();let error=0;
   for(let c=0;c<2;c++){const x=b.getChannelData(c),y=out.getChannelData(c);for(let i=0;i<y.length;i++)error=Math.max(error,Math.abs(y[i]-x[actualOffset+i%n]));}
   const db=(q,w)=>{let sum=0;for(let c=0;c<2;c++){const x=b.getChannelData(c);for(let k=0;k<w;k++)sum+=x[actualOffset+((q+k)%n+n)%n]**2}return 10*Math.log10(Math.max(1e-24,sum/(2*w)))};
   const dip=q=>{const w=Math.round(rate*.002),a=[];for(let k=-6;k<=6;k+=.5)a.push(db(q+Math.round(k*rate/1000)-Math.floor(w/2),w));return Math.max(0,Math.min(a[0],a.at(-1))-Math.min(...a))};
   const d2=q=>{let max=0;for(let c=0;c<2;c++){const x=b.getChannelData(c);for(let k=-Math.round(.002*rate);k<Math.round(.002*rate)-2;k++){const i=((q+k)%n+n)%n;max=Math.max(max,Math.abs(x[actualOffset+(i+2)%n]-2*x[actualOffset+(i+1)%n]+x[actualOffset+i]))}}return max};
   const points=Array.from({length:song.bars-1},(_,i)=>Math.round((i+1)*song.meter*60/song.bpm*rate-song.origin_shift_samples/48000*rate-(actualOffset-offset)));
   const hashes=[];if(rate===48000&&ext==='ogg')for(let c=0;c<2;c++){const data=b.getChannelData(c).slice(actualOffset,actualOffset+n);hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data.buffer)),x=>x.toString(16).padStart(2,'0')).join(''))}
   let quietTail=0;for(let k=0;k<400;k++){if(db(n-Math.round(k*rate/1000)-Math.round(.01*rate),Math.round(.01*rate))>=-40)break;quietTail++;}
   results.push({tail_quiet_ms:quietTail,id:song.id,ext,rate,expected,offset:actualOffset,nominal_offset:offset,samples:b.length,loop_frames:n,padding:b.length-expected,two_cycles_max_error:error,tail_dbfs:db(n-Math.round(.1*rate),Math.round(.1*rate)),seam_dip:dip(0),inner_dip:Math.max(...points.map(dip)),seam_d2:d2(0),inner_d2:Math.max(...points.map(d2)),pcm_hashes:hashes});
  }return results;
 },scores);
 for(const r of report.decoded){r.checks={length:r.samples-r.expected>=-2&&r.samples-r.expected<=(r.ext==='ogg'?2048:2),loop:r.two_cycles_max_error<1e-5,tail:r.tail_dbfs>-35&&r.tail_quiet_ms===0,hole:r.seam_dip<=r.inner_dip+1,transient:r.seam_d2<=r.inner_d2};}
 // Verify the ENTIRE effective Vorbis buffer is aligned to ffmpeg, not just its duration.
 for(const r of report.decoded.filter(r=>r.ext==='ogg'&&r.rate===48000)){
  const pcm=execFileSync(process.env.HOME+'/media-tools/bin/ffmpeg',['-v','error','-i',__dirname+'/../../assets/audio/bgm-'+r.id+'.ogg','-f','f32le','-ac','2','-ar','48000','-'],{maxBuffer:30*1024*1024});
  r.ffmpeg_full_alignment=true;
  for(let c=0;c<2;c++){const channel=Buffer.alloc(r.loop_frames*4);for(let i=0;i<r.loop_frames;i++)pcm.copy(channel,i*4,(i+r.offset)*8+c*4,(i+r.offset)*8+c*4+4);r.ffmpeg_full_alignment&&=createHash('sha256').update(channel).digest('hex')===r.pcm_hashes[c]}
 }
 if(!process.env.GAME_ONLY) for(const ext of ['mp3','ogg']){await page.selectOption('#format',ext);for(let i=0;i<14;i++){await page.click(`[data-song="${i}"]`);await page.waitForFunction(i=>document.querySelector(`[data-song="${i}"]`).getAttribute('aria-pressed')==='true',i)}}
 await page.click('#stop');
 fs.writeFileSync(process.env.TMPDIR+'/decoded-debug.json',JSON.stringify(report.decoded));
 console.log('decoded failures',report.decoded.filter(r=>!Object.values(r.checks).every(Boolean)).map(r=>({id:r.id,ext:r.ext,rate:r.rate,checks:r.checks})));
 // Instrument only looping sources, excluding short SFX buffer sources.
 await page.addInitScript(()=>{
  window.htmlVoices=[];const A=window.Audio;window.Audio=function(...args){const el=new A(...args);htmlVoices.push(el);return el};
  window.probe={starts:0,live:0,max:0,events:[]};const original=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){window.testContext=this;const s=original.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let counted=false;
   s.start=(...a)=>{if(s.loop){counted=true;window.probe.starts++;window.probe.live++;window.probe.max=Math.max(window.probe.max,window.probe.live);window.probe.events.push({type:'start',time:this.currentTime,loopEnd:s.loopEnd,offset:a[1]||0})}return start(...a)};
   s.stop=(...a)=>{if(counted){counted=false;window.probe.live--;window.probe.events.push({type:'stop',time:this.currentTime})}return stop(...a)};return s;
  };
 });
 console.log('game boot');await page.goto('http://127.0.0.1:8938/');await page.waitForFunction(()=>window.__GAME);
 await page.evaluate(()=>{const s=__GAME.save();s.profile={nickname:'測試'};s.unlockedRegions=['village','castle','slope','hill','bagvalley','candylane','lamplight','theater','plaza'];s.coins=100000;s.materials=1000;s.settings.sfx=false;__GAME.show('play')});
 await page.locator('body').click({position:{x:5,y:5}});await page.waitForFunction(()=>probe.live===1);
 const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify(probe)));
 report.game.initial=await snapshot();console.log('game started');
 for(const id of ['castle','slope','hill','bagvalley','candylane','lamplight','theater','plaza']){
  console.log('switch',id);await page.evaluate(()=>__GAME.show('map'));
  const names=Object.fromEntries(scores.map(s=>[s.id,s.name]));
  const card=page.locator('.region-card').filter({has:page.locator('h3',{hasText:names[id]})});
  await card.locator('.actions button').click();await page.waitForTimeout(300);
  assert.equal(await page.locator('#play').getAttribute('data-region-id'),id);
  assert.equal((await snapshot()).live,1);
 }
 report.game.switches=await snapshot();assert.equal(report.game.switches.max,1,'BGM overlap');
 const before=(await snapshot()).starts;
 await page.evaluate(()=>{__GAME.show('play');__GAME.show('book');__GAME.show('play')});
 await page.click('#btn-hud-settings');await page.locator('#vol-music').fill('0');await page.locator('#vol-music').dispatchEvent('input');await page.locator('#vol-music').fill('72');await page.locator('#vol-music').dispatchEvent('input');
 await page.locator('#tog-music').uncheck();await page.locator('#tog-music').check();await page.click('#btn-settings-close');
 await page.evaluate(()=>__GAME.show('map'));
 await page.locator('.region-card').first().locator('.bldg button').first().click();
 await page.evaluate(()=>__GAME.show('play'));await page.waitForTimeout(150);
 assert.equal((await snapshot()).starts,before,'same-scene action restarted BGM');
 await page.click('#btn-bag');await page.click('#btn-bag-close');
 await page.evaluate(()=>{__GAME.startStory([{speaker:'眠花糖',portrait:'mascot',text:'測試對話'}],()=>{})});
 await page.click('#btn-story-skip');await page.waitForTimeout(150);
 // Actual pointer drag merges a known pair on the board.
 await page.evaluate(()=>{const s=__GAME.save();s.unlockedClumps=['all'];s.board[30]={kind:'item',chain:'star',tier:1,uid:'bgm-test-a'};s.board[37]={kind:'item',chain:'star',tier:1,uid:'bgm-test-b'};__GAME.refresh()});
 const a=await page.locator('[data-uid="bgm-test-a"]').boundingBox(),b=await page.locator('[data-uid="bgm-test-b"]').boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
 await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>__GAME.save().board[37]?.tier),2,'merge did not happen');
 assert.equal((await snapshot()).starts,before,'bag/story/merge restarted');
 await page.evaluate(()=>{const s=__GAME.save();s.orders.unshift({id:'bgm-test-order',npc:'mascot',need:{chain:'star',tier:2},reward:{coins:0,seeds:0,diamonds:0}});__GAME.refresh()});
 await page.locator('.order[data-id="bgm-test-order"] .give').click({force:true});
 await page.waitForFunction(()=>!__GAME.save().orders.some(o=>o.id==='bgm-test-order'));await page.waitForTimeout(1200);
 assert.equal((await snapshot()).starts,before,'order delivery restarted');
 report.game.same_scene_no_restart=true;report.game.actions=['show(play)','book','settings volume 0/back','music off/on','restore other region building','bag open/close','story skip','actual pointer merge','order delivery'];
 report.game.chapter_routes=[];
 for(const id of ['journey','candy','bulu','hate','ending']) {
  await page.evaluate(id=>{const s=__GAME.save();s.region='village';s.chapter=id;__GAME.show('play')},id);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#play').getAttribute('data-region-id'),id);
  const loop=(await snapshot()).events.at(-1).loopEnd;
  assert.ok(Math.abs(loop-scores.find(s=>s.id===id).samples/48000)<.0001);
  report.game.chapter_routes.push({id,loopEnd:loop});
 }
 // Explicit pause/resume position, rapid loads, stop while loading and muted behavior.
 await page.evaluate(async()=>{window.audio=await import('./js/audio.js?v=bgm3');audio.pauseMusic()});
 assert.equal((await snapshot()).live,0);await page.evaluate(()=>audio.resumeMusic());
 assert.equal((await snapshot()).live,1);
 report.game.resume=await snapshot();assert.ok(report.game.resume.events.at(-1).offset>0);
 await page.evaluate(async()=>{await Promise.all([audio.playMusic('bulu'),audio.playMusic('hate'),audio.playMusic('ending')])});await page.waitForTimeout(100);
 assert.equal((await snapshot()).live,1);assert.equal((await snapshot()).max,1);
 await page.evaluate(()=>{window.clearDone=audio.playClearTheme()});
 assert.equal((await snapshot()).live,0);
 await page.evaluate(async()=>{await audio.playMusic('plaza');await clearDone});
 assert.equal((await snapshot()).live,1);
 assert.equal(await page.evaluate(()=>htmlVoices.filter(e=>e.src).length),0);
 report.game.sting_cancel_restores_without_overlap=true;
 await page.evaluate(()=>audio.stopMusic());assert.equal((await snapshot()).live,0);
 await page.evaluate(async()=>{const p=audio.playMusic('village');audio.stopMusic();await p});await page.waitForTimeout(100);assert.equal((await snapshot()).live,0);
 await page.evaluate(async()=>{await audio.playMusic('village');await testContext.suspend()});
 const suspendedStarts=(await snapshot()).starts;
 await page.locator('body').click({position:{x:5,y:5}});
 await page.waitForFunction(()=>testContext.state==='running');
 assert.equal((await snapshot()).starts,suspendedStarts);
 report.game.context_resumed_without_restart=true;
 await page.evaluate(()=>audio.stopMusic());
 report.game.final=await snapshot();report.game.page_errors=errors;assert.deepEqual(errors,[]);
 const fallback=await browser.newPage();fallback.setDefaultTimeout(15000);
 await fallback.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;window.htmlVoices=[];const A=window.Audio;window.Audio=function(...args){const el=new A(...args);htmlVoices.push(el);return el}});
 await fallback.goto('http://127.0.0.1:8938/review/bgm/loop-test.html');
 await fallback.evaluate(()=>document.head.insertAdjacentHTML('afterbegin','<base href="/">'));
 await fallback.click('#stop');
 await fallback.evaluate(async()=>{window.a=await import('/js/audio.js?v=bgm3');a.unlockAudio();await a.playMusic('village');await a.playMusic('journey')});
 await fallback.waitForFunction(()=>htmlVoices.filter(e=>e.src&&!e.paused&&e.readyState>=2).length===1);
 assert.equal(await fallback.evaluate(()=>htmlVoices.filter(e=>e.src).length),1);
 await fallback.evaluate(()=>{htmlVoices.find(e=>e.src).currentTime=.192+2468571/48000-.05});
 await fallback.waitForTimeout(650);assert.ok(await fallback.evaluate(()=>htmlVoices.find(e=>e.src).currentTime<1.5));
 report.game.html_fallback_skips_guards=true;
 await fallback.evaluate(()=>a.stopMusic());assert.equal(await fallback.evaluate(()=>htmlVoices.filter(e=>e.src).length),0);
 report.game.html_fallback_single_voice=true;await fallback.close();
 report.pairwise=[];
 for(let i=0;i<14;i++)for(let j=i+1;j<14;j++){
  const a=scores[i],b=scores[j];const pitches=s=>s.events.slice(1).map((e,k)=>e[1]-s.events[k][1]);const rhythm=s=>s.events.slice(1).map((e,k)=>+(e[0]-s.events[k][0]).toFixed(3));
  const same=(x,y)=>x.reduce((n,v,k)=>n+(v===y[k]?1:0),0)/Math.max(x.length,y.length);
  report.pairwise.push({a:a.id,b:b.id,interval_similarity:same(pitches(a),pitches(b)),rhythm_similarity:same(rhythm(a),rhythm(b)),different_tempo:a.bpm!==b.bpm,different_key:a.key!==b.key});
 }
 report.distinctness={pairs:report.pairwise.length,max_interval_similarity:Math.max(...report.pairwise.map(p=>p.interval_similarity)),max_rhythm_similarity:Math.max(...report.pairwise.map(p=>p.rhythm_similarity)),unique_tempos:new Set(scores.map(s=>s.bpm)).size,unique_mp3:new Set(scores.map(s=>s.files.mp3.sha256)).size};
 assert.equal(report.distinctness.pairs,91);assert.equal(report.distinctness.unique_tempos,14);assert.equal(report.distinctness.unique_mp3,14);
 assert.ok(report.distinctness.max_interval_similarity<.75 && report.distinctness.max_rhythm_similarity<.75);
 report.stings=fs.readdirSync(__dirname+'/../../assets/audio').filter(n=>/^(feixiang-sting|sting-clear)\./.test(n)).map(n=>({file:n,unchanged:execFileSync('git',['show','HEAD:assets/audio/'+n]).equals(fs.readFileSync(__dirname+'/../../assets/audio/'+n))}));
 report.pass=report.decoded.every(r=>Object.values(r.checks).every(Boolean))&&report.decoded.filter(r=>r.ffmpeg_full_alignment!==undefined).every(r=>r.ffmpeg_full_alignment)&&scores.every(s=>Object.values(s.files).every(f=>Object.values(f.checks).every(Boolean)))&&report.stings.every(s=>s.unchanged);
 fs.writeFileSync(process.env.GAME_ONLY?process.env.TMPDIR+'/game-debug.json':__dirname+'/validation-bgm3.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({pass:report.pass,failed:report.decoded.filter(r=>!Object.values(r.checks).every(Boolean)),game:report.game}));
 if(!process.env.GAME_ONLY)assert.ok(report.pass,'audio gates');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
