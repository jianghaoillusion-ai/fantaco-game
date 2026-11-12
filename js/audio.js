/* Original scene music; official clear sting files remain unchanged. */
let ctx, unlocked = false;
let settings = { music: true, sfx: true, musicVol: 0.72, sfxVol: 0.85 };
const MUSIC_FILES = Object.fromEntries('village journey candy bulu hate ending castle slope hill bagvalley candylane lamplight theater plaza'.split(' ').map(id => [id, `bgm-${id}`]));
// Exact scored loop lengths; codec tail blocks are excluded after decoding.
const MUSIC_SECONDS = {village:48, journey:2468571/48000, candy:45,
 bulu:80*60/108, hate:80*60/124, ending:72*60/102, castle:80*60/116,
 slope:80*60/132, hill:72*60/118, bagvalley:80*60/110,
 candylane:80*60/134, lamplight:43.2, theater:80*60/104, plaza:80*60/126};
const LOOP_GUARD = 9216 / 48000; // Circular codec context, not silence.
const cache = new Map();
const decodeUnavailable = new Set();
let active = null, wanted = null, generation = 0, paused = false, clearVoice = null;
function ac() {
 if (!ctx || ctx.state === "closed") ctx = new (window.AudioContext || window.webkitAudioContext)();
 return ctx;
}
export function unlockAudio() {
 unlocked = true;
 const retry=()=>{if(wanted && !paused){if(active?.el)active.el.play().catch(()=>{});else if(!active)playMusic(wanted)}};
 if(window.AudioContext || window.webkitAudioContext) {
  try {const c=ac();if(c.state!=='running'){c.resume().then(retry).catch(()=>{});return;}}catch{}
 }
 retry();
}
function musicGain() { return settings.music ? (settings.musicVol ?? .72) : 0; }
function sfxGain() { return settings.sfx ? (settings.sfxVol ?? .85) : 0; }
function applyMusicVolume() {
 const value=.5*musicGain();
 if(active?.gain) { const p=active.gain.gain; p.cancelScheduledValues(ctx.currentTime);p.setValueAtTime(p.value,ctx.currentTime);p.linearRampToValueAtTime(value,ctx.currentTime+.025); }
 if(active?.el) { active.el.volume=value;active.el.muted=value===0; }
 if(clearVoice) { clearVoice.el.volume=.88*musicGain();if(!musicGain()) clearVoice.finish(); }
}
export function setAudioSettings(s) {
 const wasAudible=musicGain()>0;
 settings={...settings,...s};
 if(!musicGain())generation++; // Invalidate a load that began before muting.
 if(!wasAudible && musicGain() && wanted && active?.id!==wanted) {
  dispose(active);active=null; // Never unmute the previous region while loading.
  if(!paused)playMusic(wanted);
 }
 applyMusicVolume();
}
export function getAudioSettings() { return settings; }
function dispose(v) {
 if(!v)return;
 if(v.source) { try{v.source.stop()}catch{} v.source.disconnect();v.gain.disconnect();v.source=null; }
 if(v.el) { v.el.onloadedmetadata=null;v.el.ontimeupdate=null;v.el.onended=null;v.el.pause();v.el.removeAttribute('src');v.el.load(); }
}
// Keep one complete scored cycle. Codec context allows a tiny circular origin
// adjustment after resampling, avoiding an unmatched fractional sample at 44.1k.
export function prepareLoopBuffer(buffer, frames, guard, context) {
 const channels=Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c));
 const radius=Math.round(buffer.sampleRate*.01),width=Math.round(buffer.sampleRate*.002);
 const sample=(x,q,k)=>x[q+((k%frames)+frames)%frames];
 const dip=q=>{
  const values=[];
  for(let ms=-6;ms<=6;ms+=.5){
   const at=Math.round(ms*buffer.sampleRate/1000)-Math.floor(width/2);let sum=0;
   for(const x of channels)for(let k=0;k<width;k++)sum+=sample(x,q,at+k)**2;
   values.push(10*Math.log10(Math.max(1e-24,sum/(width*channels.length))));
  }
  return Math.max(0,Math.min(values[0],values.at(-1))-Math.min(...values));
 };
 const nominalDip=dip(guard);
 let origin=guard,best=Infinity;
 for(let d=-radius;d<=radius;d++) {
  const q=guard+d;if(q<2 || q+frames+2>buffer.length)continue;
  let score=0;
  for(const x of channels)for(let k=-width;k<width-2;k++)score=Math.max(score,
   Math.abs(sample(x,q,k+2)-2*sample(x,q,k+1)+sample(x,q,k)));
  score+=Math.abs(d)*1e-12;
  if(score<best && dip(q)<=nominalDip+.01){best=score;origin=q;}
 }
 const loop=context.createBuffer(buffer.numberOfChannels,frames,buffer.sampleRate);
 channels.forEach((x,c)=>loop.copyToChannel(x.subarray(origin,origin+frames),c));
 return {buffer:loop,loopStart:0,duration:frames/buffer.sampleRate,codecOrigin:origin};
}
export function prepareDecodedLoop(buffer,seconds,ext,context) {
   const frames=Math.round(Math.round(seconds*48000)/48000*buffer.sampleRate);
   const loopStart=Math.round(LOOP_GUARD*buffer.sampleRate)/buffer.sampleRate;
   const expected=Math.round((Math.round(seconds*48000)+18432)/48000*buffer.sampleRate);
   const excess=buffer.length-expected;
   if(excess < -2 || excess > Math.ceil((ext==='ogg'?2048:4096)/48000*buffer.sampleRate))throw new Error('BGM decoded length mismatch');
   const prepared=prepareLoopBuffer(buffer,frames,Math.round(loopStart*buffer.sampleRate),context);
   // Extra leading codec delay is accepted only with measured periodic agreement.
   if(excess>2 && ext==='mp3') {
    let error=0,power=0,count=0;const q=prepared.codecOrigin,w=Math.round(buffer.sampleRate*.002);
    for(let c=0;c<buffer.numberOfChannels;c++){const x=buffer.getChannelData(c);for(let k=0;k<w;k++){error+=(x[q+k]-x[q+frames+k])**2;power+=x[q+k]**2;count++;}}
    if(Math.sqrt(error/Math.max(power,1e-12))>.25 || Math.sqrt(error/count)>.025)throw new Error('BGM codec alignment mismatch');
   }
   return prepared;
}
async function load(id) {
 if(cache.has(id)){const hit=cache.get(id);cache.delete(id);cache.set(id,hit);return hit;}
 const promise=(async()=>{
  let error,codecFailures=0;
  // Prefer MP3 (small, gapless metadata); try Vorbis if decoding fails.
  for(const ext of ['mp3','ogg'])try {
   const response=await fetch(`assets/audio/${MUSIC_FILES[id]}.${ext}?v=20261112`);
   if(!response.ok)throw new Error(`BGM HTTP ${response.status}`);
   const bytes=await response.arrayBuffer();
   let buffer;try{buffer=await ac().decodeAudioData(bytes);}catch(e){codecFailures++;throw e;}
   return prepareDecodedLoop(buffer,MUSIC_SECONDS[id],ext,ac());
  }catch(e){error=e}
  if(codecFailures===2)decodeUnavailable.add(id);
  throw error;
 })();
 cache.set(id,promise);
 // Bound decoded PCM memory on phones; active source retains its own buffer.
 while(cache.size>3)cache.delete(cache.keys().next().value);
 try{return await promise}catch(e){cache.delete(id);throw e}
}
function start(v) {
 const source=ac().createBufferSource(),gain=ctx.createGain();
 source.buffer=v.buffer;source.loop=true;source.loopStart=v.loopStart;source.loopEnd=v.loopStart+v.duration;
 source.connect(gain);gain.connect(ctx.destination);
 gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.5*musicGain(),ctx.currentTime+.025);
 v.source=source;v.gain=gain;v.started=ctx.currentTime;
 source.start(0,v.loopStart+(v.offset || 0));
}
// A short fade-out followed by a new source: no simultaneous BGM sources.
async function retire(v) {
 if(!v)return;
 if(v.source) {
  const p=v.gain.gain,t=ctx.currentTime;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(0,t+.025);
  await new Promise(resolve=>setTimeout(resolve,35));
 }
 dispose(v);
}
let switching=Promise.resolve();
export async function playMusic(sceneId) {
 const id=MUSIC_FILES[sceneId]?sceneId:'village';wanted=id;
 const token=++generation;
 if(clearVoice)clearVoice.finish(false);
 if(!unlocked || paused || !musicGain())return;
 if(active?.id===id) {applyMusicVolume();return;}
 let data;
 let web=!!(window.AudioContext || window.webkitAudioContext) && !decodeUnavailable.has(id);
 try { if(web)data=await load(id); } catch(error) {console.warn('BGM Web Audio unavailable; using HTML audio',id,error);web=false;}
 if(token!==generation || paused)return;
 switching=switching.then(async()=>{
  if(token!==generation || paused)return;
  if(active?.id===id)return;
  const old=active;active=null;await retire(old);
  if(token!==generation || paused)return;
  if(web) {active={id,...data,offset:0};start(active);}
  else {
   const el=new Audio();el.src=`assets/audio/${MUSIC_FILES[id]}.mp3?v=20261112`;el.volume=.5*musicGain();el.muted=!musicGain();
   active={id,el};
   el.onloadedmetadata=()=>{if(active?.el===el)el.currentTime=LOOP_GUARD;};
   const wrap=()=>{if(active?.el!==el || paused)return;if(el.ended || el.currentTime>=LOOP_GUARD+MUSIC_SECONDS[id]){el.currentTime=el.ended?LOOP_GUARD:el.currentTime-MUSIC_SECONDS[id];el.play().catch(()=>{});}};
   el.ontimeupdate=wrap;el.onended=wrap;el.play().catch(()=>{});
  }
 }).catch(error=>{dispose(active);active=null;console.warn("BGM transition failed",error);});
 await switching;
}
export function stopMusic() { generation++;wanted=null;if(clearVoice)clearVoice.finish(false);paused=false;dispose(active);active=null; }
export function pauseMusic() {
 generation++;paused=true;
 if(active?.source) {
  active.offset=((active.offset||0)+ctx.currentTime-active.started)%active.duration;
  dispose(active);
 } else active?.el?.pause();
}
export function resumeMusic() {
 paused=false;
 if(active?.id===wanted) {if(active.el)active.el.play().catch(()=>{});else if(!active.source)start(active);}
 else if(wanted)playMusic(wanted);
}
export function playClearTheme() {
 if(clearVoice)clearVoice.finish(false);
 if(!musicGain())return Promise.resolve();
 const wasPaused=paused;pauseMusic();
 return new Promise(resolve=>{
  const el=new Audio();let timer,alternative=false;
  const finish=(restore=true)=>{
   if(clearVoice?.el!==el)return;
   clearVoice=null;clearTimeout(timer);el.onended=null;el.onerror=null;
   el.pause();el.removeAttribute('src');el.load();paused=wasPaused;resolve();
   if(restore && !wasPaused)resumeMusic();
  };
  const failed=()=>{
   if(clearVoice?.el!==el)return;
   if(alternative || el.src.endsWith('.ogg')){finish();return;}
   alternative=true;el.src='assets/audio/feixiang-sting.ogg';el.play().catch(()=>finish());
  };
  clearVoice={el,finish};el.volume=.88*musicGain();
  el.src=el.canPlayType('audio/mp4')?'assets/audio/feixiang-sting.m4a':'assets/audio/feixiang-sting.ogg';
  el.onended=()=>finish();el.onerror=failed;timer=setTimeout(()=>finish(),30000);el.play().catch(failed);
 });
}

function beep(freq, dur, type, gain, at) {
  if (!settings.sfx || sfxGain() === 0) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    const vol = (gain ?? 0.05) * sfxGain();
    g.gain.value = vol;
    o.connect(g); g.connect(c.destination);
    const t = c.currentTime + (at || 0);
    g.gain.setValueAtTime(Math.max(0.0001, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}

function sparkle(at, gain) {
  if (!settings.sfx || sfxGain() === 0) return;
  try {
    const c = ac();
    const n = 2 ** 12;
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 1800;
    const g = c.createGain();
    const t = c.currentTime + (at || 0);
    g.gain.setValueAtTime((gain ?? 0.03) * sfxGain(), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + 0.2);
  } catch {}
}

export const sfx = {
  tap() { beep(660, 0.07, "sine", 0.03); },
  pickup() { beep(880, 0.08, "sine", 0.04); },
  drop() { beep(420, 0.08, "triangle", 0.04); },
  invalid() { beep(180, 0.16, "square", 0.025); },
  merge(tier = 1) {
    const f = 523 + Math.min(5, tier) * 40;
    beep(f, 0.11, "sine", 0.055);
    beep(f * 1.5, 0.14, "triangle", 0.04, 0.04);
    beep(f * 2, 0.16, "sine", 0.03, 0.08);
    sparkle(0.05, 0.035);
    if (tier >= 4) beep(f * 2.5, 0.18, "sine", 0.03, 0.12);
  },
  generate() { beep(520, 0.07, "triangle", 0.04); beep(740, 0.08, "sine", 0.03, 0.05); },
  order() { beep(523, 0.12, "sine", 0.05); beep(659, 0.12, "sine", 0.05, 0.1); beep(784, 0.2, "sine", 0.06, 0.2); },
  energy() { beep(240, 0.18, "square", 0.03); },
  level() { beep(392, 0.12, "sine", 0.05); beep(523, 0.12, "sine", 0.05, 0.1); beep(659, 0.12, "sine", 0.05, 0.2); beep(784, 0.28, "sine", 0.06, 0.32); },
  daily() { beep(700, 0.1, "sine", 0.05); beep(900, 0.14, "sine", 0.05, 0.08); },
  combo(n) { beep(500 + n * 80, 0.1, "triangle", 0.055); },
  coin() {
    beep(880, 0.09, "sine", 0.032);
    beep(1240, 0.11, "triangle", 0.028, 0.05);
    beep(1760, 0.09, "sine", 0.018, 0.1);
  },
  chime() {
    beep(988, 0.06, "sine", 0.03);
    beep(1319, 0.07, "triangle", 0.022, 0.04);
  },
  discover() {
    beep(392, 0.16, "sine", 0.07);
    beep(523, 0.16, "triangle", 0.06, 0.1);
    beep(659, 0.18, "sine", 0.07, 0.2);
    beep(784, 0.2, "sine", 0.08, 0.32);
    beep(1047, 0.28, "triangle", 0.07, 0.48);
    beep(1319, 0.32, "sine", 0.05, 0.62);
    sparkle(0.12, 0.07);
    sparkle(0.28, 0.05);
    sparkle(0.5, 0.06);
  }
};
