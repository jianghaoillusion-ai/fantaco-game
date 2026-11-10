const KEY = "fantaco.mianhuatang.save.v2";
const LEGACY = "fantaco.mianhuatang.save.v1";

const ENERGY_MAX = 80;
const REGEN_MS = 90_000;

export const ENERGY = { max: ENERGY_MAX, regenMs: REGEN_MS };

export function configureEnergy(config = {}) {
  ENERGY.max = Number.isFinite(config.max) && config.max > 0 ? config.max : ENERGY_MAX;
  ENERGY.regenMs = Number.isFinite(config.regenMs) && config.regenMs > 0 ? config.regenMs : REGEN_MS;
}

export function emptySave() {
  return {
    version: 2,
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
    treasures: {},
    discovered: {},
    flags: {},
    settings: { music: true, sfx: true },
    daily: { day: "", streak: 0, claimed: false },
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
    if (raw) return normalizeSave(JSON.parse(raw));
    const old = localStorage.getItem(LEGACY);
    if (old) return migrate(JSON.parse(old));
  } catch {}
  return emptySave();
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

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
