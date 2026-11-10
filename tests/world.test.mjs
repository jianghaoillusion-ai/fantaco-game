import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canAfford,payCost,regionUnlockBlocked} from '../js/world.js';
test('缺道具不可扣款；重複需求不能重用同一物品',()=>{
 const s={coins:100,starSeeds:10,board:[{kind:'item',chain:'star',tier:2}],inventory:[]};
 const cost={coins:20,stars:2,items:[{chain:'star',tier:2,count:2}]};
 assert.equal(canAfford(s,cost),false);
 const before=JSON.stringify(s);assert.equal(payCost(s,cost),false);assert.equal(JSON.stringify(s),before);
 s.inventory.push({kind:'item',chain:'star',tier:2});assert.equal(payCost(s,cost),true);
 assert.equal(s.coins,80);assert.equal(s.starSeeds,8);assert.equal(s.board[0],null);assert.equal(s.inventory.length,0);
});
test('非法成本不得加錢，已開區域不能再扣款',()=>{
 const s={coins:100,starSeeds:10,unlockedRegions:['village','castle']};
 assert.equal(canAfford(s,{coins:-1}),false);
 assert.ok(regionUnlockBlocked({},s,{id:'castle',unlock:{coins:10}}));
});
import {normalizeSave,emptySave} from '../js/save.js';
test('舊草稿修復與非標準盤面遷移一次，保留全部物品',()=>{
 const old={...emptySave(),schemaVersion:3,version:3,boardCols:10,boardRows:8,board:Array.from({length:80},(_,i)=>({uid:String(i),kind:'item',chain:'star',tier:1})),inventory:[],map:{regions:{village:2,forest:1},unlockedGenerators:['garden']},unlockedClumps:null};
 const s=normalizeSave(old);assert.equal(s.boardCols,7);assert.equal(s.boardRows,9);assert.equal(s.board.length,63);
 assert.equal(s.board.filter(Boolean).length+s.inventory.length,80);assert.equal(s.buildings.stage,3);assert.ok(s.unlockedRegions.includes('hill'));
 assert.deepEqual(normalizeSave(s),s);
});
