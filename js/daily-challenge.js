export function challengeState(save, now = Date.now()) {
  const day = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
  if (save.challenge.day !== day) save.challenge = { day, orders: 0, claimed: false };
  return { ...save.challenge, target: 3, seeds: 10, remainingMs: Date.parse(day + 'T00:00:00+08:00') + 86400000 - now };
}
export function recordOrder(save, now = Date.now()) {
  challengeState(save, now); save.challenge.orders += 1;
  save.magicBag.materials.wood = (save.magicBag.materials.wood || 0) + 1;
}
export function claimChallenge(save, now = Date.now()) {
  const state = challengeState(save, now);
  if (state.claimed) return { error: 'claimed' };
  if (state.orders < state.target) return { error: 'orders' };
  save.challenge.claimed = true; save.starSeeds += state.seeds;
  return { ok: true, seeds: state.seeds };
}
