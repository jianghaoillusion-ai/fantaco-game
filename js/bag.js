/** Expandable magic bag. Slot unlocks cost only 星星種子. Never real money. */

export const BAG_START = 6;
export const BAG_MAX = 20;
/* Cost in 星星種子 to unlock the Nth slot (1-indexed). First 6 are free. */
export const BAG_SEED_COST = [
  0, 0, 0, 0, 0, 0,
  4, 6, 8, 10, 12, 16, 20, 26, 32, 40, 50, 62, 76, 92
];

export function bagCap(save) {
  const owned = save?.inventorySlots || save?.bagSlots || BAG_START;
  const filled = (save?.inventory || []).filter(Boolean).length;
  return Math.max(owned, filled, BAG_START);
}

export function migrateBagSlots(save, isExisting) {
  let n = save.inventorySlots ?? save.bagSlots;
  if (n == null || !Number.isFinite(n)) {
    const filled = (save.inventory || []).filter(Boolean).length;
    n = isExisting ? Math.max(8, filled) : BAG_START;
  }
  const filled = (save.inventory || []).filter(Boolean).length;
  n = Math.max(BAG_START, Math.min(BAG_MAX, n));
  if (filled > n) n = Math.min(BAG_MAX, filled);
  save.inventorySlots = n;
  save.inventorySlots = n; save.bagSlots = n;
  return save;
}

export function slotCost(n) {
  return BAG_SEED_COST[n - 1] || 0;
}

export function createBag(ctx) {
  const { $, toast, sfx, persist } = ctx;

  function cap() { return bagCap(ctx.getSave()); }

  function puffStars(fromEl) {
    const host = document.createElement("div");
    host.className = "bag-puff";
    const r = (fromEl || $("#btn-bag"))?.getBoundingClientRect?.();
    host.style.left = ((r?.left || 40) + (r?.width || 40) / 2) + "px";
    host.style.top = ((r?.top || 40) + (r?.height || 40) / 2) + "px";
    host.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>";
    document.body.appendChild(host);
    setTimeout(() => host.remove(), 800);
  }

  function openBag() {
    renderInventoryFull();
    const bag = $("#bag");
    if (!bag) return;
    bag.classList.add("on");
    bag.classList.add("bag-opening");
    puffStars($("#btn-bag"));
    try { navigator.vibrate?.(12); } catch {}
    setTimeout(() => bag.classList.remove("bag-opening"), 700);
  }

  function closeBag() {
    $("#bag")?.classList.remove("on");
  }

  function renderInventoryFull() {
    const save = ctx.getSave();
    const box = $("#inv-cells");
    const owned = save.inventorySlots || save.bagSlots || BAG_START;
    const items = save.inventory || [];
    const filled = items.filter(Boolean).length;
    const countEl = $("#inv-count");
    if (countEl) countEl.textContent = `${filled}/${owned}`;
    if (!box) return;
    box.classList.add("bag-grid");
    box.innerHTML = "";
    let visible = Math.min(BAG_MAX, Math.max(owned + 4, 8));
    visible = Math.min(BAG_MAX, Math.ceil(visible / 4) * 4);
    for (let i = 0; i < visible; i++) {
      const slot = document.createElement("div");
      const locked = i >= owned;
      slot.className = "inv-cell bag-pocket" + (locked ? " locked" : "") + (!locked && items[i] ? " filled" : "");
      slot.dataset.slot = i;
      if (locked) {
        const cost = slotCost(i + 1);
        slot.innerHTML = `<button type="button" class="bag-unlock" title="用 ${cost} 顆星星種子打開這一格">
          <span class="lock" aria-hidden="true"></span>
          <span class="price"><img src="assets/items/star-seed.png" alt="">${cost}</span>
        </button>`;
        slot.querySelector(".bag-unlock").addEventListener("click", (e) => {
          e.stopPropagation();
          buySlot(i + 1);
        });
      } else if (items[i]) {
        slot.appendChild(ctx.makePiece(items[i]));
        slot.addEventListener("click", () => placeFromBag(i));
      }
      box.appendChild(slot);
    }
  }

  function buySlot(n) {
    const save = ctx.getSave();
    if (n !== (save.inventorySlots || save.bagSlots || BAG_START) + 1) {
      // require unlocking in order
      n = (save.inventorySlots || save.bagSlots || BAG_START) + 1;
    }
    if (n > BAG_MAX) return;
    const cost = slotCost(n);
    if ((save.starSeeds || 0) < cost) {
      sfx.invalid(); toast(`還差 ${cost - (save.starSeeds || 0)} 顆星星種子`); return;
    }
    save.starSeeds -= cost;
    save.inventorySlots = n; save.bagSlots = n;
    persist();
    sfx.daily();
    toast("魔法袋變大了");
    try { navigator.vibrate?.(16); } catch {}
    ctx.refreshHud();
    renderInventoryFull();
  }

  function placeFromBag(i) {
    const save = ctx.getSave();
    const item = save.inventory[i];
    if (!item) return;
    const empty = ctx.emptyOpenCell?.();
    if (empty == null) { sfx.invalid(); toast("棋盤上沒有空位"); return; }
    const fromEl = document.querySelector(`#inv-cells .piece[data-uid="${item.uid}"]`);
    const toEl = document.querySelector(`.cell[data-r="${empty.r}"][data-c="${empty.c}"]`) || $("#btn-bag");
    const fly = ctx.fx?.flyTo || ((_a, _b, d) => d?.());
    fly(fromEl, toEl, () => {
      const save2 = ctx.getSave();
      const it = save2.inventory[i];
      if (!it) return;
      save2.inventory.splice(i, 1);
      const cols = ctx.getCols();
      save2.board[empty.r * cols + empty.c] = it;
      persist();
      sfx.drop();
      ctx.refresh();
      renderInventoryFull();
    });
  }

  function bind() {
    $("#btn-bag")?.addEventListener("click", () => { sfx.tap(); openBag(); });
    $("#btn-bag-close")?.addEventListener("click", () => { sfx.tap(); closeBag(); });
  }

  return { openBag, closeBag, renderInventory: renderInventoryFull, buySlot, placeFromBag, cap, bind, puffStars };
}
