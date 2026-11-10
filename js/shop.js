/** In-game shop and magic-bag popup. Coins and 星星種子 only — no IAP, ads, or premium currency. */
import { shopItemAvailable, canAfford, payCost, formatCost, emitGameplay } from "./world.js";

export function createShop(ctx) {
  const { $, toast, sfx, persist, refresh, refreshHud, show, ENERGY } = ctx;

  function openBag() {
    const bag = $("#bag");
    if (!bag) return;
    renderInventory();
    bag.classList.add("on");
  }

  function closeBag() {
    $("#bag")?.classList.remove("on");
  }

  function renderInventory() {
    const box = $("#inv-cells");
    if (!box) return;
    const save = ctx.getSave();
    const cap = save.magicBag?.capacity || ctx.getGame().board?.inventory || 8;
    const filled = (save.inventory || []).filter(Boolean).length;
    const slots = Math.max(cap, save.inventory?.length || 0);
    const countEl = $("#inv-count");
    if (countEl) countEl.textContent = `${filled}/${Math.max(cap, filled)}`;
    box.innerHTML = "";
    box.classList.add("bag-grid");
    for (let i = 0; i < slots; i++) {
      const slot = document.createElement("div");
      slot.className = "cell inv-cell";
      slot.dataset.inv = i;
      if (save.inventory[i]) slot.appendChild(ctx.makePiece(save.inventory[i]));
      slot.addEventListener("click", () => {
        if (save.inventory[i]) placeFromBag(i);
      });
      box.appendChild(slot);
    }
  }

  function placeFromBag(i) {
    const save = ctx.getSave();
    const item = save.inventory[i];
    if (!item) return;
    const empty = ctx.emptyOpenCell();
    if (empty < 0) { sfx.invalid(); toast("棋盤沒有空位了"); return; }
    save.inventory.splice(i, 1);
    save.board[empty] = item;
    sfx.drop();
    persist();
    refresh();
    renderInventory();
    toast("放到棋盤上了");
  }

  function sellSelected() {
    const uid = ctx.getSelected?.();
    if (!uid) return;
    const loc = ctx.findCellByUid(uid);
    if (!loc || loc.item.kind !== "item") { toast("這個不能賣"); return; }
    if ((loc.item.tier || 1) <= 1) { sfx.invalid(); toast("第 1 階不能賣，合高一點再賣吧"); return; }
    const coins = loc.item.tier * 2;
    ctx.removeFrom(loc);
    ctx.getSave().coins = (ctx.getSave().coins || 0) + coins;
    ctx.setSelected?.(null);
    sfx.tap();
    toast(`賣掉了，得到 ${coins} 金幣`);
    persist();
    refresh();
    ctx.showInfo?.(null);
  }

  function openShop() {
    renderShop();
    $("#shop")?.classList.add("on");
  }

  function closeShop() {
    $("#shop")?.classList.remove("on");
  }

  function renderShop() {
    const save = ctx.getSave();
    const map = ctx.getMap();
    const shop = map?.shop || { title: "微笑小舖", notice: "", items: [] };
    const title = $("#shop-title");
    const notice = $("#shop-notice");
    const list = $("#shop-list");
    if (title) title.textContent = shop.title;
    if (notice) notice.textContent = shop.notice;
    if (!list) return;
    list.innerHTML = "";
    for (const item of shop.items || []) {
      const locked = !shopItemAvailable(save, item);
      const row = document.createElement("div");
      row.className = "shop-row";
      row.dataset.offerId = item.id;
      const price = formatCost(item.cost, ctx.getChains?.());
      row.innerHTML = `<div class="body"><b>${item.name}</b><small>${item.desc}</small></div>
        <div class="price">${price}</div>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn green";
      btn.style.minHeight = "36px";
      btn.style.padding = "6px 12px";
      btn.textContent = locked ? "還沒打開" : "換";
      btn.disabled = locked || !canAfford(save, item.cost);
      btn.addEventListener("click", () => buy(item));
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  function buy(item) {
    const save = ctx.getSave();
    item = ctx.getMap()?.shop?.items?.find(x => x.id === item?.id);
    if (!item) return;
    if (!shopItemAvailable(save, item) || !canAfford(save, item.cost)) {
      sfx.invalid(); toast("還不能換這個"); return;
    }
    if (item.energy) {
      const add = Math.min(ENERGY.max - save.energy, item.energy === "full" ? ENERGY.max : item.energy);
      if (add <= 0) { toast("能量已經滿了"); return; }
      if (!payCost(save, item.cost)) return;
      save.energy = Math.min(ENERGY.max, save.energy + add);
      if (save.energy === ENERGY.max) save.energyAt = Date.now();
      sfx.daily(); toast(`能量 +${add}`);
    } else if (item.item) {
      const cap = save.magicBag?.capacity || ctx.getGame().board?.inventory || 8;
      if ((save.inventory || []).filter(Boolean).length >= cap) {
        sfx.invalid(); toast("魔法袋滿了"); return;
      }
      if (!payCost(save, item.cost)) return;
      const cell = { ...item.item, uid: ctx.makeUid() };
      save.inventory = save.inventory || [];
      save.inventory.push(cell);
      sfx.generate(); toast(`放進魔法袋：${ctx.infoName(cell)}`);
    }
    emitGameplay("shop-purchased", { id: item.id });
    persist();
    refresh();
    refreshHud();
    renderShop();
    renderInventory();
  }

  function bind() {
    $("#btn-bag")?.addEventListener("click", () => { sfx.tap(); openBag(); });
    $("#btn-bag-close")?.addEventListener("click", () => { sfx.tap(); closeBag(); });
    $("#btn-go-shop")?.addEventListener("click", () => { sfx.tap(); openShop(); });
    $("#btn-map-shop")?.addEventListener("click", () => { sfx.tap(); openShop(); });
    $("#btn-shop-close")?.addEventListener("click", () => { sfx.tap(); closeShop(); });
    $("#btn-sell")?.addEventListener("click", sellSelected);
  }

  return { openBag, closeBag, openShop, closeShop, renderShop, renderInventory, sellSelected, buy, bind };
}
