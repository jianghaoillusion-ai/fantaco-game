import assert from 'node:assert/strict';
import fs from 'node:fs';
import {starterBoard,fillOrderSlots,produceFrom,remapBoard,NPCS_BY_CHAPTER} from '../js/merge.js';
import {migrateToFixedBoard} from '../js/board-layout.js';
import {availableChains,retiredChains,queueGenerator,claimGenerators,saleValue,recycleOffer} from '../js/progression.js';
const {chains,generators:gens}=JSON.parse(fs.readFileSync(new URL('../data/chains.json',import.meta.url)));
const story=JSON.parse(fs.readFileSync(new URL('../data/story-orders.json',import.meta.url))).orders;
const board=starterBoard(7,9);
assert.deepEqual(board.filter(Boolean).map(c=>[c.kind,c.chain||c.gen,c.tier]),[['item','star',1],['gen','star',1],['item','star',1]]);
const old={board:board.map((c,i)=>c||{kind:'item',chain:'goods',tier:1,uid:'old-'+i}),boardCols:7,boardRows:9,inventory:[]};
const snapshot=JSON.stringify(old.board);migrateToFixedBoard(old,{remapBoard,starterBoard});assert.equal(JSON.stringify(old.board),snapshot);
assert.equal(queueGenerator(old,'garden',1,gens,()=>true,'garden'),true);
assert.equal(old.pendingGenerators.length,1);assert.equal(old.inventory.length,0);
queueGenerator(old,'garden',1,gens,()=>true,'duplicate');assert.equal(old.pendingGenerators.length,1);
old.board[0]=null;old.board[1]=null;assert.equal(claimGenerators(old,()=>true),0);
old.board[2]=null;assert.equal(claimGenerators(old,i=>i!==2),0);assert.equal(claimGenerators(old,()=>true),1);
assert.equal(claimGenerators(old,()=>true),0);
assert.equal(saleValue({tier:1}),1);assert.equal(saleValue({tier:3}),6);
const save={board,inventory:[],chapter:'village',storyDone:[],orders:[]};
assert.deepEqual(availableChains(save,gens),['star']);
const opts={chains,chapter:'village',discovered:{'goods:4':true,'garden:7':true},npcsByChapter:NPCS_BY_CHAPTER,nextStory:story[0]};
for(let i=0;i<100;i++) {
 save.orders=[{id:'stale',need:{chain:'goods',tier:2}}];
 fillOrderSlots(save,3,{...opts,availableChains:availableChains(save,gens)});
 assert.equal(save.orders.length,3);assert.ok(save.orders.every(o=>o.need.chain==='star'));
}
const star=board.find(c=>c?.kind==='gen');star.queue=[{chain:'goods',tier:1}];
for(let i=0;i<1000;i++) assert.equal(produceFrom(star,gens).chain,'star');
assert.ok(retiredChains(save,chains,story).includes('goods'));
console.log('PASS new/legacy boards, locked order replacement, producer queues, 3-open-cell claim, dedupe and tier-1 sale');

const ended={board:[{kind:'gen',gen:'star',tier:1},{kind:'gen',gen:'candy',tier:1}],inventory:[],chapter:'ending',storyDone:story.map(o=>o.flag||o.id)};
assert.ok(retiredChains(ended,chains,story).includes('star'));
assert.ok(!retiredChains(ended,chains,story).includes('candy'));
assert.deepEqual(availableChains(ended,gens,retiredChains(ended,chains,story)),['candy']);

const recycling={board:[{kind:'item',chain:'goods',tier:1},{kind:'item',chain:'goods',tier:4}],inventory:[{kind:'item',chain:'goods',tier:2}]};
assert.deepEqual([recycleOffer(recycling,'goods',i=>i===0).count,recycleOffer(recycling,'goods',i=>i===0).coins],[2,5]);
