const KEY = "fantaco.mianhuatang.save.v1";

export function emptySave() {
  return {
    version: 1,
    profile: null,
    xp: 0,
    level: 1,
    starSeeds: 0,
    stagesCleared: {},
    treasures: {},
    flags: {},
    updatedAt: Date.now()
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    return { ...emptySave(), ...JSON.parse(raw) };
  } catch {
    return emptySave();
  }
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
