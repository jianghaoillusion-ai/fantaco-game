import { formatDailyResetLeft, ensureDaily } from "./save.js?v=20261112";
import { bindTip, hideTip } from "./tip.js?v=20261112";
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

  const TASKS = [
    { key: "orders", goal: 3, icon: "assets/icons/gift.png", label: "交訂單" },
    { key: "merges", goal: 5, icon: "assets/ui/coin.png", label: "合成" },
    { key: "gens", goal: 5, icon: "assets/icons/energy.png", label: "產出" }
  ];

  function taskCount(save, key) {
    if (key === "orders") return save.daily?.challenge || 0;
    if (key === "merges") return save.daily?.taskMerges || 0;
    if (key === "gens") return save.daily?.taskGens || 0;
    return 0;
  }

  function dailyState() {
    const save = ctx.getSave();
    ensureDaily(save);
    const tasks = TASKS.map((t) => {
      const done = Math.min(t.goal, taskCount(save, t.key));
      return { ...t, done, ready: done >= t.goal };
    });
    const done = tasks.reduce((n, t) => n + t.done, 0);
    const goal = tasks.reduce((n, t) => n + t.goal, 0);
    const allDone = tasks.every((t) => t.ready);
    return {
      tasks, done, goal, allDone,
      claimed: !!save.daily?.challengeClaimed,
      left: formatDailyResetLeft()
    };
  }

  function bumpDaily() { bumpTask("orders"); }

  function bumpTask(key) {
    const save = ctx.getSave();
    const today = todayKey();
    if (!save.daily) save.daily = { day: "", streak: 0, claimed: false, challengeDay: today, challenge: 0, challengeClaimed: false, taskMerges: 0, taskGens: 0 };
    ensureDaily(save);
    if (key === "orders") save.daily.challenge = (save.daily.challenge || 0) + 1;
    else if (key === "merges") save.daily.taskMerges = (save.daily.taskMerges || 0) + 1;
    else if (key === "gens") save.daily.taskGens = (save.daily.taskGens || 0) + 1;
  }

  function claimDailyChallenge(fromEl) {
    const save = ctx.getSave();
    const st = dailyState();
    if (st.claimed || !st.allDone) { sfx.invalid(); return; }
    save.daily.challengeClaimed = true;
    save.starSeeds = (save.starSeeds || 0) + 8;
    save.energy = Math.min(ENERGY.max, save.energy + 10);
    sfx.daily();
    persist();
    const after = () => { ctx.refreshHud(); renderOrders(); renderChallengePanel(); };
    const rows = [...document.querySelectorAll("#challenge-tasks .ch-task")];
    const fly = (next) => {
      if (ctx.fx?.flyRewards) ctx.fx.flyRewards({ seeds: 8, energy: 10 }, fromEl || document.querySelector(".daily-card"), next);
      else next();
    };
    fly(() => {
      if (!rows.length || !ctx.fx?.completeTask) { after(); return; }
      let left = rows.length;
      rows.forEach((row, i) => {
        setTimeout(() => ctx.fx.completeTask(row, () => { left -= 1; if (left <= 0) after(); }), i * 80);
      });
    });
  }

  function renderChallengePanel() {
    const box = document.getElementById("challenge-tasks");
    if (!box) return;
    const st = dailyState();
    box.innerHTML = st.tasks.map((t) => {
      const pct = Math.round((t.done / t.goal) * 100);
      return `<div class="ch-task${t.ready ? " ready" : ""}">
        <img src="${t.icon}" alt="">
        <span class="ch-bar"><i style="width:${pct}%"></i></span>
        <span class="ch-frac">${t.done}/${t.goal}</span>
      </div>`;
    }).join("");
    const rew = document.getElementById("challenge-rewards");
    if (rew) rew.innerHTML = `<span class="ev-rew"><img src="assets/items/star-seed.png" alt="">8</span><span class="ev-rew"><img src="assets/icons/energy.png" alt="">10</span>`;
    const claim = document.getElementById("btn-challenge-claim");
    if (claim) {
      claim.disabled = st.claimed || !st.allDone;
      claim.hidden = st.claimed;
      claim.textContent = st.claimed ? "已領取" : "領取";
    }
    const done = document.getElementById("challenge-done");
    if (done) done.hidden = !st.claimed;
  }

  function openChallenge() {
    const sheet = document.getElementById("challenge-sheet");
    if (!sheet) return;
    sfx.tap();
    renderChallengePanel();
    sheet.classList.add("on");
    sheet.setAttribute("aria-hidden", "false");
  }

  function closeChallenge() {
    const sheet = document.getElementById("challenge-sheet");
    if (!sheet) return;
    sheet.classList.remove("on");
    sheet.setAttribute("aria-hidden", "true");
  }

  function bindChallenge() {
    if (bindChallenge._on) return;
    bindChallenge._on = true;
    document.getElementById("btn-challenge-close")?.addEventListener("click", () => { sfx.tap(); closeChallenge(); });
    document.getElementById("btn-challenge-claim")?.addEventListener("click", (e) => claimDailyChallenge(e.currentTarget));
    document.getElementById("challenge-sheet")?.addEventListener("click", (e) => {
      if (e.target?.id === "challenge-sheet") closeChallenge();
    });
  }

  function renderOrders() {
    const box = $("#orders");
    if (!box) return;
    const save = ctx.getSave();
    const GAME = ctx.getGame();
    box.innerHTML = "";

    const st = dailyState();
    const head = document.createElement("div");
    head.className = "orders-head";
    const daily = document.createElement("button");
    daily.type = "button";
    daily.className = "daily-card" + (st.allDone && !st.claimed ? " ready" : "") + (st.claimed ? " claimed" : "");
    daily.setAttribute("aria-label", st.claimed ? "今日挑戰已完成" : `今日挑戰 ${st.done}/${st.goal}，還有 ${st.left.replace(/\u00a0/g, " ")}`);
    const pct = Math.round((st.done / st.goal) * 100);
    daily.innerHTML = `<img class="daily-ico" src="assets/icons/gift.png" alt="">
      <span class="daily-bar-track"><i style="width:${pct}%"></i></span>
      <span class="daily-timer">${st.claimed ? "完成" : st.left}</span>
      ${st.allDone && !st.claimed ? '<span class="daily-claim-dot" aria-hidden="true">✓</span>' : ""}`;
    daily.addEventListener("click", (e) => { e.stopPropagation(); hideTip(); openChallenge(); });
    bindTip(daily, "今日挑戰", st.claimed ? "今天完成囉" : `${st.done}/${st.goal}`, { prefer: "left", avoid: "#play .orders-row, #play .order, .play-hud" });
    head.appendChild(daily);
    box.appendChild(head);
    bindChallenge();

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
      card.innerHTML = `
        ${o.flag ? '<span class="book-badge"><img src="assets/icons/book.png" alt="故事"></span>' : ""}
        ${ready ? '<span class="check-badge" aria-hidden="true">✓</span><span class="check-spark"></span>' : ""}
        <img class="npc" src="${avatar}" alt="${npc.name}">
        <div class="need${ready ? " have" : ""}">
          <img class="${ready ? "have" : "missing"}" src="${def?.img || ""}" alt="${def?.name || ""}">
        </div>
        <div class="rew"><img src="assets/ui/coin.png" alt="">${coins}<img src="assets/ui/diamond.png" alt="">${gems}<img src="assets/items/star-seed.png" alt="">${o.reward.seeds || 0}</div>
        ${ready ? '<label class="give" tabindex="0" role="button">交付<input class="haptic-switch" type="checkbox" switch tabindex="-1" aria-hidden="true"></label>' : '<span class="give-slot" aria-hidden="true"></span>'}`;
      card.addEventListener("click", () => {
        hideTip();
        if (ready) clickGive(o.id, card);
        else { sfx.invalid(); toast("還沒做出來喔"); }
      });
      const nativeSwitch = card.querySelector(".haptic-switch");
      if (nativeSwitch) nativeSwitch.disabled = save.settings?.haptics === false;
      card.querySelector(".give")?.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickGive(o.id, card); }
      });
      card.querySelector(".give")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const off = ctx.getSave().settings?.haptics === false;
        if (off) e.preventDefault();
        if (nativeSwitch) nativeSwitch.disabled = off;
        if (e.target === nativeSwitch) return;
        if (!ctx.getSave().orders.some(order => order.id === o.id)) { e.preventDefault(); return; }
        hideTip();
        clickGive(o.id, card, !nativeSwitch?.disabled && e.isTrusted && typeof navigator.vibrate !== "function");
      });
      bindTip(card, npc.name, `${def?.name || ""}　${tip}`);
      if (ready && !seenReady.has(o.id)) seenReady.add(o.id);
      row.appendChild(card);
    }
    for (const id of [...seenReady]) {
      if (!(save.orders || []).some((x) => x.id === id)) seenReady.delete(id);
    }
    box.appendChild(row);
    ctx.eventsUi?.render?.();
  }

  function clickGive(orderId, card, nativeHaptic = false) {
    const save = ctx.getSave();
    const o = (save.orders || []).find((x) => x.id === orderId);
    if (!o) return;
    const loc = findNeed(o);
    if (!loc) { sfx.invalid(); toast("還沒做出來喔"); return; }
    const fromEl = document.querySelector(`.piece[data-uid="${loc.item.uid}"]`);
    ctx.fx?.flyTo(fromEl, card);
    ctx.tryFulfill(loc, orderId, nativeHaptic);
  }

  return { renderOrders, hasItem, findNeed, clickGive, bumpDaily, bumpTask, dailyState, openChallenge, closeChallenge };
}
