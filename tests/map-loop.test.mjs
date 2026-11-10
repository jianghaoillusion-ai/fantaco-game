import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptySave,normalizeSave,ENERGY} from '../js/save.js';
import {createMap} from '../js/map.js';
import {createShop} from '../js/shop.js';
const original=JSON.parse(readFileSync(new URL('../data/map.json',import.meta.url)));
function setup(data=structuredClone(original)){
 const s=emptySave();s.board=Array(63).fill(null);s.coins=10000;s.starSeeds=10000;
 let writes=0;
 const element={classList:{add(){},remove(){}},textContent:''};
 const ctx={getSave:()=>s,getMap:()=>data,getGame:()=>({board:{inventory:8}}),$:sel=>sel==='#nodes'?null:element,sfx:new Proxy({},{get:()=>()=>{}}),toast(){},persist(){writes++},refresh(){},refreshHud(){},show(){},startStory(_lines,done){done()},applyChapterLook(){},playMusic(){},xpLevel:()=>2,grantGen(){},makeUid:()=>String(Math.random()),infoName:()=>'',ENERGY};
 const map=createMap(ctx),shop=createShop({...ctx,$:()=>null});return {s,data,map,shop,writes:()=>writes};
}
test('正式地圖解鎖／修復完整循環，重複操作不扣款',()=>{
 const {s,data,map}=setup();const [v,c]=data.regions;
 const before=JSON.stringify(s);map.restoreBuilding(c.buildings[0],c);assert.equal(JSON.stringify(s),before);
 map.restoreBuilding(v.buildings[0],v);assert.equal(s.buildings.stage,1);assert.ok(s.unlockedClumps.includes('inner-n'));
 map.askUnlock(c);map.confirmUnlockRegion();assert.ok(s.unlockedRegions.includes('castle'));assert.equal(s.coins,9950);assert.equal(s.starSeeds,9994);
 const paid=s.coins;map.askUnlock(c);map.confirmUnlockRegion();assert.equal(s.coins,paid);
 map.restoreBuilding(c.buildings[0],c);assert.equal(s.buildings.hall,1);
 const reload=normalizeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reload.buildings,s.buildings);assert.deepEqual(reload.unlockedRegions,s.unlockedRegions);
});
test('只加資料的新區域及建築可扣金幣、種子與道具，重讀不遺失',()=>{
 const {s,data,map}=setup();
 const r={id:'weekly-10',name:'週更新',chapter:'village',unlock:{needRegion:'village',coins:10,stars:2,items:[{chain:'star',tier:2,count:2}]},buildings:[{id:'weekly-house',costs:[{coins:3,stars:1,items:[{chain:'garden',tier:1}]}],xp:[10]}]};data.regions.push(r);
 let before=JSON.stringify(s);map.askUnlock(r);map.confirmUnlockRegion();assert.equal(JSON.stringify(s),before);
 s.board[0]={kind:'item',chain:'star',tier:2};s.inventory.push({kind:'item',chain:'star',tier:2});map.askUnlock(r);map.confirmUnlockRegion();assert.ok(s.unlockedRegions.includes(r.id));assert.equal(s.board[0],null);assert.equal(s.inventory.length,0);
 before=JSON.stringify(s);map.restoreBuilding(r.buildings[0],r);assert.equal(JSON.stringify(s),before);
 s.inventory.push({kind:'item',chain:'garden',tier:1});map.restoreBuilding(r.buildings[0],r);assert.equal(s.buildings['weekly-house'],1);
 const paid=s.coins;map.restoreBuilding(r.buildings[0],r);assert.equal(s.coins,paid);assert.equal(normalizeSave(s).buildings['weekly-house'],1);
});
test('滿體力、滿袋及鎖區商品不收費；full補體力重設時間',()=>{
 const {s,data,shop}=setup();const energy=data.shop.items.find(x=>x.id==='energy-full');
 const before=JSON.stringify(s);shop.buy(energy);assert.equal(JSON.stringify(s),before);
 s.energy=99;s.energyAt=0;shop.buy(energy);assert.equal(s.energy,100);assert.ok(s.energyAt>0);assert.equal(s.starSeeds,9985);
 const item=data.shop.items.find(x=>x.id==='star-1');s.inventory=Array.from({length:8},()=>({kind:'item'}));const paid=s.coins;shop.buy(item);assert.equal(s.coins,paid);
 s.inventory=[];shop.buy(data.shop.items.find(x=>x.id==='candy-1'));assert.equal(s.coins,paid);
 shop.buy(item);assert.equal(s.inventory[0].chain,'star');assert.equal(s.coins,paid-10);
});
