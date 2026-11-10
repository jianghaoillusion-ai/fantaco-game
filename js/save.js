const KEY = "fantaco.mianhuatang.save.v2";
const LEGACY = "fantaco.mianhuatang.save.v1";

const ENERGY_MAX = 80;
const REGEN_MS = 90_000;

export const ENERGY = { max: ENERGY_MAX, regenMs: REGEN_MS };

export function emptySave() {
  return {
    version: 2,
    profile: null,
    xp: 0,
    level: 1,
    starSeeds: 0,
    energy: ENERGY_MAX,
    energyAt: Date.now(),
    board: null,
    inventory: [],
    orders: [],
    storyDone: [],
    chapter: "village",
    restore: { village: 0, journey: 0, candy: 0 },
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

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptySave(), ...JSON.parse(raw) };
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
