/** Story scenes: big portraits, matching expressions, typewriter + mouth, filled stage. */

import { avatarSrc, portraitSrc, bindImgFallback, normId, applyCastMetrics, metricsFor } from "./portraits.js?v=mobile1";

let queue = [], idx = 0, doneFn = null;
let typing = false, typed = "", full = "", typeTimer = 0, mouthTimer = 0, talking = false;
let ctxRef = null;

const SPEED = 32;


/** Strip stage directions like （跳一跳。） from displayed story text. Keep spoken remainder. */
export function displayLine(text) {
  let t = String(text || "");
  const isAction = (part) => {
    const s = String(part || "").trim();
    if (!s) return true;
    const spoken = /喔|吧|呢|呀|啊|我們|你|妳|謝謝|願意|可以合|會變成|疊在一起/;
    const action = /^(跳|點頭|指向|指指|用耳朵|小心探頭|探頭|把茶壺|把.+推到|拉著|跳得很高|揮手|鞠躬|笑了笑)/;
    if (spoken.test(s)) return false;
    if (action.test(s)) return true;
    // short parenthetical physical beats with no addressee
    if (s.length <= 18 && /點了點|縮回來|推到|看著|指指|跳一跳/.test(s) && !spoken.test(s)) return true;
    return false;
  };
  t = t.replace(/[（(]([^）)]*)[）)]/g, (_, inner) => {
    const parts = String(inner).split(/(?<=[。！!？?])/);
    return parts.filter((part) => !isAction(part)).join("");
  });
  return t.replace(/[ 	]+/g, " ").replace(/^[。、，,]+/, "").trim();
}

function visibleIndex(from, dir = 1) {
  for (let i = from; i >= 0 && i < queue.length; i += dir) {
    if (displayLine(queue[i]?.text || "")) return i;
  }
  return -1;
}


function $(s, r = document) { return (ctxRef?.$ || ((x) => document.querySelector(x)))(s, r); }

function reduced() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

export function startStory(lines, done) {
  queue = lines || [];
  doneFn = done;
  talking = false;
  idx = visibleIndex(0, 1);
  if (idx < 0) { done?.(); return; }
  ctxRef?.show?.("story");
  applyBg();
  render();
}

function cssBgUrl(raw) {
  let bg = String(raw || "").trim();
  if (!bg || bg === "none") bg = "assets/bg/village.webp";
  const m = bg.match(/^url\(\s*["']?(.+?)["']?\s*\)$/i);
  const inner = (m ? m[1] : bg).trim();
  if (/^https?:|^data:|^blob:/i.test(inner)) return 'url("' + inner + '")';
  try { return 'url("' + new URL(inner, document.baseURI).href + '")'; }
  catch { return 'url("' + inner + '")'; }
}
function applyBg() {
  let bg = cssBgUrl(ctxRef?.chapterBg?.() || getComputedStyle(document.documentElement).getPropertyValue("--chapter-bg") || "");
  const el = $("#story");
  if (!el) return;
  el.style.setProperty("--story-bg", bg);
  const wash = "linear-gradient(180deg,rgba(255,252,246,.0),rgba(255,252,246,.04) 58%,rgba(40,28,16,.16))";
  el.style.backgroundImage = wash + ", " + bg;
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  el.style.backgroundColor = "#fbfcf6";
}

function sceneCast() {
  const seen = [];
  for (const line of queue) {
    const id = normId(line.portrait || "mascot");
    if (!seen.includes(id)) seen.push(id);
  }
  return seen;
}

const GAP = 16;
const MARGIN = 6;
const PARTNER_MUL = 0.88;
let layoutTimer = 0;

function scaleOf(fig) {
  const raw = parseFloat(fig.style.getPropertyValue("--scale"));
  if (Number.isFinite(raw) && raw > 0) return raw;
  return visualFallback(fig);
}

function setScale(fig, scale) {
  fig.style.setProperty("--scale", scale + "px");
}

function figMet(fig) {
  const img = fig.querySelector("img");
  if (!img) return null;
  const src = img.getAttribute("src") || img.src;
  const m = metricsFor(fig.dataset.id, src);
  const scale = scaleOf(fig);
  if (!scale) return null;
  return {
    fig, m, scale,
    cL: m.contentL * scale,
    cR: m.contentR * scale,
    cW: (m.contentR - m.contentL) * scale,
    fL: m.faceL * scale,
    fR: m.faceR * scale,
    fW: (m.faceR - m.faceL) * scale,
    minLeft: (m.contentR - m.faceL) * scale,
    minRight: (m.faceR - m.contentL) * scale
  };
}

function actorBoxes(fig) {
  const img = fig.querySelector("img");
  if (!img) return null;
  const src = img.getAttribute("src") || img.currentSrc || img.src;
  const m = metricsFor(fig.dataset.id, src);
  const r = img.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const scale = r.height / m.h;
  const left = r.left;
  return {
    fig, img, m, scale,
    content: { l: left + m.contentL * scale, r: left + m.contentR * scale, t: r.top + (m.bboxTop ?? 0) * scale, b: r.top + m.feet * scale },
    face: { l: left + m.faceL * scale, r: left + m.faceR * scale, t: r.top + m.headTop * scale, b: r.top + m.chin * scale },
    contentW: (m.contentR - m.contentL) * scale,
    faceW: (m.faceR - m.faceL) * scale,
    imgLeft: left,
    contentL: m.contentL * scale,
    contentR: m.contentR * scale,
    faceL: m.faceL * scale,
    faceR: m.faceR * scale
  };
}

/** Story screen box in viewport coordinates. #portraits may be narrower (e.g. 640px stage on iPad). */
function frameBox() {
  const story = document.querySelector("#story");
  const r = story ? story.getBoundingClientRect() : { left: 0, width: window.innerWidth };
  return { x0: r.left, vw: r.width };
}

function setFigLeft(fig, viewportX) {
  const hold = fig.parentElement;
  const origin = hold ? hold.getBoundingClientRect().left : 0;
  fig.style.setProperty("left", Math.round(viewportX - origin) + "px", "important");
  fig.style.setProperty("right", "auto", "important");
  fig.style.setProperty("transform", "none", "important");
}

function overlapsPx(a, b, pad = 0) {
  return a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad;
}

function placeSpeaker(fig, contentCenterX) {
  const met = figMet(fig);
  if (!met) return;
  setFigLeft(fig, contentCenterX - (met.cL + met.cW / 2));
}

function visualFallback(fig) {
  const img = fig.querySelector("img");
  return img && fig.style.getPropertyValue("--img-h")
    ? (img.getBoundingClientRect().height / parseFloat(fig.style.getPropertyValue("--img-h") || "1"))
    : 1;
}

/** Place a partner against the outer edge, cropping only the outer side. `inner` is the content edge toward the speaker. */
function placePartner(fig, side, inner, x0, vw) {
  const met = figMet(fig);
  if (!met) return false;
  const { cL, cR, cW, fL, fR } = met;
  const leftEdge = x0 + MARGIN;
  const rightEdge = x0 + vw - MARGIN;
  let figLeft;
  if (side === "left") {
    const avail = inner - leftEdge;
    if (avail < 24) return false;
    figLeft = (cW <= avail + 0.5) ? (leftEdge - cL) : (inner - cR);
  } else {
    const avail = rightEdge - inner;
    if (avail < 24) return false;
    figLeft = (cW <= avail + 0.5) ? (rightEdge - cR) : (inner - cL);
  }
  const faceL = figLeft + fL, faceR = figLeft + fR;
  const contentL = figLeft + cL, contentR = figLeft + cR;
  if (faceL < leftEdge - 0.5 || faceR > rightEdge + 0.5) return false;
  if (side === "left" && contentR > inner + 0.5) return false;
  if (side === "right" && contentL < inner - 0.5) return false;
  setFigLeft(fig, figLeft);
  return true;
}

function tryLayout(speak, visible, x0, vw) {
  const sp = figMet(speak);
  if (!sp) return false;
  const left = visible.find((d) => d.dataset.side === "left");
  const right = visible.find((d) => d.dataset.side === "right");
  const L = left ? figMet(left) : null;
  const R = right ? figMet(right) : null;
  if ((left && !L) || (right && !R)) return false;
  const leftMin = L ? L.minLeft : 0;
  const rightMin = R ? R.minRight : 0;
  const gaps = (L ? GAP : 0) + (R ? GAP : 0);
  const needed = leftMin + rightMin + sp.cW + gaps + 2 * MARGIN;
  if (needed > vw + 0.5) return false;
  let leftover = vw - needed;
  let leftUse = leftMin, rightUse = rightMin;
  if (L) {
    const give = Math.min(Math.max(0, L.cW - leftMin), leftover);
    leftUse += give;
    leftover -= give;
  }
  if (R) {
    const give = Math.min(Math.max(0, R.cW - rightMin), leftover);
    rightUse += give;
    leftover -= give;
  }
  const midL = x0 + MARGIN + (L ? leftUse + GAP : 0);
  const midR = x0 + vw - MARGIN - (R ? rightUse + GAP : 0);
  const desired = x0 + vw / 2 - sp.cW / 2;
  const spL = Math.max(midL, Math.min(desired, midR - sp.cW));
  const placeAll = () => {
    placeSpeaker(speak, spL + sp.cW / 2);
    if (L && !placePartner(left, "left", midL - GAP, x0, vw)) return false;
    if (R && !placePartner(right, "right", midR + GAP, x0, vw)) return false;
    return true;
  };
  if (!placeAll()) return false;
  if (resolveOverlaps(speak, visible, x0, vw)) return true;
  // Planned slots already have a gap in metric space. Re-apply them and
  // accept the layout if every face is on screen (avoid false drops on iPad).
  if (!placeAll()) return false;
  void speak.offsetWidth;
  const leftEdge = x0 + MARGIN;
  const rightEdge = x0 + vw - MARGIN;
  for (const fig of visible) {
    const b = actorBoxes(fig);
    if (b && (b.face.l < leftEdge - 1 || b.face.r > rightEdge + 1)) return false;
  }
  return true;
}

function resolveOverlaps(speak, visible, x0, vw) {
  void speak.offsetWidth;
  const leftEdge = x0 + MARGIN;
  const rightEdge = x0 + vw - MARGIN;
  const shiftFig = (fig, delta) => {
    const img = fig.querySelector("img");
    if (!img) return;
    setFigLeft(fig, img.getBoundingClientRect().left + delta);
  };
  for (let pass = 0; pass < 6; pass++) {
    const s = actorBoxes(speak);
    if (!s) return false;
    let moved = false;
    for (const fig of visible) {
      const b = actorBoxes(fig);
      if (!b) return false;
      if (b.face.l < leftEdge - 1 || b.face.r > rightEdge + 1) return false;
      if (fig.dataset.side === "left") {
        const push = b.content.r + GAP - s.content.l;
        if (push > 0.5) {
          const roomR = rightEdge - s.content.r;
          const roomL = b.face.l - leftEdge;
          if (push <= roomR + 0.5) shiftFig(speak, push);
          else if (push <= roomL + roomR + 0.5) {
            shiftFig(fig, -(push - Math.max(0, roomR)));
            if (roomR > 0) shiftFig(speak, roomR);
          } else return false;
          moved = true;
        }
      } else if (fig.dataset.side === "right") {
        const push = s.content.r + GAP - b.content.l;
        if (push > 0.5) {
          const roomL = s.content.l - leftEdge;
          const roomR = rightEdge - b.face.r;
          if (push <= roomL + 0.5) shiftFig(speak, -push);
          else if (push <= roomL + roomR + 0.5) {
            shiftFig(fig, push - Math.max(0, roomL));
            if (roomL > 0) shiftFig(speak, -roomL);
          } else return false;
          moved = true;
        }
      }
    }
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = actorBoxes(visible[i]);
        const b = actorBoxes(visible[j]);
        if (!a || !b || overlapsPx(a.content, b.content, -1)) return false;
      }
    }
    if (!moved) {
      const s2 = actorBoxes(speak);
      for (const fig of visible) {
        const b = actorBoxes(fig);
        if (!b || !s2 || overlapsPx(b.content, s2.content, -1)) return false;
        if (b.face.l < leftEdge - 1 || b.face.r > rightEdge + 1) return false;
      }
      return true;
    }
  }
  return false;
}

function layoutCast(hold) {
  if (!hold) return;
  const speak = hold.querySelector(".story-actor.speak");
  const dims = [...hold.querySelectorAll(".story-actor.dim")];
  const { x0, vw } = frameBox();
  if (!speak) return;

  const show = (fig, on) => {
    fig.style.visibility = on ? "visible" : "hidden";
    fig.dataset.hidden = on ? "" : "1";
    if (!on) fig.dataset.side = fig.dataset.side || "";
  };

  const left0 = dims.find((d) => d.dataset.side === "left");
  const right0 = dims.find((d) => d.dataset.side === "right");
  const preferOne = (list) => {
    const human = list.find((d) => d.dataset.id !== "mascot");
    return human || list[0];
  };

  const bases = new Map();
  [speak, ...dims].forEach((fig) => bases.set(fig, scaleOf(fig)));

  const applyScales = (factor) => {
    bases.forEach((base, fig) => setScale(fig, base * factor));
  };

  const apply = (visible, factor) => {
    applyScales(factor);
    dims.forEach((d) => show(d, visible.includes(d)));
    const hasL = visible.some((d) => d.dataset.side === "left");
    const hasR = visible.some((d) => d.dataset.side === "right");
    hold.classList.toggle("has-left", hasL);
    hold.classList.toggle("has-right", hasR);
    return tryLayout(speak, visible, x0, vw);
  };

  const both = [left0, right0].filter(Boolean);
  // Prefer full 50vh scale. Only shrink (down to ~40vh) if a single partner still cannot fit.
  if (both.length === 2 && apply(both, 1)) return true;
  const ones = [];
  if (both.length >= 1) {
    const one = preferOne(both);
    ones.push(one);
    const other = both.find((d) => d !== one);
    if (other) ones.push(other);
    for (const fig of ones) {
      if (apply([fig], 1)) return true;
    }
  }
  for (const factor of [0.95, 0.9, 0.85, 0.8]) {
    for (const fig of ones) {
      if (apply([fig], factor)) return true;
    }
  }
  applyScales(1);
  apply([], 1);
  placeSpeaker(speak, x0 + vw / 2);
  hold.classList.remove("has-left", "has-right");
  return false;
}

function scheduleLayout(hold) {
  clearTimeout(layoutTimer);
  const run = () => layoutCast(hold || document.querySelector("#portraits"));
  const el = hold || document.querySelector("#portraits");
  const imgs = el ? [...el.querySelectorAll("img")] : [];
  Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()))).then(() => {
    requestAnimationFrame(() => requestAnimationFrame(run));
  });
  layoutTimer = setTimeout(run, 50);
  setTimeout(run, 220);
}


function render() {
  const line = queue[Math.min(idx, queue.length - 1)];
  if (!line) return;
  const hold = $("#portraits");
  const who = $("#bubble-who");
  const tx = $("#bubble-tx");
  if (who) who.textContent = line.speaker || "";
  const speaker = normId(line.portrait || "mascot");
  const expr = line.expr || line.face || "happy";
  const cast = sceneCast();
  const prevSpeaker = hold?.dataset.speaker;
  if (hold) {
    hold.innerHTML = "";
    hold.dataset.speaker = speaker;
    for (const id of cast) {
      const fig = document.createElement("div");
      const isSpeaker = id === speaker;
      fig.className = "story-actor" + (isSpeaker ? " speak" : " dim") + (id === "mascot" ? " mascot" : "");
      fig.dataset.id = id;
      const img = document.createElement("img");
      img.alt = isSpeaker ? (line.speaker || "") : "";
      img.draggable = false;
      img.src = portraitSrc(id, isSpeaker ? expr : "happy", false);
      bindImgFallback(img, id, isSpeaker ? expr : "happy", "full");
      img.dataset.base = img.src;
      fig.appendChild(img);
      applyCastMetrics(fig, id, img.getAttribute("src") || img.src);
      hold.appendChild(fig);
      if (isSpeaker) {
        if (prevSpeaker !== speaker && !reduced()) fig.classList.add("enter");
      } else {
        const others = cast.filter((x) => x !== speaker);
        const side = others.indexOf(id) === 1 ? "right" : "left";
        fig.dataset.side = side;
      }
    }
    const dims = [...hold.querySelectorAll(".story-actor.dim")];
    hold.classList.toggle("has-left", dims.some((d) => d.dataset.side === "left"));
    hold.classList.toggle("has-right", dims.some((d) => d.dataset.side === "right"));
    scheduleLayout(hold);
  }
  full = displayLine(line.text || "");
  typed = "";
  if (tx) tx.textContent = "";
  startTypewriter(expr);
}

function startTypewriter(expr) {
  clearInterval(typeTimer);
  clearInterval(mouthTimer);
  const tx = $("#bubble-tx");
  typing = true;
  talking = true;
  let i = 0;
  if (reduced()) {
    typed = full;
    if (tx) tx.textContent = full;
    typing = false;
    talking = false;
    setMouth(false, expr);
    return;
  }
  setMouth(true, expr);
  typeTimer = setInterval(() => {
    i += 1;
    typed = full.slice(0, i);
    if (tx) tx.textContent = typed;
    if (i >= full.length) {
      clearInterval(typeTimer);
      typing = false;
      talking = false;
      setMouth(false, expr);
    }
  }, SPEED);
  let open = false;
  mouthTimer = setInterval(() => {
    if (!typing) { clearInterval(mouthTimer); setMouth(false, expr); return; }
    open = !open;
    setMouth(open, expr);
  }, 140);
}

function setMouth(open, expr) {
  const speak = document.querySelector("#portraits .story-actor.speak img");
  if (!speak) return;
  const id = speak.parentElement?.dataset.id;
  const src = portraitSrc(id, expr, open);
  if (speak.src.endsWith(src.split("/").pop()) && open) return;
  const prev = speak.src;
  speak.src = src;
  bindImgFallback(speak, id, expr, "full");
  applyCastMetrics(speak.parentElement, id, src);
  scheduleLayout(speak.parentElement?.parentElement);
  // if open file missing, fallback keeps closed; that's ok
}

export function nextStory() {
  if (typing) {
    clearInterval(typeTimer);
    clearInterval(mouthTimer);
    typing = false;
    talking = false;
    typed = full;
    const tx = $("#bubble-tx");
    if (tx) tx.textContent = full;
    const line = queue[idx];
    setMouth(false, line?.expr || "happy");
    return;
  }
  ctxRef?.sfx?.tap?.();
  idx = visibleIndex(idx + 1, 1);
  if (idx < 0) {
    const fn = doneFn; doneFn = null;
    ctxRef?.show?.("play");
    fn?.();
  } else render();
}

export function skipStory() {
  clearInterval(typeTimer);
  clearInterval(mouthTimer);
  typing = false;
  const fn = doneFn; doneFn = null;
  idx = queue.length;
  ctxRef?.show?.("play");
  fn?.();
}

export function bindStory(ctx) {
  ctxRef = ctx;
  ctx.startStory = startStory;
  $("#btn-story-next")?.addEventListener("click", nextStory);
  $("#btn-story-skip")?.addEventListener("click", () => { ctx.sfx?.tap?.(); skipStory(); });
  $("#story")?.addEventListener("click", (e) => {
    if (e.target.closest("#btn-story-skip")) return;
    nextStory();
  });
  window.addEventListener("resize", () => scheduleLayout(document.querySelector("#portraits")));
}

export { avatarSrc };
