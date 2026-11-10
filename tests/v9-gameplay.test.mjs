import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as merge from '../js/merge.js';
import * as save from '../js/save.js';
import {createFog} from '../js/fog.js';
import {isCellOpen} from '../js/world.js';
import {createBag,bagCap} from '../js/bag.js';
globalThis.document={querySelector:()=>null};
const data=JSON.parse(readFileSync(new URL('../data/chains.json',import.meta.url)));
const opts={chains:data.chains,chapter:'village',discovered:{},npcsByChapter:merge.NPCS_BY_CHAPTER,availableChains:['star']};
const item=(uid,tier=2)=>({kind:'item',chain:'star',tier,uid});
for(const slot of [0,1,2,3]) test(`交第 ${slot+1} 張仍維持 1:2:1 且不洗掉其他訂單`,()=>{
 const s=save.emptySave();merge.fillOrderSlots(s,4,opts);
 assert.deepEqual(s.orders.map(o=>o.difficulty),['easy','medium','medium','hard']);
 const keep=s.orders.filter((_,i)=>i!==slot);s.orders=keep;merge.fillOrderSlots(s,4,opts);
 assert.deepEqual(s.orders.map(o=>o.need.tier),[2,3,3,4]);
 for(const o of keep)assert.ok(s.orders.some(x=>x.id===o.id));
});
for(const tier of [2,3,5]) test(`故事第 ${tier} 階佔相應難度格`,()=>{
 const s=save.emptySave();merge.fillOrderSlots(s,4,{...opts,nextStory:{id:'story',flag:'story',npc:'feifei',need:{chain:'star',tier},reward:{seeds:2}}});
 assert.equal(s.orders.length,4);assert.deepEqual(s.orders.map(o=>o.difficulty),['easy','medium','medium','hard']);assert.equal(s.orders.filter(o=>o.id==='story').length,1);
});
test('同物品不能讓兩張訂單同時就緒',()=>{const orders=[{need:{chain:'star',tier:2}},{need:{chain:'star',tier:2}}];merge.reserveItems(orders,[item('one')],[]);assert.deepEqual(orders.map(o=>o.reservedUid),['one',null]);});
test('移入袋子不把預留轉讓給另一張單',()=>{const orders=[{need:{chain:'star',tier:2},reservedUid:'one'},{need:{chain:'star',tier:2},reservedUid:'two'}];merge.reserveItems(orders,[item('two')],[item('one')]);assert.deepEqual(orders.map(o=>o.reservedUid),['one','two']);});
test('消耗後才補配，保留其他有效預留',()=>{const orders=[{need:{chain:'star',tier:2},reservedUid:'gone'},{need:{chain:'star',tier:2},reservedUid:'two'}];merge.reserveItems(orders,[item('two'),item('new')],[]);assert.deepEqual(orders.map(o=>o.reservedUid),['new','two']);});
const autoState=()=>{const s=save.emptySave();s.board=Array(63).fill(null);s.board[31]={kind:'gen',gen:'garden',tier:1,uid:'g'};return s;};
test('自動產出初始化計時',()=>{const s=autoState();assert.equal(merge.tickAutoGenerators(s,data.generators,7,9,()=>true,0).made.length,0);assert.equal(s.board[31].autoAt,45000);});
test('時間未到不產出',()=>{const s=autoState();s.board[31].autoAt=45000;assert.equal(merge.tickAutoGenerators(s,data.generators,7,9,()=>true,44999).made.length,0);});
test('到期只產一件且不耗體力',()=>{const s=autoState();s.board[31].autoAt=0;assert.equal(merge.tickAutoGenerators(s,data.generators,7,9,()=>true,900000).made.length,1);assert.equal(s.energy,100);});
test('滿盤保留到期計時，騰位立即補一件',()=>{const s=autoState();s.board[31].autoAt=0;s.board=s.board.map((x,i)=>x||item('x'+i));assert.equal(merge.tickAutoGenerators(s,data.generators,7,9,()=>true,100).blocked,true);assert.equal(s.board[31].autoAt,0);s.board[30]=null;assert.equal(merge.tickAutoGenerators(s,data.generators,7,9,()=>true,101).made.length,1);});
test('袋內產生器不自動產出',()=>{const s=autoState();s.inventory=[s.board[31]];s.board[31]=null;assert.equal(merge.tickAutoGenerators(s,data.generators,7,9,()=>true,999999).made.length,0);});
test('迷霧格內產生器不產出',()=>{const s=autoState();s.board[31].autoAt=0;assert.equal(merge.tickAutoGenerators(s,data.generators,7,9,()=>false,100).made.length,0);});
for(const [r,c] of [[1,1],[1,3],[7,5],[4,1]])test(`邊緣 ${r},${c} 合成只揭一格四鄰`,()=>{const s=save.emptySave();const f=createFog({getSave:()=>s,getCols:()=>7,getRows:()=>9,toast:()=>{}});assert.equal(f.revealAdjacent(r,c),true);assert.equal(s.unlockedCells.length,1);const [rr,cc]=s.unlockedCells[0].split(',').map(Number);assert.equal(Math.abs(rr-r)+Math.abs(cc-c),1);assert.equal(isCellOpen(s,rr,cc,7,9),true);});
test('中間合成不隔空揭霧',()=>{const s=save.emptySave();const f=createFog({getSave:()=>s,getCols:()=>7,getRows:()=>9,toast:()=>{}});assert.equal(f.revealAdjacent(4,3),false);});
for(const version of [1,2,3,4])test(`v${version} 存檔遷移保留道具設定與建築`,()=>{const raw={version,board:[item('saved')],inventory:[item('bag')],coins:77,buildings:{stage:2},settings:{music:false,sfx:false,musicVol:.3},unlockedCells:['0,1']};const s=save.normalizeSave(raw);assert.equal(s.version,4);assert.equal(s.board[0].uid,'saved');assert.equal(s.inventory[0].uid,'bag');assert.equal(s.coins,77);assert.equal(s.buildings.stage,2);assert.equal(s.settings.music,false);assert.equal(s.settings.musicVol,.3);assert.ok(s.unlockedCells.includes('0,1'));});
test('未來格式拒絕覆蓋',()=>assert.throws(()=>save.normalizeSave({schemaVersion:99}),/存檔版本/));
test('損毀 v3 回復 v2 並保留原備份',()=>{const old=JSON.stringify({...save.emptySave(),coins:81});const m=new Map([['fantaco.mianhuatang.save.v3','broken'],['fantaco.mianhuatang.save.v2',old]]);globalThis.localStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};const s=save.loadSave();assert.equal(s.coins,81);save.writeSave(s);assert.equal(m.get('fantaco.mianhuatang.save.v2'),old);assert.equal(JSON.parse(m.get('fantaco.mianhuatang.save.v3')).coins,81);});
test('v3 優先於舊備份',()=>{globalThis.localStorage={getItem:k=>JSON.stringify({...save.emptySave(),coins:k.endsWith('v3')?99:1})};assert.equal(save.loadSave().coins,99);});
test('舊魔法袋容量不得縮小',()=>{const s=save.normalizeSave({version:3,magicBag:{capacity:24},inventory:[]});assert.equal(bagCap(s),24);});
test('新帳號魔法袋維持 main 的六格',()=>assert.equal(bagCap(save.emptySave()),6));
test('rebase 保留 main 金幣經驗、鑽石、補給與當日進度',()=>{
 const day=save.todayKey();
 const s=save.normalizeSave({version:4,coins:17,coinsEarned:123,xp:99,diamonds:9,boosters:{wand:2,clear:1},daily:{challengeDay:day,challenge:2},ads:{day,count:3},shopDaily:{day,bought:{energy:1}}});
 assert.equal(s.xp,123);assert.equal(s.coins,17);assert.equal(s.diamonds,9);assert.deepEqual(s.boosters,{wand:2,clear:1});assert.equal(s.daily.challenge,2);assert.equal(s.ads.count,3);assert.equal(s.shopDaily.bought.energy,1);
});
test('舊版經驗轉入 main 累計金幣，不歸零',()=>{
 const s=save.normalizeSave({version:3,xp:81,coins:7});assert.equal(s.coinsEarned,81);assert.equal(s.xp,81);assert.equal(s.coins,7);assert.equal(s.version,4);
});
function bag(s,extra={}) {return createBag({getSave:()=>s,$:()=>null,persist:()=>{},refreshHud:()=>{},toast:()=>{},sfx:{invalid:()=>{},daily:()=>{},drop:()=>{}},...extra});}
test('魔法袋擴充只扣星星種子',()=>{const s=save.emptySave();s.coins=100;s.starSeeds=10;bag(s).buySlot(7);assert.equal(s.inventorySlots,7);assert.equal(s.starSeeds,6);assert.equal(s.coins,100);});
test('種子不足不扣金幣補足',()=>{const s=save.emptySave();s.coins=100;s.starSeeds=3;bag(s).buySlot(7);assert.equal(s.inventorySlots,6);assert.equal(s.starSeeds,3);assert.equal(s.coins,100);});
test('袋子取物使用棋盤 index 並保留 UID',()=>{const s=save.emptySave();s.board=Array(63).fill(null);s.inventory=[item('bag')];bag(s,{emptyOpenCell:()=>31,getCols:()=>7,refresh:()=>{}}).placeFromBag(0);assert.equal(s.board[31]?.uid,'bag');assert.equal(s.inventory.length,0);});
test('滿盤從袋取物不得遺失',()=>{const s=save.emptySave();s.board=Array.from({length:63},(_,i)=>item('x'+i));s.inventory=[item('bag')];bag(s,{emptyOpenCell:()=>-1,getCols:()=>7,refresh:()=>{}}).placeFromBag(0);assert.equal(s.inventory[0]?.uid,'bag');assert.equal(s.board.filter(Boolean).length,63);});
test('取物動畫結束時重新找 UID 與空位，連點不覆蓋',()=>{const s=save.emptySave();s.board=Array(63).fill(null);s.inventory=[item('a'),item('b')];const callbacks=[];const b=bag(s,{emptyOpenCell:()=>s.board.findIndex(x=>!x),getCols:()=>7,refresh:()=>{},fx:{flyTo:(_a,_b,done)=>callbacks.push(done)}});b.placeFromBag(0);b.placeFromBag(0);callbacks.forEach(fn=>fn());assert.equal(s.board[0]?.uid,'a');assert.equal(s.inventory[0]?.uid,'b');});
