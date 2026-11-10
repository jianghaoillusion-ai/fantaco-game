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
  // Interior is the starting open area; fog/crates live only on the outer frame.
  if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) return "start";
  const onTop = r === 0, onBot = r === rows - 1, onLeft = c === 0, onRight = c === cols - 1;
  if (onTop && !onLeft && !onRight) return "inner-n";
  if (onBot && !onLeft && !onRight) return "inner-s";
  if (onLeft && !onTop && !onBot) return (r <= 3 ? "inner-w" : "outer-w");
  if (onRight && !onTop && !onBot) return (r <= 3 ? "inner-e" : "outer-e");
  if (onTop) return "outer-n";
  if (onBot) return "outer-s";
  return "outer-n";
}

export function isAllOpen(save) {
  return Array.isArray(save.unlockedClumps) && save.unlockedClumps.includes("all");
}

export function cellKey(r, c) { return r + "," + c; }

export function isCellOpen(save, r, c, cols, rows) {
  if (isAllOpen(save)) return true;
  if ((save.unlockedCells || []).includes(cellKey(r, c))) return true;
  const id = clumpOf(r, c, cols, rows);
  return (save.unlockedClumps || ["start"]).includes(id);
}

/** Orthogonal neighbor of an open cell that is itself still locked (fog contour). */
export function isContour(save, r, c, cols, rows) {
  if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
  if (isCellOpen(save, r, c, cols, rows)) return false;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.some(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && cc >= 0 && rr < rows && cc < cols && isCellOpen(save, rr, cc, cols, rows);
  });
}

export function unlockOneCell(save, r, c) {
  if (!save.unlockedCells) save.unlockedCells = [];
  const k = cellKey(r, c);
  if (!save.unlockedCells.includes(k)) save.unlockedCells.push(k);
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
  const u = region.unlock || {};
  if (u.type === "start") return null;
  if (u.needRegion && !isRegionUnlocked(save, u.needRegion)) return "先打開前面的地區";
  if (u.needFlag && !(save.storyDone || []).includes(u.needFlag)) return "先把目前的故事走完";
  if (u.needBuilding) {
    const [bid, lv] = u.needBuilding.split(":");
    if ((save.buildings?.[bid] || 0) < Number(lv || 1)) return "先修復前面的建築";
  }
  const coins = u.coins || 0, stars = u.stars || 0;
  if ((save.coins || 0) < coins || (save.starSeeds || 0) < stars) return "金幣或星星種子還不夠";
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

export function canAfford(save, cost = {}) {
  if ((cost.coins || 0) > (save.coins || 0)) return false;
  if ((cost.stars || 0) > (save.starSeeds || 0)) return false;
  if ((cost.materials || 0) > (save.materials || 0)) return false;
  if ((cost.diamonds || 0) > (save.diamonds || 0)) return false;
  return true;
}

export function payCost(save, cost = {}) {
  save.coins = (save.coins || 0) - (cost.coins || 0);
  save.starSeeds = (save.starSeeds || 0) - (cost.stars || 0);
  save.materials = (save.materials || 0) - (cost.materials || 0);
  save.diamonds = (save.diamonds || 0) - (cost.diamonds || 0);
}

export function formatCost(cost = {}) {
  const bits = [];
  if (cost.coins) bits.push(`${cost.coins} 金幣`);
  if (cost.stars) bits.push(`${cost.stars} 星星種子`);
  if (cost.materials) bits.push(`${cost.materials} 材料`);
  if (cost.diamonds) bits.push(`${cost.diamonds} 鑽石`);
  return bits.join("　") || "免費";
}

export function formatCostHtml(cost = {}) {
  const bits = [];
  if (cost.coins) bits.push(`<span class="price"><img src="assets/ui/coin.png" alt="">${cost.coins}</span>`);
  if (cost.stars) bits.push(`<span class="price"><img src="assets/items/star-seed.png" alt="">${cost.stars}</span>`);
  if (cost.materials) bits.push(`<span class="price"><img src="assets/icons/material.png" alt="">${cost.materials}</span>`);
  if (cost.diamonds) bits.push(`<span class="price"><img src="assets/ui/diamond.png" alt="">${cost.diamonds}</span>`);
  return bits.join(" ") || "免費";
}
