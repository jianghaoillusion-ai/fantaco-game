const KEY = "fantaco.mianhuatang.save.v2";
const LEGACY = "fantaco.mianhuatang.save.v1";

const ENERGY_MAX = 100;
const REGEN_MS = 90_000;

export const ENERGY = { max: ENERGY_MAX, regenMs: REGEN_MS };

export function emptySave() {
  return {
    version: 4,
    profile: null,
    xp: 0,
    level: 1,
    starSeeds: 0,
    energy: ENERGY_MAX,
    energyAt: Date.now(),
    coins: 0,
    coinsEarned: 0,
    diamonds: 0,
    materials: 0,
    boosters: { wand: 0, clear: 0 },
    ads: { day: "", count: 0 },
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
    daily: { day: "", streak: 0, claimed: false, challenge: 0, challengeClaimed: false },
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

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const loaded = { ...emptySave(), ...JSON.parse(raw) };
      loaded.restore = { ...emptySave().restore, ...(loaded.restore || {}) };
      loaded.daily = { ...emptySave().daily, ...(loaded.daily || {}) };
      if (loaded.coins == null) loaded.coins = 0;
      if (!loaded.buildings) loaded.buildings = {};
      if (!loaded.unlockedRegions) loaded.unlockedRegions = ["village"];
      if (!loaded.region) loaded.region = loaded.chapter || "village";
      // Existing boards already filled a full rectangle — keep them fully open.
      if (loaded.board && loaded.board.length && loaded.unlockedClumps == null) loaded.unlockedClumps = ["all"];
      migrateV3(loaded);
      migrateEconomy(loaded);
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

export function tickEnergy(save) {
  const max = ENERGY_MAX;
  const now = Date.now();
  if (save.energy >= max) {
    save.energyAt = now;
    return save;
  }
  const gained = Math.floor((now - (save.energyAt || now)) / REGEN_MS);
  if (gained > 0) {
    save.energy = Math.min(max, (save.energy || 0) + gained);
    save.energyAt = (save.energyAt || now) + gained * REGEN_MS;
    if (save.energy >= max) save.energyAt = now;
  }
  return save;
}

export function nextEnergyIn(save) {
  if (save.energy >= ENERGY_MAX) return 0;
  return Math.max(0, REGEN_MS - (Date.now() - (save.energyAt || Date.now())));
}

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
