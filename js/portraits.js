/** Portrait and circular avatar helpers. Fallback if an expression file is missing. */

const FULL = {
  feifei: "assets/chars/feifei.png",
  apiao: "assets/chars/apiao.png",
  sika: "assets/chars/sika.png",
  jiejie: "assets/chars/jiejie.png",
  spirit: "assets/chars/spirit.png",
  bulu: "assets/chars/bulu.png",
  hate: "assets/chars/hate.png",
  mascot: "assets/mascot/painted/three.png"
};

const MASCOT_FULL = {
  happy: "assets/mascot/painted/front.png",
  sad: "assets/mascot/painted/front.png",
  surprised: "assets/mascot/painted/jump.png",
  worried: "assets/mascot/painted/front.png",
  angry: "assets/mascot/painted/three.png",
  determined: "assets/mascot/painted/three.png",
  sleepy: "assets/mascot/painted/sleep.png",
  default: "assets/mascot/painted/three.png"
};

export function normId(id) {
  if (!id || id === "mian" || id === "mianhuatang") return "mascot";
  return id;
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
    }
  });
}
