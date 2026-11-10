// Node integration harness: real application/data/save logic; DOM/audio/mascot are stubs.
// This verifies gameplay transitions, not browser rendering or touch layout.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as save from '../js/save.js';
import * as merge from '../js/merge.js';
import * as mapLoop from '../js/map-loop.js';
import * as mapAdapter from '../js/map-adapter.js';
import * as shop from '../js/shop-logic.js';
import * as boardLoop from '../js/board-loop.js';
import * as daily from '../js/daily-challenge.js';
import * as loopUI from '../js/loop-ui.js';
const root = new URL('../', import.meta.url);
const json = name => JSON.parse(readFileSync(new URL(name, root)));
class Element {
 constructor(){this.style={setProperty(){}};this.dataset={};this.children=[];this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:x=>{}};}
 addEventListener(){} appendChild(el){this.children.push(el);return el;} remove(){} getBoundingClientRect(){return {x:0,y:0};}
}
async function harness(initial){
 const memory = new Map(initial ? [['fantaco.mianhuatang.save.v2',JSON.stringify(initial)]] : []);
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const elements=new Map();const el=s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s);};
 const document={baseURI:'http://localhost/',body:new Element(),createElement:()=>new Element(),getElementById:id=>el('#'+id),querySelector:el,dispatchEvent(){},querySelectorAll:s=>s==='.screen,.overlay'?[...elements.values()]:[],addEventListener(){}};
 globalThis.document=document;
 const context=vm.createContext({...save,...merge,...mapLoop,...mapAdapter,...shop,...boardLoop,...daily,...loopUI,document,window:{addEventListener(){}},Image:Element,URL,Date,Math,console,
 fetch:async url=>({ok:true,json:async()=>json(url.split('?')[0])}),
 requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},matchMedia:()=>({matches:true}),
 Auth:{},mountMascot:()=>new Proxy({}, {get:()=>()=>{}}),sfx:new Proxy({}, {get:()=>()=>{}}),
 setAudioSettings(){},getAudioSettings(){return {}},playMusic(){},stopMusic(){},unlockAudio(){},playClearTheme:async()=>{}});
 let src=readFileSync(new URL('js/app.js',root),'utf8').replace(/^import[\s\S]*?from ".*?";\n/gm,'').replace('export async function boot','async function boot');
 src=src.slice(0,src.lastIndexOf('boot().catch'));
 vm.runInContext(src+'\nglobalThis.api={boot,show,tryFulfill,tapGenerator,onDragUp,onBoardDown,onTap,sellSelected,nextStory,ensureOrders,persist,moveOrMerge,moveToInventory,repairMapRegion,purchaseOffer,collectChallenge,applyBoardLayout,save:()=>SAVE};',context);
 await context.api.boot();
 return {api:context.api,el,memory};
}
test('新遊戲→所有新版故事與地圖修復→12張無限訂單→重讀存檔',async()=>{
 const {api,el,memory}=await harness();
 const story=json('data/story-orders.json').orders;
 const finishDialogs=()=>{for(let i=0;i<30 && el('#story').classList.contains('on');i++)api.nextStory();el('#result').classList.remove('on');api.show('play');};
 api.show('play');finishDialogs();
 const s=api.save();
 for(const expected of story){
  // Repair sequentially with genuine resource/item transactions before entering gated chapters.
  const map=json('data/map-regions-draft.json');
  while(!mapLoop.mapChapterOpen(s,map,expected.chapter)) {
   const region=map.regions.find(r=>mapLoop.regionStatus(s,map,r.id).state==='available');
   assert.ok(region,'reachable repair');
   const step=mapLoop.regionStatus(s,map,region.id).next;
   s.coins+=step.cost.coins;s.starSeeds+=step.cost.starSeeds;s.magicBag.materials.wood=(s.magicBag.materials.wood||0)+10;
   for(const req of step.cost.items||[])s.inventory.push({kind:'item',...req,uid:'repair-'+region.id+'-'+Math.random()});
   assert.ok(api.repairMapRegion(region.id).ok);
  }
  api.ensureOrders();finishDialogs();
  const o=s.orders.find(x=>!x.procedural);
  assert.equal(o.id,expected.id);
  const definitions=json('data/chains.json');
  assert.ok(definitions.chains[o.need.chain].items[o.need.tier-1], 'story tier exists '+o.id);
  assert.ok(s.board.concat(s.inventory).some(x=>x?.kind==='gen'&&definitions.generators[x.gen]?.produces===o.need.chain),'story source available '+o.id);
  assert.ok(s.flags['seen-intro-'+o.id],o.id+' intro');
  const i=s.board.findIndex(x=>!x);
  const item={kind:'item',...o.need,uid:'test-'+o.id};s.board[i]=item;
  const coins=s.coins,xp=s.xp,seeds=s.starSeeds;
  api.tryFulfill({where:'board',i,item},o.id);
  assert.equal(s.coins,coins+(o.reward.coins||0));assert.equal(s.xp,xp+o.reward.xp);assert.equal(s.starSeeds,seeds+o.reward.seeds);
  assert.ok(s.storyDone.includes(o.flag));
  const paid=s.coins;
  api.tryFulfill({where:'board',i,item},o.id);assert.equal(s.coins,paid,'cannot collect twice');
  finishDialogs();
 }
 assert.equal(s.storyDone.length,story.length);
 assert.ok(s.board.some(x=>x?.gen==='tea'));
 for(let n=0;n<12;n++){
  const o=s.orders[0];assert.equal(o.procedural,true);
  const i=s.board.findIndex(x=>!x), item={kind:'item',...o.need,uid:'proc-'+n};s.board[i]=item;
  api.tryFulfill({where:'board',i,item},o.id);finishDialogs();
 }
 assert.equal(s.endless.completed,12);
 assert.equal(merge.endlessRegion(s.endless.completed,json('data/game.json').orders),3);
 const stored=JSON.parse(memory.get('fantaco.mianhuatang.save.v3'));
 assert.deepEqual(stored.endless,{completed:12});assert.equal(stored.coins,s.coins);
 const loaded=save.loadSave();assert.deepEqual(loaded.board,stored.board);assert.deepEqual(loaded.orders,stored.orders);
});
test('實際點生成器、合成及取消觸控不耗體力',async()=>{
 const {api}=await harness();const s=api.save();
 const gi=s.board.findIndex(x=>x?.kind==='gen'),gen=s.board[gi];const energy=s.energy;
 api.tapGenerator({where:'board',i:gi,item:gen});assert.equal(s.energy,energy-1);
 const indices=s.board.map((x,i)=>x?.chain==='star'&&x.tier===1?i:-1).filter(x=>x>=0);
 const [a,b]=indices;
 api.moveOrMerge({where:'board',i:a,item:s.board[a]},Math.floor(b/7),b%7);
 assert.equal(s.board[a],null);assert.equal(s.board[b].tier,2);
 const before=s.energy;
 const piece={dataset:{uid:gen.uid},classList:{remove(){}}};
 api.onBoardDown({target:{closest:()=>piece},pointerId:1,clientX:0,clientY:0});
 api.onDragUp({type:'pointercancel',pointerId:1});assert.equal(s.energy,before);
});

test('滿盤可選擇出售普通物品騰出格子，生成器不會被出售',async()=>{
 const {api,el}=await harness();const s=api.save();
 const i=s.board.findIndex(x=>x?.kind==='item'),item=s.board[i];
 api.onTap({where:'board',i,item});
 assert.equal(el('#btn-sell').hidden,false);
 assert.ok(el('#btn-sell').textContent.includes('出售'));
 const coins=s.coins;
 api.sellSelected();assert.equal(s.board[i],null);assert.ok(s.coins>coins);
 const genIndex=s.board.findIndex(x=>x?.kind==='gen');
 api.onTap({where:'board',i:genIndex,item:s.board[genIndex]});
 api.sellSelected();assert.equal(s.board[genIndex].kind,'gen');
});

test('交單可修復、地圖／商店操作會持久化；鎖格禁止移動',async()=>{
 const {api,memory}=await harness();const s=api.save();
 assert.equal(boardLoop.openCells(s).length,12);assert.ok(s.orders.length>=2&&s.orders.length<=3);
 const order=s.orders[0], i=boardLoop.firstOpenEmpty(s);
 const item={kind:'item',...order.need,uid:'payment'};s.board[i]=item;
 api.tryFulfill({where:'board',i,item},order.id);
 assert.equal(s.magicBag.materials.wood,1);assert.equal(s.challenge.orders,1);assert.ok(s.coins>0);
 s.coins=100;s.starSeeds=100;s.inventory.push({kind:'item',chain:'star',tier:2,uid:'repair'});
 assert.ok(api.repairMapRegion('village').ok);assert.equal(boardLoop.openCells(s).length,16);
 const level=s.level;assert.equal(level,2);
 s.energy=0;assert.ok(api.purchaseOffer('energy-coins').ok);assert.equal(s.energy,20);
 const stored=JSON.parse(memory.get('fantaco.mianhuatang.save.v2'));
 assert.equal(stored.map.regions.village,1);assert.equal(stored.challenge.orders,1);assert.equal(stored.energy,20);
 const locIndex=s.board.findIndex(Boolean),original=s.board[locIndex],locked=s.board.findIndex((_,j)=>!boardLoop.isCellOpen(s,j));
 api.moveOrMerge({where:'board',i:locIndex,item:original},Math.floor(locked/s.boardCols),locked%s.boardCols);
 assert.equal(s.board[locIndex],original);assert.equal(s.board[locked],null);
});

test('旋轉後的過期拖曳不能複製物品，超額魔法袋整理不截斷',async()=>{
 const {api}=await harness();const s=api.save();
 const from=s.board.findIndex(x=>x?.kind==='item'),item=s.board[from],stale={where:'board',i:from,item};
 const free=boardLoop.firstOpenEmpty(s);s.board[free]=item;s.board[from]=null;
 const dest=boardLoop.openCells(s).find(i=>!s.board[i]&&i!==from);
 api.moveOrMerge(stale,Math.floor(dest/s.boardCols),dest%s.boardCols);
 assert.equal(s.board.filter(x=>x?.uid===item.uid).length,1);
 s.inventory=Array.from({length:12},(_,i)=>({kind:'item',chain:'star',tier:1,uid:'overflow-'+i}));
 api.moveToInventory({where:'inv',i:0,item:s.inventory[0]},12);
 assert.equal(s.inventory.filter(Boolean).length,12);
});
