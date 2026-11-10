/* Chapter BGM is original procedural synth. Level/chapter clear plays the official 〈飛向藍藍天〉 chorus clip (assets/audio/feixiang-sting.*). */

let ctx, unlocked = false;
const musicEl = { el: null, id: null };
let lastMusicId = "village";

const MUSIC_FILES = {
  village: "bgm-village", journey: "bgm-journey", candy: "bgm-candy",
  bulu: "bgm-bulu", hate: "bgm-hate", ending: "bgm-ending",
  castle: "bgm-village", slope: "bgm-journey", hill: "bgm-journey",
  bagvalley: "bgm-journey", candylane: "bgm-candy", lamplight: "bgm-bulu",
  theater: "bgm-hate", plaza: "bgm-ending"
};

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    unlocked = true;
  } catch {}
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

let settings = { music: true, sfx: true, musicVol: 0.72, sfxVol: 0.85 };

function musicGain() {
  if (!settings.music) return 0;
  const v = settings.musicVol;
  return (v == null ? 0.72 : v);
}
function sfxGain() {
  if (!settings.sfx) return 0;
  const v = settings.sfxVol;
  return (v == null ? 0.85 : v);
}

function applyMusicVolume() {
  if (musicEl.el) musicEl.el.volume = 0.5 * musicGain();
  document.querySelectorAll("audio[data-role='feixiang-clear']").forEach((el) => {
    el.volume = 0.88 * musicGain();
    if (!settings.music || musicGain() === 0) el.pause();
  });
}

export function setAudioSettings(s) {
  settings = { ...settings, ...s };
  if (!settings.music || musicGain() === 0) stopMusic();
  else {
    applyMusicVolume();
    if (!musicEl.el && lastMusicId) playMusic(lastMusicId);
    else applyMusicVolume();
  }
  applyMusicVolume();
}
export function getAudioSettings() { return settings; }

export function playMusic(chapterId) {
  const file = MUSIC_FILES[chapterId] || "bgm-village";
  lastMusicId = chapterId || "village";
  if (!settings.music || musicGain() === 0) { stopMusic(); return; }
  if (musicEl.id === file && musicEl.el && !musicEl.el.paused) {
    applyMusicVolume();
    return;
  }
  stopMusic();
  const el = new Audio();
  const ogg = `assets/audio/${file}.ogg`;
  const mp3 = `assets/audio/${file}.mp3`;
  if (el.canPlayType("audio/ogg")) el.src = ogg; else el.src = mp3;
  el.loop = true;
  el.volume = 0.5 * musicGain();
  el.play().catch(() => {});
  musicEl.el = el; musicEl.id = file;
}

export function stopMusic() {
  if (musicEl.el) {
    musicEl.el.pause();
    musicEl.el.src = "";
    musicEl.el = null;
    musicEl.id = null;
  }
}

export function playClearTheme() {
  /* Official 〈飛向藍藍天〉 chorus clip (from 飛向藍藍天_MMM v1.wav, ~28s). */
  stopMusic();
  if (!settings.music || musicGain() === 0) return Promise.resolve();
  const el = new Audio();
  const m4a = "assets/audio/feixiang-sting.m4a";
  const ogg = "assets/audio/feixiang-sting.ogg";
  if (el.canPlayType("audio/mp4") || el.canPlayType("audio/aac")) el.src = m4a;
  else el.src = ogg;
  el.volume = 0.88 * musicGain();
  el.setAttribute("data-role", "feixiang-clear");
  document.querySelectorAll("audio[data-role='feixiang-clear']").forEach((n) => n.remove());
  document.body.appendChild(el);
  const played = el.play().catch(() => {
    el.src = el.src.endsWith(".m4a") ? ogg : m4a;
    return el.play().catch(() => {});
  });
  return played.then(() => new Promise((res) => {
    el.onended = res;
    setTimeout(res, 30000);
  }));
}

function beep(freq, dur, type, gain, at) {
  if (!settings.sfx || sfxGain() === 0) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    const vol = (gain ?? 0.05) * sfxGain();
    g.gain.value = vol;
    o.connect(g); g.connect(c.destination);
    const t = c.currentTime + (at || 0);
    g.gain.setValueAtTime(Math.max(0.0001, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}

function sparkle(at, gain) {
  if (!settings.sfx || sfxGain() === 0) return;
  try {
    const c = ac();
    const n = 2 ** 12;
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 1800;
    const g = c.createGain();
    const t = c.currentTime + (at || 0);
    g.gain.setValueAtTime((gain ?? 0.03) * sfxGain(), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + 0.2);
  } catch {}
}

export const sfx = {
  tap() { beep(660, 0.07, "sine", 0.03); },
  pickup() { beep(880, 0.08, "sine", 0.04); },
  drop() { beep(420, 0.08, "triangle", 0.04); },
  invalid() { beep(180, 0.16, "square", 0.025); },
  merge(tier = 1) {
    const f = 523 + Math.min(5, tier) * 40;
    beep(f, 0.11, "sine", 0.055);
    beep(f * 1.5, 0.14, "triangle", 0.04, 0.04);
    beep(f * 2, 0.16, "sine", 0.03, 0.08);
    sparkle(0.05, 0.035);
    if (tier >= 4) beep(f * 2.5, 0.18, "sine", 0.03, 0.12);
  },
  generate() { beep(520, 0.07, "triangle", 0.04); beep(740, 0.08, "sine", 0.03, 0.05); },
  order() { beep(523, 0.12, "sine", 0.05); beep(659, 0.12, "sine", 0.05, 0.1); beep(784, 0.2, "sine", 0.06, 0.2); },
  energy() { beep(240, 0.18, "square", 0.03); },
  level() { beep(392, 0.12, "sine", 0.05); beep(523, 0.12, "sine", 0.05, 0.1); beep(659, 0.12, "sine", 0.05, 0.2); beep(784, 0.28, "sine", 0.06, 0.32); },
  daily() { beep(700, 0.1, "sine", 0.05); beep(900, 0.14, "sine", 0.05, 0.08); },
  combo(n) { beep(500 + n * 80, 0.1, "triangle", 0.055); }
};
