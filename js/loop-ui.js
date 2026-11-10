/** Functional controls only; visual-polish can style stable classes and listen to events. */
import { regionStatus, planCost } from './map-loop.js';
import { challengeState } from './daily-challenge.js';
export function emitGameplay(type, detail) {
  if (typeof CustomEvent !== 'undefined') document.dispatchEvent(new CustomEvent('fantaco:' + type, { detail }));
}
export function costLabel(cost, chains) {
  return [cost.coins && `${cost.coins} 金幣`, cost.starSeeds && `${cost.starSeeds} 星星種子`,
    ...Object.entries(cost.materials || {}).map(([k,n]) => `${n} ${k === 'wood' ? '修復木材' : k}`),
    ...(cost.items || []).map(x => `${chains[x.chain]?.items[x.tier-1]?.name || x.chain} ×${x.count || 1}`)].filter(Boolean).join('＋');
}
export function renderRegionControls(box, save, data, chains, repair) {
  box.innerHTML = '';
  for (const region of data.regions) {
    const status = regionStatus(save, data, region.id), card = document.createElement('article');
    card.className = 'node map-region ' + status.state; card.dataset.regionId = region.id; card.dataset.step = status.step;
    const title = document.createElement('h3'); title.textContent = `${region.name}　${status.step}/${status.total}`; card.appendChild(title);
    const button = document.createElement('button'); button.className = 'btn repair-region';
    button.disabled = status.state !== 'available';
    button.textContent = status.state === 'restored' ? '修復完成' : status.state === 'locked' ? '先修好前一區' : `${status.next.name}：${costLabel(status.next.cost, chains)}`;
    if (status.next) card.dataset.affordable = String(!planCost(save, status.next.cost).error);
    button.addEventListener('click', () => repair(region.id)); card.appendChild(button); box.appendChild(card);
  }
}
export function renderShopControls(box, save, data, buy) {
  box.innerHTML = '';
  for (const offer of data.shop) {
    const button = document.createElement('button'); button.className = 'btn shop-offer'; button.dataset.offerId = offer.id;
    button.textContent = `${offer.name}　${costLabel(offer.cost, {})}`;
    button.addEventListener('click', () => buy(offer.id)); box.appendChild(button);
  }
}
export function renderChallenge(box, save, claim) {
  box.innerHTML = '';
  const state = challengeState(save), button = document.createElement('button');
  button.className = 'daily-challenge'; button.dataset.challenge = 'orders';
  button.textContent = state.claimed ? '今日挑戰已領取' : `每日挑戰 ${Math.min(state.orders, state.target)}/${state.target}　＋${state.seeds} 星星種子`;
  button.disabled = state.claimed || state.orders < state.target;
  button.addEventListener('click', claim); box.appendChild(button);
  const timer = document.createElement('span'); timer.dataset.challengeCountdown = ''; box.appendChild(timer);
}
