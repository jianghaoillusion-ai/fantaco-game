/** In-game shop and magic-bag popup. Coins and 星星種子 only — no IAP, ads, or premium currency. */
import { shopItemAvailable, canAfford, payCost, formatCost, formatCostHtml } from "./world.js?v=24";
import { bagCap } from "./bag.js?v=24";
import { ensureDaily, formatDailyResetLeft } from "./save.js?v=24";
import { bindTip, hideTip } from "./tip.js?v=24";

const DIAMOND_ITEMS = [
  { id: "boost-energy", name: "能量加持", desc: "立刻回復 30 點能量。", energy: 30, cost: { diamonds: 5 } },
  { id: "boost-wand", name: "合成棒", desc: "點棋盤上一個道具，讓它升一階。", booster: "wand", cost: { diamonds: 8 } },
  { id: "boost-clear", name: "過關道具", desc: "下一次完成訂單時，金幣獎勵加倍。", booster: "clear", cost: { diamonds: 10 } }
];

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
    ctx.setSelected?.(null);
    toast(`賣掉了，得到 ${coins} 金幣`);
    persist();
    ctx.grantCoins?.(coins, document.querySelector("#btn-sell") || loc);
    refresh();
    ctx.showInfo?.(null);
  }

  function openShop() {
    hideTip();
    renderShop();
    $("#shop")?.classList.add("on");
  }

  function closeShop() {
    $("#shop")?.classList.remove("on");
  }

  function shopQty(item) {
    if (item.energy === "full") return "滿";
    if (item.energy) return "×" + item.energy;
    return "×1";
  }

  function shopIcon(item) {
    if (item.item) {
      const def = ctx.itemDef?.(item.item.chain, item.item.tier);
      if (def?.img) return def.img;
    }
    if (item.energy) return "assets/icons/energy.png";
    if (item.booster === "wand") return "assets/tiles/star-1.png";
    if (item.booster === "clear") return "assets/icons/gift.png";
    return "assets/ui/diamond.png";
  }

  function renderShop() {
    const save = ctx.getSave();
    const map = ctx.getMap();
    const shop = map?.shop || { title: "微笑小舖", notice: "", items: [] };
    const title = $("#shop-title");
    const notice = $("#shop-notice");
    const restock = $("#shop-restock");
    const list = $("#shop-list");
    ensureDaily(save);
    if (title) {
      title.textContent = shop.title;
      title.removeAttribute("title");
    }
    if (notice) notice.textContent = "";
    if (restock) restock.textContent = `每日 08:00 補貨　還有 ${formatDailyResetLeft()}`;
    if (!list) return;
    list.innerHTML = "";
    const energy = [];
    const tools = [];
    const special = [...DIAMOND_ITEMS];
    for (const item of shop.items || []) (item.energy ? energy : tools).push(item);
    const addRibbon = (label) => {
      const h = document.createElement("div");
      h.className = "shop-ribbon";
      h.textContent = label;
      list.appendChild(h);
    };
    const addCard = (item) => {
      const locked = !shopItemAvailable(save, item);
      const card = document.createElement("div");
      card.className = "shop-tile" + (locked ? " locked" : "");
      const icon = shopIcon(item);
      card.innerHTML = `<span class="shop-qty">${shopQty(item)}</span>
        <img class="icon" src="${icon}" alt="">`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn green shop-buy";
      btn.innerHTML = locked ? '<span class="lock" aria-hidden="true"></span>' : formatCostHtml(item.cost);
      btn.disabled = locked || !canAfford(save, item.cost);
      btn.addEventListener("click", (e) => { e.stopPropagation(); buy(item); });
      card.appendChild(btn);
      bindTip(card, item.name, item.desc || "");
      list.appendChild(card);
    };
    if (energy.length) { addRibbon("能量"); energy.forEach(addCard); }
    if (tools.length) { addRibbon("道具"); tools.forEach(addCard); }
    if (special.length) { addRibbon("鑽石"); special.forEach(addCard); }
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
    } else if (item.booster) {
      payCost(save, item.cost);
      save.boosters = save.boosters || { wand: 0, clear: 0 };
      save.boosters[item.booster] = (save.boosters[item.booster] || 0) + 1;
      sfx.daily(); toast(item.booster === "wand" ? "合成棒已放進升級道具" : "過關道具已放進升級道具");
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
    save.shopDaily = save.shopDaily || { day: "", bought: {} };
    const id = item.id || item.name;
    if (id) save.shopDaily.bought[id] = (save.shopDaily.bought[id] || 0) + 1;
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
