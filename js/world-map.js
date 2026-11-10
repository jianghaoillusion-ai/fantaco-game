/** Balloon Kingdom world map: drag, pinch-zoom with inertia, cloud-covered regions, repair states.
 *  Art is drawn by assets/map/src (vector, sticker style) and baked to webp.
 *  Looks and motion only. Costs, unlock rules and saving stay in map.js / world.js. */
import { isRegionUnlocked, regionVisible, regionUnlockBlocked } from "./world.js?v=25";

const ART = "assets/map/";
const ICON = {
  coins: "assets/ui/coin.png",
  stars: "assets/items/star-seed.png",
  materials: "assets/icons/material.png",
  lock: ART + "icon-lock.svg",
  back: ART + "icon-back.svg",
  hammer: ART + "icon-hammer.svg",
  shop: "assets/icons/shop.png",
  board: ART + "icon-board.svg",
  close: ART + "icon-close.svg"
};
let CLOUD_RATIO = 311 / 486;

export function createWorldMap(ctx, mapApi) {
  const { $, toast, sfx } = ctx;
  let root, world, layers = {}, sheet, layout = null, built = false, busy = false;
  let W = 1200, H = 2000;
  const cam = { x: 0, y: 0, s: 1, min: 1, max: 2.4, home: 1 };
  let vw = 0, vh = 0, raf = 0, anim = null;
  let openSheet = null, padB = 0;   // padB: extra room under the map while the card is up, so the bottom row is not hidden behind it

  /* ---------- data helpers ---------- */
  const save = () => ctx.getSave();
  const regions = () => ctx.getMap()?.regions || [];
  const lvOf = (id) => save().buildings?.[id] || 0;
  const maxOf = (b) => (b.costs || []).length;

  function place(region) {
    if (region.map?.pin) return region.map;
    const known = layout?.regions?.[region.id];
    if (known) return known;
    const extra = regions().filter((r) => !r.map?.pin && !layout?.regions?.[r.id]);
    const spare = layout?.spare || [];
    return spare[extra.indexOf(region) % Math.max(1, spare.length)] || { pin: [W / 2, H / 2], rect: [W / 2 - 80, H / 2 - 70, 160, 120] };
  }

  function buildingRect(region, b, i) {
    const p = place(region);
    const r = p.buildings?.[b.id]?.rect;
    if (r) return { rect: r, drawn: !region.map?.pin && !!layout?.regions?.[region.id]?.buildings?.[b.id] };
    const [x, y, w, h] = p.rect;
    return { rect: [x + w * (0.2 + 0.4 * (i % 2)), y + h * 0.2, w * 0.4, h * 0.5], drawn: false };
  }

  function costChips(cost = {}) {
    return ["coins", "stars", "materials"].filter((k) => cost[k])
      .map((k) => `<span class="wm-chip ${k}"><img src="${ICON[k]}" alt="">${cost[k]}</span>`).join("");
  }

  function needOk(b) {
    if (!b.need) return true;
    const [id, n] = b.need.split(":");
    return lvOf(id) >= Number(n || 1);
  }
  function nextCost(b) {
    const lv = lvOf(b.id);
    return { coins: b.costs?.[lv] || 0, materials: b.materials?.[lv] || 0 };
  }
  function canPay(cost) {
    const s = save();
    return (s.coins || 0) >= (cost.coins || 0) && (s.starSeeds || 0) >= (cost.stars || 0) && (s.materials || 0) >= (cost.materials || 0);
  }

  /* ---------- build once ---------- */
  function build() {
    const host = $("#map");
    host.classList.add("wm-on");
    root = document.createElement("div");
    root.className = "wm";
    root.id = "world-map";
    root.innerHTML = `
      <div class="wm-world">
        <img class="wm-art" src="${ART}world-map.webp" alt="" draggable="false" decoding="async">
        <div class="wm-layer wm-ruins"></div>
        <div class="wm-layer wm-sparks"></div>
        <div class="wm-layer wm-clouds"></div>
        <div class="wm-layer wm-pins"></div>
        <div class="wm-layer wm-fx"></div>
      </div>
      <div class="wm-edge" aria-hidden="true"></div>
      <div class="wm-sheet" hidden></div>`;
    host.appendChild(root);
    world = root.querySelector(".wm-world");
    for (const k of ["ruins", "sparks", "clouds", "pins", "fx"]) layers[k] = root.querySelector(".wm-" + k);
    sheet = root.querySelector(".wm-sheet");
    world.style.width = W + "px";
    world.style.height = H + "px";

    const shopBtn = $("#btn-map-shop");
    if (shopBtn) {
      shopBtn.classList.add("wm-hud-btn");
      shopBtn.setAttribute("aria-label", shopBtn.textContent.trim() || "小舖");
      shopBtn.title = shopBtn.getAttribute("aria-label");
      shopBtn.innerHTML = `<img src="${ICON.shop}" alt="">`;
    }
    const backBtn = host.querySelector(".hud [data-back]");
    if (backBtn) { backBtn.classList.add("wm-hud-btn", "wm-back"); backBtn.innerHTML = `<img src="${ICON.back}" alt="">`; }
    bindGestures();
    window.addEventListener("resize", () => { if (host.classList.contains("on")) { measure(); clamp(); apply(); } });
    built = true;
  }

  /* ---------- camera ---------- */
  function measure() {
    vw = root.clientWidth; vh = root.clientHeight;
    cam.min = Math.max(vw / W, vh / H);
    cam.max = Math.max(cam.min * 1.9, 1.25);
    cam.home = Math.min(cam.max, Math.max(cam.min * 1.12, Math.min(0.8, vw / 700)));
  }
  function clamp(soft = 0) {
    cam.s = Math.min(cam.max * (1 + soft), Math.max(cam.min * (1 - soft), cam.s));
    const minX = vw - W * cam.s, minY = vh - padB - H * cam.s;
    cam.x = Math.min(0, Math.max(minX, cam.x));
    cam.y = Math.min(0, Math.max(minY, cam.y));
  }
  function apply() {
    world.style.transform = `translate3d(${cam.x}px,${cam.y}px,0) scale(${cam.s})`;
    root.style.setProperty("--pin", String(Math.pow(cam.s, -0.82)));
  }
  function stopAnim() { cancelAnimationFrame(raf); anim = null; }
  function flyTo(wx, wy, s, ms = 520, yBias = 0.5) {
    stopAnim();
    const target = { s: Math.min(cam.max, Math.max(cam.min, s || cam.s)) };
    target.x = vw / 2 - wx * target.s;
    target.y = vh * yBias - wy * target.s;
    target.x = Math.min(0, Math.max(vw - W * target.s, target.x));
    target.y = Math.min(0, Math.max(vh - padB - H * target.s, target.y));
    const from = { ...cam }, t0 = performance.now();
    return new Promise((done) => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
        cam.x = from.x + (target.x - from.x) * e;
        cam.y = from.y + (target.y - from.y) * e;
        cam.s = from.s + (target.s - from.s) * e;
        apply();
        if (t < 1) raf = requestAnimationFrame(step); else done();
      };
      raf = requestAnimationFrame(step);
    });
  }
  function zoomAt(px, py, factor, soft = 0) {
    const s0 = cam.s;
    const s1 = Math.min(cam.max * (1 + soft), Math.max(cam.min * (1 - soft), s0 * factor));
    cam.x = px - (px - cam.x) * (s1 / s0);
    cam.y = py - (py - cam.y) * (s1 / s0);
    cam.s = s1;
  }

  function bindGestures() {
    const pts = new Map();
    let moved = 0, pinch = null, last = null, vel = { x: 0, y: 0 }, downAt = 0, lastTap = 0, downTarget = null;
    const local = (e) => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    root.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".wm-sheet")) return;
      stopAnim();
      const p = local(e);
      pts.set(e.pointerId, p);
      if (pts.size === 1) { moved = 0; last = { ...p, t: performance.now() }; vel = { x: 0, y: 0 }; downAt = last.t; downTarget = e.target; }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: cam.s };
        moved = 99;
      }
    });
    window.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = local(e), prev = pts.get(e.pointerId);
      pts.set(e.pointerId, p);
      if (busy) return;
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        zoomAt(mid.x, mid.y, (pinch.s * d / pinch.d) / cam.s, 0.12);
        cam.x += (p.x - prev.x) / 2; cam.y += (p.y - prev.y) / 2;
        softClamp(); apply();
        return;
      }
      const dx = p.x - prev.x, dy = p.y - prev.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved < 6) return;
      root.classList.add("dragging");
      cam.x += dx; cam.y += dy;
      softClamp(); apply();
      const now = performance.now(), dt = Math.max(1, now - last.t);
      vel = { x: vel.x * 0.4 + (dx / dt) * 0.6, y: vel.y * 0.4 + (dy / dt) * 0.6 };
      last = { ...p, t: now };
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (pts.size === 1) { pinch = null; const q = [...pts.values()][0]; last = { ...q, t: performance.now() }; vel = { x: 0, y: 0 }; return; }
      if (pts.size > 0) return;
      pinch = null;
      root.classList.remove("dragging");
      const now = performance.now();
      if (moved < 6 && now - downAt < 500) {
        const hit = downTarget?.closest?.("[data-wm]");
        if (hit) { lastTap = 0; onAct(hit); return; }
        if (openSheet) { closeSheet(); lastTap = 0; return; }
        if (now - lastTap < 320) { stopAnim(); const s = cam.s > cam.min * 1.5 ? cam.min : cam.s * 1.7; flyTo((p.x - cam.x) / cam.s, (p.y - cam.y) / cam.s, s, 320); lastTap = 0; }
        else lastTap = now;
        return;
      }
      if (now - last.t > 90) vel = { x: 0, y: 0 };
      glide(vel);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    root.addEventListener("wheel", (e) => {
      if (e.target.closest(".wm-sheet")) return;
      e.preventDefault();
      stopAnim();
      const p = local(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0016));
      clamp(); apply();
    }, { passive: false });
  }

  /* rubber band past the edges while the finger is down */
  function softClamp() {
    const minX = vw - W * cam.s, minY = vh - padB - H * cam.s;
    const band = (v, lo, hi) => v > hi ? hi + (v - hi) * 0.35 : v < lo ? lo + (v - lo) * 0.35 : v;
    cam.x = band(cam.x, Math.min(minX, 0), 0);
    cam.y = band(cam.y, Math.min(minY, 0), 0);
  }
  function glide(v) {
    stopAnim();
    let vx = v.x * 16, vy = v.y * 16, prev = performance.now();
    const step = (now) => {
      const k = Math.min(3, (now - prev) / 16); prev = now;
      cam.x += vx * k; cam.y += vy * k;
      vx *= Math.pow(0.94, k); vy *= Math.pow(0.94, k);
      const sT = Math.min(cam.max, Math.max(cam.min, cam.s));
      if (Math.abs(sT - cam.s) > 0.0005) zoomAt(vw / 2, vh / 2, 1 + (sT / cam.s - 1) * 0.22 * k, 1);
      const minX = vw - W * cam.s, minY = vh - padB - H * cam.s;
      const tx = Math.min(0, Math.max(minX, cam.x)), ty = Math.min(0, Math.max(minY, cam.y));
      if (tx !== cam.x) { cam.x += (tx - cam.x) * 0.22 * k; vx *= 0.5; }
      if (ty !== cam.y) { cam.y += (ty - cam.y) * 0.22 * k; vy *= 0.5; }
      apply();
      const settled = Math.abs(vx) + Math.abs(vy) < 0.08 && Math.abs(tx - cam.x) + Math.abs(ty - cam.y) < 0.4 && Math.abs(sT - cam.s) < 0.001;
      if (settled) { clamp(); apply(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ---------- painting state ---------- */
  function paint() {
    const s = save(), map = ctx.getMap();
    layers.ruins.innerHTML = ""; layers.sparks.innerHTML = ""; layers.clouds.innerHTML = ""; layers.pins.innerHTML = "";
    for (const region of regions()) {
      const p = place(region);
      const open = isRegionUnlocked(s, region.id);
      if (!open) {
        const near = regionVisible(map, s, region);
        const set = cloudSet(region, p);
        if (near) { set.classList.add("near"); layers.pins.appendChild(lockPin(region, p)); }
        layers.clouds.appendChild(set);
        continue;
      }
      layers.pins.appendChild(regionPin(region, p));
      (region.buildings || []).forEach((b, i) => {
        const { rect, drawn } = buildingRect(region, b, i);
        const lv = lvOf(b.id), max = maxOf(b);
        if (lv < max) {
          if (drawn) layers.ruins.appendChild(ruin(b, rect, lv, max));
          layers.pins.appendChild(repairPin(region, b, rect));
        } else if (max > 0) layers.sparks.appendChild(twinkle(b, rect));
      });
    }
  }

  function cloudSet(region, p) {
    const [x, y, w, h] = p.rect;
    const set = document.createElement("div");
    set.className = "wm-cloudset";
    set.dataset.region = region.id;
    const cx = x + w / 2, cy = y + h / 2;
    const big = Math.max(w * 0.74, h * 1.02);
    const parts = [
      { w: big * 0.6, dx: -w * 0.3, dy: -h * 0.24, dir: -1, flip: 1, b: 1 },
      { w: big * 0.62, dx: w * 0.3, dy: -h * 0.2, dir: 1, flip: 0, b: 1 },
      { w: big * 0.6, dx: -w * 0.27, dy: h * 0.24, dir: -1, flip: 0 },
      { w: big * 0.6, dx: w * 0.29, dy: h * 0.27, dir: 1, flip: 1, b: 1 },
      { w: big, dx: 0, dy: 0, dir: 0, flip: 0 }
    ];
    parts.forEach((c, i) => {
      const el = document.createElement("i");
      el.className = "wm-cloud" + (c.flip ? " flip" : "") + (c.b ? " b" : "");
      el.style.cssText = `left:${cx + c.dx - c.w / 2}px;top:${cy + c.dy - c.w * CLOUD_RATIO / 2}px;width:${c.w}px;height:${c.w * CLOUD_RATIO}px;--dir:${c.dir};--i:${i}`;
      set.appendChild(el);
    });
    return set;
  }

  function pinBase(cls, x, y) {
    const el = document.createElement("div");
    el.className = "wm-pin " + cls;
    el.style.left = x + "px"; el.style.top = y + "px";
    return el;
  }

  function regionPin(region, p) {
    const here = save().region === region.id;
    const el = pinBase("open" + (here ? " here" : ""), p.pin[0], p.pin[1]);
    el.dataset.wm = "region"; el.dataset.id = region.id;
    const face = here ? "assets/chars/avatars/mascot.png" : (ctx.avatarSrc?.(region.npc) || "assets/chars/avatars/mascot.png");
    el.innerHTML = `<span class="wm-face"><img src="${face}" alt=""></span><span class="wm-name">${region.name}</span>`;
    return el;
  }

  function lockPin(region, p) {
    const blocked = regionUnlockBlocked(ctx.getMap(), save(), region);
    const [x, y, w, h] = p.rect;
    const el = pinBase("locked" + (blocked ? "" : " ready"), x + w / 2, y + h / 2 + 34);
    el.dataset.wm = "region"; el.dataset.id = region.id;
    el.innerHTML = `<span class="wm-lock"><img src="${ICON.lock}" alt=""></span>
      <span class="wm-tag"><span class="wm-name">${region.name}</span><span class="wm-costs">${costChips(region.unlock)}</span></span>`;
    return el;
  }

  function repairPin(region, b, rect) {
    const ok = needOk(b) && canPay(nextCost(b));
    const h = layout?.regions?.[region.id]?.buildings?.[b.id]?.hammer;
    const el = pinBase("repair" + (ok ? " ready" : ""), h ? h[0] : rect[0] + rect[2] / 2, h ? h[1] : rect[1] + 6);
    el.dataset.wm = "building"; el.dataset.id = b.id; el.dataset.region = region.id;
    el.innerHTML = `<span class="wm-hammer"><img src="${ICON.hammer}" alt=""></span>`;
    el.setAttribute("aria-label", b.name);
    return el;
  }

  function ruin(b, rect, lv, max) {
    const el = document.createElement("img");
    el.className = "wm-ruin";
    el.dataset.b = b.id;
    el.src = `${ART}ruin-${b.id}${lv > 0 ? "-" + lv : ""}.webp`;
    el.alt = ""; el.draggable = false;
    el.style.cssText = `left:${rect[0]}px;top:${rect[1]}px;width:${rect[2]}px;height:${rect[3]}px`;
    // no half-way picture for this step: fade the flat one instead
    el.addEventListener("error", () => { if (lv > 0 && !el.dataset.fb) { el.dataset.fb = "1"; el.style.opacity = String(0.4 + 0.6 * (1 - lv / Math.max(1, max))); el.src = `${ART}ruin-${b.id}.webp`; } else el.remove(); });
    return el;
  }

  function twinkle(b, rect) {
    const el = document.createElement("div");
    el.className = "wm-twinkle";
    el.style.cssText = `left:${rect[0]}px;top:${rect[1]}px;width:${rect[2]}px;height:${rect[3]}px`;
    el.innerHTML = "<i></i><i></i><i></i>";
    return el;
  }

  /* ---------- bottom card ---------- */
  function onAct(hit) {
    if (busy) return;
    const region = regions().find((r) => r.id === (hit.dataset.region || hit.dataset.id));
    if (!region) return;
    sfx.tap?.();
    showRegion(region, hit.dataset.wm === "building" ? hit.dataset.id : null);
  }

  function showRegion(region, focusBuilding) {
    const s = save(), map = ctx.getMap();
    const open = isRegionUnlocked(s, region.id);
    const p = place(region);
    const thumb = layout?.regions?.[region.id] && !region.map?.pin ? `${ART}region-${region.id}.webp` : (region.bg || "assets/bg/village.webp");
    let body = "";
    if (open) {
      const rows = (region.buildings || []).map((b) => {
        const lv = lvOf(b.id), max = maxOf(b);
        const done = lv >= max;
        const ok = needOk(b);
        const cost = nextCost(b);
        const pips = Array.from({ length: max }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("");
        const bt = layout?.regions?.[region.id]?.buildings?.[b.id] && !region.map?.pin ? `${ART}thumb-${b.id}.webp` : thumb;
        const action = done
          ? `<span class="wm-done" aria-label="修好了"></span>`
          : `<button type="button" class="wm-btn green small" data-repair="${b.id}" ${ok && canPay(cost) ? "" : "disabled"} title="${b.desc || b.name}">
               <img class="ico" src="${ICON.hammer}" alt="">${ok ? costChips(cost) || "修復" : `<img class="ico" src="${ICON.lock}" alt="">`}
             </button>`;
        return `<li class="wm-bldg${done ? " done" : ""}${focusBuilding === b.id ? " focus" : ""}" data-b="${b.id}" title="${b.desc || ""}">
            <span class="wm-bthumb${done ? "" : " faded"}"><img src="${bt}" alt=""></span>
            <span class="wm-binfo"><b>${b.name}</b><span class="wm-pips">${pips}</span></span>
            ${action}
          </li>`;
      }).join("");
      const here = s.region === region.id;
      body = `<ul class="wm-bldgs">${rows}</ul>
        <button type="button" class="wm-btn ${here ? "yellow" : "green"} wide" data-enter><img class="ico" src="${ICON.board}" alt="">${here ? "回到棋盤" : "來這裡玩"}</button>`;
    } else {
      const blocked = regionUnlockBlocked(map, s, region);
      body = `<div class="wm-price">${costChips(region.unlock)}</div>
        ${blocked ? `<p class="wm-why">${blocked}</p>` : ""}
        <button type="button" class="wm-btn green wide" data-unlock ${blocked ? "disabled" : ""}><img class="ico" src="${ICON.lock}" alt="">打開</button>`;
    }
    sheet.innerHTML = `
      <button type="button" class="wm-x" data-close aria-label="關閉"><img src="${ICON.close}" alt=""></button>
      <header class="wm-head${open ? "" : " locked"}">
        <span class="wm-thumb"><img src="${thumb}" alt=""></span>
        <span class="wm-title"><b>${region.name}</b><small>${region.subtitle || ""}</small></span>
      </header>${body}`;
    sheet.hidden = false;
    sheet.classList.remove("in"); void sheet.offsetWidth; sheet.classList.add("in");
    openSheet = region.id;
    sheet.querySelector("[data-close]").addEventListener("click", () => { sfx.tap?.(); closeSheet(); });
    sheet.querySelector("[data-enter]")?.addEventListener("click", () => { closeSheet(); mapApi.enterRegion(region); });
    sheet.querySelector("[data-unlock]")?.addEventListener("click", () => unlock(region));
    sheet.querySelectorAll("[data-repair]").forEach((btn) => btn.addEventListener("click", () => repair(region, btn.dataset.repair)));
    const fb = focusBuilding && (region.buildings || []).find((b) => b.id === focusBuilding);
    const r = fb ? buildingRect(region, fb, region.buildings.indexOf(fb)).rect : p.rect;
    padB = sheet.offsetHeight + 28;
    const bias = Math.max(0.2, (vh - padB) / 2 / vh + 0.03);
    flyTo(r[0] + r[2] / 2, r[1] + r[3] / 2, Math.max(cam.s, Math.min(cam.max, cam.home * (fb ? 1.5 : 1.1))), 480, bias);
  }

  function closeSheet() {
    const was = openSheet;
    openSheet = null; padB = 0;
    sheet.classList.remove("in");
    sheet.hidden = true;
    if (was && built && vw) glide({ x: 0, y: 0 });
  }

  /* ---------- repair: boards fly off, colour comes back ---------- */
  function repair(region, bid) {
    const b = (region.buildings || []).find((x) => x.id === bid);
    if (!b || busy) return;
    const before = lvOf(bid);
    mapApi.restoreBuilding(b, region);
    const after = lvOf(bid);
    if (after <= before) return;
    const { rect } = buildingRect(region, b, region.buildings.indexOf(b));
    const full = after >= maxOf(b);
    const old = layers.ruins.querySelector(`.wm-ruin[data-b="${bid}"]`);
    paint();
    if (old) {
      const ghost = old.cloneNode();
      ghost.classList.add("mend");
      layers.fx.appendChild(ghost);
      setTimeout(() => ghost.remove(), 950);
    }
    burst(rect[0] + rect[2] / 2, rect[1] + rect[3] / 2, Math.max(rect[2], rect[3]), full ? 14 : 8, true);
    if (openSheet === region.id) showRegion(region, bid);
  }

  /* ---------- unlock: clouds roll away, then the rules run ---------- */
  function unlock(region) {
    if (busy) return;
    const blocked = regionUnlockBlocked(ctx.getMap(), save(), region);
    if (blocked) { sfx.invalid?.(); toast(blocked); return; }
    busy = true;
    closeSheet();
    const p = place(region), [x, y, w, h] = p.rect;
    flyTo(x + w / 2, y + h / 2, Math.min(cam.max, cam.home * 1.15), 420).then(() => {
      sfx.daily?.();
      layers.clouds.querySelector(`.wm-cloudset[data-region="${region.id}"]`)?.classList.add("parting");
      layers.pins.querySelector(`.wm-pin.locked[data-id="${region.id}"]`)?.classList.add("gone");
      burst(x + w / 2, y + h / 2, Math.max(w, h) * 1.1, 16, false);
      setTimeout(() => {
        busy = false;
        mapApi.askUnlock(region);
        $("#region-buy")?.classList.remove("on");
        mapApi.confirmUnlockRegion();
        if ($("#map")?.classList.contains("on")) paint();
      }, 1500);
    });
  }

  function burst(x, y, size, n, dust) {
    const fx = document.createElement("div");
    fx.className = "wm-burst";
    fx.style.cssText = `left:${x}px;top:${y}px;--size:${size}px`;
    let html = '<b class="ring"></b><b class="glow"></b>';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3, d = size * (0.42 + (i % 3) * 0.14);
      html += `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d * 0.8}px;--d:${(i % 4) * 60}ms;--c:${["#FFD54A", "#fff", "#FF8FB3", "#6BB9F2"][i % 4]}"></i>`;
    }
    if (dust) for (let i = 0; i < 4; i++) html += `<u style="--dx:${(i - 1.5) * size * 0.3}px;--d:${i * 70}ms"></u>`;
    fx.innerHTML = html;
    layers.fx.appendChild(fx);
    setTimeout(() => fx.remove(), 1800);
  }

  /* ---------- entry ---------- */
  async function render() {
    if (!layout) {
      try { layout = await (await fetch(ART + "layout.json?v=25")).json(); } catch { layout = { regions: {}, spare: [] }; }
      if (layout.size) [W, H] = layout.size;
      if (layout.cloud) CLOUD_RATIO = layout.cloud[1] / layout.cloud[0];
    }
    if (!built) build();
    closeSheet();
    measure();
    paint();
    const cur = regions().find((r) => r.id === save().region) || regions()[0];
    const p = cur ? place(cur) : { rect: [0, 0, W, H] };
    cam.s = cam.home;
    cam.x = vw / 2 - (p.rect[0] + p.rect[2] / 2) * cam.s;
    cam.y = vh / 2 - (p.rect[1] + p.rect[3] / 2) * cam.s;
    clamp(); apply();
  }

  return { render, paint, showRegion, flyTo, camera: () => ({ ...cam }) };
}
