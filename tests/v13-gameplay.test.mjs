import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tickAutoGenerators} from '../js/merge.js';
import {createFog} from '../js/fog.js';
import {createBoardDrag} from '../js/drag.js';
import {emptySave} from '../js/save.js';
const data=JSON.parse(readFileSync(new URL('../data/chains.json',import.meta.url)));
const item=uid=>({kind:'item',chain:'star',tier:1,uid});
function full(){const s=emptySave();s.board=Array.from({length:63},(_,i)=>item('i'+i));s.board[31]={kind:'gen',gen:'garden',tier:1,uid:'g',autoAt:0,queue:[{chain:'garden',tier:1}]};return s;}
test('滿盤自動產出進背包，只產一件且不耗能量',()=>{
 const s=full(),e=s.energy;const result=tickAutoGenerators(s,data.generators,7,9,()=>true,100);
 assert.equal(result.made.length,1);assert.equal(s.inventory[0],result.made[0]);assert.equal(s.energy,e);assert.equal(s.board.filter(Boolean).length,63);assert.ok(s.board[31].autoAt>100);
});
test('雙滿不消耗產出佇列，背包騰位後產出',()=>{
 const s=full();s.inventory=Array.from({length:6},(_,i)=>item('bag'+i));
 assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,100).blocked,true);assert.equal(s.board[31].queue.length,1);
 s.inventory.pop();assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,101).made.length,1);assert.equal(s.inventory.length,6);
});
for(const toBag of [false,true])test(`自動產出呼叫一般發現慶祝（背包=${toBag}）`,()=>{
 const s=full();if(!toBag)s.board[30]=null;const calls=[];
 const f=createFog({getSave:()=>s,getGens:()=>data.generators,getCols:()=>7,getRows:()=>9,discover:(...args)=>calls.push(args),persist:()=>{},refresh:()=>{},toast:()=>{}});
 f.tickAutoGens();assert.equal(calls.length,1);assert.notEqual(calls[0][1]?.silent,true);f.tickAutoGens();assert.equal(calls.length,1);
});
test('觸控拖到不同物品時允許互換，不再彈回',()=>{
 const listeners={},classes=new Set(),a=item('a'),b={...item('b'),tier:2};const s={board:[a,b],inventory:[]};
 const rect={x:0,y:0,left:0,top:0,width:40,height:40};
 const piece={dataset:{uid:'a'},classList:{add(){},remove(){}},getBoundingClientRect:()=>rect,querySelector:()=>null};
 const target={dataset:{r:'0',c:'1'},classList:{contains:()=>false,add:x=>classes.add(x),remove(){}},closest(){return this;}};
 target.classList.contains=x=>x==='cell';
 const fl={style:{},classList:{add(){},remove(){}},addEventListener(){}};
 const play={addEventListener:(k,fn)=>listeners[k]=fn};
 globalThis.document={getElementById:id=>id==='play'?play:fl,querySelector:()=>null,querySelectorAll:()=>[],elementFromPoint:()=>target,body:{classList:{add(){},remove(){}}}};
 globalThis.window={addEventListener:(k,fn)=>listeners[k]=fn};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 let moved=false;
 const d=createBoardDrag({getSave:()=>s,getCols:()=>2,findCellByUid:()=>({where:'board',i:0,item:a}),fog:{isOpenIndex:()=>true,canDropAt:()=>true},canMerge:()=>false,moveOrMerge:(loc,r,c)=>{moved=true;[s.board[loc.i],s.board[c]]=[s.board[c],s.board[loc.i]];}});d.bind();
 listeners.pointerdown({target:{closest:sel=>sel==='.cell.locked'?null:piece},pointerId:1,clientX:20,clientY:20});
 listeners.pointermove({pointerId:1,clientX:60,clientY:20});listeners.pointerup({type:'pointerup',pointerId:1,clientX:60,clientY:20});
 assert.equal(moved,true);assert.deepEqual(s.board.map(x=>x.uid),['b','a']);assert.ok(classes.has('merge-hot'));
});
