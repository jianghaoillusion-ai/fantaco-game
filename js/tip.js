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
