/** Shared Apple-style spring popover for shop, bag, and HUD. Hover or long-press. */
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

export function hideTip() {
  clearTimeout(hideTimer);
  if (!tipEl) return;
  tipEl.classList.remove("on");
}

export function showTip(anchor, title, body, opts = {}) {
  const el = ensure();
  clearTimeout(hideTimer);
  const t = title || "";
  const b = body || "";
  el.innerHTML = `<b>${t}</b>${b ? `<span>${b}</span>` : ""}`;
  el.style.left = "0px";
  el.style.top = "0px";
  el.classList.add("on");
  const r = (anchor instanceof Element ? anchor : null)?.getBoundingClientRect?.();
  const tw = el.offsetWidth || 160;
  const th = el.offsetHeight || 48;
  let x, y;
  if (r) {
    x = r.left + r.width / 2 - tw / 2;
    y = r.top - th - 10;
    if (y < 8) y = r.bottom + 10;
  } else {
    x = (opts.x || 0) - tw / 2;
    y = (opts.y || 0) - th - 10;
  }
  x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
  y = Math.max(8, Math.min(y, window.innerHeight - th - 8));
  el.style.left = x + "px";
  el.style.top = y + "px";
}

export function bindTip(el, title, body) {
  if (!el) return;
  el._tipTitle = typeof title === "function" ? title : () => title;
  el._tipBody = typeof body === "function" ? body : () => body;
  if (el._tipBound) return;
  el._tipBound = true;

  const show = () => showTip(el, el._tipTitle(), el._tipBody());
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
