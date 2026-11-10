/** Story scenes: big portraits, matching expressions, typewriter + mouth, filled stage. */

import { avatarSrc, portraitSrc, bindImgFallback, normId } from "./portraits.js?v=11";

let queue = [], idx = 0, doneFn = null;
let typing = false, typed = "", full = "", typeTimer = 0, mouthTimer = 0, talking = false;
let ctxRef = null;

const SPEED = 32;

function $(s, r = document) { return (ctxRef?.$ || ((x) => document.querySelector(x)))(s, r); }

function reduced() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

export function startStory(lines, done) {
  queue = lines || [];
  idx = 0;
  doneFn = done;
  talking = false;
  if (!queue.length) { done?.(); return; }
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
  const wash = "linear-gradient(180deg,rgba(8,12,16,.04),rgba(8,12,16,.10) 62%,rgba(8,12,16,.42))";
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
      hold.appendChild(fig);
      if (isSpeaker) {
        fig.style.left = "50%";
        fig.style.transform = "translateX(-50%)";
        if (prevSpeaker !== speaker && !reduced()) fig.classList.add("enter");
      } else {
        const others = cast.filter((x) => x !== speaker);
        const side = others.indexOf(id) % 2 === 0 ? "right" : "left";
        fig.dataset.side = side;
        if (side === "left") {
          fig.style.left = "14%";
          fig.style.transform = "translateX(-50%)";
        } else {
          fig.style.left = "86%";
          fig.style.transform = "translateX(-50%)";
        }
      }
    }
  }
  full = line.text || "";
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
  idx += 1;
  if (idx >= queue.length) {
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
}

export { avatarSrc };
