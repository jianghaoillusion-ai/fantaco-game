const KEY = "fantaco.mianhuatang.save.v2";
const LEGACY = "fantaco.mianhuatang.save.v1";

const ENERGY_MAX = 100;
const REGEN_MS = 90_000;

export const ENERGY = { max: ENERGY_MAX, regenMs: REGEN_MS };

export function configureEnergy(config = {}) {
  ENERGY.max = Number.isFinite(config.max) && config.max > 0 ? config.max : ENERGY_MAX;
  ENERGY.regenMs = Number.isFinite(config.regenMs) && config.regenMs > 0 ? config.regenMs : REGEN_MS;
}

export function emptySave() {
  return {
    version: 4,
    profile: null,
    coins: 0,
    endless: { completed: 0 },
    orderSeq: 0,
    xp: 0,
    level: 1,
    starSeeds: 0,
    energy: ENERGY.max,
    energyAt: Date.now(),
    coins: 0,
    coinsEarned: 0,
    diamonds: 0,
    materials: 0,
    boosters: { wand: 0, clear: 0 },
    ads: { day: "", count: 0 },
    shopDaily: { day: "", bought: {} },
    board: null,
    boardCols: 7,
    boardRows: 9,
    inventory: [],
    inventorySlots: 6,
    unlockedCells: [],
    orders: [],
    storyDone: [],
    chapter: "village",
    restore: { village: 0, journey: 0, candy: 0, bulu: 0, hate: 0, ending: 0 },
    buildings: {},
    unlockedClumps: null,
    unlockedRegions: ["village"],
    region: "village",
    treasures: {},
    discovered: {},
    flags: {},
    settings: { music: true, sfx: true, musicVol: 0.72, sfxVol: 0.85 },
    daily: { day: "", streak: 0, claimed: false, challengeDay: "", challenge: 0, challengeClaimed: false },
    comboBest: 0,
    ordersDone: 0,
    updatedAt: Date.now()
  };
}

function migrate(v1) {
  const s = emptySave();
  if (!v1) return s;
  s.profile = v1.profile || null;
  s.xp = v1.xp || 0;
  s.level = v1.level || 1;
  s.starSeeds = v1.starSeeds || 0;
  s.treasures = v1.treasures || {};
  s.flags = v1.flags || {};
  return s;
}

export function normalizeSave(raw) {
  const base = emptySave();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const s = { ...base, ...raw };
  for (const key of ["settings", "restore", "daily", "endless", "flags", "discovered", "treasures"]) {
    s[key] = { ...base[key], ...(raw[key] && typeof raw[key] === "object" && !Array.isArray(raw[key]) ? raw[key] : {}) };
  }
  for (const key of ["inventory", "orders", "storyDone"]) s[key] = Array.isArray(raw[key]) ? raw[key] : [];
  s.board = Array.isArray(raw.board) ? raw.board : null;
  for (const key of ["coins", "xp", "starSeeds", "energy", "ordersDone", "orderSeq", "comboBest"]) {
    if (!Number.isFinite(s[key]) || s[key] < 0) s[key] = base[key];
  }
  if (!Number.isFinite(s.endless.completed) || s.endless.completed < 0) s.endless.completed = 0;
  if (!Number.isFinite(s.energyAt) || s.energyAt < 0) s.energyAt = Date.now();
  return s;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const loaded = { ...emptySave(), ...JSON.parse(raw) };
      loaded.restore = { ...emptySave().restore, ...(loaded.restore || {}) };
      loaded.daily = { ...emptySave().daily, ...(loaded.daily || {}) };
      loaded.ads = { ...emptySave().ads, ...(loaded.ads || {}) };
      loaded.shopDaily = { ...emptySave().shopDaily, ...(loaded.shopDaily || {}) };
      if (loaded.coins == null) loaded.coins = 0;
      if (!loaded.buildings) loaded.buildings = {};
      if (!loaded.unlockedRegions) loaded.unlockedRegions = ["village"];
      if (!loaded.region) loaded.region = loaded.chapter || "village";
      // Existing boards already filled a full rectangle — keep them fully open.
      if (loaded.board && loaded.board.length && loaded.unlockedClumps == null) loaded.unlockedClumps = ["all"];
      migrateV3(loaded);
      migrateEconomy(loaded);
      ensureDaily(loaded);
      return loaded;
    }
    const old = localStorage.getItem(LEGACY);
    if (old) { const m = migrate(JSON.parse(old)); migrateEconomy(m); return m; }
  } catch {}
  return emptySave();
}


function migrateV3(s) {
  if (!s || s.version >= 3) {
    if (s.materials == null) s.materials = 0;
    if (s.unlockedCells == null) s.unlockedCells = [];
    if (s.inventorySlots == null) {
      const filled = (s.inventory || []).filter(Boolean).length;
      s.inventorySlots = Math.max(6, filled, s.bagSlots || 8);
    }
    if (s.settings) {
      if (s.settings.musicVol == null) s.settings.musicVol = 0.72;
      if (s.settings.sfxVol == null) s.settings.sfxVol = 0.85;
    }
    s.version = 3;
    return s;
  }
  s.materials = s.materials || 0;
  s.unlockedCells = s.unlockedCells || [];
  const filled = (s.inventory || []).filter(Boolean).length;
  // Existing v2 saves had 8 bag slots; never shrink, never drop items.
  s.inventorySlots = Math.max(8, filled, s.inventorySlots || 0, s.bagSlots || 0);
  if (!s.settings) s.settings = { music: true, sfx: true, musicVol: 0.72, sfxVol: 0.85 };
  else {
    if (s.settings.musicVol == null) s.settings.musicVol = 0.72;
    if (s.settings.sfxVol == null) s.settings.sfxVol = 0.85;
  }
  s.version = 3;
  return s;
}

function migrateEconomy(s) {
  if (!s) return s;
  if (s.diamonds == null) s.diamonds = 0;
  if (s.coins == null) s.coins = 0;
  if (s.coinsEarned == null) s.coinsEarned = Math.max(s.xp || 0, 0);
  s.xp = s.coinsEarned;
  if (!s.boosters) s.boosters = { wand: 0, clear: 0 };
  if (s.boosters.wand == null) s.boosters.wand = 0;
  if (s.boosters.clear == null) s.boosters.clear = 0;
  if (!s.ads) s.ads = { day: "", count: 0 };
  if (!s.shopDaily) s.shopDaily = { day: "", bought: {} };
  s.version = Math.max(s.version || 0, 4);
  return s;
}

export function writeSave(data) {
  data.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(data));
  // STUB: later POST JSON to Cloudflare Worker, persist in D1
  return data;
}

export async function syncCloud(_data) {
  // STUB: Cloudflare Workers + D1 cloud save
  return { ok: true, mode: "local" };
}

export function tickEnergy(save, now = Date.now()) {
  const max = ENERGY.max;
  save.energy = Math.min(max, Math.max(0, Number(save.energy) || 0));
  if (!Number.isFinite(save.energyAt) || save.energyAt > now) save.energyAt = now;
  if (save.energy >= max) { save.energyAt = now; return save; }
  const gained = Math.floor((now - save.energyAt) / ENERGY.regenMs);
  if (gained > 0) {
    save.energy = Math.min(max, save.energy + gained);
    save.energyAt += gained * ENERGY.regenMs;
    if (save.energy >= max) save.energyAt = now;
  }
  return save;
}

export function nextEnergyIn(save, now = Date.now()) {
  if (save.energy >= ENERGY.max) return 0;
  return Math.max(0, Math.min(ENERGY.regenMs, ENERGY.regenMs - (now - (save.energyAt ?? now))));
}

/** Daily systems reset at 08:00 Asia/Taipei, not midnight. Always computed in Taipei time. */
export const DAILY_RESET_HOUR = 8;
export const DAILY_TZ = "Asia/Taipei";

function pad2(n) { return String(n).padStart(2, "0"); }

function taipeiParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const bag = {};
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second)
  };
}

function addCalendarDays(y, m, d, delta) {
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

function ymd(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

/** Game-day key: the Taipei calendar date of the 08:00 start of the current period. */
export function todayKey(now = new Date()) {
  const p = taipeiParts(now);
  if (p.hour < DAILY_RESET_HOUR) {
    const prev = addCalendarDays(p.year, p.month, p.day, -1);
    return ymd(prev.year, prev.month, prev.day);
  }
  return ymd(p.year, p.month, p.day);
}

/** Instant of the next 08:00 Asia/Taipei. Taipei is UTC+8 year-round, so 08:00 = 00:00 UTC that date. */
export function nextDailyReset(now = new Date()) {
  const p = taipeiParts(now);
  let y, m, d;
  if (p.hour < DAILY_RESET_HOUR) {
    y = p.year; m = p.month; d = p.day;
  } else {
    const n = addCalendarDays(p.year, p.month, p.day, 1);
    y = n.year; m = n.month; d = n.day;
  }
  return new Date(Date.UTC(y, m - 1, d, DAILY_RESET_HOUR - 8, 0, 0));
}

export function dailyResetLeftMs(now = new Date()) {
  return Math.max(0, nextDailyReset(now).getTime() - now.getTime());
}

export function formatDailyResetLeft(now = new Date()) {
  const s = Math.max(0, Math.floor(dailyResetLeftMs(now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h <= 0) return `${m}\u00a0分`;
  return `${h}\u00a0小時\u00a0${m}\u00a0分`;
}

/** Roll ads, daily challenge, and shop restock onto the current 08:00 game day. */
export function ensureDaily(save, now = new Date()) {
  if (!save) return todayKey(now);
  const day = todayKey(now);
  if (!save.daily) save.daily = { day: "", streak: 0, claimed: false, challengeDay: "", challenge: 0, challengeClaimed: false };
  if (save.daily.challengeDay !== day) {
    save.daily.challengeDay = day;
    save.daily.challenge = 0;
    save.daily.challengeClaimed = false;
    save.daily.taskMerges = 0;
    save.daily.taskGens = 0;
  }
  if (!save.ads || save.ads.day !== day) save.ads = { day, count: 0 };
  if (!save.shopDaily || save.shopDaily.day !== day) save.shopDaily = { day, bought: {} };
  return day;
}
