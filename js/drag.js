import { bagCap } from "./bag.js?v=25";
import { hideTip } from "./tip.js?v=25";
/** Travel Town-style board drag: the item follows the finger in real time. */
const THRESHOLD = 8;

function hudTarget() { return null; }

export function createBoardDrag(ctx) {
  let drag = null;
  let raf = 0;
  let px = 0, py = 0;

  function floatEl() {
    let el = document.getElementById("drag-float");
    if (!el) {
      el = document.createElement("div");
      el.id = "drag-float";
      el.className = "drag-float";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    }
    return el;
  }

  function placeFloat() {
    raf = 0;
    if (!drag?.float) return;
    const x = drag.x, y = drag.y;
    const w = drag.fw, h = drag.fh;
    drag.float.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0) scale(1.1)`;
  }

  function queuePlace() {
    if (!raf) raf = requestAnimationFrame(placeFloat);
  }

  function startFloat(e) {
    const piece = drag.piece;
    const r = piece.getBoundingClientRect();
    const fl = floatEl();
    const img = piece.querySelector("img");
    fl.innerHTML = "";
    if (img) {
      const copy = img.cloneNode(true);
      fl.appendChild(copy);
    }
    drag.fw = r.width;
    drag.fh = r.height;
    fl.style.width = r.width + "px";
    fl.style.height = r.height + "px";
    fl.classList.add("on");
    drag.float = fl;
    drag.x = e.clientX;
    drag.y = e.clientY;
    piece.classList.add("origin-ghost");
    document.body.classList.add("is-dragging");
    hideTip();
    ctx.sfx?.pickup?.();
    try { piece.setPointerCapture?.(drag.pointerId); } catch {}
    placeFloat();
  }

  function clearHot() {
    document.querySelectorAll(".cell.merge-hot, .cell.merge-bad, .order.merge-hot, .order.merge-bad, .cell.hot, .cell.bad, .order.hot, .order.bad, #btn-bag.merge-hot, #btn-bag.merge-bad")
      .forEach((el) => el.classList.remove("merge-hot", "merge-bad", "hot", "bad"));
  }

  function hoverAt(x, y) {
    const prev = drag.hot;
    const el = document.elementFromPoint(x, y)?.closest?.(".cell, .order, .inv-cell, #btn-bag");
    if (prev === el) return;
    clearHot();
    drag.hot = el || null;
    if (!el) return;
    const item = drag.loc.item;
    const ok = dropOk(el, item);
    el.classList.add(ok ? "merge-hot" : "merge-bad");
  }

  function dropOk(el, item) {
    if (el.classList.contains("order")) {
      const od = (ctx.getSave().orders || []).find((o) => o.id === el.dataset.id);
      return !!(od && item.kind === "item" && item.chain === od.need.chain && item.tier === od.need.tier
        && od.reservedUid === item.uid);
    }
    if (el.id === "btn-bag" || el.classList.contains("inv-cell") || el.dataset.inv !== undefined) return !el.classList.contains("locked") && ctx.getSave().inventory.filter(Boolean).length < bagCap(ctx.getSave());
    if (el.classList.contains("locked")) return false;
    const r = +el.dataset.r, c = +el.dataset.c;
    if (Number.isNaN(r) || (ctx.fog && !ctx.fog.canDropAt(r, c))) return false;
    const dest = ctx.getSave().board[ctx.getCols() * r + c];
    if (!dest) return true;
    if (ctx.canMerge?.(item, dest)) return true;
    if (dest.uid === item.uid) return true;
    return false;
  }

  function springBack(d, then) {
    const fl = d.float;
    const origin = d.originRect;
    if (!fl || !origin) { then?.(); return; }
    const x = origin.left;
    const y = origin.top;
    fl.classList.add("spring");
    fl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
    const done = () => { fl.classList.remove("on", "spring"); then?.(); };
    fl.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 320);
  }

  function finish(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.body.classList.remove("is-dragging");
    clearHot();
    d.piece.classList.remove("origin-ghost");
    const fl = d.float;
    const current = ctx.findCellByUid?.(d.loc.item.uid);
    if (!current || e.type === "pointercancel") { springBack(d); return; }
    d.loc = current;
    if (!d.moved) {
      if (fl) fl.classList.remove("on");
      ctx.onTap?.(d.loc);
      return;
    }
    const x = e.clientX, y = e.clientY;
    if (fl) fl.style.pointerEvents = "none";
    const el = document.elementFromPoint(x, y)?.closest?.(".cell, .order, .inv-cell, #btn-bag");
    const valid = el && dropOk(el, d.loc.item);
    const settle = (fn) => {
      if (fl) fl.classList.remove("on", "spring");
      fn?.();
    };
    if (!el || !valid) {
      ctx.sfx?.invalid?.();
      springBack(d, () => settle());
      return;
    }
    if (el.classList.contains("order")) {
      settle(() => ctx.tryFulfill?.(d.loc, el.dataset.id));
      return;
    }
    if (el.id === "btn-bag" || el.classList.contains("inv-cell") || el.dataset.inv !== undefined) {
      settle(() => ctx.moveToInventory?.(d.loc, el.dataset.inv === undefined ? -1 : +el.dataset.inv));
      return;
    }
    const r = +el.dataset.r, c = +el.dataset.c;
    settle(() => ctx.moveOrMerge?.(d.loc, r, c));
  }

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    const locked = e.target.closest(".cell.locked");
    if (locked && !e.target.closest(".piece")) { ctx.fog?.onLockedTap?.(locked); return; }
    const piece = e.target.closest("#play .piece, #board .piece, .inv-cell .piece");
    if (!piece) return;
    const loc = ctx.findCellByUid?.(piece.dataset.uid);
    if (!loc || drag || (loc.where === "board" && !ctx.fog.isOpenIndex(loc.i))) return;
    if (e.cancelable) e.preventDefault();
    drag = {
      loc, piece,
      start: { x: e.clientX, y: e.clientY, t: Date.now() },
      originRect: piece.getBoundingClientRect(),
      moved: false, float: null, pointerId: e.pointerId,
      x: e.clientX, y: e.clientY, fw: 48, fh: 48, hot: null
    };
  }

  function onMove(e) {
    if (!drag) return;
    if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
    if (e.cancelable) e.preventDefault();
    drag.x = e.clientX;
    drag.y = e.clientY;
    const dx = e.clientX - drag.start.x, dy = e.clientY - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) >= THRESHOLD) {
      drag.moved = true;
      startFloat(e);
    }
    if (drag.moved) {
      queuePlace();
      hoverAt(e.clientX, e.clientY);
    }
  }

  function onUp(e) {
    if (!drag) return;
    if (drag.pointerId != null && e.pointerId !== drag.pointerId && e.type !== "pointercancel") return;
    finish(e);
  }

  function bind() {
    const play = document.getElementById("play");
    if (!play || play._dragBound) return;
    play._dragBound = true;
    play.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return { bind, isDragging: () => !!drag };
}
