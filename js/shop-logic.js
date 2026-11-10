import { makeUid } from './merge.js';
import { planCost, payCost } from './map-loop.js';

export function buyOffer(save, data, id, energyMax, now = Date.now()) {
  const offer = data.shop.find(o => o.id === id);
  if (!offer) return { error: 'offer' };
  const plan = planCost(save, offer.cost); if (plan.error) return plan;
  if (offer.energy && save.energy >= energyMax) return { error: 'energy-full' };
  if (offer.item && save.inventory.filter(Boolean).length >= save.magicBag.capacity) return { error: 'bag-full' };
  payCost(save, offer.cost, plan);
  if (offer.energy) {
    save.energy = Math.min(energyMax, save.energy + offer.energy);
    if (save.energy === energyMax) save.energyAt = now;
  }
  if (offer.item) save.inventory.push({ kind: 'item', ...offer.item, uid: makeUid() });
  return { ok: true, id };
}
