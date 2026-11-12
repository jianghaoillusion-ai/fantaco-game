import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../js/audio.js',import.meta.url),'utf8');
let sources=[],fetches=0;
class Param {value=1; setValueAtTime(v){this.value=v} linearRampToValueAtTime(v){this.value=v} cancelScheduledValues(){} }
class Context {
 currentTime=0;state='running';sampleRate=48000;destination={};
 resume(){this.state='running';return Promise.resolve()}
 createBuffer(channels,length,sampleRate){return {numberOfChannels:channels,length,sampleRate,copyToChannel(){}}}
 createGain(){return {gain:new Param(),connect(){},disconnect(){}}}
 createBufferSource(){const s={connect(){},disconnect(){},start(t,o){this.started=true;this.offset=o;sources.push(this)},stop(){this.stopped=true;this.onended?.()}};return s}
 async decodeAudioData(bytes){Context.decodes=(Context.decodes||0)+1;if(Context.fail)throw new Error('unsupported codec');const n=new Float64Array(bytes)[0]+(Context.extra||0);return {numberOfChannels:2,getChannelData:()=>new Float32Array(n),length:n,sampleRate:48000,duration:n/48000}}
}
globalThis.window={AudioContext:Context,addEventListener(){}};
globalThis.document={querySelectorAll:()=>[],addEventListener(){}};
const html=[];globalThis.Audio=class {constructor(){html.push(this)}canPlayType(){return 'probably'} play(){return Promise.resolve()}pause(){}removeAttribute(){this.src=''}load(){}};
globalThis.fetch=async url=>{fetches++;const n=url.includes('journey')?2468571:url.includes('candy')?2160000:2304000;return {ok:true,arrayBuffer:async()=>new Float64Array([n+18432]).buffer}};
const audio=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('Web Audio loop, same scene/mute retain source; stop cancels it',async()=>{
 audio.unlockAudio();await audio.playMusic('village');
 assert.equal(sources.length,1,'must use AudioBufferSource');
 assert.equal(sources[0].loop,true);
 await audio.playMusic('village');
 audio.setAudioSettings({music:false});audio.setAudioSettings({music:true});
 assert.equal(sources.length,1);assert.equal(fetches,1);
 audio.stopMusic();assert.equal(sources[0].stopped,true);
});

test('pause keeps offset; stale loads and stop cannot restart',async()=>{
 await audio.playMusic('village');
 audio.pauseMusic();const n=sources.length;
 await audio.playMusic('village');assert.equal(sources.length,n);
 audio.resumeMusic();assert.equal(sources.length,n+1);
 await Promise.all([audio.playMusic('journey'),audio.playMusic('candy')]);
 assert.equal(sources.filter(s=>!s.stopped).length,1);
 const pending=audio.playMusic('journey');audio.stopMusic();await pending;
 assert.equal(sources.filter(s=>!s.stopped).length,0);
});
test('a source creation error does not poison later transitions',async()=>{
 const original=Context.prototype.createBufferSource;const warn=console.warn;console.warn=()=>{};
 Context.prototype.createBufferSource=function(){throw new Error('injected source failure')};
 await audio.playMusic('village');
 Context.prototype.createBufferSource=original;console.warn=warn;
 await audio.playMusic('candy');
 assert.equal(sources.filter(s=>!s.stopped).length,1);
 audio.stopMusic();
});
test('loop durations match the rendered score for every scene',async()=>{
 const scores=JSON.parse(await readFile(new URL('../review/bgm/scores-bgm3.json',import.meta.url),'utf8'));
 const literals=code.match(/const MUSIC_SECONDS = (\{[\s\S]*?\});/)[1];
 const times=Function('return ('+literals+')')();
 for(const s of scores)assert.equal(Math.round(times[s.id]*48000),s.samples,s.id);
});

test('extra codec length accepts the boundary, rejects one sample beyond it',async()=>{
 const warn=console.warn;console.warn=()=>{};
 try {
  for(const extra of [4096,4097]){
   Context.extra=extra;const before=sources.length,h=html.length;
   const a=await import('data:text/javascript;base64,'+Buffer.from(code+'\n// case '+extra).toString('base64'));
   a.unlockAudio();await a.playMusic('village');
   assert.equal(sources.length-before,extra===4096?1:0);
   assert.equal(html.length-h,extra===4097?1:0);a.stopMusic();
  }
 }finally{Context.extra=0;console.warn=warn}
});
test('44.1k periodic signal with leading delay keeps a complete, unchanged cycle',()=>{
 const rate=44100,exact=4*60/123*rate,frames=Math.round(exact),guard=Math.round(.192*rate),delay=1105;
 const x=new Float32Array(frames+2*guard+delay);
 for(let i=delay;i<x.length;i++)x[i]=.13*Math.sin(2*Math.PI*201*(i-delay)/exact)+.03*Math.sin(2*Math.PI*402*(i-delay)/exact);
 const context={createBuffer(ch,length,sampleRate){const data=new Float32Array(length);return {length,sampleRate,getChannelData:()=>data,copyToChannel:a=>data.set(a)}}};
 const b={numberOfChannels:1,sampleRate:rate,length:x.length,getChannelData:()=>x};
 const result=audio.prepareLoopBuffer(b,frames,guard,context),y=result.buffer.getChannelData(0);
 assert.equal(y.length,frames);assert.ok(Math.abs(result.codecOrigin-guard)<=Math.round(rate*.01));
 assert.deepEqual(y,x.slice(result.codecOrigin,result.codecOrigin+frames));
 assert.ok(Math.abs(y[0]-2*y.at(-1)+y.at(-2))<.002);
});

test('unsupported codecs are remembered per scene, without repeated downloads',async()=>{
 const warn=console.warn;console.warn=()=>{};Context.fail=true;const before=Context.decodes;
 try{
  const a=await import('data:text/javascript;base64,'+Buffer.from(code+'\n// codec failure').toString('base64'));
  a.unlockAudio();await a.playMusic('village');await a.playMusic('journey');await a.playMusic('village');
  assert.equal(Context.decodes-before,4);a.stopMusic();
 }finally{Context.fail=false;console.warn=warn}
});
