/** Settings sheet: music / SFX toggles + volume sliders, persist immediately. */

import { setAudioSettings, sfx } from "./audio.js?v=bgm3r2";

export const DEFAULT_SETTINGS = { music: true, sfx: true, haptics: true, musicVol: 0.72, sfxVol: 0.85 };

export function migrateSettings(save) {
  const cur = { ...DEFAULT_SETTINGS, ...(save.settings || {}) };
  if (cur.musicVol == null) cur.musicVol = DEFAULT_SETTINGS.musicVol;
  if (cur.sfxVol == null) cur.sfxVol = DEFAULT_SETTINGS.sfxVol;
  save.settings = cur;
  return cur;
}

export function createSettingsUi(ctx) {
  const { $, persist } = ctx;

  function apply(extra = {}) {
    const save = ctx.getSave();
    save.settings = { ...DEFAULT_SETTINGS, ...(save.settings || {}), ...extra };
    setAudioSettings(save.settings);
    persist();
    sync();
  }

  function sync() {
    const s = { ...DEFAULT_SETTINGS, ...(ctx.getSave().settings || {}) };
    const tm = $("#tog-music"), ts = $("#tog-sfx");
    const th = $("#tog-haptics");
    if (th) th.checked = s.haptics !== false;
    const vm = $("#vol-music"), vs = $("#vol-sfx");
    if (tm) tm.checked = s.music !== false;
    if (ts) ts.checked = s.sfx !== false;
    if (vm) vm.value = Math.round((s.musicVol ?? 0.72) * 100);
    if (vs) vs.value = Math.round((s.sfxVol ?? 0.85) * 100);
    if (vm) vm.disabled = s.music === false;
    if (vs) vs.disabled = s.sfx === false;
    const name = $("#name-edit");
    if (name && ctx.getSave().profile) name.value = ctx.getSave().profile.nickname || "";
  }

  function open() {
    sync();
    $("#settings-sheet")?.classList.add("on");
  }
  function close() {
    $("#settings-sheet")?.classList.remove("on");
  }

  function bind() {
    $("#btn-settings")?.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      sfx.tap(); open();
    });
    $("#btn-hud-settings")?.addEventListener("click", () => { sfx.tap(); open(); });
    $("#btn-settings-close")?.addEventListener("click", () => { sfx.tap(); close(); });
    $("#btn-howto")?.addEventListener("click", () => { sfx.tap(); close(); ctx.show?.("howto"); });
    $("#settings-sheet")?.addEventListener("click", (e) => {
      if (e.target.id === "settings-sheet") close();
    });
    $("#tog-music")?.addEventListener("change", (e) => apply({ music: e.target.checked }));
    $("#tog-haptics")?.addEventListener("change", (e) => apply({ haptics: e.target.checked }));
    $("#tog-sfx")?.addEventListener("change", (e) => apply({ sfx: e.target.checked }));
    $("#vol-music")?.addEventListener("input", (e) => apply({ musicVol: Number(e.target.value) / 100 }));
    $("#vol-sfx")?.addEventListener("input", (e) => apply({ sfxVol: Number(e.target.value) / 100 }));
  }

  return { open, close, bind, sync, apply };
}
