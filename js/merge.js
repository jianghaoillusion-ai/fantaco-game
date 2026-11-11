/** Merge-2 board, generators, orders. Data-driven chains. */

export function maxTier(chains, chain) {
  return chains[chain]?.items?.length || 1;
}

export function itemDef(chains, chain, tier) {
  return chains[chain]?.items?.[tier - 1] || null;
}

/** Up to 5 icons around the current tier, for Travel Town-style chain peeks. */
export function chainPreview(chains, chain, tier) {
  const items = chains?.[chain]?.items || [];
  if (!items.length) return [];
  const i = Math.max(0, (tier || 1) - 1);
  let start = Math.max(0, i - 2);
  let end = Math.min(items.length, start + 5);
  start = Math.max(0, end - 5);
  return items.slice(start, end).map((it, k) => ({
    img: it.img,
    name: it.name,
    tier: start + k + 1,
    current: start + k + 1 === (tier || 1)
  }));
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
  const put = (r, c, cell) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return;
    b[idx(cols, r, c)] = cell;
  };
  const item = (chain, tier) => ({ kind: "item", chain, tier, uid: makeUid() });
  const gen = (id, tier) => ({ kind: "gen", gen: id, tier, uid: makeUid() });
  // Interior 5x7 is open. Fill ~65% with varied village + later-chain items so the board reads full.
  // Two identical stars sit side-by-side for a first merge.
  put(4, 3, gen("star", 1));
  put(3, 3, gen("garden", 1));
  put(4, 2, item("star", 1));
  put(5, 2, item("star", 1));
  put(2, 3, item("star", 2));
  put(4, 4, item("star", 3));
  put(6, 4, item("star", 7)); // 微笑氣球
  put(5, 1, item("star", 4));
  put(1, 3, item("star", 5));
  put(1, 2, item("garden", 1));
  put(3, 1, item("garden", 2));
  put(5, 3, item("garden", 3));
  put(2, 5, item("garden", 4));
  put(7, 2, item("garden", 5));
  put(1, 1, item("garden", 6));
  put(4, 1, item("garden", 8));
  put(1, 4, item("tea", 1));
  put(6, 1, item("tea", 2));
  put(3, 5, item("candy", 1));
  put(5, 5, item("candy", 2));
  put(6, 3, item("candy", 3));
  put(3, 2, item("candy", 4));
  put(2, 2, item("candy", 5));
  put(4, 5, item("candy", 6));
  put(2, 1, item("magic", 1));
  put(7, 4, item("magic", 2));
  put(1, 5, item("magic", 3));
  put(2, 4, item("magic", 4));
  put(7, 3, item("magic", 5));
  put(7, 5, item("forest", 1));
  put(6, 2, item("forest", 2));
  put(6, 5, item("candy", 7));
  put(7, 1, item("garden", 7));
  put(3, 4, item("goods", 1));
  put(5, 4, item("goods", 2));
  // two interiors left open beside the generators so new drops still have a seat
  return b;
}

/** Scale items onto a new grid. Collisions go to the nearest empty cell; leftovers are returned for inventory. */
export function remapBoard(board, oldCols, oldRows, newCols, newRows) {
  const src = board || [];
  if (!oldCols || !oldRows) {
    oldCols = newCols;
    oldRows = Math.max(1, Math.floor(src.length / Math.max(1, newCols)));
  }
  if (oldCols === newCols && oldRows === newRows && src.length === newCols * newRows) return { board: src, overflow: [] };
  const next = emptyBoard(newCols, newRows);
  const overflow = [];
  const pending = [];
  for (let r = 0; r < oldRows; r++) {
    for (let c = 0; c < oldCols; c++) {
      const cell = src[r * oldCols + c];
      if (!cell) continue;
      const nr = Math.round(r * (newRows - 1) / Math.max(1, oldRows - 1));
      const nc = Math.round(c * (newCols - 1) / Math.max(1, oldCols - 1));
      pending.push({ cell, nr: Math.max(0, Math.min(newRows - 1, nr)), nc: Math.max(0, Math.min(newCols - 1, nc)) });
    }
  }
  for (const it of pending) {
    const i = idx(newCols, it.nr, it.nc);
    if (!next[i]) next[i] = it.cell;
    else overflow.push(it.cell);
  }
  const still = [];
  for (const cell of overflow) {
    const e = firstEmpty(next);
    if (e >= 0) next[e] = cell;
    else still.push(cell);
  }
  return { board: next, overflow: still };
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

export function refillProduceQueue(genCell, gens, n = 10) {
  const def = gens[genCell.gen];
  const t = genDef(gens, genCell.gen, genCell.tier);
  if (!def || !t) return;
  const q = [];
  for (let i = 0; i < n; i++) {
    if (def.id === "garden" && genCell.tier >= 2 && Math.random() < 0.08) q.push({ chain: "tea", tier: 1 });
    else if (def.id === "star" && Math.random() < 0.1) q.push({ chain: "goods", tier: 1 });
    else q.push({ chain: def.produces, tier: pickTable(t.table) });
  }
  genCell.queue = q;
}

export function produceFrom(genCell, gens) {
  const def = gens[genCell.gen];
  const t = genDef(gens, genCell.gen, genCell.tier);
  if (!def || !t) return null;
  if (!genCell.queue || !genCell.queue.length) refillProduceQueue(genCell, gens);
  const next = genCell.queue.shift();
  return { kind: "item", chain: next.chain, tier: next.tier, uid: makeUid() };
}

export function firstEmpty(board) {
  return board.findIndex((c) => !c);
}

/** Prefer a random empty unlocked cell in rings around an origin; then any unlocked empty. */
export function nearbyEmpty(board, cols, rows, origin, isOpen) {
  const open = typeof isOpen === "function" ? isOpen : () => true;
  const empties = (cells) => cells.filter((i) => i >= 0 && i < board.length && !board[i] && open(i));
  if (origin == null || origin < 0) {
    const all = empties([...board.keys()]);
    return all.length ? all[Math.floor(Math.random() * all.length)] : -1;
  }
  const r0 = Math.floor(origin / cols), c0 = origin % cols;
  const maxR = Math.max(cols, rows);
  for (let ring = 1; ring <= maxR; ring++) {
    const cells = [];
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const r = r0 + dr, c = c0 + dc;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        cells.push(r * cols + c);
      }
    }
    const opts = empties(cells);
    if (opts.length) return opts[Math.floor(Math.random() * opts.length)];
  }
  const all = empties([...board.keys()]);
  return all.length ? all[Math.floor(Math.random() * all.length)] : -1;
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
  const { chains, chapter, discovered, npcsByChapter, seq, availableChains } = ctx;
  const order = ["village", "journey", "candy", "bulu", "hate", "ending"];
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
  const cap = Math.max(2, discoveredMax(discovered, chain));
  const maxT = maxTier(chains, chain);
  // 4 slots style: vary difficulty by seq % 4
  const slot = (seq || 0) % 4;
  let tier;
  if (slot === 0) tier = Math.min(maxT, Math.max(2, Math.min(cap, 2))); // easy
  else if (slot === 3) tier = Math.min(maxT, Math.max(4, cap + (cap >= maxT ? 0 : 1))); // stretch
  else tier = Math.min(maxT, Math.max(3, cap));
  tier = Math.max(2, Math.min(maxT, tier));
  const npcs = (npcsByChapter[chapter] || ["feifei", "apiao", "jiejie"]).filter((id) => id !== "mian");
  const npc = npcs[Math.floor(Math.random() * npcs.length)];
  const seeds = 3 + tier * 2 + (slot === 3 ? 6 : 0);
  const xp = 15 + tier * 10 + (slot === 3 ? 20 : 0);
  const energy = slot === 3 ? 6 : (slot === 0 ? 0 : 3);
  return {
    id: "p-" + makeUid(),
    npc,
    need: { chain, tier },
    reward: { seeds, xp, energy, coins: seeds + 4, ...(slot === 3 ? {materials: 1} : {}) },
    chapter,
    procedural: true
  };
}


/** Four stable slots: replacing an order retains its difficulty, including story orders. */
export function fillOrderSlots(save, _slots, opts) {
  const difficulties = ['easy', 'medium', 'medium', 'hard'];
  const old = (save.orders || []).filter(o => o?.need);
  const story = typeof opts.nextStory === 'function' ? opts.nextStory() : opts.nextStory;
  const used = new Set(), usedNpcs = new Set();
  const storySlot = story ? (story.need.tier <= 2 ? 0 : story.need.tier === 3 ? 1 : 3) : -1;
  const npcs = [...new Set([...(opts.npcsByChapter[opts.chapter] || []), 'spirit'])];
  save.orders = difficulties.map((difficulty, slot) => {
    let order = old.find(o => o.slot === slot && o.difficulty === difficulty && !used.has(o.id));
    if (story && slot === storySlot) order = old.find(o => o.id === story.id) || {...story};
    if (!order || (order.flag && order.id !== story?.id)) {
      order = makeProceduralOrder({...opts, seq: slot});
    }
    if (!order) return null;
    used.add(order.id);
    const npc = order.flag ? order.npc : npcs.find(n => !usedNpcs.has(n) && (slot > storySlot || n !== story?.npc)) || order.npc;
    usedNpcs.add(npc);
    return {...order, npc, slot, difficulty};
  }).filter(Boolean);
  reserveOrderItems(save);
}

/** Keep valid reservations, then allocate each remaining UID only once. */
export function reserveOrderItems(save) {
  const items = (save.board || []).concat(save.inventory || []).filter(x => x?.kind === 'item' && x.uid);
  const used = new Set();
  const matches = (item, o) => item.chain === o.need.chain && item.tier === o.need.tier;
  for (const o of save.orders || []) {
    const item = items.find(x => x.uid === o.reservedUid && matches(x, o) && !used.has(x.uid));
    o.reservedUid = item?.uid || null;
    if (item) used.add(item.uid);
  }
  for (const o of save.orders || []) {
    if (o.reservedUid) continue;
    const item = items.find(x => matches(x, o) && !used.has(x.uid));
    if (item) { o.reservedUid = item.uid; used.add(item.uid); }
  }
}

/** A due automatic producer waits when full; never charges energy or catches up in a burst. */
export function tickAutoGenerators(save, gens, cols, rows, isOpen, now = Date.now(), intervalFor = (_save, def) => def?.autoMs) {
  const made = []; let blocked = false, changed = false;
  for (let i = 0; i < save.board.length; i++) {
    const gen = save.board[i], interval = intervalFor(save, gens[gen?.gen], gen);
    if (gen?.kind !== 'gen' || !interval || !isOpen(i)) continue;
    if (!Number.isFinite(gen.autoAt)) { gen.autoAt = now + interval; changed = true; continue; }
    if (gen.autoAt > now) continue;
    const empty = nearbyEmpty(save.board, cols, rows, i, isOpen);
    if (empty < 0) { blocked = true; continue; }
    const item = produceFrom(gen, gens);
    if (!item) continue;
    save.board[empty] = item; gen.autoAt = now + interval; made.push(item); changed = true;
  }
  return {made, blocked, changed};
}

export function reserveItems(orders, board, inventory) {
  reserveOrderItems({orders, board, inventory});
}

export const NPCS_BY_CHAPTER = {
  village: ["jiejie", "feifei", "apiao"],
  journey: ["feifei", "apiao", "spirit"],
  candy: ["sika", "feifei", "apiao", "spirit"],
  bulu: ["bulu", "feifei", "apiao", "spirit"],
  hate: ["hate", "feifei", "apiao", "spirit"],
  ending: ["feifei", "apiao", "jiejie", "sika", "bulu", "hate", "spirit"]
};

export function xpLevel(xp, curve) {
  let lv = 1;
  for (let i = 1; i < curve.length; i++) if (xp >= curve[i]) lv = i + 1;
  if (xp >= curve[curve.length - 1]) lv = curve.length + Math.floor((xp - curve[curve.length - 1]) / 200);
  return Math.max(1, lv);
}
