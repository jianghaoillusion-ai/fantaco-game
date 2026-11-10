import { migrateToFixedBoard } from "./board-layout.js";
import { remapBoard, starterBoard } from "./merge.js";
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
    schemaVersion: 4,
    map: { regions: {}, unlockedGenerators: [], legacyChapters: [] },
    fog: { openCount: 12, legacyOpen: false },
    magicBag: { capacity: 8, materials: {} },
    challenge: { day: "", orders: 0, claimed: false },
    generatorCooldowns: {},
    profile: null,
    coins: 0,
    endless: { completed: 0 },
    orderSeq: 0,
    xp: 0,
    level: 1,
    starSeeds: 0,
    energy: ENERGY.max,
    energyAt: Date.now(),
    board: null,
    boardCols: 7,
    boardRows: 9,
    inventory: [],
    orders: [],
    storyDone: [],
    chapter: "village",
    restore: { village: 0, journey: 0, candy: 0, bulu: 0, hate: 0, ending: 0 },
    buildings: {},
    unlockedClumps: ["start"],
    unlockedRegions: ["village"],
    region: "village",
    treasures: {},
    discovered: {},
    flags: {},
    settings: { music: true, sfx: true },
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

export function normalizeSave(raw) {
  const base = emptySave();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  if ((raw.schemaVersion ?? raw.version ?? 1) > 4) throw new Error("存檔版本較新，請更新遊戲後再開啟");
  const s = { ...base, ...raw, version: 4, schemaVersion: 4 };
  for (const key of ["settings", "restore", "daily", "endless", "flags", "discovered", "treasures", "map", "fog", "magicBag", "challenge", "generatorCooldowns", "buildings"]) {
    s[key] = { ...base[key], ...(raw[key] && typeof raw[key] === "object" && !Array.isArray(raw[key]) ? raw[key] : {}) };
  }
  for (const key of ["inventory", "orders", "storyDone"]) s[key] = Array.isArray(raw[key]) ? raw[key] : [];
  s.board = Array.isArray(raw.board) ? raw.board : null;
  for (const key of ["coins", "xp", "starSeeds", "energy", "ordersDone", "orderSeq", "comboBest"]) {
    if (!Number.isFinite(s[key]) || s[key] < 0) s[key] = base[key];
  }
  if (!Number.isFinite(s.endless.completed) || s.endless.completed < 0) s.endless.completed = 0;
  if (!Number.isFinite(s.energyAt) || s.energyAt < 0) s.energyAt = Date.now();
  const object = x => x && typeof x === "object" && !Array.isArray(x) ? x : {};
  s.map.regions = Object.fromEntries(Object.entries(object(s.map.regions)).filter(([, v]) => Number.isInteger(v) && v >= 0));
  s.map.unlockedGenerators = Array.isArray(s.map.unlockedGenerators) ? s.map.unlockedGenerators.filter(x => typeof x === 'string') : [];
  s.map.legacyChapters = Array.isArray(s.map.legacyChapters) ? s.map.legacyChapters.filter(x => typeof x === 'string') : [];
  s.magicBag.materials = Object.fromEntries(Object.entries(object(s.magicBag.materials)).filter(([, v]) => Number.isInteger(v) && v >= 0));
  s.magicBag.capacity = Math.max(8, Math.min(24, Math.floor(Number(s.magicBag.capacity) || 8)));
  s.fog.openCount = Math.max(12, Math.floor(Number(s.fog.openCount) || 12));
  s.challenge.orders = Math.max(0, Math.floor(Number(s.challenge.orders) || 0));
  if ((raw.schemaVersion ?? raw.version ?? 2) < 3 && s.board) {
    s.fog.legacyOpen = true;
    const chapters = ['village','journey','candy','bulu','hate','ending'];
    s.map.legacyChapters = chapters.slice(0, Math.max(0, chapters.indexOf(s.chapter)) + 1);
  }
  s.buildings = Object.fromEntries(Object.entries(object(s.buildings)).filter(([, v]) => Number.isInteger(v) && v >= 0));
  s.unlockedRegions = [...new Set(['village', ...(Array.isArray(raw.unlockedRegions) ? raw.unlockedRegions.filter(x => typeof x === 'string') : [])])];
  if ((raw.schemaVersion ?? raw.version ?? 2) < 4) {
    // The retired draft had two repair steps per region. Keep its ledger and
    // translate paid progress once; subsequent weekly additions need no mapping.
    const legacy = {village:['village','stage',3],castle:['castle','hall',2],forest:['hill','lookout',1],candy:['candylane','stall',1],bulu:['lamplight','lamp',1],hate:['theater','show',1],sky:['plaza','fountain',1]};
    for (const [id, [region, building, max]] of Object.entries(legacy)) {
      const step = s.map.regions[id] || 0;
      if (!step) continue;
      if (!s.unlockedRegions.includes(region)) s.unlockedRegions.push(region);
      s.buildings[building] = Math.max(s.buildings[building] || 0, step >= 2 ? max : 1);
    }
    if (raw.challenge?.day && !raw.daily?.challenge) {
      s.daily.challengeDay = raw.challenge.day;
      s.daily.challenge = raw.challenge.orders || 0;
      s.daily.challengeClaimed = !!raw.challenge.claimed;
    }
  }
  s.unlockedClumps = Array.isArray(raw.unlockedClumps) ? [...raw.unlockedClumps] : s.board ? ['all'] : ['start'];
  if (s.board) {
    const oldCols = Number.isInteger(raw.boardCols) && raw.boardCols > 0 ? raw.boardCols : 7;
    const oldRows = Math.max(Number.isInteger(raw.boardRows) ? raw.boardRows : 0, Math.ceil(s.board.length / oldCols));
    s.boardCols = oldCols; s.boardRows = oldRows;
    s.inventory = [...s.inventory];
    migrateToFixedBoard(s, { remapBoard, starterBoard });
  }
  s.boardCols = 7; s.boardRows = 9;
  if (!s.unlockedRegions.includes(s.region)) s.region = 'village';
  return s;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizeSave(JSON.parse(raw));
    const old = localStorage.getItem(LEGACY);
    if (old) return migrate(JSON.parse(old));
  } catch (error) {
    if (error.message.includes("存檔版本")) throw error;
  }
  return emptySave();
}

export function writeSave(data) {
  if ((data.schemaVersion ?? data.version) > 4) throw new Error("存檔版本較新");
  data.version = 4; data.schemaVersion = 4;
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

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
