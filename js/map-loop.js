/** Pure state transitions. A failed transaction never mutates the save. */
export function regionStatus(save, data, id) {
  const region = data.regions.find(r => r.id === id);
  if (!region) return null;
  const step = Math.min(region.steps.length, save.map.regions[id] || 0);
  const locked = (region.requires || []).some(parent => {
    const def = data.regions.find(r => r.id === parent);
    return !def || (save.map.regions[parent] || 0) < def.steps.length;
  });
  return { id, step, total: region.steps.length, state: step === region.steps.length ? 'restored' : locked ? 'locked' : 'available', next: region.steps[step] || null };
}

export function planCost(save, cost = {}) {
  for (const key of ['coins', 'starSeeds']) {
    if (!Number.isFinite(cost[key] ?? 0) || (cost[key] ?? 0) < 0) return { error: 'cost' };
    if (save[key] < (cost[key] || 0)) return { error: key };
  }
  for (const [key, count] of Object.entries(cost.materials || {})) {
    if (!Number.isInteger(count) || count < 0) return { error: 'cost' };
    if ((save.magicBag.materials[key] || 0) < count) return { error: 'materials' };
  }
  const used = new Set(), consume = [];
  for (const req of cost.items || []) {
    if (!Number.isInteger(req.count ?? 1) || (req.count ?? 1) < 1) return { error: 'cost' };
    for (let n = 0; n < (req.count ?? 1); n++) {
      let found;
      for (const where of ['board', 'inventory']) {
        const i = (save[where] || []).findIndex((x, i) => x?.kind === 'item' && x.chain === req.chain && x.tier === req.tier && !used.has(where + ':' + i));
        if (i >= 0) { found = { where, i }; break; }
      }
      if (!found) return { error: 'items' };
      used.add(found.where + ':' + found.i); consume.push(found);
    }
  }
  return { consume };
}

export function payCost(save, cost, plan) {
  save.coins -= cost.coins || 0; save.starSeeds -= cost.starSeeds || 0;
  for (const [key, count] of Object.entries(cost.materials || {})) save.magicBag.materials[key] -= count;
  for (const { where, i } of plan.consume) save[where][i] = null;
  save.inventory = save.inventory.filter(Boolean);
}

export function repairRegion(save, data, id) {
  const status = regionStatus(save, data, id);
  if (!status) return { error: 'region' };
  if (status.state === 'locked') return { error: 'locked' };
  if (!status.next) return { error: 'complete' };
  const cost = status.next.cost || {}, plan = planCost(save, cost);
  if (plan.error) return plan;
  payCost(save, cost, plan);
  save.map.regions[id] = status.step + 1;
  const reward = status.next.reward || {};
  for (const gen of reward.generators || []) if (!save.map.unlockedGenerators.includes(gen)) save.map.unlockedGenerators.push(gen);
  save.fog.openCount += reward.cells || 0;
  save.level += 1;
  return { ok: true, id, step: status.step + 1, reward, complete: status.step + 1 === status.total };
}

export function mapChapterOpen(save, data, chapter) {
  if (save.map.legacyChapters.includes(chapter)) return true;
  const gate = data.chapterGates?.[chapter];
  return !gate || regionStatus(save, data, gate)?.state === 'restored';
}

export function expandBag(save) {
  if (save.magicBag.capacity >= 24) return { error: 'complete' };
  const cost = { starSeeds: 10 + (save.magicBag.capacity - 8) * 5 };
  const plan = planCost(save, cost); if (plan.error) return plan;
  payCost(save, cost, plan); save.magicBag.capacity += 1;
  return { ok: true };
}
