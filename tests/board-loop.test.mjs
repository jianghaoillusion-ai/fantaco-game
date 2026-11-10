import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptySave} from '../js/save.js';
import {starterBoard,generateItem} from '../js/merge.js';
import * as loop from '../js/board-loop.js';
import * as daily from '../js/daily-challenge.js';
const gens=JSON.parse(readFileSync(new URL('../data/chains.json',import.meta.url))).generators;
test('12 格連通島，重排後不增格不丟物；滿袋縮盤仍保留全部',()=>{
 const s=emptySave();s.board=starterBoard(7,9);loop.arrangeFogBoard(s,7,9);
 assert.equal(loop.openCells(s).length,12);const uids=s.board.filter(Boolean).map(x=>x.uid).sort();
 const cells=loop.openCells(s), seen=new Set([cells[0]]);for(let n=0;n<cells.length;n++)for(const i of cells)if(cells.some(j=>seen.has(j)&&Math.abs(i%7-j%7)+Math.abs(Math.floor(i/7)-Math.floor(j/7))===1))seen.add(i);
 assert.equal(seen.size,12);
 loop.arrangeFogBoard(s,10,7);assert.equal(loop.openCells(s).length,12);assert.deepEqual(s.board.filter(Boolean).map(x=>x.uid).sort(),uids);
 s.fog.legacyOpen=true;s.board=Array.from({length:70},(_,i)=>({kind:'item',chain:'star',tier:1,uid:''+i}));s.inventory=Array.from({length:8},(_,i)=>({uid:'bag'+i}));
 loop.arrangeFogBoard(s,6,5);assert.equal(s.board.filter(Boolean).length+s.inventory.length,78);
});
test('優先最近一圈隨機空格，冷卻重讀後有效、失敗不耗體力',()=>{
 const s=emptySave();s.board=starterBoard(7,9);loop.arrangeFogBoard(s,7,9);
 const gen=s.board.find(x=>x?.kind==='gen'),gi=s.board.indexOf(gen);
 const out=generateItem(s,gen,gens,{max:80,cost:1,cooldownMs:2000},()=>0,10000);
 assert.ok(out.item);assert.ok(Math.max(Math.abs(gi%7-out.index%7),Math.abs(Math.floor(gi/7)-Math.floor(out.index/7)))<=1);
 const before=JSON.stringify(s);assert.equal(generateItem(s,gen,gens,{max:80,cost:1,cooldownMs:2000},()=>0,11000).error,'cooldown');assert.equal(JSON.stringify(s),before);
 assert.ok(generateItem(s,gen,gens,{max:80,cost:1,cooldownMs:2000},()=>0,12000).item);
});
test('台北午夜挑戰重置，交三單只領一次，材料可堆疊',()=>{
 const s=emptySave(), now=Date.parse('2026-11-10T15:59:00Z');
 for(let i=0;i<3;i++)daily.recordOrder(s,now);
 assert.equal(s.magicBag.materials.wood,3);assert.ok(daily.claimChallenge(s,now).ok);
 const seeds=s.starSeeds;assert.equal(daily.claimChallenge(s,now).error,'claimed');assert.equal(s.starSeeds,seeds);
 daily.challengeState(s,now+60000);assert.equal(s.challenge.orders,0);assert.equal(s.challenge.claimed,false);
});
