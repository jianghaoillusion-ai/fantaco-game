/** Selection brackets, merge/spawn pop, fly-to-order, discovery card, coin pops. */

export function createFx(ctx) {
  const { $, toast, sfx } = ctx;

  function flyTo(fromEl, toEl, done) {
    if (!fromEl || !toEl) { done?.(); return; }
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const ghost = fromEl.cloneNode(true);
    ghost.classList.add("fly-ghost");
    ghost.style.left = a.left + "px";
    ghost.style.top = a.top + "px";
    ghost.style.width = a.width + "px";
    ghost.style.height = a.height + "px";
    document.body.appendChild(ghost);
    requestAnimationFrame(() => {
      const dx = b.left + b.width / 2 - a.left - a.width / 2;
      const dy = b.top + b.height / 2 - a.top - a.height / 2;
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(.35)`;
      ghost.style.opacity = "0.2";
    });
    setTimeout(() => { ghost.remove(); done?.(); }, 480);
  }

  function popAt(uid) {
    const el = document.querySelector(`.piece[data-uid="${uid}"]`);
    if (el) {
      el.classList.remove("pop-merge");
      void el.offsetWidth;
      el.classList.add("pop-merge");
    }
  }

  function revealMerge(uid) {
    const el = document.querySelector(`.piece[data-uid="${uid}"]`);
    if (!el) return;
    el.classList.remove("pop-merge", "merge-reveal");
    void el.offsetWidth;
    el.classList.add("merge-reveal");
    const burst = document.createElement("span");
    burst.className = "merge-burst";
    burst.setAttribute("aria-hidden", "true");
    const pts = [[-22,-28],[24,-26],[32,6],[-30,8],[6,-36],[-8,30],[28,26],[-26,24]];
    burst.innerHTML = pts.map(([x,y]) => `<i style="--dx:${x}px;--dy:${y}px"></i>`).join("");
    el.appendChild(burst);
    setTimeout(() => burst.remove(), 700);
  }

  function spawnArc(fromEl, toEl, done) {
    if (!fromEl || !toEl) { done?.(); return; }
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const ghost = fromEl.cloneNode(true);
    ghost.classList.add("spawn-ghost");
    ghost.style.left = (a.left + a.width / 2) + "px";
    ghost.style.top = (a.top + a.height / 2) + "px";
    ghost.style.width = a.width + "px";
    ghost.style.height = a.height + "px";
    document.body.appendChild(ghost);
    requestAnimationFrame(() => {
      ghost.style.left = (b.left + b.width / 2) + "px";
      ghost.style.top = (b.top + b.height / 2) + "px";
      ghost.style.transform = "translate(-50%,-50%) scale(1)";
    });
    setTimeout(() => {
      ghost.style.transform = "translate(-50%,-50%) scale(1.3)";
      setTimeout(() => {
        ghost.style.transform = "translate(-50%,-50%) scale(1)";
        setTimeout(() => { ghost.remove(); done?.(); }, 120);
      }, 150);
    }, 250);
  }

  function bounceCell(el) {
    if (!el) return;
    el.classList.remove("cell-bounce", "bad");
    void el.offsetWidth;
    el.classList.add("cell-bounce", "bad");
    setTimeout(() => el.classList.remove("cell-bounce", "bad"), 280);
  }

  function coinPop(target, text) {
    const el = document.createElement("div");
    el.className = "coin-pop";
    el.textContent = text;
    const r = (target || $("#play"))?.getBoundingClientRect?.() || { left: innerWidth / 2, top: 120, width: 0 };
    el.style.left = (r.left + r.width / 2) + "px";
    el.style.top = (r.top + 8) + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function showDiscover(item) {
    const name = ctx.infoName(item);
    const img = ctx.infoImg(item);
    const box = $("#discover");
    if (!box) {
      toast(`新發現：${name}　＋1 星星種子`);
      return;
    }
    $("#discover-img").src = img;
    $("#discover-img").alt = name;
    $("#discover-name").textContent = "新發現：" + name;
    const tier = item.tier ? `第 ${item.tier} 階` : "";
    $("#discover-sub").textContent = `${tier}　已記進魔法書　＋1 星星種子`.trim();
    box.classList.add("on");
  }

  function showInfo(item) {
    const bar = $("#item-info");
    if (!bar) return;
    bar.hidden = false;
    const thumb = $("#info-thumb");
    if (!item) {
      bar.classList.add("empty");
      $("#info-name").textContent = "點選棋盤上的東西";
      $("#info-hint").textContent = "合兩個一樣的，交給訂單。";
      if ($("#btn-sell")) $("#btn-sell").disabled = true;
      if (thumb) { thumb.hidden = true; thumb.removeAttribute("src"); }
      return;
    }
    bar.classList.remove("empty");
    $("#info-name").textContent = ctx.infoName(item);
    const src = ctx.infoImg?.(item);
    if (thumb) {
      if (src) { thumb.src = src; thumb.hidden = false; }
      else { thumb.hidden = true; thumb.removeAttribute("src"); }
    }
    if (item.kind === "gen") {
      const cool = item.coolUntil && item.coolUntil > Date.now();
      const lv = item.tier ? `第 ${item.tier} 階　` : "";
      $("#info-hint").textContent = lv + (cool ? "還在休息，等一下再點。" : "點一下就會產出（花 1 點能量）。");
      if ($("#btn-sell")) $("#btn-sell").disabled = true;
    } else {
      const max = ctx.maxTier?.(item.chain) || 99;
      const lv = item.tier ? `第 ${item.tier} 階　` : "";
      $("#info-hint").textContent = lv + (item.tier >= max ? "已經是最高一階了。" : "再合一個一樣的，就會升階。");
      if ($("#btn-sell")) $("#btn-sell").disabled = item.tier <= 1;
    }
  }

  function celebrateRestore(name, anchor) {
    const layer = document.createElement("div");
    layer.className = "restore-fx";
    layer.innerHTML = `<div class="restore-burst" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <b>修好了！</b><span>${name}</span>`;
    document.body.appendChild(layer);
    coinPop(anchor || $("#map") || document.body, "修好了");
    setTimeout(() => layer.remove(), 1800);
  }

  return { flyTo, popAt, revealMerge, spawnArc, bounceCell, coinPop, showDiscover, showInfo, celebrateRestore };
}
