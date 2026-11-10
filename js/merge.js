/** Merge-2 board, generators, orders. Data-driven chains. */

export function maxTier(chains, chain) {
  return chains[chain]?.items?.length || 1;
}

export function itemDef(chains, chain, tier) {
  return chains[chain]?.items?.[tier - 1] || null;
}

export function genDef(gens, id, tier) {
  const g = gens[id];
  if (!g) return null;
  return g.tiers.find((t) => t.tier === tier) || g.tiers[0];
}

export function makeUid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function emptyBoard(cols, rows) {
  return Array.from({ length: rows * cols }, () => null);
}

export function idx(cols, r, c) { return r * cols + c; }

export function starterBoard(cols, rows) {
  const b = emptyBoard(cols, rows);
  const put = (r, c, cell) => { b[idx(cols, r, c)] = cell; };
  put(2, 3, { kind: "gen", gen: "star", tier: 1, uid: makeUid() });
  put(3, 2, { kind: "item", chain: "star", tier: 1, uid: makeUid() });
  put(3, 4, { kind: "item", chain: "star", tier: 1, uid: makeUid() });
  put(4, 3, { kind: "item", chain: "star", tier: 1, uid: makeUid() });
  put(1, 1, { kind: "item", chain: "garden", tier: 1, uid: makeUid() });
  put(1, 5, { kind: "item", chain: "garden", tier: 1, uid: makeUid() });
  return b;
}

export function canMerge(a, b, chains, gens) {
  if (!a || !b || a === b) return false;
  if (a.kind === "item" && b.kind === "item") {
    return a.chain === b.chain && a.tier === b.tier && a.tier < maxTier(chains, a.chain);
  }
  if (a.kind === "gen" && b.kind === "gen") {
    const g = gens[a.gen];
    if (!g || a.gen !== b.gen) return false;
    return a.tier === b.tier && a.tier < g.tiers[g.tiers.length - 1].tier;
  }
  return false;
}

export function mergeCells(a, b, chains, gens) {
  if (!canMerge(a, b, chains, gens)) return null;
  if (a.kind === "item") return { kind: "item", chain: a.chain, tier: a.tier + 1, uid: makeUid() };
  return { kind: "gen", gen: a.gen, tier: a.tier + 1, uid: makeUid() };
}

function pickTable(table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [tier, w] of table) {
    r -= w;
    if (r <= 0) return tier;
  }
  return table[0][0];
}

export function produceFrom(genCell, gens) {
  const def = gens[genCell.gen];
  const t = genDef(gens, genCell.gen, genCell.tier);
  if (!def || !t) return null;
  const tier = pickTable(t.table);
  for (const bonus of t.bonusDrops || []) {
    if (Math.random() < bonus.chance) return { kind: "item", chain: bonus.chain, tier: bonus.tier, uid: makeUid() };
  }
  return { kind: "item", chain: def.produces, tier, uid: makeUid() };
}

/** Full boards never spend energy or silently send generated items to inventory. */
export function generateItem(save, generator, gens, energy, random = Math.random) {
  const spaces = save.board.map((cell, i) => cell ? -1 : i).filter(i => i >= 0);
  if (!spaces.length) return { error: "full" };
  const cost = energy.cost ?? 1;
  if (save.energy < cost) return { error: "energy" };
  const item = produceFrom(generator, gens);
  if (!item) return { error: "generator" };
  const index = spaces[Math.floor(random() * spaces.length)];
  if (save.energy >= energy.max) save.energyAt = Date.now();
  save.energy -= cost;
  save.board[index] = item;
  return { item, index };
}

export function endlessRegion(completed, balance) {
  return 1 + Math.floor(completed / balance.ordersPerRegion);
}

export function firstEmpty(board) {
  return board.findIndex((c) => !c);
}

export function playerMaxTier(board, inv, chain) {
  let m = 0;
  for (const c of board.concat(inv)) {
    if (c && c.kind === "item" && c.chain === chain) m = Math.max(m, c.tier);
  }
  return m;
}

export function discoveredMax(discovered, chain) {
  let m = 0;
  for (const k of Object.keys(discovered || {})) {
    const [ch, t] = k.split(":");
    if (ch === chain) m = Math.max(m, Number(t) || 0);
  }
  return m;
}

export function keyOf(cell) {
  if (!cell) return "";
  if (cell.kind === "item") return `${cell.chain}:${cell.tier}`;
  return `gen:${cell.gen}:${cell.tier}`;
}

/** Endless / leftover slots: mix of easy, mid, hard orders from unlocked content. */
export function makeProceduralOrder(ctx) {
  const { chains, chapter, discovered, npcsByChapter, seq, availableChains, region = 0, balance = {} } = ctx;
  const order = ["village", "journey", "candy"];
  const unlockedChains = Object.keys(chains).filter((id) => {
    if (availableChains) return availableChains.includes(id);
    const ch = chains[id].chapter;
    return order.indexOf(ch) <= order.indexOf(chapter);
  }).filter((id) => {
    if (availableChains || id === "star" || id === "garden") return true;
    return discoveredMax(discovered, id) >= 1;
  });
  if (!unlockedChains.length) return null;
  const chain = unlockedChains[Math.floor(Math.random() * unlockedChains.length)];
  const cap = region > 0 ? (balance.startTier ?? 2) + Math.floor((region - 1) / (balance.regionsPerTier ?? 2)) : Math.max(2, discoveredMax(discovered, chain));
  const maxT = maxTier(chains, chain);
  // 4 slots style: vary difficulty by seq % 4
  const slot = (seq || 0) % 4;
  let tier;
  if (slot === 0) tier = Math.min(maxT, Math.max(2, Math.min(cap, 2))); // easy
  else if (slot === 3) tier = Math.min(maxT, Math.max(2, cap + (cap >= maxT ? 0 : 1))); // stretch
  else tier = Math.min(maxT, Math.max(2, cap));
  tier = Math.max(2, Math.min(maxT, tier));
  const npcs = npcsByChapter[chapter] || ["feifei", "apiao", "mian"];
  const npc = npcs[Math.floor(Math.random() * npcs.length)];
  const seeds = (balance.seedBase ?? 3) + tier * (balance.seedsPerTier ?? 2) + (slot === 3 ? (balance.hardSeeds ?? 6) : 0);
  const xp = (balance.xpBase ?? 15) + tier * (balance.xpPerTier ?? 10) + (slot === 3 ? (balance.hardXp ?? 20) : 0);
  const energy = slot === 3 ? (balance.hardEnergy ?? 6) : (slot === 0 ? 0 : (balance.energy ?? 3));
  const coins = (balance.coinBase ?? 5) + tier * (balance.coinsPerTier ?? 5);
  return {
    id: "p-" + makeUid(),
    npc,
    need: { chain, tier },
    reward: { seeds, xp, energy, coins },
    region,
    chapter,
    procedural: true
  };
}

export const NPCS_BY_CHAPTER = {
  village: ["jiejie", "feifei", "apiao", "mian"],
  journey: ["feifei", "apiao", "spirit", "mian"],
  candy: ["sika", "feifei", "apiao", "spirit"]
};

export function xpLevel(xp, curve) {
  let lv = 1;
  for (let i = 1; i < curve.length; i++) if (xp >= curve[i]) lv = i + 1;
  if (xp >= curve[curve.length - 1]) lv = curve.length + Math.floor((xp - curve[curve.length - 1]) / 200);
  return Math.max(1, lv);
}
