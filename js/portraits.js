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
 * head = crown / hair (fitted cap included; tall hats and 微笑姐姐's bow excluded) to chin.
 * 眠花糖 uses the skull crown between the ear bases, not the ear tips.
 */
export const CAST_METRICS = {
  jiejie: { w: 540, h: 720, headTop: 35, chin: 256, head: 222, feet: 690, bboxTop: 5, contentL: 80, contentR: 459, faceL: 197, faceR: 353 },
  feifei: { w: 540, h: 720, headTop: 30, chin: 262, head: 233, feet: 686, bboxTop: 30, contentL: 113, contentR: 426, faceL: 200, faceR: 350 },
  apiao:  { w: 540, h: 720, headTop: 29, chin: 248, head: 220, feet: 687, bboxTop: 29, contentL: 128, contentR: 412, faceL: 185, faceR: 355 },
  sika:   { w: 540, h: 720, headTop: 29, chin: 252, head: 224, feet: 687, bboxTop: 29, contentL: 152, contentR: 388, faceL: 180, faceR: 365 },
  bulu:   { w: 540, h: 720, headTop: 29, chin: 248, head: 220, feet: 687, bboxTop: 29, contentL: 146, contentR: 393, faceL: 180, faceR: 350 },
  hate:   { w: 540, h: 720, headTop: 86, chin: 294, head: 209, feet: 700, bboxTop: 4, contentL: 109, contentR: 430, faceL: 219, faceR: 393 },
  spirit: { w: 540, h: 720, headTop: 82, chin: 293, head: 212, feet: 700, bboxTop: 4, contentL: 117, contentR: 422, faceL: 208, faceR: 362 },
  mascot: { w: 248, h: 441, headTop: 106, chin: 210, head: 105, feet: 429, bboxTop: 12, contentL: 12, contentR: 236, faceL: 36, faceR: 212 }
};

const MASCOT_POSE_METRICS = {
  "front.png":       { w: 248, h: 441, headTop: 106, chin: 210, head: 105, feet: 429, bboxTop: 12, contentL: 12, contentR: 236, faceL: 36, faceR: 212 },
  "back.png":        { w: 249, h: 441, headTop: 106, chin: 210, head: 105, feet: 429, bboxTop: 12, contentL: 12, contentR: 237, faceL: 36, faceR: 212 },
  "jump.png":        { w: 423, h: 466, headTop: 100, chin: 202, head: 103, feet: 453, bboxTop: 12, contentL: 12, contentR: 411, faceL: 35, faceR: 283 },
  "wave.png":        { w: 202, h: 349, headTop: 78,  chin: 154, head: 77,  feet: 340, bboxTop: 6,  contentL: 6,  contentR: 195, faceL: 36, faceR: 168 },
  "sit-closed.png":  { w: 306, h: 427, headTop: 108, chin: 210, head: 103, feet: 414, bboxTop: 12, contentL: 0,  contentR: 294, faceL: 80, faceR: 270 },
  "hold-star.png":   { w: 227, h: 420, headTop: 96,  chin: 200, head: 105, feet: 407, bboxTop: 12, contentL: 12, contentR: 215, faceL: 33, faceR: 192 },
  "hold-carrot.png": { w: 327, h: 410, headTop: 100, chin: 210, head: 111, feet: 397, bboxTop: 12, contentL: 0,  contentR: 315, faceL: 20, faceR: 200 },
  "side.png":        { w: 311, h: 426, headTop: 96,  chin: 200, head: 105, feet: 413, bboxTop: 12, contentL: 12, contentR: 299, faceL: 12, faceR: 223 },
  "sleep.png":       { w: 437, h: 218, headTop: 16,  chin: 120, head: 105, feet: 205, bboxTop: 0,  contentL: 12, contentR: 437, faceL: 32, faceR: 180 },
  "surprise.png":    { w: 332, h: 419, headTop: 90,  chin: 200, head: 111, feet: 418, bboxTop: 12, contentL: 0,  contentR: 320, faceL: 47, faceR: 220 },
  "face.png":        { w: 175, h: 217, headTop: 20, chin: 150, head: 131, feet: 209, bboxTop: 5, contentL: 8, contentR: 167, faceL: 8, faceR: 167 },
  "blink.png":       { w: 208, h: 258, headTop: 20, chin: 160, head: 141, feet: 249, bboxTop: 8, contentL: 8, contentR: 200, faceL: 8, faceR: 200 },
  "peek.png":        { w: 279, h: 245, headTop: 10, chin: 140, head: 131, feet: 232, bboxTop: 0, contentL: 12, contentR: 267, faceL: 12, faceR: 200 }
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

/** Majority-kid reference (飛飛 / 阿飄 / 西卡 / 布魯). Head 224px, body 657px, ratio 0.341. */
export const REF_HEAD = 224;
export const REF_BODY = 657;
export const REF_RATIO = 224 / 657;

function bodySpan(id, m) {
  const n = normId(id);
  // Tall hats (and 微笑姐姐's bow) are excluded from height so they may poke above a shared crown line.
  if (n === "hate" || n === "spirit" || n === "jiejie") return Math.max(1, m.feet - m.headTop);
  const top = m.bboxTop != null ? m.bboxTop : 0;
  return Math.max(1, m.feet - top);
}

/**
 * Source px → CSS px.
 * Kids of the same age: match head size and overall height within ±5% when the
 * head-to-body ratio is within ~10% of the majority. Outliers are height-matched
 * only (no stretching) and flagged for redraw.
 * 眠花糖 keeps its own head, then is capped at 50vh × roleMul.
 */
export function visualScale(id, src, roleMul = 1, vh = 0) {
  const m = metricsFor(id, src);
  const viewH = vh || (typeof window !== "undefined" ? window.innerHeight : 667);
  const targetBody = 0.50 * viewH * roleMul;
  const targetHead = targetBody * REF_RATIO;
  const n = normId(id);
  if (n === "mascot") {
    let scale = targetHead / m.head;
    const span = Math.max(1, m.feet - (m.bboxTop != null ? m.bboxTop : 0));
    if (span * scale > targetBody) scale = targetBody / span;
    return scale;
  }
  const span = bodySpan(n, m);
  const ratio = m.head / span;
  if (Math.abs(ratio / REF_RATIO - 1) <= 0.10) {
    return targetHead / m.head;
  }
  // Interim: same overall height as the other kids. Do not stretch. Head will be short of target.
  return targetBody / span;
}

/** Write head-normalisation CSS variables onto a story actor. */
export function applyCastMetrics(fig, id, src, roleMul) {
  if (!fig) return;
  const m = metricsFor(id, src);
  const mul = roleMul != null ? roleMul : (fig.classList.contains("dim") ? 0.88 : 1);
  const scale = visualScale(id, src, mul);
  fig.style.setProperty("--img-w", String(m.w));
  fig.style.setProperty("--img-h", String(m.h));
  fig.style.setProperty("--head-h", String(m.head));
  fig.style.setProperty("--head-top", String(m.headTop));
  fig.style.setProperty("--chin", String(m.chin));
  fig.style.setProperty("--feet", String(m.feet));
  fig.style.setProperty("--role-mul", String(mul));
  fig.style.setProperty("--scale", scale + "px");
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
