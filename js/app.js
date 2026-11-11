import { Auth } from "./auth.js?v=25";
import { loadSave, writeSave, syncCloud, tickEnergy, nextEnergyIn, todayKey, ensureDaily, formatDailyResetLeft, ENERGY } from "./save.js?v=25";
import { unlockAudio, playMusic, stopMusic, pauseMusic, resumeMusic, sfx, setAudioSettings, getAudioSettings } from "./audio.js?v=25";
import { mountMascot } from "./mascot.js?v=25";
import { mountHome } from "./home.js?v=25";
import { bindStory, startStory } from "./story.js?v=25";
import { createSettingsUi, migrateSettings } from "./settings-ui.js?v=25";
import { bagCap, migrateBagSlots } from "./bag.js?v=25";
import { reserveItems } from "./merge.js?v=25";
import { avatarSrc } from "./portraits.js?v=25";
import {
  starterBoard, canMerge, mergeCells, produceFrom, firstEmpty, keyOf,
  itemDef, genDef, maxTier, chainPreview, makeProceduralOrder, NPCS_BY_CHAPTER, xpLevel, makeUid, idx,
  remapBoard, nearbyEmpty, fillOrderSlots
} from "./merge.js?v=25";
import { attachSystems, GEN_POPS, GEN_COOL_MS } from "./systems.js?v=25";
import { regionById } from "./world.js?v=25";
import { BOARD_COLS, BOARD_ROWS, fitBoardCell, migrateToFixedBoard } from "./board-layout.js?v=25";
import { bindTip, bindChromeTips, hideTip } from "./tip.js?v=25";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let GAME, CHAINS, GENS, CHAPTERS, STORY, MAP;
let SAVE = loadSave();
let mascot;
let dragging = null;
let pendingStory = null;
let energyTimer;
let selectedUid = null;
let wandArmed = false;
let systems;
let orderAnimations = 0;
let home, settingsUi;

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
  const res = await fetch(url + "?v=25");
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
  ensureOrders();
  unlockGenerators();
  persist();
  migrateSettings(SAVE);
  migrateBagSlots(SAVE, !!(SAVE.board && SAVE.board.length));
  setAudioSettings(SAVE.settings);
  systems = attachSystems(systemCtx());
  bind();
  mascot = mountMascot($("#mascot-root"));
  home = mountHome({ $, getSave: () => SAVE });
  settingsUi = createSettingsUi({ $, persist, getSave: () => SAVE, show });
  settingsUi.bind();
  bindStory({ $, sfx, show, chapterBg: () => getComputedStyle($("#play") || document.documentElement).getPropertyValue("--chapter-bg") });
  window.__GAME = { save: () => SAVE, giveEnergy, completeTopOrder, show, refresh, refreshHud, startStory, todayKey, formatDailyResetLeft, ensureDaily, grantCoins, showDiscover: (item) => systems?.fx?.showDiscover(item), flyRewards: (b, el, d) => systems?.fx?.flyRewards(b, el, d), selectUid: (uid) => { const loc = findCellByUid(uid); if (loc) onTap(loc); } };
  if (!SAVE.profile) show("profile");
  else { show("title"); }
  refresh();
  energyTimer = setInterval(() => { tickEnergy(SAVE); refreshHud(); systems?.fog.tickCool?.(); if ($("#toast")?.classList.contains("on")) placeToast(); }, 1000);
  if (!placeToast._resize) { placeToast._resize = () => { if ($("#toast")?.classList.contains("on")) placeToast(); }; addEventListener("resize", placeToast._resize); }
}

function persist() {
  tickEnergy(SAVE);
  reserveItems(SAVE.orders || [], SAVE.board, SAVE.inventory);
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
    home?.refresh?.();
  } else if (name === "book") renderBook();
  else if (name === "redeem") $("#redeem-count").textContent = SAVE.starSeeds;
  else if (name === "lyrics") renderLyrics();
    else if (name === "map") renderMap();
  else if (name === "daily") renderDaily();
  refreshHud();
}

function chapter() { return CHAPTERS.find((c) => c.id === SAVE.chapter) || CHAPTERS[0]; }

function applyChapterLook() {
  const ch = chapter();
  const region = regionById(MAP, SAVE.region) || null;
  const play = $("#play");
  const bgPath = region?.bg || ch.bg;
  const bg = new URL(bgPath, document.baseURI).href;
  play.style.backgroundImage = `url("${bg}")`;
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
    $("#btn-map")?.addEventListener("click", () => { sfx.tap(); show("map"); });
  $("#btn-daily")?.addEventListener("click", () => { sfx.tap(); show("daily"); });
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => { sfx.tap(); show(b.dataset.back); }));

  $("#name-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("#name-edit").value.trim().slice(0, 12);
    if (!n) return toast("請輸入名稱");
    SAVE.profile = { ...(SAVE.profile || {}), nickname: n };
    persist(); refreshHud(); toast("名稱已更新"); sfx.tap();
  });

  $("#btn-claim-daily")?.addEventListener("click", claimDaily);
  $("#btn-result-ok")?.addEventListener("click", () => {
    $("#result").classList.remove("on");
    if (pendingAfterClear) { const fn = pendingAfterClear; pendingAfterClear = null; fn(); }
    else { playMusic(SAVE.chapter); show("play"); }
  });
  systems?.bind();
  bindChromeTips();

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

function refresh() { refreshHud(); if ($("#play")?.classList.contains("on")) { renderBoard(); renderOrders(); } if ($("#title")?.classList.contains("on")) home?.refresh?.(); if ($("#daily")?.classList.contains("on")) renderDaily(); }

function refreshHud() {
  tickEnergy(SAVE);
  ensureDaily(SAVE);
  systems?.events?.sync?.();
  systems?.eventsUi?.render?.();
  const name = SAVE.profile?.nickname || "小朋友";
  $$("[data-nick]").forEach((el) => { el.textContent = name; });
  $$("[data-level]").forEach((el) => { el.textContent = "Lv." + SAVE.level; });
  $$("[data-seeds]").forEach((el) => { el.textContent = SAVE.starSeeds; });
  $$("[data-coins]").forEach((el) => { el.textContent = SAVE.coins || 0; });
  $$("[data-diamonds]").forEach((el) => { el.textContent = SAVE.diamonds || 0; });
  $$("[data-mats]").forEach((el) => { el.textContent = SAVE.materials || 0; });
  const cap = bagCap(SAVE);
  const filled = (SAVE.inventory || []).filter(Boolean).length;
  const invEl = document.getElementById("inv-count");
  if (invEl) invEl.textContent = `${filled}/${cap}`;
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
  const { have, need, pct } = xpProgress();
  if (!refreshHud._deferXp) {
    $$("[data-xp]").forEach((el) => { el.style.width = (pct * 100) + "%"; });
  }
  bindXpTips(have, need);
  systems?.ads?.syncLabels?.();
  const ch = chapter();
  $$(".chapter-chip [data-chapter]").forEach((el) => { el.textContent = ch.title; });
}

function bindXpTips(have, need) {
  $$("[data-xp-tip]").forEach((el) => {
    bindTip(el, "經驗", () => `${have} / ${need}　金幣 ${SAVE.coins || 0}`);
  });
}

function xpProgress() {
  const curve = GAME?.xpCurve || [0, 40, 100];
  const earned = SAVE.coinsEarned ?? SAVE.xp ?? 0;
  SAVE.xp = earned;
  SAVE.level = xpLevel(earned, curve);
  const lo = curve[Math.min(SAVE.level, curve.length) - 1] ?? 0;
  const hi = curve[SAVE.level] ?? (lo + 100);
  const have = Math.max(0, earned - lo);
  const need = Math.max(1, hi - lo);
  const pct = Math.max(0, Math.min(1, have / need));
  return { have, need, pct, earned, lo, hi };
}

function applyCoins(n) {
  n = Math.max(0, Math.floor(n || 0));
  if (!n) return false;
  SAVE.coins = (SAVE.coins || 0) + n;
  SAVE.coinsEarned = (SAVE.coinsEarned || 0) + n;
  SAVE.xp = SAVE.coinsEarned;
  const before = SAVE.level;
  SAVE.level = xpLevel(SAVE.xp, GAME.xpCurve || [0, 40, 100]);
  if (SAVE.level > before) SAVE.diamonds = (SAVE.diamonds || 0) + 2;
  return SAVE.level > before;
}

function grantCoins(n, fromEl, then) {
  const prev = xpProgress().pct;
  const leveled = applyCoins(n);
  persist();
  if (n > 0) {
    $$("[data-xp]").forEach((el) => {
      el.style.transition = "none";
      el.style.width = (prev * 100) + "%";
    });
    refreshHud._deferXp = true;
    refreshHud();
    refreshHud._deferXp = false;
    sfx.coin();
    const finish = () => {
      $$("[data-xp]").forEach((el) => { el.style.transition = ""; });
      refreshHud();
      then?.(leveled);
    };
    const wrap = () => {
      if (leveled && systems?.fx?.flyRewards) {
        systems.fx.flyRewards({ diamonds: 2 }, document.querySelector("#play .lv-badge, [data-xp-tip]"), finish);
      } else finish();
    };
    if (systems?.fx?.flyCoins) systems.fx.flyCoins(fromEl, document.querySelector("#play .lv-badge, [data-xp-tip]"), wrap);
    else wrap();
  } else {
    refreshHud();
    then?.(leveled);
  }
  return leveled;
}

function placeToast() {
  const t = $("#toast");
  if (!t) return;
  const playOn = $("#play")?.classList.contains("on");
  const blocked = document.querySelector("#bag.overlay.on, #shop.overlay.on, #settings-sheet.on, #story.screen.on, #result.overlay.on, #event-sheet.overlay.on, #challenge-sheet.overlay.on, #ad-sheet.overlay.on, #energy-prompt.overlay.on");
  t.classList.toggle("play-toast", !!(playOn && !blocked));
  if (playOn && !blocked) {
    const orders = $("#orders");
    const board = $("#board");
    const o = orders?.getBoundingClientRect();
    const b = board?.getBoundingClientRect();
    const th = Math.max(t.offsetHeight || 0, 26);
    let top = 0;
    if (o && b) {
      const gap = b.top - o.bottom;
      // --toast-top is the TOP edge of the pill (not the centre).
      // Stay fully above the board; a little overlap with empty orders padding is fine.
      if (gap >= th + 8) top = o.bottom + (gap - th) / 2;
      else top = b.top - th - 4;
    } else if (o) {
      top = o.bottom + 4;
    }
    if (top) t.style.setProperty("--toast-top", Math.round(top) + "px");
    else t.style.removeProperty("--toast-top");
  } else {
    t.style.removeProperty("--toast-top");
  }
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  placeToast();
  t.classList.add("on");
  clearTimeout(t._id);
  t._id = setTimeout(() => t.classList.remove("on"), 2000);
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
    board.style.boxSizing = "content-box";
    board.style.width = (COLS * picked.cell) + "px";
    board.style.height = (ROWS * picked.cell) + "px";
    board.style.marginLeft = "auto";
    board.style.marginRight = "auto";
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
      if (item && isWantedItem(item)) slot.classList.add("wanted");
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
  el.removeAttribute("title");
  const chain = item.kind === "item" ? chainPreview(CHAINS, item.chain, item.tier) : [];
  bindTip(el, name, "", { chain, avoidNeighbors: true, avoid: "#play .orders-row, #play .order, .play-hud" });
  return el;
}
function isWantedItem(item) {
  if (!item || item.kind !== "item") return false;
  return (SAVE.orders || []).some((o) =>
    o.need?.chain === item.chain && o.need?.tier === item.tier
  );
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
  $$(".cell.hot,.cell.bad,.order.hot").forEach((el) => el.classList.remove("hot", "bad"));
  const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".cell, .order");
  if (!cell || !dragging) return;
  const item = dragging.loc.item;
  if (cell.classList.contains("order")) {
    const od = SAVE.orders.find((o) => o.id === cell.dataset.id);
    const ok = od && item.kind === "item" && item.chain === od.need.chain && item.tier === od.need.tier
      && (!od.reservedUid || od.reservedUid === item.uid);
    cell.classList.add(ok ? "hot" : "bad");
  } else {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (cell.classList.contains("locked") || (systems && !systems.fog.canDropAt(r, c))) {
      cell.classList.add("bad");
      return;
    }
    const dest = cellAt(r, c);
    if (!dest || canMerge(item, dest, CHAINS, GENS)) cell.classList.add("hot");
    else if (dragging.loc.where !== "board") cell.classList.add("bad");
  }
}

function onDragUp(e) {
  if (!dragging) return;
  const d = dragging; dragging = null;
  $$(".cell.hot,.cell.bad,.order.hot,.order.bad").forEach((el) => el.classList.remove("hot", "bad"));
  d.piece.classList.remove("lifted");
  d.ghost?.remove();
  if (!d.moved) { onTap(d.loc); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".cell, .order, .inv-cell");
  if (!el) {
    sfx.invalid();
    const src = d.piece.closest(".cell") || d.piece;
    systems?.fx.bounceCell?.(src);
    return;
  }
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

function moveToInventory(loc, slot) {
  const cap = bagCap(SAVE);
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
    sfx.drop(); persist(); renderBoard(); renderOrders();
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
  sfx.drop(); persist(); renderBoard(); renderOrders();
}

function removeFrom(loc) {
  if (loc.where === "board") SAVE.board[loc.i] = null;
  else SAVE.inventory.splice(loc.i, 1);
}

function armWand() {
  if ((SAVE.boosters?.wand || 0) < 1) { sfx.invalid(); toast("還沒有合成棒"); return; }
  wandArmed = true;
  toast("點棋盤上的道具，讓它升一階。");
}

function onTap(loc) {
  const item = loc.item;
  if (wandArmed && item?.kind === "item") {
    wandArmed = false;
    const max = maxTier(CHAINS, item.chain);
    if ((item.tier || 1) >= max) { sfx.invalid(); toast("已經是最高一階了"); return; }
    SAVE.boosters.wand = Math.max(0, (SAVE.boosters.wand || 0) - 1);
    item.tier += 1;
    persist();
    sfx.merge(item.tier);
    toast("合成棒發動，升了一階！");
    systems?.fx.popAt?.(item.uid);
    renderBoard();
    refreshHud();
    systems?.bag?.renderInventory?.();
    return;
  }
  hideTip();
  selectedUid = item.uid;
  systems?.fx.showInfo(item);
  sfx.tap();
  if (item.kind === "gen") { tapGenerator(loc); return; }
  renderBoard();
}

function tapGenerator(loc) {
  tickEnergy(SAVE);
  const gen = loc.item;
  if (GENS[gen.gen]?.autoMs) { toast("會自動產出"); return; }
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
    systems?.ads?.openEnergyPrompt?.();
    return;
  }
  const origin = loc.where === "board" ? loc.i : -1;
  let empty = nearbyEmpty(SAVE.board, COLS, ROWS, origin, systems?.fog.isOpenIndex);
  if (empty < 0 && SAVE.inventory.filter(Boolean).length >= bagCap(SAVE)) {
    toast("棋盤和魔法袋都滿了");
    sfx.invalid(); return;
  }
  const chargeMax = gen.chargeMax || GENS[gen.gen]?.chargeMax;
  if (chargeMax) {
    gen.charge = (gen.charge || 0) + 1;
    if (gen.charge < chargeMax) {
      sfx.tap();
      toast(`蓄力 ${gen.charge}/${chargeMax}`);
      persist(); renderBoard(); renderOrders();
      return;
    }
    gen.charge = 0;
  }
  const made = produceFrom(gen, GENS);
  if (!made) return;
  SAVE.energy -= 1;
  if (SAVE.energy === ENERGY.max - 1) SAVE.energyAt = Date.now();
  gen.pops = (gen.pops || 0) + 1;
  const popsMax = systems?.fog?.genBurstPops?.(SAVE, gen) ?? GEN_POPS;
  if (gen.pops >= popsMax) {
    gen.pops = 0;
    const coolMs = systems?.fog?.genCoolMs?.(SAVE, gen) ?? GEN_COOL_MS;
    if (coolMs > 0) { gen.coolUntil = Date.now() + coolMs; gen.coolStarted = Date.now(); }
    else { gen.coolUntil = 0; gen.coolStarted = 0; }
  }
  systems?.orders?.bumpTask?.("gens");
  if (empty < 0) SAVE.inventory.push(made);
  else SAVE.board[empty] = made;
  discover(made);
  sfx.generate();
  persist();
  const fromEl = document.querySelector(`.piece[data-uid="${gen.uid}"]`);
  renderBoard(); renderOrders();
  refreshHud();
  const toEl = empty < 0 ? $("#btn-bag") : document.querySelector(`.piece[data-uid="${made.uid}"]`)?.closest(".cell");
  if (systems?.fx.spawnArc && fromEl && toEl) systems.fx.spawnArc(fromEl, toEl, () => systems.fx.popAt(made.uid));
  else systems?.fx.popAt(made.uid);
}

function moveOrMerge(loc, r, c) {
  if (systems && !systems.fog.canDropAt(r, c)) {
    sfx.invalid();
    toast("這一格還沒揭開");
    systems.fx.bounceCell?.(document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`));
    const src = document.querySelector(`.piece[data-uid="${loc.item.uid}"]`)?.closest(".cell");
    systems.fx.bounceCell?.(src);
    return;
  }
  const destI = idx(COLS, r, c);
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
  const tier = merged.tier || 1;
  sfx.merge(tier);
  mascot?.merge(tier);
  systems?.fx.revealMerge?.(merged.uid) || systems?.fx.popAt(merged.uid);
  const at = findCellByUid(merged.uid);
  if (at?.where === "board") {
    const cols = COLS;
    systems?.fog.revealAdjacent?.(Math.floor(at.i / cols), at.i % cols);
  }
  try { navigator.vibrate?.(12); } catch {}
  systems?.events?.noteMerge?.(merged);
  systems?.orders?.bumpTask?.("merges");
  discover(merged);
  if (tier >= 5) shake(10);
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

function renderInventory() {
  if (systems?.shop) systems.shop.renderInventory();
}

/* ---------- orders ---------- */
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
  fillOrderSlots(SAVE, GAME.board?.orders || 3, {
    chains: CHAINS,
    chapter: SAVE.chapter,
    discovered: SAVE.discovered,
    npcsByChapter: NPCS_BY_CHAPTER,
    seq: SAVE.ordersDone || 0,
    availableChains: [...new Set(SAVE.board.concat(SAVE.inventory).filter(x => x?.kind === "gen").map(x => GENS[x.gen]?.produces).filter(Boolean))],
    nextStory: nextStoryOrder
  });
  reserveItems(SAVE.orders, SAVE.board, SAVE.inventory);
}

function hasGen(id) {
  return SAVE.board.some((c) => c && c.kind === "gen" && c.gen === id)
    || SAVE.inventory.some((c) => c && c.kind === "gen" && c.gen === id);
}

function grantGen(id, tier = 1) {
  if (hasGen(id)) return false;
  const empty = systems
    ? nearbyEmpty(SAVE.board, COLS, ROWS, -1, systems.fog.isOpenIndex)
    : firstEmpty(SAVE.board);
  const cell = { kind: "gen", gen: id, tier, uid: makeUid() };
  if (GENS[id]?.autoMs) { cell.autoMs = GENS[id].autoMs; cell.coolUntil = Date.now() + GENS[id].autoMs; }
  if (empty >= 0) SAVE.board[empty] = cell;
  else if (SAVE.inventory.filter(Boolean).length < bagCap(SAVE)) SAVE.inventory.push(cell);
  else return false;
  toast(`新的產生器：${GENS[id]?.name || id}`);
  return true;
}

function unlockGenerators() {
  const done = (f) => SAVE.storyDone.includes(f);
  grantGen("star");
  if (done("v2") || done("v3") || (SAVE.restore.village || 0) >= 2) grantGen("garden");
  if (chapterUnlocked("journey")) grantGen("forest");
  if (done("j2") || done("j3") || SAVE.chapter === "candy") grantGen("magic");
  if (chapterUnlocked("candy")) grantGen("candy");
}

function renderOrders() {
  // Auto output and board actions must not remove cards mid-completion.
  if (orderAnimations) return;
  reserveItems(SAVE.orders || [], SAVE.board, SAVE.inventory);
  if (systems?.orders) systems.orders.renderOrders();
}

function tryFulfill(loc, orderId) {
  const o = SAVE.orders.find((x) => x.id === orderId);
  // Fly-in callbacks may finish after another transaction moved/consumed the item.
  loc = findCellByUid(loc?.item?.uid);
  if (!loc) return;
  const item = loc.item;
  if (!o || item.kind !== "item" || item.chain !== o.need.chain || item.tier !== o.need.tier) {
    sfx.invalid(); toast("這不是訂單要的東西"); return;
  }
  if (item.uid !== o.reservedUid) {
    sfx.invalid(); toast("這件是另一張訂單要的"); return;
  }
  orderAnimations += 1;
  removeFrom(loc);
  SAVE.orders = SAVE.orders.filter((x) => x.id !== orderId);
  SAVE.ordersDone = (SAVE.ordersDone || 0) + 1;
  SAVE.starSeeds += o.reward.seeds || 0;
  let coins = o.reward.coins ?? ((o.reward.seeds || 0) + 4);
  if (SAVE.boosters?.clear > 0) {
    SAVE.boosters.clear -= 1;
    coins *= 2;
    toast("過關道具發動，金幣加倍！");
  }
  if (o.reward.materials) SAVE.materials = (SAVE.materials || 0) + o.reward.materials;
  const gems = o.reward.diamonds ?? (o.flag ? 2 : 1);
  if (gems) SAVE.diamonds = (SAVE.diamonds || 0) + gems;
  systems?.orders.bumpDaily();
  systems?.events?.noteOrder?.(o);
  if (o.reward.energy) SAVE.energy = Math.min(ENERGY.max, SAVE.energy + o.reward.energy);
  if (o.flag) SAVE.storyDone.push(o.flag);
  if (o.restore) {
    const ch = o.chapter || SAVE.chapter;
    SAVE.restore[ch] = (SAVE.restore[ch] || 0) + o.restore;
  }
  sfx.order();
  mascot?.order();
  const chapterClear = Object.values(CHAPTER_END).includes(o.flag);
  if (chapterClear && CHAPTER_NEXT[o.chapter]) SAVE.chapter = CHAPTER_NEXT[o.chapter];
  ensureOrders();
  unlockGenerators();
  const fromCard = document.querySelector(`.order[data-id="${orderId}"]`);
  fromCard?.classList.add("task-glow");
  const after = (leveled) => {
    const finish = () => {
      orderAnimations -= 1;
      renderBoard(); renderOrders(); refreshHud();
      if (o.outro) startStory(o.outro, () => {
        if (chapterClear || leveled) showClear({ chapterClear, leveled, o });
        else { playMusic(SAVE.chapter); applyChapterLook(); maybeStoryIntro(); }
      });
      else if (chapterClear || leveled) showClear({ chapterClear, leveled, o });
      else maybeStoryIntro();
    };
    if (fromCard?.isConnected && systems?.fx?.completeTask) systems.fx.completeTask(fromCard, finish);
    else finish();
  };
  const extras = { diamonds: gems || 0, seeds: o.reward.seeds || 0, energy: o.reward.energy || 0 };
  grantCoins(coins, fromCard, (leveled) => {
    if (systems?.fx?.flyRewards && (extras.diamonds || extras.seeds || extras.energy)) {
      systems.fx.flyRewards(extras, fromCard, () => after(leveled));
    } else after(leveled);
  });
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

function showClear({ chapterClear, leveled, o }) {
  const box = $("#result");
  box.classList.add("on");
  $("#result-title").textContent = chapterClear ? "這一章，完成了！" : (leveled ? "升級了！" : "訂單完成！");
  $("#result-sub").textContent = chapterClear
    ? `${chapter().title}　跟著歌詞，一起飛向藍藍天`
    : `現在是 Lv.${SAVE.level}　星星種子 ${SAVE.starSeeds}`;
  const lv = $("#result-lv");
  if (lv) {
    lv.style.display = "";
    lv.innerHTML = `<span class="lv-star" aria-hidden="true"><img src="assets/items/star-seed.png" alt=""></span><b>Lv.${SAVE.level}</b>`;
  }
  if (leveled) sfx.level();
  const ok = $("#btn-result-ok");
  if (ok) ok.textContent = "領取";
  const rewards = $("#result-rewards");
  if (rewards) {
    const coins = o?.reward?.coins ?? 0;
    const seeds = o?.reward?.seeds || 0;
    const mats = o?.reward?.materials || 0;
    const gems = o?.reward?.diamonds ?? (o?.flag ? 2 : 1);
    const def = o?.need ? itemDef(CHAINS, o.need.chain, o.need.tier) : null;
    const piece = (src, label, extra="") => `<div class="rew-piece ${extra}"><img src="${src}" alt=""><b>${label}</b></div>`;
    let icons = "";
    if (coins) icons += piece("assets/ui/coin.png", "+" + coins);
    if (seeds) icons += piece("assets/items/star-seed.png", "+" + seeds);
    if (gems) icons += piece("assets/ui/diamond.png", "+" + gems);
    if (mats) icons += piece("assets/icons/material.png", "+" + mats);
    if (def?.img) icons += piece(def.img, def.name || "", "item");
    rewards.style.display = icons ? "" : "none";
    rewards.innerHTML = icons
      ? `<div class="rew-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="rew-icons">${icons}</div>`
      : "";
  }
  const lyricsBox = $("#result-lyrics");
  if (chapterClear) {
    lyricsBox.style.display = "";
    lyricsBox.innerHTML = (GAME.lyrics.endingLines || []).map((l) => `<p>${l}</p>`).join("");
    pendingAfterClear = () => { playMusic(SAVE.chapter); applyChapterLook(); show("play"); maybeStoryIntro(); };
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
  const status = $("#daily-status");
  if (status) {
    status.innerHTML = claimed
      ? `今天已經領過囉，08:00 再來。<br>還要 <span class="reset-left">${formatDailyResetLeft()}</span>。`
      : "今天的禮物在這裡。";
  }
  const claimBtn = $("#btn-claim-daily");
  if (claimBtn) claimBtn.disabled = claimed;
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
  SAVE.daily = { ...(SAVE.daily || {}), day: today, streak: st, claimed: true };
  persist(); sfx.daily(); mascot?.wish();
  toast(`領到 ${energy} 能量、${seeds} 顆星星種子（連續 ${st} 天）`);
  const after = () => { renderDaily(); refreshHud(); };
  if (systems?.fx?.flyRewards) systems.fx.flyRewards({ energy, seeds }, document.getElementById("btn-claim-daily"), after);
  else after();
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
    getCols: () => COLS,
    getRows: () => ROWS,
    getSelected: () => selectedUid,
    setSelected: (u) => { selectedUid = u; },
    persist, toast, sfx, show, refresh, refreshHud, grantCoins, applyCoins,
    startStory, applyChapterLook, playMusic, pauseMusic, resumeMusic,
    makePiece, infoName, infoImg, findCellByUid, removeFrom,
    canMerge: (a, b) => canMerge(a, b, CHAINS, GENS),
    moveOrMerge, onTap, moveToInventory,
    tryFulfill: (loc, id) => tryFulfill(loc, id),
    grantGen: (id, tier) => grantGen(id, tier),
    xpLevel: (xp) => xpLevel(xp, GAME.xpCurve || [0, 40, 100]),
    makeUid, ENERGY, todayKey,
    itemDef: (chain, tier) => itemDef(CHAINS, chain, tier),
    maxTier: (chain) => maxTier(CHAINS, chain),
    chainPreview: (chain, tier) => chainPreview(CHAINS, chain, tier),
    getGens: () => GENS,
    discover,
    canAutoGenerate: () => !systems?.drag?.isDragging() && $("#play").classList.contains("on") && !$$(".overlay.on,.sheet-overlay.on").length,
    avatarSrc,
    get mascot() { return mascot; },
    showInfo: (item) => systems?.fx.showInfo(item),
    armWand
  };
}

function giveEnergy(n) { SAVE.energy = Math.min(ENERGY.max, SAVE.energy + n); persist(); refreshHud(); }
function completeTopOrder() {
  const order = SAVE.orders?.[0];
  if (!order) return;
  const card = document.querySelector(`.order[data-id="${order.id}"]`);
  systems?.orders.clickGive(order.id, card);
}

boot().catch((err) => {
  console.error(err);
  document.body.innerHTML = "<p style='padding:40px;font-family:sans-serif'>遊戲載入失敗，請重新整理。</p>";
});
