/* Tiny Web Audio tones. No paid assets. Unlocked on first tap. */
let ctx, muted = false, unlocked = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function unlockAudio() {
  try {
    const c = ac();
    if (c.state === "suspended") c.resume();
    unlocked = true;
  } catch {}
}

export function setMuted(v) { muted = !!v; }
export function isMuted() { return muted; }

function beep(freq, dur, type, gain, at) {
  if (muted) return;
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
  tap() { beep(660, 0.08, "sine", 0.04); },
  star() { beep(880, 0.12, "triangle", 0.06); beep(1320, 0.1, "sine", 0.03, 0.04); },
  hit() { beep(520, 0.08, "triangle", 0.05); },
  win() { beep(523, 0.18, "sine", 0.06); beep(659, 0.18, "sine", 0.06, 0.12); beep(784, 0.28, "sine", 0.07, 0.24); },
  level() { beep(392, 0.15, "sine", 0.06); beep(523, 0.15, "sine", 0.06, 0.12); beep(659, 0.15, "sine", 0.06, 0.24); beep(784, 0.35, "sine", 0.07, 0.36); },
  hurt() { beep(200, 0.2, "square", 0.03); },
  pickup() { beep(990, 0.1, "sine", 0.05); }
};
