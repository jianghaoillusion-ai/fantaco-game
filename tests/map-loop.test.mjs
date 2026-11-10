import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as save from '../js/save.js';
import * as loop from '../js/map-loop.js';
import {buyOffer} from '../js/shop-logic.js';
const data=JSON.parse(readFileSync(new URL('../data/map-regions-draft.json',import.meta.url)));
const item=(chain,tier,uid)=>({kind:'item',chain,tier,uid});
function ready(){const s=save.emptySave();s.board=Array(63).fill(null);s.coins=10000;s.starSeeds=10000;s.magicBag.materials.wood=100;return s;}
test('修復先檢查所有資源，不足不扣款；兩步修好才開城堡',()=>{
 const s=ready();const before=JSON.stringify(s);
 assert.equal(loop.repairRegion(s,data,'village').error,'items');assert.equal(JSON.stringify(s),before);
 for(const step of data.regions[0].steps){for(const req of step.cost.items||[])for(let n=0;n<(req.count||1);n++)s.inventory.push(item(req.chain,req.tier,Math.random()+''));assert.ok(loop.repairRegion(s,data,'village').ok);}
 assert.equal(loop.regionStatus(s,data,'village').state,'restored');
 assert.equal(loop.regionStatus(s,data,'castle').state,'available');
 const paid=s.coins;assert.equal(loop.repairRegion(s,data,'village').error,'complete');assert.equal(s.coins,paid);
 assert.ok(s.map.unlockedGenerators.includes('garden'));
});
test('商店僅遊戲貨幣；滿體力或背包滿不收費，購物重讀保留',()=>{
 const s=ready();let before=JSON.stringify(s);
 assert.equal(buyOffer(s,data,'energy-coins',save.ENERGY.max).error,'energy-full');assert.equal(JSON.stringify(s),before);
 s.energy=0;assert.ok(buyOffer(s,data,'energy-coins',save.ENERGY.max).ok);assert.equal(s.energy,20);
 assert.ok(buyOffer(s,data,'star-item',save.ENERGY.max).ok);assert.equal(s.inventory.length,1);
 s.inventory=Array.from({length:s.magicBag.capacity},(_,i)=>item('star',1,''+i));before=JSON.stringify(s);
 assert.equal(buyOffer(s,data,'star-item',save.ENERGY.max).error,'bag-full');assert.equal(JSON.stringify(s),before);
 assert.equal(buyOffer(s,data,'unknown',80).error,'offer');
 assert.deepEqual(save.normalizeSave(JSON.parse(JSON.stringify(s))).magicBag,s.magicBag);
});
test('schema 3 遷移保留舊盤面背包、章節、資源，未來版本不降級',()=>{
 const s=save.normalizeSave({version:2,board:[item('star',3,'a')],inventory:[item('garden',2,'b')],chapter:'candy',starSeeds:9});
 assert.equal(s.schemaVersion,3);assert.equal(s.board[0].uid,'a');assert.equal(s.inventory[0].uid,'b');assert.equal(s.chapter,'candy');assert.equal(s.fog.legacyOpen,true);
 assert.throws(()=>save.normalizeSave({schemaVersion:99}),/版本/);
});
