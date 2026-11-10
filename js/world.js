/** Board clumps, region unlocks, and the in-game shop (coins / 星星種子 only). */

export const CLUMP_COSTS = {
  start: 0,
  "inner-n": 8,
  "inner-s": 12,
  "inner-w": 14,
  "inner-e": 14,
  "outer-n": 20,
  "outer-s": 22,
  "outer-w": 24,
  "outer-e": 24
};

export function clumpOf(r, c, cols, rows) {
  const cr = (rows - 1) / 2, cc = (cols - 1) / 2;
  const dr = r - cr, dc = c - cc;
  const m = Math.abs(dr) + Math.abs(dc);
  const oddCorner = Math.abs(dr) === 2 && Math.abs(dc) === 2 && dr * dc > 0;
  if (m <= 2 && !oddCorner) return "start";
  const dir = Math.abs(dr) >= Math.abs(dc) ? (dr < 0 ? "n" : "s") : (dc < 0 ? "w" : "e");
  return (m <= 4 ? "inner-" : "outer-") + dir;
}

export function isAllOpen(save) {
  return Array.isArray(save.unlockedClumps) && save.unlockedClumps.includes("all");
}

export function isCellOpen(save, r, c, cols, rows) {
  if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
  if (isAllOpen(save) || save.fog?.revealed?.includes(r * cols + c)) return true;
  const id = clumpOf(r, c, cols, rows);
  return (save.unlockedClumps || ["start"]).includes(id);
}

export function clumpCells(id, cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (clumpOf(r, c, cols, rows) === id) cells.push({ r, c, i: r * cols + c });
    }
  }
  return cells;
}

export function lockedClumpIds(save, cols, rows) {
  if (isAllOpen(save)) return [];
  const have = new Set(save.unlockedClumps || ["start"]);
  const seen = new Set();
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = clumpOf(r, c, cols, rows);
      if (have.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function regionById(map, id) {
  return (map?.regions || []).find((r) => r.id === id) || null;
}

export function isRegionUnlocked(save, id) {
  if (id === "village") return true;
  return (save.unlockedRegions || ["village"]).includes(id);
}

export function regionVisible(map, save, region) {
  if (isRegionUnlocked(save, region.id)) return true;
  const u = region.unlock || {};
  if (u.type === "start") return true;
  if (u.needRegion) return isRegionUnlocked(save, u.needRegion);
  return false;
}

export function regionUnlockBlocked(map, save, region) {
  if (isRegionUnlocked(save, region.id)) return "這個地區已經打開";
  const u = region.unlock || {};
  if (u.type === "start") return null;
  if (u.needRegion && !isRegionUnlocked(save, u.needRegion)) return "先打開前面的地區";
  if (u.needFlag && !(save.storyDone || []).includes(u.needFlag)) return "先把目前的故事走完";
  if (u.needBuilding) {
    const [bid, lv] = u.needBuilding.split(":");
    if ((save.buildings?.[bid] || 0) < Number(lv || 1)) return "先修復前面的建築";
  }
  if (!canAfford(save, u)) return "金幣、星星種子或道具還不夠";
  return null;
}

export function allBuildings(map) {
  const list = [];
  for (const r of map?.regions || []) {
    for (const b of r.buildings || []) list.push({ ...b, region: r.id, chapter: r.chapter });
  }
  return list;
}

export function buildingDef(map, id) {
  return allBuildings(map).find((b) => b.id === id) || null;
}

export function shopItemAvailable(save, item) {
  if (item.needRegion && !isRegionUnlocked(save, item.needRegion)) return false;
  return true;
}

// Plan the entire payment before mutating currency or inventory.
function paymentPlan(save, cost = {}) {
  for (const [field, balance] of [['coins', 'coins'], ['stars', 'starSeeds']]) {
    const amount = cost[field] ?? 0;
    if (!Number.isFinite(amount) || amount < 0 || amount > (save[balance] || 0)) return null;
  }
  const used = new Set(), consume = [];
  for (const req of cost.items || []) {
    const count = req.count ?? 1;
    if (!Number.isInteger(count) || count < 1) return null;
    for (let n = 0; n < count; n++) {
      let found;
      for (const where of ['board', 'inventory']) {
        const i = (save[where] || []).findIndex((x, i) => x?.kind === 'item' && x.chain === req.chain && x.tier === req.tier && !used.has(where + ':' + i));
        if (i >= 0) { found = { where, i }; break; }
      }
      if (!found) return null;
      used.add(found.where + ':' + found.i); consume.push(found);
    }
  }
  return consume;
}

export function canAfford(save, cost = {}) { return paymentPlan(save, cost) !== null; }

export function payCost(save, cost = {}) {
  const consume = paymentPlan(save, cost);
  if (!consume) return false;
  save.coins = (save.coins || 0) - (cost.coins || 0);
  save.starSeeds = (save.starSeeds || 0) - (cost.stars || 0);
  for (const {where, i} of consume) save[where][i] = null;
  if (save.inventory) save.inventory = save.inventory.filter(Boolean);
  return true;
}

export function emitGameplay(type, detail) {
  if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') document.dispatchEvent(new CustomEvent('fantaco:' + type, { detail }));
}

export function formatCost(cost = {}, chains = {}) {
  const bits = [];
  if (cost.coins) bits.push(`${cost.coins} 金幣`);
  if (cost.stars) bits.push(`${cost.stars} 星星種子`);
  for (const item of cost.items || []) bits.push(`${chains[item.chain]?.items?.[item.tier - 1]?.name || item.chain} Lv.${item.tier} ×${item.count ?? 1}`);
  return bits.join("　") || "免費";
}

/** Reveal just one orthogonal edge next to the merge destination. */
export function revealMergeEdge(save, index, cols, rows) {
  const r = Math.floor(index / cols), c = index % cols;
  if (!isCellOpen(save, r, c, cols, rows)) return null;
  for (const [dr, dc] of [[-1,0],[0,1],[1,0],[0,-1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || isCellOpen(save, nr, nc, cols, rows)) continue;
    const i = nr * cols + nc;
    save.fog.revealed = [...(save.fog.revealed || []), i];
    return i;
  }
  return null;
}
