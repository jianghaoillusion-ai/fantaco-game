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
  const put = (r, c, cell) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return;
    b[idx(cols, r, c)] = cell;
  };
  const cr = Math.floor(rows / 2), cc = Math.floor(cols / 2);
  // 2 village generators + 8 varied items across chains/tiers, leaving empties in the open start area.
  put(cr, cc, { kind: "gen", gen: "star", tier: 1, uid: makeUid() });
  put(cr - 1, cc, { kind: "gen", gen: "garden", tier: 1, uid: makeUid() });
  put(cr, cc - 1, { kind: "item", chain: "star", tier: 1, uid: makeUid() });
  put(cr + 1, cc, { kind: "item", chain: "star", tier: 1, uid: makeUid() });
  put(cr - 2, cc, { kind: "item", chain: "star", tier: 2, uid: makeUid() });
  put(cr, cc + 2, { kind: "item", chain: "star", tier: 3, uid: makeUid() });
  put(cr + 1, cc - 2, { kind: "item", chain: "garden", tier: 1, uid: makeUid() });
  put(cr - 1, cc - 2, { kind: "item", chain: "garden", tier: 2, uid: makeUid() });
  put(cr + 2, cc, { kind: "item", chain: "garden", tier: 3, uid: makeUid() });
  put(cr - 1, cc + 2, { kind: "item", chain: "tea", tier: 1, uid: makeUid() });
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
  const { chains, chapter, discovered, npcsByChapter, seq } = ctx;
  const order = ["village", "journey", "candy", "bulu", "hate", "ending"];
  const unlockedChains = Object.keys(chains).filter((id) => {
    const ch = chains[id].chapter;
    return order.indexOf(ch) <= order.indexOf(chapter);
  }).filter((id) => {
    if (id === "star" || id === "garden") return true;
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
  else if (slot === 3) tier = Math.min(maxT, Math.max(2, cap + (cap >= maxT ? 0 : 1))); // stretch
  else tier = Math.min(maxT, Math.max(2, cap));
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
    reward: { seeds, xp, energy },
    chapter,
    procedural: true
  };
}


function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function listProceduralCandidates(opts) {
  const { chains, chapter, discovered, npcsByChapter } = opts;
  const order = ["village", "journey", "candy", "bulu", "hate", "ending"];
  const unlocked = Object.keys(chains).filter((id) => {
    const ch = chains[id].chapter;
    const okChapter = order.indexOf(ch) <= order.indexOf(chapter || "village");
    if (!okChapter) return false;
    if (id === "star" || id === "garden") return true;
    return discoveredMax(discovered, id) >= 1;
  });
  const npcs = (npcsByChapter[chapter] || ["feifei", "apiao", "jiejie"]).filter((id) => id !== "mian");
  const out = [];
  for (const chain of unlocked) {
    const maxT = maxTier(chains, chain);
    const starter = chain === "star" || chain === "garden";
    const cap = Math.max(starter ? 3 : 2, discoveredMax(discovered, chain));
    const top = Math.min(maxT, cap);
    for (let tier = 2; tier <= top; tier++) {
      const seeds = 3 + tier * 2;
      const xp = 15 + tier * 10;
      for (const npc of npcs) {
        out.push({
          npc,
          need: { chain, tier },
          reward: { seeds, xp, energy: tier >= 4 ? 6 : 3, coins: seeds + 4 },
          chapter,
          procedural: true
        });
      }
    }
  }
  return out;
}

/** Fill slots with a guaranteed easy / mid / hard mix. One procedural order grants materials. */
function difficultyOf(c, opts) {
  const tier = c.need?.tier || 2;
  if (tier <= 2) return "easy";
  if (tier >= 4) return "hard";
  return "mid";
}

export function fillOrderSlots(save, slots, opts) {
  save.orders = (save.orders || []).filter((o) => o && o.need);
  const story = typeof opts.nextStory === "function" ? opts.nextStory() : opts.nextStory;
  if (story && !save.orders.some((o) => o.id === story.id)) {
    save.orders.unshift({ ...story });
  }
  const needKey = (o) => `${o.need.chain}:${o.need.tier}`;
  const all = listProceduralCandidates(opts);
  const plan = slots >= 4 ? ["easy", "mid", "mid", "hard"] : ["easy", "mid", "hard"];
  const usedPlan = save.orders.map((o) => o.procedural ? difficultyOf(o, opts) : "story");
  const needed = [];
  const counts = { easy: 0, mid: 0, hard: 0 };
  for (const d of usedPlan) if (counts[d] != null) counts[d]++;
  for (const d of plan) {
    if (counts[d] > 0) counts[d]--;
    else needed.push(d);
  }
  const take = (pool, allowRepeatNeed, allowRepeatNpc) => {
    for (const c of pool) {
      if (save.orders.length >= slots) return true;
      const npcs = new Set(save.orders.map((o) => o.npc));
      const needs = new Set(save.orders.map(needKey));
      if (!allowRepeatNpc && npcs.has(c.npc)) continue;
      if (!allowRepeatNeed && needs.has(needKey(c))) continue;
      save.orders.push({ ...c, id: "p-" + makeUid() });
      return true;
    }
    return false;
  };
  for (const d of needed) {
    if (save.orders.length >= slots) break;
    const pool = shuffle(all.filter((c) => difficultyOf(c, opts) === d));
    if (take(pool, false, false)) continue;
    if (take(pool, true, false)) continue;
    if (take(shuffle(all), false, false)) continue;
    take(shuffle(all), true, true);
  }
  if (save.orders.length && !save.orders.some((o) => o.reward?.materials)) {
    const proc = save.orders.filter((o) => o.procedural);
    const hard = proc.filter((o) => difficultyOf(o, opts) === "hard");
    const target = hard[0] || proc[proc.length - 1];
    if (target) target.reward = { ...(target.reward || {}), materials: 1 };
  }
  save.orders = save.orders.slice(0, slots);
}

/** Bind at most one matching board/bag item to each order so two cards cannot claim the same uid. */
export function reserveItems(orders, board, inv) {
  const used = new Set();
  for (const o of orders || []) {
    const hit = [...(board || []), ...(inv || [])].find((c) =>
      c && c.kind === "item" && c.chain === o.need.chain && c.tier === o.need.tier && !used.has(c.uid)
    );
    o.reservedUid = hit?.uid || null;
    if (hit) used.add(hit.uid);
  }
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
