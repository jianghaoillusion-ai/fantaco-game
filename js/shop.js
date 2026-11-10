/** In-game shop and magic-bag popup. Coins and 星星種子 only — no IAP, ads, or premium currency. */
import { shopItemAvailable, canAfford, payCost, formatCost, formatCostHtml } from "./world.js?v=10";
import { bagCap } from "./bag.js?v=10";

export function createShop(ctx) {
  const { $, toast, sfx, persist, refresh, refreshHud, show, ENERGY } = ctx;

  function openBag() { ctx.bag?.openBag(); }
  function closeBag() { ctx.bag?.closeBag(); }
  function renderInventory() { ctx.bag?.renderInventory(); }

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
    if (title) {
      title.textContent = shop.title;
      title.title = shop.notice || "只用遊戲裡的金幣和星星種子";
    }
    if (notice) notice.textContent = "";
    if (!list) return;
    list.innerHTML = "";
    for (const item of shop.items || []) {
      const locked = !shopItemAvailable(save, item);
      const row = document.createElement("div");
      row.className = "shop-row" + (locked ? " locked" : "");
      row.title = item.desc || item.name;
      const icon = shopIcon(item);
      row.innerHTML = `<img class="icon" src="${icon}" alt="">
        <b>${item.name}</b>
        <div class="price">${formatCostHtml(item.cost)}</div>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn green";
      btn.textContent = locked ? "還沒打開" : "換";
      btn.disabled = locked || !canAfford(save, item.cost);
      btn.addEventListener("click", () => buy(item));
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  function shopIcon(item) {
    if (item.item) {
      const def = ctx.itemDef?.(item.item.chain, item.item.tier);
      if (def?.img) return def.img;
    }
    if (item.energy === 20) return "assets/icons/shop-energy-20.png";
    if (item.energy === 50) return "assets/icons/shop-energy-50.png";
    if (item.energy === "full") return "assets/icons/shop-energy-full.png";
    return "assets/ui/coin.png";
  }

  function buy(item) {
    const save = ctx.getSave();
    if (!shopItemAvailable(save, item) || !canAfford(save, item.cost)) {
      sfx.invalid(); toast("還不能換這個"); return;
    }
    if (item.energy) {
      const add = item.energy === "full" ? (ENERGY.max - save.energy) : item.energy;
      if (add <= 0) { toast("能量已經滿了"); return; }
      payCost(save, item.cost);
      save.energy = Math.min(ENERGY.max, save.energy + add);
      sfx.daily(); toast(`能量 +${add}`);
    } else if (item.item) {
      const cap = bagCap(save);
      if ((save.inventory || []).filter(Boolean).length >= cap) {
        sfx.invalid(); toast("魔法袋滿了"); return;
      }
      payCost(save, item.cost);
      const cell = { ...item.item, uid: ctx.makeUid() };
      save.inventory = save.inventory || [];
      save.inventory.push(cell);
      sfx.generate(); toast(`放進魔法袋：${ctx.infoName(cell)}`);
    }
    persist();
    refreshHud();
    renderShop();
    renderInventory();
  }

  function bind() {
    $("#btn-go-shop")?.addEventListener("click", () => { sfx.tap(); openShop(); });
    $("#btn-map-shop")?.addEventListener("click", () => { sfx.tap(); openShop(); });
    $("#btn-shop-close")?.addEventListener("click", () => { sfx.tap(); closeShop(); });
    $("#btn-sell")?.addEventListener("click", sellSelected);
  }

  return { openBag, closeBag, openShop, closeShop, renderShop, renderInventory, sellSelected, buy, bind };
}
