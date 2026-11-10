/** Portrait and circular avatar helpers. Fallback if an expression file is missing. */

const FULL = {
  feifei: "assets/chars/feifei.png",
  apiao: "assets/chars/apiao.png",
  sika: "assets/chars/sika.png",
  jiejie: "assets/chars/jiejie.png",
  spirit: "assets/chars/spirit.png",
  bulu: "assets/chars/bulu.png",
  hate: "assets/chars/hate.png",
  mascot: "assets/mascot/sticker/front.png"
};

const MASCOT_FULL = {
  happy: "assets/mascot/sticker/front.png",
  sad: "assets/mascot/sticker/sit-closed.png",
  surprised: "assets/mascot/sticker/jump.png",
  worried: "assets/mascot/sticker/front.png",
  angry: "assets/mascot/sticker/surprise.png",
  determined: "assets/mascot/sticker/hold-star.png",
  sleepy: "assets/mascot/sticker/sleep.png",
  default: "assets/mascot/sticker/front.png"
};

/**
 * Head-height metrics in source pixels.
 * head = crown / hair (fitted cap or bow included; tall hats excluded) to chin.
 * 眠花糖 uses the skull crown between the ear bases, not the ear tips.
 */
export const CAST_METRICS = {
  jiejie: { w: 540, h: 720, headTop: 29, chin: 214, head: 186, feet: 687 },
  feifei: { w: 540, h: 720, headTop: 30, chin: 262, head: 233, feet: 686 },
  apiao:  { w: 540, h: 720, headTop: 29, chin: 248, head: 220, feet: 687 },
  sika:   { w: 540, h: 720, headTop: 29, chin: 252, head: 224, feet: 687 },
  bulu:   { w: 540, h: 720, headTop: 29, chin: 248, head: 220, feet: 687 },
  hate:   { w: 540, h: 720, headTop: 114, chin: 262, head: 149, feet: 686 },
  spirit: { w: 540, h: 720, headTop: 114, chin: 268, head: 155, feet: 686 },
  mascot: { w: 248, h: 441, headTop: 106, chin: 210, head: 105, feet: 429 }
};

const MASCOT_POSE_METRICS = {
  "front.png":       { w: 248, h: 441, headTop: 106, chin: 210, head: 105, feet: 429 },
  "back.png":        { w: 249, h: 441, headTop: 106, chin: 210, head: 105, feet: 429 },
  "jump.png":        { w: 423, h: 466, headTop: 100, chin: 202, head: 103, feet: 453 },
  "wave.png":        { w: 202, h: 349, headTop: 78,  chin: 154, head: 77,  feet: 340 },
  "sit-closed.png":  { w: 306, h: 427, headTop: 108, chin: 210, head: 103, feet: 414 },
  "hold-star.png":   { w: 227, h: 420, headTop: 96,  chin: 200, head: 105, feet: 407 },
  "hold-carrot.png": { w: 327, h: 410, headTop: 100, chin: 210, head: 111, feet: 397 },
  "side.png":        { w: 311, h: 426, headTop: 96,  chin: 200, head: 105, feet: 413 },
  "sleep.png":       { w: 437, h: 218, headTop: 16,  chin: 120, head: 105, feet: 205 },
  "surprise.png":    { w: 332, h: 419, headTop: 90,  chin: 200, head: 111, feet: 418 },
  "hero.png":        { w: 1024, h: 1024, headTop: 180, chin: 430, head: 251, feet: 976 },
  "run.png":         { w: 1024, h: 1024, headTop: 180, chin: 420, head: 241, feet: 975 },
  "three.png":       { w: 1024, h: 1024, headTop: 180, chin: 420, head: 241, feet: 975 },
  "face.png":        { w: 175, h: 217, headTop: 20, chin: 150, head: 131, feet: 209 },
  "blink.png":       { w: 208, h: 258, headTop: 20, chin: 160, head: 141, feet: 249 },
  "peek.png":        { w: 279, h: 245, headTop: 10, chin: 140, head: 131, feet: 232 }
};

export function normId(id) {
  if (!id || id === "mian" || id === "mianhuatang") return "mascot";
  return id;
}

export function metricsFor(id, src = "") {
  const n = normId(id);
  if (n === "mascot") {
    const file = String(src || "").split("?")[0].split("/").pop();
    if (file && MASCOT_POSE_METRICS[file]) return MASCOT_POSE_METRICS[file];
    return CAST_METRICS.mascot;
  }
  return CAST_METRICS[n] || CAST_METRICS.jiejie;
}

/** Write head-normalisation CSS variables onto a story actor. */
export function applyCastMetrics(fig, id, src) {
  if (!fig) return;
  const m = metricsFor(id, src);
  fig.style.setProperty("--img-w", String(m.w));
  fig.style.setProperty("--img-h", String(m.h));
  fig.style.setProperty("--head-h", String(m.head));
  fig.style.setProperty("--head-top", String(m.headTop));
  fig.style.setProperty("--chin", String(m.chin));
  fig.style.setProperty("--feet", String(m.feet));
}

export function avatarSrc(id, expr = "happy") {
  const n = normId(id);
  if (expr && expr !== "happy") return `assets/chars/avatars/${n}-${expr}.png`;
  return `assets/chars/avatars/${n}.png`;
}

export function portraitSrc(id, expr = "happy", talking = false) {
  const n = normId(id);
  const open = talking ? "-open" : "";
  if (n === "mascot") {
    if (talking) {
      const t = `assets/chars/expr/mascot-${expr || "happy"}-open.png`;
      return t;
    }
    return MASCOT_FULL[expr] || MASCOT_FULL.default;
  }
  if (expr) {
    return `assets/chars/expr/${n}-${expr}${open}.png`;
  }
  return FULL[n] || FULL.mascot;
}

export function bindImgFallback(img, id, expr, kind = "avatar") {
  img.addEventListener("error", function onErr() {
    img.removeEventListener("error", onErr);
    const n = normId(id);
    if (kind === "avatar") {
      if (img.src && !img.src.endsWith(`${n}.png`)) img.src = `assets/chars/avatars/${n}.png`;
    } else {
      const baseExpr = `assets/chars/expr/${n}-${expr || "happy"}.png`;
      if (img.src.includes("-open")) img.src = baseExpr;
      else if (n === "mascot") img.src = MASCOT_FULL[expr] || MASCOT_FULL.default;
      else img.src = FULL[n] || FULL.mascot;
      const fig = img.parentElement;
      if (fig && fig.classList.contains("story-actor")) applyCastMetrics(fig, n, img.getAttribute("src") || img.src);
    }
  });
}
