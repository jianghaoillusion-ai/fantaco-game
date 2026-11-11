/** Shared Apple-style spring popover. Hover or long-press only. */
let tipEl = null;
let hideTimer = 0;
let pressTimer = 0;

function ensure() {
  if (tipEl) return tipEl;
  tipEl = document.createElement("div");
  tipEl.className = "game-tip";
  tipEl.setAttribute("role", "tooltip");
  document.body.appendChild(tipEl);
  return tipEl;
}

function rectsOf(sel) {
  if (!sel) return [];
  if (sel instanceof DOMRect) return [sel];
  if (Array.isArray(sel)) return sel.flatMap(rectsOf);
  if (sel instanceof Element) {
    const b = sel.getBoundingClientRect();
    return [{ left: b.left, top: b.top, right: b.right, bottom: b.bottom }];
  }
  if (typeof sel === "string") {
    return [...document.querySelectorAll(sel)].map((el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    });
  }
  if (sel.left != null) return [sel];
  return [];
}

function overlaps(a, b, pad = 0) {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
}

function chainHtml(chain) {
  if (!chain || !chain.length) return "";
  const bits = chain.map((it) => {
    if (!it?.img) return "";
    const cls = it.current ? " now" : "";
    const alt = it.name || "";
    return `<img class="${cls.trim()}" src="${it.img}" alt="${alt}">`;
  }).join("");
  return bits ? `<span class="game-tip-chain" aria-hidden="true">${bits}</span>` : "";
}

function placeTip(el, anchor, opts = {}) {
  const tw = el.offsetWidth || 160;
  const th = el.offsetHeight || 48;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 8;
  const margin = 8;
  const elAnchor = anchor instanceof Element ? anchor : null;
  const cell = elAnchor?.closest?.("#play #board .cell") || elAnchor;
  const r = cell?.getBoundingClientRect?.() || elAnchor?.getBoundingClientRect?.() || null;
  const boardEl = document.querySelector("#play #board");
  const board = boardEl?.getBoundingClientRect?.();

  const avoid = [];
  if (r && opts.avoidNeighbors) {
    const cw = r.width || 48, ch = r.height || 48;
    avoid.push({ left: r.left - cw, top: r.top - ch, right: r.right + cw, bottom: r.bottom + ch });
    const cr = parseInt(cell?.dataset?.r, 10);
    const cc = parseInt(cell?.dataset?.c, 10);
    if (!Number.isNaN(cr)) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const n = document.querySelector(`#play #board .cell[data-r="${cr + dr}"][data-c="${cc + dc}"]`);
          if (!n) continue;
          const b = n.getBoundingClientRect();
          avoid.push({ left: b.left - 2, top: b.top - 2, right: b.right + 2, bottom: b.bottom + 2 });
        }
      }
    }
  } else if (r) {
    avoid.push({ left: r.left - 4, top: r.top - 4, right: r.right + 4, bottom: r.bottom + 4 });
  }
  avoid.push(...rectsOf(opts.avoid));

  const union = (list) => {
    if (!list.length) return null;
    return {
      left: Math.min(...list.map((a) => a.left)),
      top: Math.min(...list.map((a) => a.top)),
      right: Math.max(...list.map((a) => a.right)),
      bottom: Math.max(...list.map((a) => a.bottom))
    };
  };
  const hard = union(avoid) || (r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : { left: 0, top: 0, right: 0, bottom: 0 });
  const cx = r ? r.left + r.width / 2 : (opts.x || 0);
  const cy = r ? r.top + r.height / 2 : (opts.y || 0);

  const clamp = (x, y) => {
    x = Math.max(margin, Math.min(x, vw - tw - margin));
    y = Math.max(margin, Math.min(y, vh - th - margin));
    return { left: x, top: y, right: x + tw, bottom: y + th };
  };

  const raw = [];
  const onBoard = (p) => !!(board && p.left < board.right && p.right > board.left && p.top < board.bottom && p.bottom > board.top);

  // Piece tips must stay off the board: prefer the orders/board alley, then sides, then below.
  if (board && opts.avoidNeighbors) {
    const hudUnion = union(rectsOf("#play .orders-row, #play .order, .play-hud"));
    const gapTop = hudUnion ? hudUnion.bottom : 0;
    const gapBottom = board.top;
    if (gapBottom - gapTop >= th + 8) {
      const y = Math.max(gapTop + 6, gapBottom - th - 8);
      raw.push([cx - tw / 2, y]);
      raw.push([board.left, y]);
      raw.push([Math.max(margin, board.right - tw), y]);
    }
    raw.push([board.left - tw - gap, Math.max(board.top, cy - th / 2)]);
    raw.push([board.right + gap, Math.max(board.top, cy - th / 2)]);
    raw.push([cx - tw / 2, board.bottom + gap]);
    raw.push([board.left, board.bottom + gap]);
    raw.push([Math.max(margin, board.right - tw), board.bottom + gap]);
  } else {
    raw.push([cx - tw / 2, hard.top - th - gap]);
    raw.push([cx - tw / 2, hard.bottom + gap]);
    raw.push([hard.left - tw - gap, cy - th / 2]);
    raw.push([hard.right + gap, cy - th / 2]);
    const prefer = opts.prefer || "top";
    const preferXY = {
      top: [cx - tw / 2, hard.top - th - gap],
      bottom: [cx - tw / 2, hard.bottom + gap],
      left: [hard.left - tw - gap, cy - th / 2],
      right: [hard.right + gap, cy - th / 2]
    };
    if (preferXY[prefer]) raw.unshift(preferXY[prefer]);
  }

  const score = (p) => {
    let s = 0;
    if (p.left < margin - 1 || p.top < margin - 1 || p.right > vw - margin + 1 || p.bottom > vh - margin + 1) s += 60;
    for (const a of avoid) if (overlaps(p, a, 2)) s += 400;
    if (opts.avoidNeighbors && onBoard(p)) s += 8000;
    const pcx = (p.left + p.right) / 2, pcy = (p.top + p.bottom) / 2;
    s += Math.hypot(pcx - cx, pcy - cy) / 90;
    return s;
  };
  let best = null, bestS = Infinity;
  for (const [x, y] of raw) {
    const p = clamp(x, y);
    const s = score(p);
    if (s < bestS) { best = p; bestS = s; }
  }
  // If clamp dragged an alley candidate onto the board, shift it just above or beside the board.
  if (best && opts.avoidNeighbors && onBoard(best) && board) {
    const above = clamp(best.left, board.top - th - 8);
    const below = clamp(best.left, board.bottom + gap);
    const left = clamp(board.left - tw - gap, best.top);
    const right = clamp(board.right + gap, best.top);
    for (const p of [above, below, left, right]) {
      const s = score(p);
      if (s < bestS) { best = p; bestS = s; }
    }
  }

  el.style.left = (best?.left ?? margin) + "px";
  el.style.top = (best?.top ?? margin) + "px";
}

export function hideTip() {
  clearTimeout(hideTimer);
  clearTimeout(pressTimer);
  if (!tipEl) return;
  tipEl.classList.remove("on");
}

export function showTip(anchor, title, body, opts = {}) {
  if (anchor instanceof Element && anchor.closest("#map")) return;   // no popovers on the map
  const el = ensure();
  clearTimeout(hideTimer);
  const t = title || "";
  const b = typeof body === "function" ? body() : (body || "");
  const chain = opts.chain || [];
  el.innerHTML = `<b>${t}</b>${chainHtml(chain)}${b ? `<span>${b}</span>` : ""}`;
  el.classList.toggle("has-chain", chain.length > 0);
  el.style.left = "0px";
  el.style.top = "0px";
  el.classList.add("on");
  placeTip(el, anchor, opts);
}

export function bindTip(el, title, body, opts = {}) {
  if (!el) return;
  el._tipTitle = typeof title === "function" ? title : () => title;
  el._tipBody = typeof body === "function" ? body : () => body;
  el._tipOpts = opts || {};
  if (el._tipBound) return;
  el._tipBound = true;

  const show = () => showTip(el, el._tipTitle(), el._tipBody(), el._tipOpts || {});
  const hide = () => hideTip();

  el.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") show();
  });
  el.addEventListener("pointerleave", hide);
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      el._tipHeld = true;
      show();
    }, 400);
  });
  const cancelPress = () => {
    clearTimeout(pressTimer);
    if (el._tipHeld) {
      el._tipHeld = false;
      hideTimer = setTimeout(hide, 1400);
    }
  };
  el.addEventListener("pointerup", cancelPress);
  el.addEventListener("pointercancel", () => { clearTimeout(pressTimer); el._tipHeld = false; hide(); });
}

/** Icon-only chrome: names live in the animated popover, never in a native title tooltip. */
export function bindChromeTips() {
  const pairs = [
    ["#btn-settings", "設定", "音樂、音效與名字"],
    ["#btn-hud-settings", "設定", "音樂、音效與名字"],
    ["#btn-map", "故事地圖", "打開地圖，修復小建築"],
    ["#btn-book", "魔法書", "看看收集到的寶物"],
    ["#btn-daily", "每日禮物", "每天都可以來領一份禮物"],
    ["#btn-redeem", "兌換禮品", "用星星種子換禮物"],
    ["#btn-lyrics", "飛向藍藍天", "聽聽主題曲"],
    ["#btn-watch-ad", "看影片", "看〈飛向藍藍天〉領獎勵"],
    ["#btn-bag", "魔法袋", "把棋盤上的東西先收起來"],
    ["#btn-go-map", "地圖", "打開世界地圖"],
    ["#btn-go-shop", "小舖", "用金幣和鑽石買道具"],
    ['.tool-btn.home[data-back="title"]', "主畫面", "回到主畫面"],
    [".play-hud .pill.energy", "能量", "點產生器會用掉能量，會慢慢回來"],
    [".play-hud .pill.diamonds", "鑽石", "在小舖裡使用"],
    [".play-hud .pill.seeds", "星星種子", "用來加大魔法袋或兌換禮物"],
    [".play-hud .pill.mats", "修復材料", "用來修復地圖上的建築"],
    ["#btn-events", "活動", "看看今天的活動"],
    ["#btn-sell", "出售", "賣掉這個多餘的道具"]
  ];
  for (const [sel, title, body] of pairs) {
    document.querySelectorAll(sel).forEach((el) => {
      el.removeAttribute("title");
      bindTip(el, title, body);
    });
  }
}
