import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptySave,normalizeSave,loadSave,writeSave} from '../js/save.js';
import {fillOrderSlots,reserveOrderItems,tickAutoGenerators,NPCS_BY_CHAPTER} from '../js/merge.js';
import {isCellOpen,revealMergeEdge,canAfford,payCost} from '../js/world.js';
const data=JSON.parse(readFileSync(new URL('../data/chains.json',import.meta.url)));
const map=JSON.parse(readFileSync(new URL('../data/map.json',import.meta.url)));
const opts={chains:data.chains,chapter:'village',discovered:{},npcsByChapter:NPCS_BY_CHAPTER,availableChains:['star']};
const item=(uid,tier=2)=>({kind:'item',chain:'star',tier,uid});
test('四張固定難度，任意順序交單後補回同難度，不洗掉其他訂單',()=>{
 const s=emptySave();s.board=[];
 for(let n=0;n<40;n++){
  fillOrderSlots(s,4,opts);
  assert.deepEqual(s.orders.map(o=>o.difficulty),['easy','medium','medium','hard']);
  assert.deepEqual(s.orders.map(o=>o.need.tier),[2,3,3,4]);
  const previous=s.orders.filter((_,i)=>i!==n%4);s.orders=previous;
  fillOrderSlots(s,4,opts);
  for(const o of previous)assert.ok(s.orders.some(x=>x.id===o.id));
 }
});
test('UID 預留不重用；移入袋子仍保留；已消耗才補配',()=>{
 const s=emptySave();s.board=[item('one')];s.orders=[{id:'a',need:{chain:'star',tier:2}},{id:'b',need:{chain:'star',tier:2}}];
 reserveOrderItems(s);assert.deepEqual(s.orders.map(o=>o.reservedUid),['one',null]);
 s.inventory=s.board;s.board=[];reserveOrderItems(s);assert.equal(s.orders[0].reservedUid,'one');
 s.board=[item('two')];reserveOrderItems(s);assert.deepEqual(s.orders.map(o=>o.reservedUid),['one','two']);
 s.inventory=[];reserveOrderItems(s);assert.deepEqual(s.orders.map(o=>o.reservedUid),[null,'two']);
 const round=normalizeSave(JSON.parse(JSON.stringify(s)));reserveOrderItems(round);assert.equal(round.orders[1].reservedUid,'two');
});
test('邊緣合成只揭四鄰一格、不跨列、不重揭，重讀保留',()=>{
 const s=emptySave(),open=()=>Array.from({length:63},(_,i)=>i).filter(i=>isCellOpen(s,Math.floor(i/7),i%7,7,9));
 assert.equal(open().length,13);const i=revealMergeEdge(s,17,7,9);assert.equal(i,10);assert.equal(open().length,14);
 assert.equal(revealMergeEdge(s,31,7,9),null);assert.equal(open().length,14);
 assert.ok(normalizeSave(s).fog.revealed.includes(10));
 s.unlockedClumps=['all'];assert.equal(revealMergeEdge(s,0,7,9),null);
});
test('自動產生不耗體力；滿盤不消耗計時，騰位只補一件，袋內不產出',()=>{
 const s=emptySave();s.board=Array(63).fill(null);s.board[31]={kind:'gen',gen:'garden',tier:1,uid:'g'};const energy=s.energy;
 assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,0).made.length,0);
 assert.equal(s.board[31].autoAt,30000);
 assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,29999).made.length,0);
 assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,30000).made.length,1);assert.equal(s.energy,energy);
 s.board=s.board.map((x,i)=>x||item('full-'+i));const before=s.board[31].autoAt;
 assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,90000).blocked,true);assert.equal(s.board[31].autoAt,before);
 s.board[30]=null;assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,90000).made.length,1);
 s.inventory=[s.board[31]];s.board[31]=null;assert.equal(tickAutoGenerators(s,data.generators,7,9,()=>true,999999).made.length,0);
});
test('修復約三分之一階段需金幣與材料，缺料不扣錢',()=>{
 const costs=map.regions.flatMap(r=>r.buildings.flatMap(b=>b.costs));
 const mixed=costs.filter(c=>c.items?.length);assert.equal(mixed.length,4);assert.equal(costs.length,13);
 for(const c of mixed){const s=emptySave();s.coins=999;s.board=[];assert.equal(canAfford(s,c),false);assert.equal(payCost(s,c),false);assert.equal(s.coins,999);s.inventory=[item('material')];assert.equal(payCost(s,c),true);assert.equal(s.inventory.length,0);}
});
test('v3入口遷移v2且保留原備份、音樂音效與地圖格式4，拒絕未來格式',()=>{
 const old={...emptySave(),version:4,schemaVersion:4,coins:77,settings:{music:false,sfx:true},board:Array(63).fill(null),buildings:{stage:2}};
 old.board[31]=item('saved');const memory=new Map([['fantaco.mianhuatang.save.v2',JSON.stringify(old)]]);
 globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const s=loadSave();writeSave(s);assert.equal(s.version,3);assert.equal(s.schemaVersion,4);assert.equal(s.coins,77);assert.equal(s.buildings.stage,2);
 assert.equal(s.board[31].uid,'saved');assert.deepEqual(s.settings,{music:false,sfx:true});assert.equal(memory.get('fantaco.mianhuatang.save.v2'),JSON.stringify(old));
 assert.ok(memory.has('fantaco.mianhuatang.save.v3'));assert.throws(()=>normalizeSave({schemaVersion:99}));
});

test('損毀 v3 可回復保留的 v2，v1 完整道具與資源不遺失',()=>{
 const memory=new Map([['fantaco.mianhuatang.save.v3','broken'],['fantaco.mianhuatang.save.v2',JSON.stringify({...emptySave(),coins:81})]]);
 globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 assert.equal(loadSave().coins,81);memory.clear();
 memory.set('fantaco.mianhuatang.save.v1',JSON.stringify({version:1,coins:32,board:[item('v1-item')],inventory:[item('v1-bag')],settings:{music:false,sfx:false}}));
 const s=loadSave();assert.equal(s.coins,32);assert.ok(s.board.some(x=>x?.uid==='v1-item'));assert.equal(s.inventory[0].uid,'v1-bag');assert.deepEqual(s.settings,{music:false,sfx:false});
});
