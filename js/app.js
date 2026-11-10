import { Auth } from "./auth.js";
import { loadSave, writeSave, emptySave, syncCloud } from "./save.js";
import { unlockAudio, sfx, setMuted, isMuted } from "./audio.js";
import { createBattle } from "./battle.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const PORTRAITS = {
  mascot: "assets/mascot/wish.png",
  feifei: "assets/chars/feifei.png",
  apiao: "assets/chars/apiao.png",
  sika: "assets/chars/sika.png",
  jiejie: "assets/chars/jiejie.png",
  spirit: "assets/chars/spirit.png"
};

let GAME = {}, SAVE = loadSave(), stages = [], battle;
let storyQueue = [], storyIdx = 0, storyDone = null;
let pendingRewards = null;

async function fetchJSON(url) {
  const res = await fetch(url + "?v=" + Date.now());
  if (!res.ok) throw new Error("讀不到 " + url);
  return res.json();
}

export async function boot() {
  GAME = await fetchJSON("data/game.json");
  const cat = await fetchJSON("data/stages/index.json");
  stages = [];
  for (const id of cat.stages) {
    stages.push(await fetchJSON(`data/stages/${id}.json`));
  }
  window.__GAME = {
    save: () => SAVE, stages, game: GAME,
    open: show, win: () => battle?.winNow(),
    give: (n) => { SAVE.starSeeds += n; persist(); refreshHud(); }
  };
  bind();
  if (!SAVE.profile) show("profile");
  else show("title");
  refreshHud();
}

function persist() { writeSave(SAVE); syncCloud(SAVE); }

function show(name) {
  $$(".screen,.overlay").forEach((el) => el.classList.remove("on"));
  const el = document.getElementById(name);
  if (el) el.classList.add("on");
  if (name === "map") renderMap();
  if (name === "book") renderBook();
  if (name === "redeem") renderRedeem();
  if (name === "lyrics") renderLyrics();
  refreshHud();
}

function bind() {
  document.addEventListener("pointerdown", () => unlockAudio(), { once: true });

  $("#nick-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const profile = await Auth.signInLocal($("#nick").value);
      SAVE.profile = profile;
      persist();
      sfx.tap();
      show("title");
    } catch (err) { alert(err.message); }
  });

  $("#btn-start")?.addEventListener("click", () => { sfx.tap(); show("map"); });
  $("#btn-book")?.addEventListener("click", () => { sfx.tap(); show("book"); });
  $("#btn-redeem")?.addEventListener("click", () => { sfx.tap(); show("redeem"); });
  $("#btn-lyrics")?.addEventListener("click", () => { sfx.tap(); show("lyrics"); });
  $("#btn-howto")?.addEventListener("click", () => { sfx.tap(); show("howto"); });
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => { sfx.tap(); show(b.dataset.back); }));

  $("#btn-story-next")?.addEventListener("click", nextStory);
  $("#btn-story-skip")?.addEventListener("click", () => { storyIdx = storyQueue.length; nextStory(); });

  $("#btn-mute")?.addEventListener("click", () => {
    setMuted(!isMuted());
    $("#btn-mute").textContent = isMuted() ? "聲音關" : "聲音開";
  });

  // pads
  const hold = (id, key) => {
    const el = $(id);
    if (!el) return;
    const on = (v) => (e) => { e.preventDefault(); if (battle) battle.input[key] = v; };
    el.addEventListener("pointerdown", on(true));
    el.addEventListener("pointerup", on(false));
    el.addEventListener("pointerleave", on(false));
  };
  hold("#pad-left", "left");
  hold("#pad-right", "right");
  hold("#pad-jump", "jump");
  hold("#pad-star", "fire");

  window.addEventListener("keydown", (e) => {
    if (!battle || !$("#battle").classList.contains("on")) {
      if (e.key === "Enter" && $("#story").classList.contains("on")) nextStory();
      return;
    }
    if (["ArrowLeft", "a", "A"].includes(e.key)) battle.input.left = true;
    if (["ArrowRight", "d", "D"].includes(e.key)) battle.input.right = true;
    if (["ArrowUp", "w", "W", " "].includes(e.key)) { battle.input.jump = true; if (e.key === " ") e.preventDefault(); }
    if (["j", "J", "z", "Z", "Enter", "k", "K"].includes(e.key)) battle.input.fire = true;
  });
  window.addEventListener("keyup", (e) => {
    if (!battle) return;
    if (["ArrowLeft", "a", "A"].includes(e.key)) battle.input.left = false;
    if (["ArrowRight", "d", "D"].includes(e.key)) battle.input.right = false;
    if (["ArrowUp", "w", "W", " "].includes(e.key)) battle.input.jump = false;
    if (["j", "J", "z", "Z", "Enter", "k", "K"].includes(e.key)) battle.input.fire = false;
  });

  $("#btn-retry")?.addEventListener("click", () => {
    $("#fail").classList.remove("on");
    const st = stages.find((s) => s.id === $("#battle").dataset.stage);
    startBattle(st);
  });
  $("#btn-fail-map")?.addEventListener("click", () => { battle?.stop(); show("map"); });
  $("#btn-result-ok")?.addEventListener("click", afterResult);

  $("#btn-pause")?.addEventListener("click", () => {
    battle?.stop();
    if (confirm("要先回地圖嗎？現在離開不會存過關。")) show("map");
    else {
      const st = stages.find((s) => s.id === $("#battle").dataset.stage);
      startBattle(st);
    }
  });
}

function refreshHud() {
  const name = SAVE.profile?.nickname || "小朋友";
  $$("[data-nick]").forEach((el) => { el.textContent = name; });
  $$("[data-level]").forEach((el) => { el.textContent = "Lv." + SAVE.level; });
  $$("[data-seeds]").forEach((el) => { el.textContent = SAVE.starSeeds; });
  const curve = GAME.xpCurve || [0, 40, 100];
  const lo = curve[SAVE.level - 1] ?? 0;
  const hi = curve[SAVE.level] ?? (lo + 100);
  const pct = Math.max(0, Math.min(1, (SAVE.xp - lo) / Math.max(1, hi - lo)));
  $$("[data-xp]").forEach((el) => { el.style.width = (pct * 100) + "%"; });
}

function isUnlocked(st) {
  const u = st.unlock || { type: "start" };
  if (u.type === "start") return true;
  if (u.type === "stageCleared") return !!SAVE.stagesCleared[u.stageId];
  return false;
}

function renderMap() {
  const box = $("#nodes");
  box.innerHTML = "";
  const thumbs = ["assets/mascot/front.png", "assets/fx/bag.png", "assets/items/cupcake.png"];
  stages.forEach((st, i) => {
    const locked = !isUnlocked(st);
    const cleared = !!SAVE.stagesCleared[st.id];
    const btn = document.createElement("button");
    btn.className = "node" + (locked ? " locked" : "");
    btn.innerHTML = `
      <img class="thumb" src="${thumbs[i] || "assets/mascot/front.png"}" alt="">
      <div>
        <div class="num">第 ${st.number} 關　${st.mapLabel || ""}</div>
        <h3>${st.title}${cleared ? "　✓" : ""}</h3>
        <small>${locked ? "先完成前面的關卡" : st.subtitle}</small>
      </div>`;
    if (!locked) btn.addEventListener("click", () => { sfx.tap(); openStage(st); });
    box.appendChild(btn);
  });
  const soon = document.createElement("div");
  soon.className = "node soon";
  soon.innerHTML = `
    <img class="thumb" src="assets/mascot/sleep.png" alt="">
    <div>
      <div class="num">即將到來<span class="soon-mark">每週更新</span></div>
      <h3>新關卡製作中</h3>
      <small>下一回：怕黑的布魯，還有最後一願送給哈特。</small>
    </div>`;
  box.appendChild(soon);
}

function openStage(st) {
  storyQueue = st.intro || [];
  storyIdx = 0;
  storyDone = () => startBattle(st);
  show("story");
  renderStory();
}

function renderStory() {
  const line = storyQueue[Math.min(storyIdx, storyQueue.length - 1)];
  if (!line) return;
  $("#bubble-who").textContent = line.speaker || "";
  $("#bubble-tx").textContent = line.text || "";
  const hold = $("#portraits");
  hold.innerHTML = "";
  const src = PORTRAITS[line.portrait] || PORTRAITS.mascot;
  const img = new Image();
  img.src = src;
  img.alt = line.speaker || "";
  hold.appendChild(img);
  // companion mascot if not speaking as mascot
  if (line.portrait && line.portrait !== "mascot") {
    const m = new Image();
    m.src = "assets/mascot/front.png";
    m.alt = "眠花糖";
    m.className = "dim";
    hold.appendChild(m);
  }
}

function nextStory() {
  sfx.tap();
  storyIdx += 1;
  if (storyIdx >= storyQueue.length) {
    const fn = storyDone; storyDone = null;
    fn?.();
  } else renderStory();
}

function startBattle(st) {
  show("battle");
  $("#battle").dataset.stage = st.id;
  $("#obj").textContent = st.battle.objective || st.subtitle;
  const cv = $("#game");
  if (!battle) {
    battle = createBattle(cv, {
      onHp(hp, max) { renderHearts(hp, max); },
      onSeed() {},
      onEnd(res) { onBattleEnd(st, res); }
    });
  }
  renderHearts(st.battle.playerHp, st.battle.playerHp);
  battle.start(st);
  battle.resize();
  requestAnimationFrame(() => battle.resize());
}

function renderHearts(hp, max) {
  const el = $("#hearts");
  el.innerHTML = "";
  for (let i = 0; i < max; i++) {
    const iel = document.createElement("i");
    iel.textContent = "✦";
    if (i < hp) iel.className = "on";
    el.appendChild(iel);
  }
}

function rollTreasure() {
  const rates = GAME.dropRates;
  const r = Math.random();
  let acc = 0, rarity = "common";
  for (const d of rates) {
    acc += d.rate;
    if (r <= acc) { rarity = d.rarity; break; }
  }
  const pool = GAME.items.filter((it) => it.rarity === rarity);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function addXp(n) {
  const before = SAVE.level;
  SAVE.xp += n;
  const curve = GAME.xpCurve || [0, 40, 100];
  let lv = 1;
  for (let i = 1; i < curve.length; i++) {
    if (SAVE.xp >= curve[i]) lv = i + 1;
  }
  // if beyond last
  if (SAVE.xp >= curve[curve.length - 1]) {
    const extra = Math.floor((SAVE.xp - curve[curve.length - 1]) / 200);
    lv = curve.length + extra;
  }
  SAVE.level = Math.max(SAVE.level, lv);
  return SAVE.level > before;
}

function onBattleEnd(st, res) {
  if (!res.win) {
    $("#fail").classList.add("on");
    return;
  }
  const first = !SAVE.stagesCleared[st.id];
  SAVE.stagesCleared[st.id] = { at: Date.now(), first };
  const rw = st.battle.rewards || { xp: 40, starSeeds: [3, 5] };
  const seeds = (rw.starSeeds[0] + Math.floor(Math.random() * (rw.starSeeds[1] - rw.starSeeds[0] + 1))) + (res.seedsGot || 0);
  const xp = rw.xp + (first ? 10 : 0);
  const leveled = addXp(xp);
  SAVE.starSeeds += seeds;
  // 1-2 treasures
  const drops = [];
  const n = first ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const it = rollTreasure();
    if (it) {
      SAVE.treasures[it.id] = (SAVE.treasures[it.id] || 0) + 1;
      drops.push(it);
    }
  }
  persist();
  pendingRewards = { st, seeds, xp, leveled, drops, first };
  renderResult();
}

function renderResult() {
  const r = pendingRewards;
  const box = $("#result");
  box.classList.add("on");
  $("#result-title").textContent = r.first ? "過關了！" : "再一次完成！";
  $("#result-sub").textContent = `${r.st.title}　＋${r.xp} 經驗　＋${r.seeds} 顆星星種子`;
  const lv = $("#result-lv");
  if (r.leveled) {
    lv.style.display = "";
    lv.textContent = `升級了！現在是 Lv.${SAVE.level}`;
    sfx.level();
  } else lv.style.display = "none";
  const g = $("#result-drops");
  g.innerHTML = "";
  // seeds
  const seed = document.createElement("div");
  seed.className = "drop";
  seed.innerHTML = `<img src="assets/items/star-seed.png" alt=""><b>星星種子 ×${r.seeds}</b><div class="r">收集</div>`;
  g.appendChild(seed);
  const rateMap = Object.fromEntries((GAME.dropRates || []).map((d) => [d.rarity, d]));
  for (const it of r.drops) {
    const d = document.createElement("div");
    d.className = "drop";
    const meta = rateMap[it.rarity] || {};
    d.innerHTML = `<img src="${it.img}" alt=""><b>${it.name}</b><div class="r" style="color:${meta.color || ""}">${meta.label || it.rarity}　${Math.round((meta.rate || 0) * 100)}%</div>`;
    g.appendChild(d);
  }
}

function afterResult() {
  $("#result").classList.remove("on");
  const r = pendingRewards;
  pendingRewards = null;
  const st = r?.st;
  if (st?.outro?.length) {
    storyQueue = st.outro;
    storyIdx = 0;
    storyDone = () => {
      if (st.endingNote) showEnding();
      else show("map");
    };
    show("story");
    renderStory();
  } else if (st?.endingNote) showEnding();
  else show("map");
}

function showEnding() {
  show("lyrics");
  const note = $("#ending-note");
  if (note) note.style.display = "";
}

function renderBook() {
  const rates = $("#rates");
  rates.innerHTML = (GAME.dropRates || []).map((d) =>
    `<span style="color:${d.color}">${d.label} ${Math.round(d.rate * 100)}%</span>`
  ).join("");
  const g = $("#grid");
  g.innerHTML = "";
  for (const it of GAME.items) {
    const have = SAVE.treasures[it.id] || 0;
    const meta = (GAME.dropRates || []).find((d) => d.rarity === it.rarity);
    const el = document.createElement("div");
    el.className = "card" + (have ? "" : " locked");
    el.innerHTML = `<img src="${it.img}" alt=""><div class="name">${have ? it.name : "？？？"}</div>
      <div class="r" style="color:${meta?.color || ""};font-size:11px;font-weight:700">${meta?.label || ""}　${have ? "×" + have : ""}</div>`;
    g.appendChild(el);
  }
}

function renderRedeem() {
  $("#redeem-count").textContent = SAVE.starSeeds;
}

function renderLyrics() {
  const L = GAME.lyrics;
  $("#lyrics-title").textContent = "〈" + L.title + "〉";
  $("#lyrics-credit").textContent = `詞｜${L.lyricist}　曲｜${L.composer}`;
  $("#lyrics-src").innerHTML = `來源：<a href="${L.sourceUrl}" target="_blank" rel="noopener">${L.source}</a>`;
  $("#lyrics-lines").innerHTML = L.lines.map((l) => `<p>${l}</p>`).join("");
  const note = $("#ending-note");
  if (note && !pendingRewards) {
    // keep visible if coming from stage 3 path — afterResult sets display
  }
}

boot().catch((err) => {
  console.error(err);
  document.body.innerHTML = "<p style='padding:40px;font-family:sans-serif'>遊戲載入失敗，請重新整理。</p>";
});
