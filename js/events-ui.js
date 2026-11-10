/** Travel Town-style side-event button + panel. Uses js/events.js; no real money. */
import { formatEventLeft } from "./events.js";

function needLabel(need, progress) {
  const p = progress || 0;
  const n = need?.count || 0;
  if (need?.type === "merge") {
    if (need.chain === "garden") return `合成花園物品 ${p}/${n}`;
    return `合成物品 ${p}/${n}`;
  }
  if (need?.chain === "candy") return `交糖果訂單 ${p}/${n}`;
  return `交訂單 ${p}/${n}`;
}

function rewardHtml(reward) {
  if (!reward) return "";
  const bits = [];
  if (reward.coins) bits.push(`<span class="ev-rew"><img src="assets/ui/coin.png" alt="">${reward.coins}</span>`);
  if (reward.diamonds) bits.push(`<span class="ev-rew"><img src="assets/ui/diamond.png" alt="">${reward.diamonds}</span>`);
  if (reward.dailyCoins) bits.push(`<span class="ev-rew muted">每天 <img src="assets/ui/coin.png" alt="">${reward.dailyCoins}</span>`);
  return bits.join("");
}

export function createEventsUi(ctx) {
  const { $, toast, sfx, persist, grantCoins } = ctx;

  function state() {
    const save = ctx.getSave() || {};
    const ev = ctx.events?.sync?.() || ctx.events?.current?.();
    return { save, ev };
  }

  function featured(ev, save) {
    const longSt = save.events?.long;
    const shortSt = save.events?.short;
    const longDone = !ev?.long || (longSt?.claimed && (longSt.progress || 0) >= (ev.long.need?.count || 0));
    return longDone && ev?.short ? ev.short : ev?.long || ev?.short;
  }

  function renderButton() {
    const head = document.querySelector("#orders .orders-head");
    if (!head) return;
    let btn = head.querySelector("#btn-events");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "btn-events";
      btn.className = "event-entry";
      head.appendChild(btn);
      btn.addEventListener("click", (e) => { e.stopPropagation(); open(); });
    }
    const { save, ev } = state();
    if (!ev) { btn.hidden = true; return; }
    btn.hidden = false;
    const feat = featured(ev, save);
    const st = save.events?.[feat.kind];
    const ready = st && !st.claimed && (st.progress || 0) >= (feat.need?.count || 0);
    const left = formatEventLeft(feat.endKey, new Date(), true);
    btn.className = "event-entry" + (feat.kind === "long" ? " long" : " short") + (ready ? " ready" : "");
    btn.setAttribute("aria-label", `${feat.name}，還有 ${left.replace(/\u00a0/g, "")}`);
    btn.title = feat.name;
    btn.innerHTML = `<img src="assets/icons/gift.png" alt="">
      <span class="event-timer">${left}</span>
      ${ready ? '<span class="event-ready" aria-hidden="true">✓</span>' : ""}`;
  }

  function renderPanel() {
    const box = $("#event-panels");
    if (!box) return;
    const { save, ev } = state();
    if (!ev) { box.innerHTML = ""; return; }
    box.innerHTML = [ev.long, ev.short].filter(Boolean).map((def) => cardHtml(def, save.events?.[def.kind])).join("");
    box.querySelectorAll("[data-claim]").forEach((b) => {
      b.addEventListener("click", () => claim(b.getAttribute("data-claim"), b));
    });
  }

  function cardHtml(def, st) {
    const progress = st?.progress || 0;
    const goal = def.need?.count || 1;
    const pct = Math.max(0, Math.min(100, Math.round((progress / goal) * 100)));
    const claimed = !!st?.claimed;
    const ready = !claimed && progress >= goal;
    const left = formatEventLeft(def.endKey);
    const tag = def.kind === "long" ? "限時活動" : "今日活動";
    const dayBit = def.kind === "long" ? `第 ${def.dayInEvent}/${def.days} 天` : "今天";
    let action = "";
    if (claimed) action = `<p class="ev-done">今天完成囉</p>`;
    else if (ready) action = `<button type="button" class="btn green ev-claim" data-claim="${def.kind}">領取獎勵</button>`;
    else action = `<p class="ev-wait">進行中</p>`;
    return `<article class="ev-card ${def.kind}${ready ? " ready" : ""}${claimed ? " claimed" : ""}">
      <header class="ev-banner">
        <span class="ev-tag">${tag}</span>
        <h3>${def.name}</h3>
        <span class="ev-count"><img src="assets/icons/clock.png" alt="">還有 ${left}</span>
        <span class="ev-day">${dayBit}</span>
      </header>
      <p class="ev-blurb">${def.blurb || ""}</p>
      <div class="ev-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${progress}" aria-label="${needLabel(def.need, progress)}">
        <span class="ev-bar"><i style="width:${pct}%"></i></span>
        <span class="ev-frac">${needLabel(def.need, progress)}</span>
      </div>
      <div class="ev-rewards" aria-label="獎勵">${rewardHtml(def.reward)}</div>
      ${action}
    </article>`;
  }

  function render() {
    renderButton();
    const sheet = $("#event-sheet");
    if (sheet?.classList.contains("on")) renderPanel();
  }

  function open() {
    const sheet = $("#event-sheet");
    if (!sheet) return;
    sfx?.tap?.();
    renderPanel();
    sheet.classList.add("on");
    sheet.setAttribute("aria-hidden", "false");
    $("#btn-event-close")?.focus?.();
  }

  function close() {
    const sheet = $("#event-sheet");
    if (!sheet) return;
    sheet.classList.remove("on");
    sheet.setAttribute("aria-hidden", "true");
  }

  function claim(kind, btn) {
    const reward = ctx.events?.tryClaim?.(kind);
    if (!reward) { sfx?.invalid?.(); return; }
    sfx?.daily?.() || sfx?.order?.();
    if (reward.diamonds) {
      const save = ctx.getSave();
      save.diamonds = (save.diamonds || 0) + reward.diamonds;
    }
    const after = () => {
      persist();
      ctx.refreshHud?.();
      render();
    };
    if (reward.coins && grantCoins) grantCoins(reward.coins, btn, after);
    else after();
    toast(`完成「${reward.name}」！`);
  }

  function bind() {
    $("#btn-event-close")?.addEventListener("click", () => { sfx?.tap?.(); close(); });
    $("#event-sheet")?.addEventListener("click", (e) => {
      if (e.target?.id === "event-sheet") close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#event-sheet")?.classList.contains("on")) close();
    });
  }

  return { bind, render, open, close };
}
