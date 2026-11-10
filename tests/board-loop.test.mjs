import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptySave} from '../js/save.js';
import {starterBoard,nearbyEmpty} from '../js/merge.js';
import {isCellOpen} from '../js/world.js';
import {createOrdersUi} from '../js/orders-ui.js';
test('開場13格連通島，生成器優先相鄰且不進鎖格',()=>{
 const s=emptySave();s.unlockedClumps=['start'];s.board=starterBoard(7,9);
 const open=i=>isCellOpen(s,Math.floor(i/7),i%7,7,9);
 const cells=s.board.map((_,i)=>i).filter(open);assert.equal(cells.length,13);
 const seen=new Set([cells[0]]);for(let n=0;n<cells.length;n++)for(const i of cells)if(cells.some(j=>seen.has(j)&&Math.abs(i%7-j%7)+Math.abs(Math.floor(i/7)-Math.floor(j/7))===1))seen.add(i);
 assert.equal(seen.size,13);assert.ok(s.board.every((x,i)=>!x||open(i)));
 const gi=s.board.findIndex(x=>x?.kind==='gen'),out=nearbyEmpty(s.board,7,9,gi,open);
 assert.ok(open(out));assert.ok(Math.max(Math.abs(gi%7-out%7),Math.abs(Math.floor(gi/7)-Math.floor(out/7)))<=1);
});
test('每日挑戰跨日重置，與禮物領取日期獨立',()=>{
 const s=emptySave();let day='2026-11-10';
 const ui=createOrdersUi({getSave:()=>s,todayKey:()=>day});
 for(let n=0;n<3;n++)ui.bumpDaily();assert.equal(ui.dailyState().done,3);
 s.daily.claimed=true;s.daily.day=day;day='2026-11-11';
 assert.equal(ui.dailyState().done,0);ui.bumpDaily();assert.equal(ui.dailyState().done,1);
 assert.equal(s.daily.day,'2026-11-10');
});
