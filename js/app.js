import { loadMapData } from "./map-adapter.js";
import { repairRegion, mapChapterOpen, expandBag } from "./map-loop.js";
import { buyOffer } from "./shop-logic.js";
import { arrangeFogBoard, isCellOpen, firstOpenEmpty } from "./board-loop.js";
import { recordOrder, claimChallenge, challengeState } from "./daily-challenge.js";
import { emitGameplay, renderRegionControls, renderShopControls, renderChallenge } from "./loop-ui.js";
import { Auth } from "./auth.js";
import { loadSave, writeSave, syncCloud, tickEnergy, nextEnergyIn, todayKey, ENERGY, configureEnergy } from "./save.js";
import { unlockAudio, playMusic, stopMusic, playClearTheme, sfx, setAudioSettings, getAudioSettings } from "./audio.js";
import { mountMascot } from "./mascot.js";
import {
  starterBoard, canMerge, mergeCells, keyOf,
  itemDef, genDef, maxTier, makeProceduralOrder, NPCS_BY_CHAPTER, makeUid, idx, generateItem, endlessRegion
} from "./merge.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let GAME, CHAINS, GENS, CHAPTERS, STORY, MAP;
let SAVE;
let mascot;
let dragging = null;
let selectedUid = null;
let combo = { n: 0, at: 0 };
let pendingStory = null;
let energyTimer;

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
  const res = await fetch(url + "?v=5");
  if (!res.ok) throw new Error("讀不到 " + url);
  return res.json();
}

export async function boot() {
  SAVE = loadSave();
  [GAME, CHAINS, CHAPTERS, STORY] = await Promise.all([
    fetchJSON("data/game.json"),
    fetchJSON("data/chains.json"),
    fetchJSON("data/chapters.json"),
    fetchJSON("data/story-orders.json")
  ]);
  MAP = await loadMapData(fetchJSON);
  GENS = CHAINS.generators;
  CHAINS = CHAINS.chains;
  CHAPTERS = CHAPTERS.chapters;
  STORY = STORY.orders;
  configureEnergy(GAME.energy);
  COLS = GAME.board?.cols || 7; ROWS = GAME.board?.rows || 6;
  tickEnergy(SAVE);
  COLS = SAVE.boardCols || COLS;
  ROWS = SAVE.boardRows || ROWS;
  if (!SAVE.board) {
    SAVE.board = starterBoard(COLS, ROWS);
    SAVE.boardCols = COLS;
    SAVE.boardRows = ROWS;
  }
  arrangeFogBoard(SAVE, COLS, ROWS);
  if (!SAVE.settings) SAVE.settings = { music: true, sfx: true };
  setAudioSettings(SAVE.settings);
  for (const cell of (SAVE.board || []).concat(SAVE.inventory || [])) {
    if (cell) discover(cell, { silent: true });
  }
  unlockGenerators();
  ensureOrders();
  persist();
  bind();
  mascot = mountMascot($("#mascot-root"));
  window.__GAME = { save: () => SAVE, giveEnergy, completeTopOrder, show, refresh, repair: repairMapRegion, buy: purchaseOffer, claimChallenge: collectChallenge };
  if (!SAVE.profile) show("profile");
  else { show("title"); }
  refresh();
  energyTimer = setInterval(() => { tickEnergy(SAVE); refreshHud(); refreshLoopTimers(); }, 1000);
}

function persist() {
  tickEnergy(SAVE);
  // Retry unlocked generators after merges/orders free a cell on a previously full board.
  if (GENS && SAVE.board) unlockGenerators();
  try { writeSave(SAVE); syncCloud(SAVE); }
  catch { toast("無法儲存進度，請確認瀏覽器允許儲存並保留此分頁"); }
}

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
  else if (name === "shop") renderShopControls($("#shop-offers"), SAVE, MAP, purchaseOffer);
  refreshHud();
  if (name === "play" && !$("#result").classList.contains("on")) maybeFirstIntro();
}

function chapter() { return CHAPTERS.find((c) => c.id === SAVE.chapter) || CHAPTERS[0]; }

function applyChapterLook() {
  const ch = chapter();
  const play = $("#play");
  const bg = new URL(ch.bg, document.baseURI).href;
  play.style.backgroundImage = `linear-gradient(180deg, rgba(251,252,246,.72), rgba(251,252,246,.88) 40%, var(--cream)), url("${bg}")`;
  play.dataset.chapterId = ch.id;
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
  $("#btn-map-play")?.addEventListener("click", () => show("map"));
  $("#btn-shop")?.addEventListener("click", () => show("shop"));
  $("#btn-bag-expand")?.addEventListener("click", () => {
    const result = expandBag(SAVE);
    if (result.error) return transactionError(result.error);
    persist(); renderInventory(); refreshHud(); emitGameplay("bag-expanded", { capacity: SAVE.magicBag.capacity });
  });
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

  $("#btn-sell")?.addEventListener("click", sellSelected);
  $("#btn-claim-daily")?.addEventListener("click", claimDaily);
  $("#btn-result-ok")?.addEventListener("click", () => {
    $("#result").classList.remove("on");
    if (pendingAfterClear) { const fn = pendingAfterClear; pendingAfterClear = null; fn(); }
    else { playMusic(SAVE.chapter); show("play"); }
  });
  $("#btn-bag-close")?.addEventListener("click", () => $("#inventory").classList.remove("open"));
  $("#btn-inv-toggle")?.addEventListener("click", () => $("#inventory").classList.toggle("open"));

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
  const main = $(".play-main");
  if (main && window.ResizeObserver) {
    new ResizeObserver(onWinResize).observe(main);
  }
}

function refresh() { refreshHud(); if ($("#play")?.classList.contains("on")) { renderBoard(); renderOrders(); } }

function refreshHud() {
  tickEnergy(SAVE);
  const name = SAVE.profile?.nickname || "小朋友";
  $$("[data-nick]").forEach((el) => { el.textContent = name; });
  $$("[data-level]").forEach((el) => { el.textContent = "Lv." + SAVE.level; });
  $$("[data-coins]").forEach((el) => { el.textContent = SAVE.coins; });
  $$("[data-seeds]").forEach((el) => { el.textContent = SAVE.starSeeds; });
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
  $$(".chapter-chip [data-chapter]").forEach((el) => { el.textContent = mainComplete() ? `探索區域 ${currentRegion()}` : ch.title; });
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(t._id);
  t._id = setTimeout(() => t.classList.remove("on"), 1800);
}


/* ---------- responsive board ---------- */
function pickBoardSize(availW, availH) {
  const gap = availW < 430 ? 4 : 6;
  const pad = availW < 430 ? 6 : 8;
  const minCell = 36, maxCell = 92;
  const aspect = availW / Math.max(1, availH);
  const preferred = aspect < 0.9
    ? [[7, 9], [8, 10], [7, 8], [8, 9], [7, 10], [6, 9], [8, 11], [6, 8]]
    : aspect > 1.2
      ? [[10, 7], [11, 7], [10, 8], [9, 7], [11, 8], [12, 7], [8, 6], [9, 6]]
      : [[8, 8], [8, 7], [7, 7], [9, 8], [8, 9], [9, 7], [7, 8]];
  const score = (cols, rows) => {
    const border = 8; // 3px border + a little slack
    const cell = Math.floor(Math.min(
      (availW - pad * 2 - gap * (cols - 1) - border) / cols,
      (availH - pad * 2 - gap * (rows - 1) - border) / rows
    ));
    if (cell < minCell) return null;
    const usedC = Math.min(cell, maxCell);
    const usedW = pad * 2 + usedC * cols + gap * (cols - 1) + border;
    const usedH = pad * 2 + usedC * rows + gap * (rows - 1) + border;
    if (usedW > availW + 0.5 || usedH > availH + 0.5) return null;
    const fill = (usedW * usedH) / Math.max(1, availW * availH);
    return { cols, rows, cell: usedC, gap, pad, fill };
  };
  let best = null;
  const tried = new Set();
  for (const [c, r] of preferred) {
    tried.add(c + "," + r);
    const s = score(c, r);
    if (!s) continue;
    if (!best || s.fill > best.fill + 0.02 || (Math.abs(s.fill - best.fill) <= 0.02 && s.cell > best.cell)) best = s;
  }
  for (let c = 6; c <= 12; c++) {
    for (let r = 5; r <= 12; r++) {
      if (tried.has(c + "," + r)) continue;
      const s = score(c, r);
      if (!s) continue;
      if (!best || s.fill > best.fill + 0.04 || (Math.abs(s.fill - best.fill) <= 0.01 && s.cols * s.rows >= best.cols * best.rows && s.cell >= best.cell - 2)) best = s;
    }
  }
  return best || { cols: 7, rows: 9, cell: 40, gap, pad, fill: 0 };
}

function measureBoardBox() {
  const main = $(".play-main");
  const mascot = $(".mascot-col");
  if (!main) return { w: 360, h: 400 };
  const gap = parseFloat(getComputedStyle(main).gap) || 8;
  const row = getComputedStyle(main).flexDirection !== "column";
  const w = main.clientWidth;
  const h = main.clientHeight;
  if (row) {
    const mw = mascot ? mascot.getBoundingClientRect().width : 0;
    return { w: Math.max(120, w - mw - gap), h: Math.max(120, h) };
  }
  const mh = mascot ? mascot.getBoundingClientRect().height : 0;
  return { w: Math.max(120, w), h: Math.max(120, h - mh - gap) };
}

function applyBoardLayout() {
  const box = measureBoardBox();
  const picked = pickBoardSize(box.w, box.h);
  const frame = $(".play-frame") || $("#play");
  if (frame) {
    const fw = (frame.clientWidth || box.w) - 24;
    const invCell = Math.max(40, Math.min(64, Math.floor((fw - 6 * 7) / 8)));
    frame.style.setProperty("--inv-cell", invCell + "px");
  }
  const sizeChanged = picked.cols !== COLS || picked.rows !== ROWS || (SAVE.board && SAVE.board.length !== picked.cols * picked.rows);
  COLS = picked.cols;
  ROWS = picked.rows;
  const board = $("#board");
  if (board) {
    board.style.setProperty("--cols", String(COLS));
    board.style.setProperty("--rows", String(ROWS));
    board.style.setProperty("--cell", picked.cell + "px");
    board.style.setProperty("--gap", picked.gap + "px");
    board.style.setProperty("--pad", picked.pad + "px");
  }
  if (sizeChanged) {
    if (SAVE.board && SAVE.board.length) {
      arrangeFogBoard(SAVE, COLS, ROWS);
    } else {
      SAVE.board = starterBoard(COLS, ROWS);
    }
    SAVE.boardCols = COLS;
    SAVE.boardRows = ROWS;
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
      slot.className = "cell" + (isCellOpen(SAVE, idx(COLS, r, c)) ? "" : " fog locked");
      slot.dataset.locked = String(!isCellOpen(SAVE, idx(COLS, r, c)));
      slot.dataset.r = r; slot.dataset.c = c;
      const item = cellAt(r, c);
      if (item) slot.appendChild(makePiece(item));
      board.appendChild(slot);
    }
  }
  renderInventory();
  refreshSelection();
  refreshLoopTimers();
  renderOrders();
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
  if (item.kind === "gen") {
    el.dataset.cooldownUntil = SAVE.generatorCooldowns[item.uid] || 0;
    if (+el.dataset.cooldownUntil > Date.now()) el.classList.add("cooling");
  }
  const img = infoImg(item);
  const name = infoName(item);
  el.innerHTML = `<img src="${img}" alt="${name}" draggable="false"><span class="sr">${name}</span>`;
  if (item.kind === "gen") {
    const timer = document.createElement("span"); timer.className = "generator-countdown";
    timer.dataset.generatorTimer = item.uid; el.appendChild(timer);
  }
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
  if (dragging || e.isPrimary === false) return;
  const piece = e.target.closest(".piece");
  if (!piece) return;
  const loc = findCellByUid(piece.dataset.uid);
  if (!loc) return;
  const start = { x: e.clientX, y: e.clientY, t: Date.now() };
  dragging = { loc, piece, start, moved: false, ghost: null, pointerId: e.pointerId };
}

function onDragMove(e) {
  if (!dragging || e.pointerId !== dragging.pointerId) return;
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
    const dest = cellAt(r, c);
    if ((cell.dataset.inv !== undefined || isCellOpen(SAVE, idx(COLS, r, c))) && (!dest || canMerge(item, dest, CHAINS, GENS))) cell.classList.add("hot");
  }
}

function onDragUp(e) {
  if (!dragging || e.pointerId !== dragging.pointerId) return;
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
  if (loc.where === "inv") {
    const empty = firstOpenEmpty(SAVE);
    if (empty < 0) return toast("棋盤滿了");
    moveOrMerge(loc, Math.floor(empty / COLS), empty % COLS); return;
  }
  selectedUid = item.kind === "item" ? item.uid : null;
  refreshSelection();
  if (item.kind === "gen") { tapGenerator(loc); return; }
  toast(infoName(item));
  sfx.tap();
}

function refreshSelection() {
  const item = findCellByUid(selectedUid)?.item;
  const button = $("#btn-sell");
  button.hidden = !item || item.kind !== "item";
  if (!button.hidden) button.textContent = `出售 ${infoName(item)}　＋${item.tier * GAME.orders.sellCoinsPerTier} 金幣`;
}

function sellSelected() {
  const loc = findCellByUid(selectedUid);
  if (!loc || loc.item.kind !== "item") return;
  SAVE.coins += loc.item.tier * GAME.orders.sellCoinsPerTier;
  removeFrom(loc);
  selectedUid = null;
  persist(); renderBoard(); refreshHud();
}

function tapGenerator(loc) {
  tickEnergy(SAVE);
  const origin = loc.where === "board" ? document.querySelector(`#board .cell:nth-child(${loc.i + 1})`)?.getBoundingClientRect() : null;
  const result = generateItem(SAVE, loc.item, GENS, { ...GAME.energy, ...ENERGY });
  if (result.error) {
    if (result.error === "energy") {
      sfx.energy(); mascot?.sad();
      toast(`體力用完了，${Math.ceil(nextEnergyIn(SAVE) / 1000)} 秒後恢復 1 點`);
    } else if (result.error === "cooldown") { toast(`產生器冷卻中，${Math.ceil(result.remainingMs / 1000)} 秒後可用`);
    } else { sfx.invalid(); toast("棋盤滿了，先合成、交訂單或移到背包吧"); }
    return;
  }
  emitGameplay("generated", { uid: loc.item.uid, ...result });
  const made = result.item;
  discover(made);
  sfx.generate();
  persist();
  renderBoard();
  const target = document.querySelector(`#board .cell:nth-child(${result.index + 1}) .piece`);
  if (origin && target?.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const end = target.getBoundingClientRect();
    target.animate([
      { transform: `translate(${origin.x - end.x}px, ${origin.y - end.y}px) scale(.4)`, opacity: .4 },
      { transform: "translate(0, -12px) scale(1.08)", offset: .75 },
      { transform: "translate(0, 0) scale(1)", opacity: 1 }
    ], { duration: 360, easing: "ease-out" });
  }
  refreshHud();
  mascot?.idle();
}

function moveOrMerge(loc, r, c) {
  if (!validLocation(loc)) return;
  const destI = idx(COLS, r, c);
  if (!isCellOpen(SAVE, destI)) { toast("到地圖修復建築，就能揭開迷霧"); return; }
  const src = loc.item;
  const dest = SAVE.board[destI];
  // same cell
  if (loc.where === "board" && loc.i === destI) return;
  if (!dest) {
    removeFrom(loc);
    SAVE.board[destI] = src;
    sfx.drop();
    persist(); renderBoard(); renderOrders();
    return;
  }
  if (canMerge(src, dest, CHAINS, GENS)) {
    const merged = mergeCells(src, dest, CHAINS, GENS);
    removeFrom(loc);
    SAVE.board[destI] = merged;
    onMerged(merged);
    persist(); renderBoard(); renderOrders();
    return;
  }
  // swap
  if (loc.where === "board") {
    SAVE.board[loc.i] = dest;
    SAVE.board[destI] = src;
    sfx.drop();
    persist(); renderBoard(); renderOrders();
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
  discover(merged);
  emitGameplay("merged", { item: merged, combo: combo.n });
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
        emitGameplay("discovered", { item: cell, definition: def });
        toast(`新發現：${def.name}　＋1 星星種子`);
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
  const box = $("#inv-cells");
  box.innerHTML = "";
  const cap = SAVE.magicBag.capacity;
  $("#bag-materials").textContent = `修復木材 ${SAVE.magicBag.materials.wood || 0}`;
  $("#btn-bag-expand").textContent = `擴充一格　${10 + (cap - 8) * 5} 星星種子`;
  $("#btn-bag-expand").disabled = cap >= 24;
  $("#inv-count").textContent = `${SAVE.inventory.length}/${cap}`;
  for (let i = 0; i < Math.max(cap, SAVE.inventory.length); i++) {
    const slot = document.createElement("div");
    slot.className = "cell inv-cell";
    slot.dataset.inv = i;
    if (SAVE.inventory[i]) {
      slot.appendChild(makePiece(SAVE.inventory[i]));

    }
    box.appendChild(slot);
  }
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
function chapterUnlocked(id) {
  if (!mapChapterOpen(SAVE, MAP, id)) return false;
  if (id === "village") return true;
  if (id === "journey") return SAVE.storyDone.includes("ch1-end") || SAVE.storyDone.includes("v5");
  if (id === "candy") return SAVE.storyDone.includes("ch2-end") || SAVE.storyDone.includes("j5");
  if (id === "bulu") return SAVE.storyDone.includes("ch3-end") || SAVE.storyDone.includes("c5");
  if (id === "hate") return SAVE.storyDone.includes("ch4-end");
  if (id === "ending") return SAVE.storyDone.includes("ch5-end");
  return false;
}
function availableChains() {
  return [...new Set(Object.values(GENS).filter(g => hasGen(g.id)).map(g => g.produces))];
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
  SAVE.orders = (SAVE.orders || []).filter(o => o?.procedural && o.need && o.reward &&
    itemDef(CHAINS, o.need.chain, o.need.tier) && available.includes(o.need.chain));
  const slots = Math.max(2, Math.min(3, GAME.board?.orders || 3));
  // keep current story order first if any
  const story = nextStoryOrder();
  const hasStory = SAVE.orders.some((o) => !o.procedural && story && o.id === story.id);
  if (story && !hasStory && !SAVE.orders.some((o) => o.id === story.id)) {
    SAVE.orders.unshift({ ...story, reward: { ...story.reward, coins: story.reward.coins ?? (5 + story.need.tier * 5) } });
  }
  // fill procedural
  let guard = 0;
  while (SAVE.orders.length < slots && guard++ < 8) {
    const o = makeProceduralOrder({
      chains: CHAINS,
      chapter: SAVE.chapter,
      discovered: SAVE.discovered,
      npcsByChapter: NPCS_BY_CHAPTER,
      seq: SAVE.orderSeq++,
      availableChains: available,
      region: mainComplete() ? currentRegion() : 0,
      balance: GAME.orders
    });
    if (!o) break;
    // avoid duplicate needs
    if (SAVE.orders.length >= 2 && SAVE.orders.some((x) => x.need.chain === o.need.chain && x.need.tier === o.need.tier)) continue;
    SAVE.orders.push(o);
  }
  SAVE.orders = SAVE.orders.slice(0, slots);
}

function hasGen(id) {
  return SAVE.board.some((c) => c && c.kind === "gen" && c.gen === id)
    || SAVE.inventory.some((c) => c && c.kind === "gen" && c.gen === id);
}

function grantGen(id, tier = 1) {
  if (hasGen(id)) return false;
  const empty = firstOpenEmpty(SAVE);
  const cell = { kind: "gen", gen: id, tier, uid: makeUid() };
  if (empty >= 0) SAVE.board[empty] = cell;
  else if (SAVE.inventory.length < SAVE.magicBag.capacity) SAVE.inventory.push(cell);
  else return false;
  toast(`新的產生器：${GENS[id]?.name || id}`);
  return true;
}

function unlockGenerators() {
  for (const gen of Object.values(GENS)) {
    if (SAVE.map.unlockedGenerators.includes(gen.id) || gen.unlock === "start" || (gen.unlock.startsWith("story:") && hasStoryFlag(gen.unlock.slice(6)))) grantGen(gen.id);
  }
}

function renderOrders() {
  const box = $("#orders");
  box.innerHTML = "";
  for (const o of SAVE.orders) {
    const npc = GAME.npcs[o.npc] || { name: o.npc, portrait: "assets/mascot/front.png" };
    const def = itemDef(CHAINS, o.need.chain, o.need.tier);
    const card = document.createElement("div");
    card.className = "order" + (o.flag ? " story" : "");
    card.dataset.id = o.id;
    card.innerHTML = `
      <img class="npc" src="${npc.portrait}" alt="${npc.name}">
      <div class="body">
        <b>${npc.name}${o.flag ? " · 故事" : ""}</b>
        <div class="need">
          <img src="${def?.img || ""}" alt="">
          <span>${def?.name || ""}</span>
        </div>
        ${o.banter ? `<div class="banter">${o.banter}</div>` : ""}
        <div class="rew">＋${o.reward.coins || 0} 金幣　＋${o.reward.seeds} 種子　＋${o.reward.xp} 經驗${o.reward.energy ? "　＋" + o.reward.energy + " 能量" : ""}</div>
      </div>`;
    const give = document.createElement("button"); give.className = "btn order-give"; give.textContent = "交給他";
    const match = SAVE.board.concat(SAVE.inventory).find(x => x?.kind === "item" && x.chain === o.need.chain && x.tier === o.need.tier);
    give.disabled = !match; card.classList.toggle("ready", !!match);
    give.addEventListener("click", () => { const loc = findCellByUid(match?.uid); if (loc) tryFulfill(loc, o.id); });
    card.appendChild(give);
    box.appendChild(card);
  }
  renderChallenge($("#challenge-card"), SAVE, collectChallenge);
  refreshLoopTimers();
}

function tryFulfill(loc, orderId) {
  const o = SAVE.orders.find((x) => x.id === orderId);
  if (!validLocation(loc)) return;
  const item = loc.item;
  if (!o || item.kind !== "item" || item.chain !== o.need.chain || item.tier !== o.need.tier) {
    sfx.invalid(); toast("這不是訂單要的東西"); return;
  }
  const wasEndless = mainComplete();
  removeFrom(loc);
  SAVE.orders = SAVE.orders.filter((x) => x.id !== orderId);
  SAVE.ordersDone = (SAVE.ordersDone || 0) + 1;
  recordOrder(SAVE);
  emitGameplay("order-completed", { order: o, item, from: { where: loc.where, index: loc.i } });
  SAVE.coins += o.reward.coins || 0;
  if (wasEndless && o.procedural) SAVE.endless.completed += 1;
  SAVE.starSeeds += o.reward.seeds || 0;
  const before = SAVE.level;
  SAVE.xp += o.reward.xp || 0;
  // Level now follows repairs; XP remains recorded for compatibility.
  tickEnergy(SAVE);
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
  if (chapterClear && CHAPTER_NEXT[o.chapter] && chapterUnlocked(CHAPTER_NEXT[o.chapter])) SAVE.chapter = CHAPTER_NEXT[o.chapter];
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
  if (storyDoneFn) return false;
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
    if (fn) fn(); else show("play");
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
  renderRegionControls($("#nodes"), SAVE, MAP, CHAINS, repairMapRegion);
}

function transactionError(code) {
  const messages = { coins: "金幣不足，再完成幾張訂單吧", starSeeds: "星星種子不足", items: "還缺指定道具，可從棋盤或魔法袋交付", materials: "還缺修復木材，完成訂單就能取得", locked: "先修好前一區", complete: "已經完成了", "energy-full": "體力已滿", "bag-full": "魔法袋滿了，先取出道具", claimed: "今天已經領過了", orders: "先完成三張訂單" };
  toast(messages[code] || "目前無法完成這個操作");
}
function repairMapRegion(id) {
  const result = repairRegion(SAVE, MAP, id);
  if (result.error) { transactionError(result.error); return result; }
  const next = CHAPTER_NEXT[SAVE.chapter];
  if (next && chapterUnlocked(next)) SAVE.chapter = next;
  unlockGenerators(); ensureOrders(); persist(); renderMap(); refresh();
  emitGameplay("map-repaired", result);
  toast(result.complete ? "修復完成！新的區域開放了" : "修復完成，迷霧散開了");
  return result;
}
function purchaseOffer(id) {
  tickEnergy(SAVE);
  const result = buyOffer(SAVE, MAP, id, ENERGY.max);
  if (result.error) { transactionError(result.error); return result; }
  persist(); refreshHud(); emitGameplay("shop-purchased", result); toast("已放入魔法袋／補充體力");
  return result;
}
function collectChallenge() {
  const result = claimChallenge(SAVE);
  if (result.error) return transactionError(result.error);
  persist(); renderOrders(); refreshHud(); emitGameplay("challenge-claimed", result);
}
function refreshLoopTimers() {
  const previous = SAVE.challenge.day, state = challengeState(SAVE);
  if (previous && previous !== state.day) { persist(); renderChallenge($("#challenge-card"), SAVE, collectChallenge); }
  const seconds = Math.ceil(state.remainingMs / 1000);
  $$("[data-challenge-countdown]").forEach(el => { el.textContent = `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; });
  $$("[data-generator-timer]").forEach(el => {
    const remaining = Math.max(0, Math.ceil(((SAVE.generatorCooldowns[el.dataset.generatorTimer] || 0) - Date.now()) / 1000));
    el.textContent = remaining ? `${remaining}s` : "";
    el.parentElement?.classList.toggle("cooling", remaining > 0);
  });
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

function giveEnergy(n) { SAVE.energy = Math.min(ENERGY.max, SAVE.energy + n); persist(); refreshHud(); }
function completeTopOrder() { /* debug */ }

boot().catch((err) => {
  console.error(err);
  const message = document.createElement("p");
  message.textContent = err.message.includes("存檔版本") ? err.message : "遊戲載入失敗，請重新整理。";
  document.body.replaceChildren(message);
});
