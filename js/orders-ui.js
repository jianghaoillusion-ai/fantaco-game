/** Vertical character-order cards, green Give button, daily challenge, fly-in fulfill. */

export function createOrdersUi(ctx) {
  const { $, toast, sfx, persist, ENERGY, todayKey } = ctx;
  const seenReady = new Set();

  function hasItem(orderOrNeed, reservedUid) {
    const save = ctx.getSave();
    const need = orderOrNeed.need || orderOrNeed;
    const uid = reservedUid || orderOrNeed.reservedUid;
    const match = (c) => {
      if (!c || c.kind !== "item" || c.chain !== need.chain || c.tier !== need.tier) return false;
      if (uid) return c.uid === uid;
      return true;
    };
    return (save.board || []).some(match) || (save.inventory || []).some(match);
  }

  function findNeed(orderOrNeed, reservedUid) {
    const save = ctx.getSave();
    const need = orderOrNeed.need || orderOrNeed;
    const uid = reservedUid || orderOrNeed.reservedUid;
    const match = (c) => {
      if (!c || c.kind !== "item" || c.chain !== need.chain || c.tier !== need.tier) return false;
      if (uid) return c.uid === uid;
      return true;
    };
    const i = (save.board || []).findIndex(match);
    if (i >= 0) return { where: "board", i, item: save.board[i] };
    const j = (save.inventory || []).findIndex(match);
    if (j >= 0) return { where: "inv", i: j, item: save.inventory[j] };
    return null;
  }

  function dailyState() {
    const save = ctx.getSave();
    const today = todayKey();
    if (save.daily?.day && save.daily.day !== today) {
      save.daily.challenge = 0;
      save.daily.challengeClaimed = false;
    }
    return {
      done: save.daily?.challenge || 0,
      goal: 3,
      claimed: !!save.daily?.challengeClaimed,
      left: midnightLabel()
    };
  }

  function midnightLabel() {
    const now = new Date();
    const tz = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
    const end = new Date(tz);
    end.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((end - tz) / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h <= 0) return `${m} 分`;
    return `${h} 小時 ${m} 分`;
  }

  function bumpDaily() {
    const save = ctx.getSave();
    const today = todayKey();
    if (!save.daily) save.daily = { day: today, streak: 0, claimed: false, challenge: 0, challengeClaimed: false };
    if (save.daily.day !== today) {
      save.daily.day = today;
      save.daily.challenge = 0;
      save.daily.challengeClaimed = false;
    }
    save.daily.challenge = (save.daily.challenge || 0) + 1;
  }

  function claimDailyChallenge() {
    const save = ctx.getSave();
    const st = dailyState();
    if (st.claimed || st.done < st.goal) { sfx.invalid(); return; }
    save.daily.challengeClaimed = true;
    save.starSeeds = (save.starSeeds || 0) + 8;
    save.energy = Math.min(ENERGY.max, save.energy + 10);
    sfx.daily();
    toast("今日挑戰完成！＋8 星星種子、＋10 能量");
    persist();
    ctx.refreshHud();
    renderOrders();
  }

  function renderOrders() {
    const box = $("#orders");
    if (!box) return;
    const save = ctx.getSave();
    const GAME = ctx.getGame();
    box.innerHTML = "";

    const st = dailyState();
    const daily = document.createElement("div");
    daily.className = "daily-bar" + (st.done >= st.goal && !st.claimed ? " ready" : "") + (st.claimed ? " claimed" : "");
    daily.innerHTML = `<b>今日挑戰</b>
      <span class="need">${st.done}/${st.goal}</span>
      <span class="rew">＋8 種子　＋10 能量</span>
      <span class="banter">${st.claimed ? "今天完成囉" : "剩 " + st.left}</span>
      ${st.done >= st.goal && !st.claimed ? '<button type="button" class="give">領取</button>' : ""}`;
    daily.querySelector(".give")?.addEventListener("click", (e) => { e.stopPropagation(); claimDailyChallenge(); });
    box.appendChild(daily);

    const row = document.createElement("div");
    row.className = "orders-row";
    for (const o of save.orders || []) {
      const npc = GAME.npcs[o.npc] || { name: o.npc, portrait: "assets/chars/avatars/mascot.png" };
      const def = ctx.itemDef(o.need.chain, o.need.tier);
      const ready = hasItem(o);
      const coins = o.reward.coins ?? ((o.reward.seeds || 0) + 4);
      const avatar = (ctx.avatarSrc?.(o.npc) || npc.portrait || "").replace(/assets\/chars\/(\w+)\.png/, "assets/chars/avatars/$1.png");
      const gems = o.reward.diamonds ?? (o.flag ? 2 : 1);
      const tip = `＋${coins} 金幣　＋${o.reward.seeds || 0} 星星種子` + (gems ? `　＋${gems} 鑽石` : "") + (o.reward.materials ? `　＋${o.reward.materials} 材料` : "");
      const card = document.createElement("div");
      card.className = "order" + (o.flag ? " story" : "") + (ready ? " ready" : "");
      card.dataset.id = o.id;
      card.title = `${npc.name}　${def?.name || ""}　${tip}`;
      card.innerHTML = `
        ${o.flag ? '<span class="book-badge"><img src="assets/icons/book.png" alt="故事"></span>' : ""}
        ${ready ? '<span class="check-badge" aria-hidden="true">✓</span><span class="check-spark"></span>' : ""}
        <img class="npc" src="${avatar}" alt="${npc.name}">
        <div class="need${ready ? " have" : ""}">
          <img class="${ready ? "have" : "missing"}" src="${def?.img || ""}" alt="${def?.name || ""}">
        </div>
        <div class="rew"><img src="assets/ui/coin.png" alt="">${coins}<img src="assets/ui/diamond.png" alt="">${gems}<img src="assets/items/star-seed.png" alt="">${o.reward.seeds || 0}</div>
        ${ready ? '<button type="button" class="give">交付</button>' : ""}`;
      card.addEventListener("click", () => {
        if (ready) clickGive(o.id, card);
        else { sfx.invalid(); toast("還沒做出來喔"); }
      });
      card.querySelector(".give")?.addEventListener("click", (e) => {
        e.stopPropagation();
        clickGive(o.id, card);
      });
      if (ready && !seenReady.has(o.id)) {
        seenReady.add(o.id);
        toast("可以交付囉！點「交付」交給朋友。");
      }
      row.appendChild(card);
    }
    for (const id of [...seenReady]) {
      if (!(save.orders || []).some((x) => x.id === id)) seenReady.delete(id);
    }
    box.appendChild(row);
  }

  function clickGive(orderId, card) {
    const save = ctx.getSave();
    const o = (save.orders || []).find((x) => x.id === orderId);
    if (!o) return;
    const loc = findNeed(o);
    if (!loc) { sfx.invalid(); toast("還沒做出來喔"); return; }
    const fromEl = document.querySelector(`.piece[data-uid="${loc.item.uid}"]`);
    ctx.fx?.flyTo(fromEl, card, () => ctx.tryFulfill(loc, orderId));
  }

  return { renderOrders, hasItem, findNeed, clickGive, bumpDaily, dailyState };
}
