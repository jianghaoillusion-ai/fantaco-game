// Node integration harness: real application/data/save logic; DOM/audio/mascot are stubs.
// This verifies gameplay transitions, not browser rendering or touch layout.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as save from '../js/save.js';
import * as merge from '../js/merge.js';
import * as layout from '../js/board-layout.js';
import * as world from '../js/world.js';
import {attachSystems} from '../js/systems.js';
import {GEN_POPS,GEN_COOL_MS} from '../js/fog.js';
const root = new URL('../', import.meta.url);
const json = name => JSON.parse(readFileSync(new URL(name, root)));
class Element {
 constructor(){this.style={setProperty(){}};this.dataset={};this.children=[];this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:x=>{}};}
 querySelector(){return new Element();} querySelectorAll(){return [];}
 addEventListener(){} appendChild(el){this.children.push(el);return el;} remove(){} getBoundingClientRect(){return {x:0,y:0};}
}
async function harness(initial){
 const memory = new Map(initial ? [['fantaco.mianhuatang.save.v2',JSON.stringify(initial)]] : []);
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const elements=new Map();const el=s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s);};
 const document={baseURI:'http://localhost/',body:new Element(),createElement:()=>new Element(),getElementById:id=>el('#'+id),querySelector:el,dispatchEvent(){},querySelectorAll:s=>s==='.screen,.overlay'?[...elements.values()]:[],addEventListener(){}};
 globalThis.document=document;
 const context=vm.createContext({...save,...merge,...world,...layout,attachSystems,GEN_POPS,GEN_COOL_MS,document,window:{addEventListener(){}},Image:Element,URL,Date,Math,console,
 fetch:async url=>({ok:true,json:async()=>json(url.split('?')[0])}),
 requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},matchMedia:()=>({matches:true}),
 Auth:{},mountMascot:()=>new Proxy({}, {get:()=>()=>{}}),sfx:new Proxy({}, {get:()=>()=>{}}),
 setAudioSettings(){},getAudioSettings(){return {}},playMusic(){},stopMusic(){},unlockAudio(){},playClearTheme:async()=>{}});
 let src=readFileSync(new URL('js/app.js',root),'utf8').replace(/^import[\s\S]*?from ".*?";\n/gm,'').replace('export async function boot','async function boot');
 src=src.slice(0,src.lastIndexOf('boot().catch'));
 vm.runInContext(src+'\nglobalThis.api={boot,show,tryFulfill,tapGenerator,onDragUp,onBoardDown,onTap,nextStory,ensureOrders,persist,moveOrMerge,moveToInventory,systems:()=>systems,applyBoardLayout,save:()=>SAVE};',context);
 await context.api.boot();
 return {api:context.api,el,memory};
}
test('新遊戲→所有新版故事→12張無限訂單→重讀存檔',async()=>{
 const {api,el,memory}=await harness();
 const story=json('data/story-orders.json').orders;
 const finishDialogs=()=>{for(let i=0;i<30 && el('#story').classList.contains('on');i++)api.nextStory();el('#result').classList.remove('on');api.show('play');};
 api.show('play');finishDialogs();
 const s=api.save();
 for(const expected of story){
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
 assert.ok(s.board.concat(s.inventory).some(x=>x?.gen==='tea'));
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

test('過期拖曳不能複製物品，超額魔法袋整理不截斷',async()=>{
 const {api}=await harness();const s=api.save();
 const from=s.board.findIndex(x=>x?.kind==='item'),item=s.board[from],stale={where:'board',i:from,item};
 const free=s.board.findIndex(x=>!x);s.board[free]=item;s.board[from]=null;
 api.moveOrMerge(stale,4,3);
 assert.equal(s.board.filter(x=>x?.uid===item.uid).length,1);
 s.inventory=Array.from({length:12},(_,i)=>({kind:'item',chain:'star',tier:1,uid:'overflow-'+i}));
 api.moveToInventory({where:'inv',i:0,item:s.inventory[0]},12);
 assert.equal(s.inventory.filter(Boolean).length,12);
});

test('全裝置固定7×9，版面縮放不搬動物品',async()=>{
 const {api,el}=await harness();const s=api.save();const before=JSON.stringify(s.board);
 for(const [w,h] of [[393,852],[820,1180],[1180,820],[320,480]]){
  el('.scene').clientWidth=w;el('.scene').clientHeight=h;
  const size=api.applyBoardLayout();assert.equal(size.cols,7);assert.equal(size.rows,9);
  assert.equal(JSON.stringify(s.board),before);assert.equal(s.board.length,63);
 }
});


test('快速連續合成只領首次發現獎勵，重複物品不重領', async () => {
 const {api} = await harness(); const s = api.save();
 s.discovered = {}; const coins = s.coins, xp = s.xp, seeds = s.starSeeds;
 for (let n = 0; n < 5; n++) {
  const a = {kind:'item', chain:'star', tier:1, uid:'left-'+n};
  s.board[29] = a;
  s.board[30] = {kind:'item', chain:'star', tier:1, uid:'right-'+n};
  api.moveOrMerge({where:'board', i:29, item:a}, 4, 2);
  assert.equal(s.board[29], null); assert.equal(s.board[30].tier, 2);
  assert.equal(s.coins, coins); assert.equal(s.xp, xp); assert.equal(s.starSeeds, seeds+1);
 }
 const stored = JSON.parse(localStorage.getItem('fantaco.mianhuatang.save.v3'));
 assert.equal('comboBest' in stored, false);
});


test('魔法袋只扣星星種子，拒絕不足資源並保留擴充存檔', async () => {
 const {api,memory}=await harness();const s=api.save();
 s.coins=9999;s.starSeeds=7;s.magicBag.materials={wood:99};
 const items=JSON.stringify(s.inventory);
 api.systems().shop.expandBag();
 assert.equal(s.magicBag.capacity,8);assert.equal(s.starSeeds,7);
 s.starSeeds=32;
 for(const cap of [12,16,20,24]){api.systems().shop.expandBag();assert.equal(s.magicBag.capacity,cap);}
 assert.equal(s.starSeeds,0);assert.equal(s.coins,9999);
 assert.deepEqual(s.magicBag.materials,{wood:99});assert.equal(JSON.stringify(s.inventory),items);
 s.starSeeds=8;api.systems().shop.expandBag();assert.equal(s.starSeeds,8);
 assert.equal(JSON.parse(memory.get('fantaco.mianhuatang.save.v3')).magicBag.capacity,24);
 assert.equal(save.loadSave().magicBag.capacity,24);
});

test('滿盤不扣體力不塞背包，不相容落點不交換物品',async()=>{
 const {api}=await harness();const s=api.save();s.unlockedClumps=['all'];
 s.board=s.board.map((x,i)=>x||{kind:'item',chain:'star',tier:1,uid:'full-'+i});
 const gi=s.board.findIndex(x=>x.kind==='gen'),energy=s.energy,inv=s.inventory.length;
 api.tapGenerator({where:'board',i:gi,item:s.board[gi]});assert.equal(s.energy,energy);assert.equal(s.inventory.length,inv);
 const a=s.board.findIndex(x=>x.chain==='star'),b=s.board.findIndex(x=>x.chain==='garden');
 const before=JSON.stringify(s.board);api.moveOrMerge({where:'board',i:a,item:s.board[a]},Math.floor(b/7),b%7);assert.equal(JSON.stringify(s.board),before);
});

test('同材料訂單只允許領取預留給自己的 UID',async()=>{
 const {api}=await harness();const s=api.save();s.board=Array(63).fill(null);s.inventory=[];
 const need={chain:'star',tier:2},reward={coins:10};s.orders=[{id:'one',need,reward},{id:'two',need,reward}];
 const item={kind:'item',...need,uid:'only'};s.board[31]=item;const loc={where:'board',i:31,item},coins=s.coins;
 api.tryFulfill(loc,'two');assert.equal(s.coins,coins);assert.equal(s.board[31],item);
 api.tryFulfill(loc,'one');assert.equal(s.coins,coins+10);assert.equal(s.board[31],null);
});
