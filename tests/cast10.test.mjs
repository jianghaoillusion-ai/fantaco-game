import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAST_METRICS, applyCastMetrics, visualScale, portraitSrc, avatarSrc, bindImgFallback } from '../js/portraits.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/cast-metrics.json',import.meta.url))).chars;
for(const id of ['spirit','jiejie','bulu','feifei','apiao','sika']){
 assert.equal(CAST_METRICS[id].feet,data[id].feet);
 assert.equal(CAST_METRICS[id].h,data[id].h);
}
assert.equal(CAST_METRICS.spirit.h,800);assert.equal(CAST_METRICS.spirit.feet,765);
for(const id of ['spirit','bulu','jiejie'])for(const vh of [390,820,844]){
 const m=CAST_METRICS[id],s=visualScale(id,'',1,vh);
 if(id==='spirit')assert.ok((m.feet-m.bboxTop)*s<vh-120,'tall crown fits');
 const vars={};applyCastMetrics({style:{setProperty(k,v){vars[k]=v;}},classList:{contains(){return false;}}},id,'',1);
 assert.equal(Number(vars['--img-h']),m.h);assert.equal(Number(vars['--feet']),m.feet);
}
for(const id of ['spirit','jiejie']){
 for(const talking of [false,true])assert.ok(portraitSrc(id,'happy',talking).endsWith('?v=mobile2'));
 assert.ok(portraitSrc(id,'',false).endsWith('?v=mobile2'));assert.ok(avatarSrc(id).endsWith('?v=mobile2'));
 let fail;const img={src:portraitSrc(id,'happy',true),parentElement:null,addEventListener(_,f){fail=f},removeEventListener(){}};
 bindImgFallback(img,id,'happy','full');fail();assert.equal(img.src,portraitSrc(id,'happy',false));
}
assert.equal(portraitSrc('bulu','happy',true),'assets/chars/expr/bulu-happy-open.png?v=mobile2');
console.log('cast10: mixed canvases, ground anchors, versioned assets and fallback passed');
