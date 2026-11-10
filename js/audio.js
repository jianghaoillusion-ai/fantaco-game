/* Chapter BGM is original. Level/chapter clear plays the official 〈飛向藍藍天〉 chorus clip (assets/audio/feixiang-sting.*). */
let ctx, unlocked = false;
const musicEl = { el: null, id: null };

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

let settings = { music: true, sfx: true };
export function setAudioSettings(s) { settings = { ...settings, ...s }; if (!settings.music) { stopMusic(); document.querySelectorAll("audio[data-role='feixiang-clear']").forEach(el => { el.pause(); el.remove(); }); } }
export function getAudioSettings() { return settings; }

export function playMusic(chapterId) {
  const file = ({ village: "bgm-village", journey: "bgm-journey", candy: "bgm-candy", bulu: "bgm-journey", hate: "bgm-candy", ending: "bgm-village", castle: "bgm-village", slope: "bgm-journey", hill: "bgm-journey", bagvalley: "bgm-journey", candylane: "bgm-candy", lamplight: "bgm-journey", theater: "bgm-candy", plaza: "bgm-village" })[chapterId] || "bgm-village";
  if (!settings.music) { stopMusic(); return; }
  if (musicEl.id === file && musicEl.el && !musicEl.el.paused) return;
  stopMusic();
  const el = new Audio();
  const ogg = `assets/audio/${file}.ogg`;
  const mp3 = `assets/audio/${file}.mp3`;
  if (el.canPlayType("audio/ogg")) el.src = ogg; else el.src = mp3;
  el.loop = true;
  el.volume = 0.38;
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
  if (!settings.music) return Promise.resolve();
  const el = new Audio();
  const m4a = "assets/audio/feixiang-sting.m4a";
  const ogg = "assets/audio/feixiang-sting.ogg";
  if (el.canPlayType("audio/mp4") || el.canPlayType("audio/aac")) el.src = m4a;
  else el.src = ogg;
  el.volume = 0.62;
  el.setAttribute("data-role", "feixiang-clear");
  document.querySelectorAll("audio[data-role='feixiang-clear']").forEach((n) => n.remove());
  document.body.appendChild(el);
  const played = el.play().catch(() => {
    // Safari/old engines: try the other container, still the official recording
    el.src = el.src.endsWith(".m4a") ? ogg : m4a;
    return el.play().catch(() => {});
  });
  return played.then(() => new Promise((res) => {
    el.onended = res;
    setTimeout(res, 30000);
  }));
}

function beep(freq, dur, type, gain, at) {
  if (!settings.sfx) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.value = gain ?? 0.05;
    o.connect(g); g.connect(c.destination);
    const t = c.currentTime + (at || 0);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}

export const sfx = {
  tap() { beep(660, 0.07, "sine", 0.03); },
  pickup() { beep(880, 0.08, "sine", 0.04); },
  drop() { beep(420, 0.08, "triangle", 0.04); },
  invalid() { beep(180, 0.16, "square", 0.025); },
  merge(tier = 1) {
    const f = 420 + tier * 70;
    beep(f, 0.1, "triangle", 0.06);
    beep(f * 1.5, 0.12, "sine", 0.04, 0.05);
    if (tier >= 4) beep(f * 2, 0.16, "sine", 0.04, 0.1);
  },
  generate() { beep(520, 0.07, "triangle", 0.04); beep(740, 0.08, "sine", 0.03, 0.05); },
  order() { beep(523, 0.12, "sine", 0.05); beep(659, 0.12, "sine", 0.05, 0.1); beep(784, 0.2, "sine", 0.06, 0.2); },
  energy() { beep(240, 0.18, "square", 0.03); },
  level() { beep(392, 0.12, "sine", 0.05); beep(523, 0.12, "sine", 0.05, 0.1); beep(659, 0.12, "sine", 0.05, 0.2); beep(784, 0.28, "sine", 0.06, 0.32); },
  daily() { beep(700, 0.1, "sine", 0.05); beep(900, 0.14, "sine", 0.05, 0.08); },
};
