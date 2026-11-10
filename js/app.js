import { Auth } from "./auth.js";
import { loadSave, writeSave, syncCloud, tickEnergy, nextEnergyIn, todayKey, ENERGY, configureEnergy } from "./save.js";
import { unlockAudio, playMusic, stopMusic, playClearTheme, sfx, setAudioSettings, getAudioSettings } from "./audio.js";
import { mountMascot } from "./mascot.js";
import {
  starterBoard, canMerge, mergeCells, produceFrom, keyOf,
  itemDef, genDef, maxTier, makeProceduralOrder, NPCS_BY_CHAPTER, xpLevel, makeUid, idx,
  remapBoard, nearbyEmpty, fillOrderSlots, endlessRegion
} from "./merge.js";
import { attachSystems, GEN_POPS, GEN_COOL_MS } from "./systems.js";
import { regionById, isCellOpen, allBuildings } from "./world.js";
import { BOARD_COLS, BOARD_ROWS, fitBoardCell, migrateToFixedBoard } from "./board-layout.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let GAME, CHAINS, GENS, CHAPTERS, STORY, MAP;
let SAVE = loadSave();
let mascot;
let dragging = null;
let combo = { n: 0, at: 0 };
let pendingStory = null;
let energyTimer;
let selectedUid = null;
let systems;

let COLS = 7, ROWS = 9;
const CHAPTER_END = {
  village: "ch1-end",
  journey: "ch2-end",
  candy: "ch3-end",
  bulu: "ch4-end",
  hate: "ch5-end",
  ending: "ch6-end"
};
const CHAPTER_NEXT = {
  village: "journey",
  journey: "candy",
  candy: "bulu",
  bulu: "hate",
  hate: "ending"
};

async function fetchJSON(url) {
  const res = await fetch(url + "?v=7");
  if (!res.ok) throw new Error("讀不到 " + url);
  return res.json();
}

export async function boot() {
  [GAME, CHAINS, CHAPTERS, STORY, MAP] = await Promise.all([
    fetchJSON("data/game.json"),
    fetchJSON("data/chains.json"),
    fetchJSON("data/chapters.json"),
    fetchJSON("data/story-orders.json"),
    fetchJSON("data/map.json")
  ]);
  GENS = CHAINS.generators;
  CHAINS = CHAINS.chains;
  CHAPTERS = CHAPTERS.chapters;
  STORY = STORY.orders;
  configureEnergy(GAME.energy);
  tickEnergy(SAVE);
  if (!SAVE.unlockedRegions) SAVE.unlockedRegions = ["village"];
  if (!SAVE.region) SAVE.region = "village";
  if (!SAVE.board) {
    if (!SAVE.unlockedClumps) SAVE.unlockedClumps = ["start"];
  } else if (!SAVE.unlockedClumps) {
    SAVE.unlockedClumps = ["all"];
  }
  migrateToFixedBoard(SAVE, { remapBoard, starterBoard });
  COLS = BOARD_COLS;
  ROWS = BOARD_ROWS;
  if (!SAVE.settings) SAVE.settings = { music: true, sfx: true };
  setAudioSettings(SAVE.settings);
  for (const cell of (SAVE.board || []).concat(SAVE.inventory || [])) {
    if (cell) discover(cell, { silent: true });
  }
  unlockGenerators();
  ensureOrders();
  persist();
  systems = attachSystems(systemCtx());
  bind();
  mascot = mountMascot($("#mascot-root"));
  window.__GAME = { save: () => SAVE, giveEnergy, completeTopOrder, show, refresh };
  if (!SAVE.profile) show("profile");
  else { show("title"); }
  refresh();
  energyTimer = setInterval(() => { tickEnergy(SAVE); refreshHud(); systems?.fog.tickCool?.(); }, 1000);
}

function persist() { tickEnergy(SAVE); if (GENS && SAVE.board) unlockGenerators(); writeSave(SAVE); syncCloud(SAVE); }

function show(name) {
  $$(".screen,.overlay").forEach((el) => el.classList.remove("on"));
  const el = document.getElementById(name);
  if (el) el.classList.add("on");
  if (name === "play") {
    applyChapterLook();
    playMusic(SAVE.chapter);
    mascot?.wake?.();
    requestAnimationFrame(() => {
      applyBoardLayout();
      renderBoard();
      renderOrders();
    });
  } else if (name === "title") {
    playMusic("village");
  } else if (name === "book") renderBook();
  else if (name === "redeem") $("#redeem-count").textContent = SAVE.starSeeds;
  else if (name === "lyrics") renderLyrics();
  else if (name === "settings") renderSettings();
  else if (name === "map") renderMap();
  else if (name === "daily") renderDaily();
  refreshHud();
  if (name === "play" && !$("#result").classList.contains("on")) maybeFirstIntro();
}

function chapter() { return CHAPTERS.find((c) => c.id === SAVE.chapter) || CHAPTERS[0]; }

function applyChapterLook() {
  const ch = chapter();
  const region = regionById(MAP, SAVE.region) || null;
  const play = $("#play");
  const bgPath = region?.bg || ch.bg;
  const bg = new URL(bgPath, document.baseURI).href;
  play.style.backgroundImage = `linear-gradient(180deg, rgba(251,252,246,.35), rgba(251,252,246,.55) 60%, var(--cream)), url("${bg}")`;
  play.style.setProperty("--chapter-bg", `url("${bg}")`);
  play.dataset.chapterId = ch.id;
  play.dataset.regionId = SAVE.region || ch.id;
  const sceneBg = $(".scene-bg");
  if (sceneBg) sceneBg.style.backgroundImage = `url("${bg}")`;
  $$("[data-chapter]").forEach((el) => { el.textContent = region?.name || ch.title; });
}

function bind() {
  document.addEventListener("pointerdown", () => unlockAudio(), { once: true });

  $("#nick-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const profile = await Auth.signInLocal($("#nick").value);
      SAVE.profile = profile;
      persist(); sfx.tap(); show("title");
    } catch (err) { toast(err.message); }
  });

  $("#btn-play")?.addEventListener("click", () => { sfx.tap(); show("play"); maybeFirstIntro(); });
  $("#btn-book")?.addEventListener("click", () => { sfx.tap(); show("book"); });
  $("#btn-redeem")?.addEventListener("click", () => { sfx.tap(); show("redeem"); });
  $("#btn-lyrics")?.addEventListener("click", () => { sfx.tap(); show("lyrics"); });
  $("#btn-howto")?.addEventListener("click", () => { sfx.tap(); show("howto"); });
  $("#btn-settings")?.addEventListener("click", () => { sfx.tap(); show("settings"); });
  $("#btn-map")?.addEventListener("click", () => { sfx.tap(); show("map"); });
  $("#btn-daily")?.addEventListener("click", () => { sfx.tap(); show("daily"); });
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => { sfx.tap(); show(b.dataset.back); }));

  $("#btn-story-next")?.addEventListener("click", nextStory);
  $("#btn-story-skip")?.addEventListener("click", () => { storyIdx = storyQueue.length; nextStory(); });

  $("#name-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("#name-edit").value.trim().slice(0, 12);
    if (!n) return toast("請輸入名稱");
    SAVE.profile = { ...(SAVE.profile || {}), nickname: n };
    persist(); refreshHud(); toast("名稱已更新"); sfx.tap();
  });
  $("#tog-music")?.addEventListener("change", (e) => {
    SAVE.settings.music = e.target.checked; setAudioSettings(SAVE.settings); persist();
    if (e.target.checked) playMusic(SAVE.chapter); else stopMusic();
  });
  $("#tog-sfx")?.addEventListener("change", (e) => {
    SAVE.settings.sfx = e.target.checked; setAudioSettings(SAVE.settings); persist();
  });

  $("#btn-claim-daily")?.addEventListener("click", claimDaily);
  $("#btn-result-ok")?.addEventListener("click", () => {
    $("#result").classList.remove("on");
    if (pendingAfterClear) { const fn = pendingAfterClear; pendingAfterClear = null; fn(); }
    else { playMusic(SAVE.chapter); show("play"); }
  });
  systems?.bind();

  $("#play").addEventListener("pointerdown", onBoardDown);
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragUp);
  window.addEventListener("pointercancel", onDragUp);

  let resizeT = 0;
  const onWinResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if ($("#play")?.classList.contains("on")) applyBoardLayout();
    }, 120);
  };
  window.addEventListener("resize", onWinResize);
  window.addEventListener("orientationchange", onWinResize);
  const box = $(".scene") || $(".play-main");
  if (box && window.ResizeObserver) {
    new ResizeObserver(onWinResize).observe(box);
  }
}

function refresh() { refreshHud(); if ($("#play")?.classList.contains("on")) { renderBoard(); renderOrders(); } }

function refreshHud() {
  tickEnergy(SAVE);
  const name = SAVE.profile?.nickname || "小朋友";
  $$("[data-nick]").forEach((el) => { el.textContent = name; });
  $$("[data-level]").forEach((el) => { el.textContent = "Lv." + SAVE.level; });
  $$("[data-seeds]").forEach((el) => { el.textContent = SAVE.starSeeds; });
  $$("[data-coins]").forEach((el) => { el.textContent = SAVE.coins || 0; });
  $$("[data-energy]").forEach((el) => { el.textContent = SAVE.energy; });
  $$("[data-energy-max]").forEach((el) => { el.textContent = ENERGY.max; });
  const wait = nextEnergyIn(SAVE);
  $$("[data-energy-in]").forEach((el) => {
    if (SAVE.energy >= ENERGY.max) el.textContent = "已滿";
    else {
      const s = Math.ceil(wait / 1000);
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }
  });
  const curve = GAME.xpCurve || [0, 40, 100];
  const lo = curve[Math.min(SAVE.level, curve.length) - 1] ?? 0;
  const hi = curve[SAVE.level] ?? (lo + 100);
  const pct = Math.max(0, Math.min(1, (SAVE.xp - lo) / Math.max(1, hi - lo)));
  $$("[data-xp]").forEach((el) => { el.style.width = (pct * 100) + "%"; });
  const ch = chapter();
  $$(".chapter-chip [data-chapter]").forEach((el) => { el.textContent = ch.title; });
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(t._id);
  t._id = setTimeout(() => t.classList.remove("on"), 1800);
}


/* ---------- fixed 7×9 board; only the cell size scales ---------- */
function measureBoardBox() {
  const scene = $(".scene") || $(".play-main");
  if (!scene) return { w: 360, h: 400 };
  return { w: Math.max(120, scene.clientWidth - 8), h: Math.max(120, scene.clientHeight - 8) };
}

function applyBoardLayout() {
  const box = measureBoardBox();
  const picked = fitBoardCell(box.w, box.h);
  COLS = BOARD_COLS;
  ROWS = BOARD_ROWS;
  const frame = $(".play-frame") || $("#play");
  if (frame) {
    const fw = (frame.clientWidth || box.w) - 24;
    const invCell = Math.max(40, Math.min(64, Math.floor((fw - 6 * 7) / 8)));
    frame.style.setProperty("--inv-cell", invCell + "px");
  }
  const board = $("#board");
  if (board) {
    board.style.setProperty("--cols", String(COLS));
    board.style.setProperty("--rows", String(ROWS));
    board.style.setProperty("--cell", picked.cell + "px");
    board.style.setProperty("--gap", picked.gap + "px");
    board.style.setProperty("--pad", picked.pad + "px");
  }
  const need = !SAVE.board || SAVE.board.length !== COLS * ROWS || SAVE.boardCols !== COLS || SAVE.boardRows !== ROWS;
  if (need) {
    migrateToFixedBoard(SAVE, { remapBoard, starterBoard });
    persist();
    renderBoard();
  }
  return picked;
}

/* ---------- board render & drag ---------- */
function cellAt(r, c) { return SAVE.board[idx(COLS, r, c)]; }

function renderBoard() {
  const board = $("#board");
  if (!board) return;
  board.style.setProperty("--cols", COLS);
  board.style.setProperty("--rows", ROWS);
  board.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const slot = document.createElement("div");
      slot.className = "cell";
      slot.dataset.r = r; slot.dataset.c = c;
      const item = cellAt(r, c);
      if (item) slot.appendChild(makePiece(item));
      systems?.fog.decorateCell(slot, r, c, item);
      board.appendChild(slot);
    }
  }
  renderInventory();
  const sel = selectedUid && findCellByUid(selectedUid);
  systems?.fx.showInfo(sel ? sel.item : null);
}

function itemRarity(item) {
  if (item.kind === "gen") return item.tier >= 3 ? "legendary" : item.tier >= 2 ? "rare" : "common";
  return itemDef(CHAINS, item.chain, item.tier)?.rarity || "common";
}
function makePiece(item) {
  const el = document.createElement("button");
  el.type = "button";
  const rarity = itemRarity(item);
  el.className = "piece" + (item.kind === "gen" ? " gen" : "") + " r-" + rarity;
  el.dataset.uid = item.uid;
  el.dataset.rarity = rarity;
  const img = infoImg(item);
  const name = infoName(item);
  el.innerHTML = `<img src="${img}" alt="${name}" draggable="false"><span class="sr">${name}</span>`;
  el.title = name;
  return el;
}

function infoImg(item) {
  if (item.kind === "gen") return genDef(GENS, item.gen, item.tier)?.img || "";
  return itemDef(CHAINS, item.chain, item.tier)?.img || "";
}
function infoName(item) {
  if (item.kind === "gen") {
    const g = GENS[item.gen];
    return `${g?.name || ""} Lv.${item.tier}`;
  }
  return itemDef(CHAINS, item.chain, item.tier)?.name || "";
}

function findCellByUid(uid) {
  const i = SAVE.board.findIndex((c) => c && c.uid === uid);
  if (i >= 0) return { where: "board", i, item: SAVE.board[i] };
  const j = SAVE.inventory.findIndex((c) => c && c.uid === uid);
  if (j >= 0) return { where: "inv", i: j, item: SAVE.inventory[j] };
  return null;
}

function onBoardDown(e) {
  const locked = e.target.closest(".cell.locked");
  if (locked && !e.target.closest(".piece")) { systems?.fog.onLockedTap(locked); return; }
  const piece = e.target.closest(".piece");
  if (!piece) return;
  const loc = findCellByUid(piece.dataset.uid);
  if (!loc) return;
  const start = { x: e.clientX, y: e.clientY, t: Date.now() };
  dragging = { loc, piece, start, moved: false, ghost: null, pointerId: e.pointerId };
}

function onDragMove(e) {
  if (!dragging) return;
  const dx = e.clientX - dragging.start.x, dy = e.clientY - dragging.start.y;
  if (!dragging.moved && Math.hypot(dx, dy) < 10) return;
  if (!dragging.moved) {
    dragging.moved = true;
    const ghost = dragging.piece.cloneNode(true);
    ghost.classList.add("ghost");
    document.body.appendChild(ghost);
    dragging.ghost = ghost;
    dragging.piece.classList.add("lifted");
    sfx.pickup();
    try { dragging.piece.setPointerCapture?.(dragging.pointerId); } catch {}
  }
  if (dragging.ghost) {
    dragging.ghost.style.left = e.clientX + "px";
    dragging.ghost.style.top = e.clientY + "px";
  }
  highlightDrop(e);
}

function highlightDrop(e) {
  $$(".cell.hot,.order.hot").forEach((el) => el.classList.remove("hot"));
  const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".cell, .order");
  if (!cell || !dragging) return;
  const item = dragging.loc.item;
  if (cell.classList.contains("order")) {
    const od = SAVE.orders.find((o) => o.id === cell.dataset.id);
    if (od && item.kind === "item" && item.chain === od.need.chain && item.tier === od.need.tier) cell.classList.add("hot");
  } else {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (cell.classList.contains("locked") || (systems && !systems.fog.canDropAt(r, c))) return;
    const dest = cellAt(r, c);
    if (!dest || canMerge(item, dest, CHAINS, GENS)) cell.classList.add("hot");
  }
}

function onDragUp(e) {
  if (!dragging) return;
  const d = dragging; dragging = null;
  $$(".cell.hot,.order.hot").forEach((el) => el.classList.remove("hot"));
  d.piece.classList.remove("lifted");
  d.ghost?.remove();
  if (e.type === "pointercancel") return;
  if (!d.moved) { onTap(d.loc); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".cell, .order");
  if (!el) { sfx.drop(); return; }
  if (el.classList.contains("order")) {
    tryFulfill(d.loc, el.dataset.id);
    return;
  }
  if (el.classList.contains("inv-cell") || el.dataset.inv !== undefined) {
    moveToInventory(d.loc, el.dataset.inv === undefined ? -1 : +el.dataset.inv);
    return;
  }
  const r = +el.dataset.r, c = +el.dataset.c;
  moveOrMerge(d.loc, r, c);
}

function validLocation(loc) {
  return loc && (loc.where === "board" ? SAVE.board : SAVE.inventory)[loc.i] === loc.item;
}

function moveToInventory(loc, slot) {
  if (!validLocation(loc)) return;
  const cap = SAVE.magicBag.capacity;
  const src = loc.item;
  if (loc.where === "inv") {
    if (slot < 0 || slot === loc.i) return;
    const dest = SAVE.inventory[slot];
    if (!dest) {
      removeFrom(loc);
      // may have shifted
      while (SAVE.inventory.length < slot) SAVE.inventory.push(null);
      // after remove, indices shift if loc.i < slot
      const at = loc.i < slot ? slot - 1 : slot;
      SAVE.inventory.splice(at, 0, src);
      SAVE.inventory = SAVE.inventory.filter(Boolean);
    } else if (canMerge(src, dest, CHAINS, GENS)) {
      const merged = mergeCells(src, dest, CHAINS, GENS);
      SAVE.inventory[slot] = merged;
      removeFrom(loc);
      onMerged(merged);
    } else {
      // swap
      SAVE.inventory[loc.i] = dest;
      SAVE.inventory[slot] = src;
    }
    sfx.drop(); persist(); renderBoard();
    return;
  }
  if (SAVE.inventory.filter(Boolean).length >= cap) {
    sfx.invalid(); toast("背包滿了"); return;
  }
  removeFrom(loc);
  SAVE.inventory = SAVE.inventory.filter(Boolean);
  if (slot >= 0 && slot <= SAVE.inventory.length) SAVE.inventory.splice(slot, 0, src);
  else SAVE.inventory.push(src);
  SAVE.inventory = SAVE.inventory.filter(Boolean);
  sfx.drop(); persist(); renderBoard();
}

function removeFrom(loc) {
  if (loc.where === "board") SAVE.board[loc.i] = null;
  else SAVE.inventory.splice(loc.i, 1);
}

function onTap(loc) {
  const item = loc.item;
  selectedUid = item.uid;
  systems?.fx.showInfo(item);
  sfx.tap();
  if (item.kind === "gen") { tapGenerator(loc); return; }
  renderBoard();
}

function tapGenerator(loc) {
  tickEnergy(SAVE);
  const gen = loc.item;
  if (gen.coolUntil && gen.coolUntil > Date.now()) {
    const s = Math.ceil((gen.coolUntil - Date.now()) / 1000);
    sfx.invalid();
    toast(`產生器還在休息（${s} 秒）`);
    return;
  }
  if (SAVE.energy < 1) {
    sfx.energy();
    mascot?.sad();
    const s = Math.ceil(nextEnergyIn(SAVE) / 1000);
    toast(`能量還在回來的路上（${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}）`);
    return;
  }
  const origin = loc.where === "board" ? loc.i : -1;
  let empty = nearbyEmpty(SAVE.board, COLS, ROWS, origin, systems?.fog.isOpenIndex);
  let toInv = false;
  if (empty < 0) {
    if (SAVE.inventory.length >= SAVE.magicBag.capacity) {
      toast("棋盤和背包都滿了，先合一些吧");
      sfx.invalid();
      return;
    }
    toInv = true;
  }
  const made = produceFrom(gen, GENS);
  if (!made) return;
  SAVE.energy -= 1;
  if (SAVE.energy === ENERGY.max - 1) SAVE.energyAt = Date.now();
  gen.pops = (gen.pops || 0) + 1;
  if (gen.pops >= GEN_POPS) { gen.pops = 0; gen.coolUntil = Date.now() + GEN_COOL_MS; }
  if (toInv) SAVE.inventory.push(made);
  else SAVE.board[empty] = made;
  discover(made);
  sfx.generate();
  persist();
  renderBoard();
  refreshHud();
  systems?.fx.popAt(made.uid);
}

function moveOrMerge(loc, r, c) {
  if (!validLocation(loc)) return;
  if (systems && !systems.fog.canDropAt(r, c)) { sfx.invalid(); toast("這一格還沒揭開"); return; }
  const destI = idx(COLS, r, c);
  const src = loc.item;
  const dest = SAVE.board[destI];
  // same cell
  if (loc.where === "board" && loc.i === destI) return;
  if (!dest) {
    removeFrom(loc);
    SAVE.board[destI] = src;
    sfx.drop();
    persist(); renderBoard();
    return;
  }
  if (canMerge(src, dest, CHAINS, GENS)) {
    const merged = mergeCells(src, dest, CHAINS, GENS);
    removeFrom(loc);
    SAVE.board[destI] = merged;
    onMerged(merged);
    persist(); renderBoard();
    return;
  }
  // swap
  if (loc.where === "board") {
    SAVE.board[loc.i] = dest;
    SAVE.board[destI] = src;
    sfx.drop();
    persist(); renderBoard();
    return;
  }
  sfx.invalid();
  toast("這裡放不下，找相同的合在一起吧");
}

function onMerged(merged) {
  const now = Date.now();
  if (now - combo.at < 2200) combo.n += 1; else combo.n = 1;
  combo.at = now;
  SAVE.comboBest = Math.max(SAVE.comboBest || 0, combo.n);
  const tier = merged.tier || 1;
  sfx.merge(tier);
  if (combo.n >= 2) { sfx.combo(combo.n); floatCombo(combo.n); }
  mascot?.merge(tier);
  systems?.fx.popAt(merged.uid);
  discover(merged);
  if (tier >= 5) shake(10);
  else if (combo.n >= 3) shake(6);
  // first-discover gift
}

function discover(cell, opts = {}) {
  const k = keyOf(cell);
  if (!k || SAVE.discovered[k]) return;
  SAVE.discovered[k] = Date.now();
  if (cell.kind === "item") {
    const def = itemDef(CHAINS, cell.chain, cell.tier);
    if (def) {
      SAVE.treasures[defNameId(def)] = (SAVE.treasures[defNameId(def)] || 0) + 1;
      if (!opts.silent) {
        SAVE.starSeeds += 1;
        systems?.fx.showDiscover(cell);
      }
    }
  }
}

function defNameId(def) {
  // map back to collection item ids when possible
  const map = {
    "小星星貼紙": "star-white", "黃花貼紙": "flower-yellow", "藍花貼紙": "flower-blue",
    "小樹叢": "bush", "紅蘿蔔": "carrot", "微笑杯子蛋糕": "cupcake", "西卡的糖果盒": "candy",
    "紅蘑菇": "mushroom-red", "藍蘑菇": "mushroom-blue", "梅花撲克牌": "card-club",
    "黑桃撲克牌": "card-spade", "愛心撲克牌": "card-heart", "藍藍天藥水": "potion-blue",
    "勇氣藥水": "potion-red", "紫緞帶禮帽": "hat-purple", "魔術高帽": "hat",
    "下午茶杯子": "teacup", "星星茶壺": "teapot", "神祕魔法袋": "bag", "白玫瑰": "rose-white",
    "藍玫瑰": "rose-blue"
  };
  return map[def.name] || def.name;
}

function shake(n) {
  const play = $("#play");
  play.classList.add("shake");
  play.style.setProperty("--shake", n + "px");
  setTimeout(() => play.classList.remove("shake"), 400);
}

function floatCombo(n) {
  const el = document.createElement("div");
  el.className = "combo-float";
  el.textContent = n >= 4 ? `超讚連擊 ×${n}` : `連擊 ×${n}`;
  $("#play").appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function renderInventory() {
  if (systems?.shop) systems.shop.renderInventory();
}

/* ---------- orders ---------- */
function storyCompleted(order) {
  return SAVE.storyDone.includes(order.flag || order.id) || SAVE.storyDone.includes(order.id);
}
function mainComplete() { return STORY.every(storyCompleted); }
function currentRegion() { return endlessRegion(SAVE.endless.completed, GAME.orders); }
function hasStoryFlag(flag) {
  return SAVE.storyDone.includes(flag) || STORY.some(o => o.flag === flag && storyCompleted(o));
}
function availableChains() {
  return [...new Set(Object.values(GENS).filter(g => hasGen(g.id)).map(g => g.produces))];
}
function chapterUnlocked(id) {
  if (id === "village") return true;
  if (id === "journey") return SAVE.storyDone.includes("ch1-end") || SAVE.storyDone.includes("v5");
  if (id === "candy") return SAVE.storyDone.includes("ch2-end") || SAVE.storyDone.includes("j5");
  if (id === "bulu") return SAVE.storyDone.includes("ch3-end") || SAVE.storyDone.includes("c5");
  if (id === "hate") return SAVE.storyDone.includes("ch4-end");
  if (id === "ending") return SAVE.storyDone.includes("ch5-end");
  return false;
}

function chapterOpenForStory(id, flag) {
  const end = CHAPTER_END[id];
  if (!end) return chapterUnlocked(id);
  if (SAVE.storyDone.includes(end) && flag !== end) return false;
  return chapterUnlocked(id);
}

function nextStoryOrder() {
  return STORY.find((o) => !SAVE.storyDone.includes(o.flag) && !SAVE.storyDone.includes(o.id) && chapterOpenForStory(o.chapter, o.flag));
}

function ensureOrders() {
  const available = availableChains();
  SAVE.orders = (SAVE.orders || []).filter(o => o?.procedural && o.need && o.reward && itemDef(CHAINS, o.need.chain, o.need.tier) && available.includes(o.need.chain));
  fillOrderSlots(SAVE, GAME.board?.orders || 3, {
    chains: CHAINS,
    chapter: SAVE.chapter,
    discovered: SAVE.discovered,
    npcsByChapter: NPCS_BY_CHAPTER,
    seq: SAVE.orderSeq++,
    availableChains: available,
    region: mainComplete() ? currentRegion() : 0,
    balance: GAME.orders,
    nextStory: () => {
      const story = nextStoryOrder();
      return story ? { ...story, reward: { ...story.reward, coins: story.reward.coins ?? (5 + story.need.tier * 5) } } : null;
    }
  });
}

function hasGen(id) {
  return SAVE.board.some((c) => c && c.kind === "gen" && c.gen === id)
    || SAVE.inventory.some((c) => c && c.kind === "gen" && c.gen === id);
}

function grantGen(id, tier = 1) {
  if (hasGen(id)) return false;
  const empty = systems
    ? nearbyEmpty(SAVE.board, COLS, ROWS, -1, systems.fog.isOpenIndex)
    : nearbyEmpty(SAVE.board, COLS, ROWS, -1, i => isCellOpen(SAVE, Math.floor(i / COLS), i % COLS, COLS, ROWS));
  const cell = { kind: "gen", gen: id, tier, uid: makeUid() };
  if (empty >= 0) SAVE.board[empty] = cell;
  else if (SAVE.inventory.length < SAVE.magicBag.capacity) SAVE.inventory.push(cell);
  else return false;
  toast(`新的產生器：${GENS[id]?.name || id}`);
  return true;
}

function unlockGenerators() {
  const repaired = allBuildings(MAP).flatMap(b => (b.unlocks || []).slice(0, SAVE.buildings[b.id] || 0));
  for (const gen of Object.values(GENS)) {
    if (repaired.includes(gen.id) || SAVE.map.unlockedGenerators.includes(gen.id) || gen.unlock === 'start' || (gen.unlock?.startsWith('story:') && hasStoryFlag(gen.unlock.slice(6)))) grantGen(gen.id);
  }
}

function renderOrders() {
  if (systems?.orders) systems.orders.renderOrders();
}

function tryFulfill(loc, orderId) {
  if (!validLocation(loc)) return;
  const o = SAVE.orders.find((x) => x.id === orderId);
  const item = loc.item;
  if (!o || item.kind !== "item" || item.chain !== o.need.chain || item.tier !== o.need.tier) {
    sfx.invalid(); toast("這不是訂單要的東西"); return;
  }
  removeFrom(loc);
  SAVE.orders = SAVE.orders.filter((x) => x.id !== orderId);
  SAVE.ordersDone = (SAVE.ordersDone || 0) + 1;
  if (o.procedural && mainComplete()) SAVE.endless.completed += 1;
  SAVE.starSeeds += o.reward.seeds || 0;
  SAVE.coins = (SAVE.coins || 0) + (o.reward.coins ?? ((o.reward.seeds || 0) + 4));
  systems?.orders.bumpDaily();
  const before = SAVE.level;
  SAVE.xp += o.reward.xp || 0;
  SAVE.level = xpLevel(SAVE.xp, GAME.xpCurve || [0, 40, 100]);
  if (o.reward.energy) SAVE.energy = Math.min(ENERGY.max, SAVE.energy + o.reward.energy);
  if (o.flag) SAVE.storyDone.push(o.flag);
  if (o.restore) {
    const ch = o.chapter || SAVE.chapter;
    SAVE.restore[ch] = (SAVE.restore[ch] || 0) + o.restore;
  }
  sfx.order();
  mascot?.order();
  const leveled = SAVE.level > before;
  const chapterClear = Object.values(CHAPTER_END).includes(o.flag);
  if (chapterClear && CHAPTER_NEXT[o.chapter]) SAVE.chapter = CHAPTER_NEXT[o.chapter];
  unlockGenerators();
  ensureOrders();
  persist();
  renderBoard(); renderOrders(); refreshHud();
  const after = () => {
    if (o.outro) startStory(o.outro, () => {
      if (chapterClear || leveled) showClear({ chapterClear, leveled, o });
      else { playMusic(SAVE.chapter); applyChapterLook(); maybeStoryIntro(); }
    });
    else if (chapterClear || leveled) showClear({ chapterClear, leveled, o });
    else maybeStoryIntro();
  };
  after();
}

let storyQueue = [], storyIdx = 0, storyDoneFn = null;
let pendingAfterClear = null;

function maybeFirstIntro() { maybeStoryIntro(); }

function maybeStoryIntro() {
  const o = (SAVE.orders || []).find((x) => x.intro && !SAVE.flags["seen-intro-" + x.id]);
  if (!o) return false;
  if (o.id === "v1" && SAVE.flags.seenOpen && !SAVE.flags["seen-intro-v1"]) {
    SAVE.flags["seen-intro-v1"] = true;
    persist();
    return maybeStoryIntro();
  }
  SAVE.flags["seen-intro-" + o.id] = true;
  if (o.id === "v1") SAVE.flags.seenOpen = true;
  persist();
  startStory(o.intro, () => show("play"));
  return true;
}

function startStory(lines, done) {
  storyQueue = lines || [];
  storyIdx = 0;
  storyDoneFn = done;
  if (!storyQueue.length) { done?.(); return; }
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
  const map = { mascot: "assets/mascot/wish.png", feifei: "assets/chars/feifei.png", apiao: "assets/chars/apiao.png", sika: "assets/chars/sika.png", jiejie: "assets/chars/jiejie.png", spirit: "assets/chars/spirit.png", bulu: "assets/chars/bulu.png", hate: "assets/chars/hate.png" };
  const src = map[line.portrait] || map.mascot;
  const img = new Image(); img.src = src; img.alt = line.speaker || "";
  hold.appendChild(img);
  if (line.portrait && line.portrait !== "mascot") {
    const m = new Image(); m.src = "assets/mascot/front.png"; m.alt = "眠花糖"; m.className = "dim";
    hold.appendChild(m);
  }
}

function nextStory() {
  sfx.tap();
  storyIdx += 1;
  if (storyIdx >= storyQueue.length) {
    const fn = storyDoneFn; storyDoneFn = null;
    show("play"); fn?.();
  } else renderStory();
}

function showClear({ chapterClear, leveled, o }) {
  const box = $("#result");
  box.classList.add("on");
  $("#result-title").textContent = chapterClear ? "這一章，完成了！" : (leveled ? "升級了！" : "訂單完成！");
  $("#result-sub").textContent = chapterClear
    ? `${chapter().title}　跟著歌詞，一起飛向藍藍天`
    : `現在是 Lv.${SAVE.level}　星星種子 ${SAVE.starSeeds}`;
  const lv = $("#result-lv");
  if (leveled) { lv.style.display = ""; lv.textContent = `冒險者 ${SAVE.profile?.nickname || ""}　Lv.${SAVE.level}`; sfx.level(); }
  else lv.style.display = "none";
  const lyricsBox = $("#result-lyrics");
  if (chapterClear) {
    lyricsBox.style.display = "";
    lyricsBox.innerHTML = (GAME.lyrics.endingLines || []).map((l) => `<p>${l}</p>`).join("");
    pendingAfterClear = () => { playMusic(SAVE.chapter); applyChapterLook(); show("play"); maybeStoryIntro(); };
    playClearTheme().then(() => {});
  } else {
    lyricsBox.style.display = "none";
    pendingAfterClear = () => { playMusic(SAVE.chapter); show("play"); maybeStoryIntro(); };
  }
}

/* ---------- collection / map / daily / settings ---------- */
function renderBook() {
  const rates = $("#rates");
  rates.innerHTML = (GAME.dropRates || []).map((d) =>
    `<span style="color:${d.color}">${d.label} ${Math.round(d.rate * 100)}%</span>`
  ).join("");
  const g = $("#grid");
  g.innerHTML = "";
  for (const chain of Object.values(CHAINS)) {
    const h = document.createElement("h3");
    h.className = "chain-title";
    h.textContent = chain.name;
    g.appendChild(h);
    const row = document.createElement("div");
    row.className = "chain-row";
    for (const it of chain.items) {
      const have = SAVE.discovered[`${chain.id}:${it.tier}`];
      const el = document.createElement("div");
      el.className = "card" + (have ? "" : " locked");
      el.innerHTML = `<img src="${it.img}" alt=""><div class="name">${have ? it.name : "？？？"}</div>
        <div class="r" style="font-size:12px;font-weight:700">${have ? "Lv." + it.tier : ""}　${it.rarity === "common" ? "普通" : it.rarity === "rare" ? "稀有" : it.rarity === "epic" ? "史詩" : "傳說"}</div>`;
      row.appendChild(el);
    }
    g.appendChild(row);
  }
}

function renderMap() {
  if (systems?.map) systems.map.renderMap();
}

function renderDaily() {
  const today = todayKey();
  const claimed = SAVE.daily?.day === today && SAVE.daily.claimed;
  $("#daily-status").textContent = claimed ? "今天已經領過囉，明天再來。" : "今天的免費禮物在這裡，完全不用花錢。";
  $("#btn-claim-daily").disabled = claimed;
}

function claimDaily() {
  const today = todayKey();
  if (SAVE.daily?.day === today && SAVE.daily.claimed) return;
  // simple streak: if last day was yesterday +1 else reset to 1
  let st = 1;
  if (SAVE.daily?.day) {
    const prev = SAVE.daily.day;
    const d0 = new Date(today + "T00:00:00+08:00");
    const d1 = new Date(prev + "T00:00:00+08:00");
    if ((d0 - d1) === 86400000) st = (SAVE.daily.streak || 0) + 1;
  }
  const bonus = Math.min(5, st);
  const energy = (GAME.energy?.dailyGiftEnergy || 25) + bonus;
  const seeds = (GAME.energy?.dailyGiftSeeds || 8) + bonus;
  SAVE.energy = Math.min(ENERGY.max, SAVE.energy + energy);
  SAVE.starSeeds += seeds;
  SAVE.daily = { day: today, streak: st, claimed: true };
  persist(); sfx.daily(); mascot?.wish();
  toast(`領到 ${energy} 能量、${seeds} 顆星星種子（連續 ${st} 天）`);
  renderDaily(); refreshHud();
}

function renderSettings() {
  $("#name-edit").value = SAVE.profile?.nickname || "";
  $("#tog-music").checked = SAVE.settings?.music !== false;
  $("#tog-sfx").checked = SAVE.settings?.sfx !== false;
}

function renderLyrics() {
  const L = GAME.lyrics;
  $("#lyrics-title").textContent = "〈" + L.title + "〉";
  $("#lyrics-credit").textContent = `詞｜${L.lyricist}　曲｜${L.composer}`;
  $("#lyrics-src").innerHTML = `來源：<a href="${L.sourceUrl}" target="_blank" rel="noopener">${L.source}</a>`;
  $("#lyrics-lines").innerHTML = L.lines.map((l) => `<p>${l}</p>`).join("");
}


function systemCtx() {
  return {
    $, $$,
    getSave: () => SAVE,
    getGame: () => GAME,
    getMap: () => MAP,
    getChains: () => CHAINS,
    getCols: () => COLS,
    getRows: () => ROWS,
    getSelected: () => selectedUid,
    setSelected: (u) => { selectedUid = u; },
    persist, toast, sfx, show, refresh, refreshHud,
    startStory, applyChapterLook, playMusic,
    makePiece, infoName, infoImg, findCellByUid, removeFrom,
    tryFulfill: (loc, id) => tryFulfill(loc, id),
    grantGen: (id, tier) => grantGen(id, tier),
    xpLevel: (xp) => xpLevel(xp, GAME.xpCurve || [0, 40, 100]),
    makeUid, ENERGY, todayKey,
    itemDef: (chain, tier) => itemDef(CHAINS, chain, tier),
    maxTier: (chain) => maxTier(CHAINS, chain),
    get mascot() { return mascot; },
    showInfo: (item) => systems?.fx.showInfo(item)
  };
}

function giveEnergy(n) { SAVE.energy = Math.min(ENERGY.max, SAVE.energy + n); persist(); refreshHud(); }
function completeTopOrder() { /* debug */ }

boot().catch((err) => {
  console.error(err);
  document.body.innerHTML = "<p style='padding:40px;font-family:sans-serif'>遊戲載入失敗，請重新整理。</p>";
});
