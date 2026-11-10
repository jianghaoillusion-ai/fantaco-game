import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as save from '../js/save.js';
import * as merge from '../js/merge.js';
const data = JSON.parse(readFileSync(new URL('../data/chains.json', import.meta.url)));
const game = JSON.parse(readFileSync(new URL('../data/game.json', import.meta.url)));
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) };

test('舊存檔補上金幣、探索進度及巢狀設定，保留物品', () => {
 storage.clear();
 storage.set('fantaco.mianhuatang.save.v2', JSON.stringify({energy: 9, board: [null], settings: {music: false}, restore: {village: 2}}));
 const s = save.loadSave();
 assert.equal(s.coins, 0);
 assert.equal(s.endless.completed, 0);
 assert.equal(s.settings.sfx, true);
 assert.equal(s.restore.journey, 0);
 assert.equal(s.board.length, 63);assert.equal(s.board.filter(Boolean).length,0);
 save.writeSave(s);
 assert.deepEqual(save.loadSave(), s);
});
test('體力遵循資料設定、保留零時間戳與零碎恢復時間', () => {
 assert.equal(typeof save.configureEnergy, 'function');
 save.configureEnergy({max: 10, regenMs: 1000});
 const s = {energy: 3, energyAt: 0};
 save.tickEnergy(s, 2500);
 assert.equal(s.energy, 5);
 assert.equal(s.energyAt, 2000);
 save.tickEnergy(s, 90000);
 assert.equal(s.energy, 10);
 save.configureEnergy(game.energy);
});
test('無限訂單依區域增難、需要可取得物品、獎勵含金幣', () => {
 const ctx = {chains: data.chains, chapter: 'candy', discovered: {}, npcsByChapter: merge.NPCS_BY_CHAPTER, seq: 1, availableChains: ['tea'], balance: game.orders};
 const early = merge.makeProceduralOrder({...ctx, region: 1});
 const late = merge.makeProceduralOrder({...ctx, region: 100});
 assert.equal(late.need.chain, 'tea');
 assert.ok(late.need.tier > early.need.tier);
 assert.ok(late.need.tier <= data.chains.tea.items.length);
 assert.ok(late.reward.coins > 0);
});
test('每條合成鏈都有多階，生成器掉落和圖片有效', () => {
 for (const chain of Object.values(data.chains)) {
  assert.ok(chain.items.length >= 4, chain.id);
  chain.items.forEach((item, i) => { assert.equal(item.tier, i+1); readFileSync(new URL('../'+item.img, import.meta.url)); });
 }
 for (const gen of Object.values(data.generators)) for (const tier of gen.tiers) {
  for (const [n] of tier.table) assert.ok(data.chains[gen.produces].items[n-1]);
 }
});

test('v1升級保留舊獎勵，損毀JSON不讓載入崩潰', () => {
 storage.clear();storage.set('fantaco.mianhuatang.save.v1',JSON.stringify({xp:123,starSeeds:7,profile:{nickname:'測試'}}));
 let s=save.loadSave();assert.equal(s.xp,123);assert.equal(s.starSeeds,7);assert.equal(s.coins,0);
 storage.clear();storage.set('fantaco.mianhuatang.save.v2','broken');
 assert.equal(save.loadSave().energy,game.energy.max);
});
test('時鐘倒退不鎖住體力，長時間離線只回到上限', () => {
 save.configureEnergy(game.energy);
 const s={energy:0,energyAt:1000000};save.tickEnergy(s,500000);
 assert.equal(s.energyAt,500000);assert.equal(s.energy,0);
 save.tickEnergy(s,500000+game.energy.regenMs);assert.equal(s.energy,1);
 save.tickEnergy(s,10**12);assert.equal(s.energy,game.energy.max);
});
