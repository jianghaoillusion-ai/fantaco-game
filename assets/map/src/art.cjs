/* Balloon Kingdom world map — vector art source.
 * Sticker cartoon: one dark rounded outline, flat fill + 2 shade steps + one soft oval highlight.
 * Everything here returns SVG strings. build-map.cjs renders them to webp. */
const OUT = "#2A2218";
const SW = 3.6;
const W = 1200, H = 2000;

/* ---------- colour ---------- */
const PAL = {
  pink: ["#FF8FB3", "#E96C97", "#FFC0D5"], red: ["#F46464", "#D2454F", "#FF9C94"],
  yellow: ["#FFD54A", "#EFB02C", "#FFEA94"], orange: ["#FFA654", "#EC8435", "#FFCB8E"],
  blue: ["#6BB9F2", "#4795DA", "#A9D9FB"], purple: ["#B78CEB", "#9568D2", "#D6BCF7"],
  green: ["#7BC67A", "#5AA85A", "#A9E09D"], teal: ["#5FD0C2", "#3EAD9F", "#A2E8DE"],
  white: ["#FFFFFF", "#D9E6F2", "#FFFFFF"], cream: ["#FFF0D2", "#F0D5A6", "#FFF9EA"],
  brown: ["#C98B57", "#A76A3B", "#E2B083"], black: ["#514B63", "#322D40", "#77708C"],
  gold: ["#F6D45A", "#E8C04A", "#F6E27A"], lime: ["#A6DC6A", "#84C24C", "#C9EE9C"],
  navy: ["#7384DC", "#5362BE", "#A3AFF0"], sky: ["#8EC8F0", "#6FB2E4", "#BFE7FF"]
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
function dull(h) { const [r, g, b] = hex(h); const l = 0.3 * r + 0.59 * g + 0.11 * b; return mix(toHex([l, l, l]), "#C9C1B4", 0.45); }

/* T = how inflated the thing being drawn is. 1 = repaired, 0 = flat and grey. */
let T = 1;
const setT = (t) => { T = t; };
const tone = (h) => (T >= 1 ? h : mix(dull(h), h, T * T));   // no air = plain grey; colour only comes back as it fills up
const P = (c) => (PAL[c] || [c, mix(c, "#2A2218", 0.22), mix(c, "#ffffff", 0.45)]).map(tone);
const f = (n) => Math.round(n * 10) / 10;

/* ---------- random ---------- */
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- primitives ---------- */
function ball(x, y, r, c, o = {}) {
  const rx = o.rx || r, ry0 = o.ry || r, ry = ry0 * (0.78 + 0.22 * T), sw = o.sw || (r < 9 ? 2.6 : SW), [b, s, l] = P(c);
  y += ry0 - ry;   // a soft balloon sinks onto whatever is under it
  const crease = T < 1 && r >= 12 ? `<path d="M${f(rx * 0.18)} ${f(ry * 0.5)}q${f(rx * 0.3)} ${f(-ry * 0.12)} ${f(rx * 0.44)} ${f(-ry * 0.42)}M${f(-rx * 0.62)} ${f(ry * 0.28)}q${f(rx * 0.16)} ${f(ry * 0.26)} ${f(rx * 0.44)} ${f(ry * 0.3)}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round" opacity="${f(0.5 * (1 - T))}"/>` : "";
  const hi = o.plain || T < 0.3 ? "" : `<ellipse cx="${f(-rx * 0.4)}" cy="${f(-ry * 0.44)}" rx="${f(rx * 0.24)}" ry="${f(ry * 0.14)}" fill="#fff" opacity="${f(0.92 * Math.max(0.15, T))}" transform="rotate(-38 ${f(-rx * 0.4)} ${f(-ry * 0.44)})"/>`;
  return `<g transform="translate(${f(x)} ${f(y)})${o.rot ? ` rotate(${o.rot})` : ""}"><ellipse rx="${f(rx)}" ry="${f(ry)}" fill="${s}"/><ellipse cx="${f(-rx * 0.08)}" cy="${f(-ry * 0.1)}" rx="${f(rx * 0.88)}" ry="${f(ry * 0.86)}" fill="${b}"/><ellipse cx="${f(-rx * 0.2)}" cy="${f(-ry * 0.26)}" rx="${f(rx * 0.52)}" ry="${f(ry * 0.46)}" fill="${l}" opacity=".6"/>${hi}${crease}<ellipse rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${OUT}" stroke-width="${sw}"/></g>`;
}
/* little puffs of air still leaking out */
function hiss(x, y, rot = 0) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})" fill="none" stroke="#fff" stroke-width="3.200" stroke-linecap="round" opacity=".9"><path d="M0 -6q7 -5 14 -1"/><path d="M2 2q9 -3 18 2"/><path d="M0 10q7 1 13 6"/></g>`;
}
/* long balloon segment */
function cap(x1, y1, x2, y2, w, c, o = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, [b, s, l] = P(c), sw = o.sw || (w < 12 ? 2.6 : SW), L = len + w * (o.ext == null ? 0.5 : o.ext);
  return `<g transform="translate(${f((x1 + x2) / 2)} ${f((y1 + y2) / 2)}) rotate(${f(a)})"><rect x="${f(-L / 2)}" y="${f(-w / 2)}" width="${f(L)}" height="${f(w)}" rx="${f(w / 2)}" fill="${s}"/><rect x="${f(-L / 2 + w * 0.06)}" y="${f(-w / 2)}" width="${f(L - w * 0.12)}" height="${f(w * 0.72)}" rx="${f(w * 0.36)}" fill="${b}"/><rect x="${f(-L / 2 + w * 0.4)}" y="${f(-w * 0.33)}" width="${f(Math.max(2, L - w * 0.8))}" height="${f(w * 0.2)}" rx="${f(w * 0.1)}" fill="${l}" opacity="${f(0.85 * Math.max(0.2, T))}"/><rect x="${f(-L / 2)}" y="${f(-w / 2)}" width="${f(L)}" height="${f(w)}" rx="${f(w / 2)}" fill="none" stroke="${OUT}" stroke-width="${sw}"/></g>`;
}
const chain = (pts, w, c, o) => pts.slice(1).map((p, i) => cap(pts[i][0], pts[i][1], p[0], p[1], w, Array.isArray(c) ? c[i % c.length] : c, o)).join("");
const shadow = (x, y, rx, ry) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#2A2218" opacity=".16"/>`;
const shape = (d, fill, o = {}) => `<path d="${d}" fill="${fill === "none" ? "none" : tone(fill)}" stroke="${o.stroke || OUT}" stroke-width="${o.sw || SW}" stroke-linejoin="round" stroke-linecap="round"${o.extra || ""}/>`;
const flat = (d, fill, op = 1) => `<path d="${d}" fill="${tone(fill)}" opacity="${op}"/>`;
const rrect = (x, y, w, h, r, fill, o = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="${tone(fill)}" stroke="${o.stroke === 0 ? "none" : OUT}" stroke-width="${o.sw || SW}"${o.op ? ` opacity="${o.op}"` : ""}/>`;
const line = (x1, y1, x2, y2, sw = 2.4, col = OUT) => `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`;
const curve = (d, sw = 2.4, col = OUT) => `<path d="${d}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`;
function star(x, y, r, c = "gold", o = {}) {
  let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r; d += (i ? "L" : "M") + f(x + Math.cos(a) * rr) + " " + f(y + Math.sin(a) * rr); }
  const [b, , l] = P(c);
  return `<path d="${d}Z" fill="${b}" stroke="${OUT}" stroke-width="${o.sw || 2.8}" stroke-linejoin="round"/><ellipse cx="${f(x - r * 0.18)}" cy="${f(y - r * 0.2)}" rx="${f(r * 0.2)}" ry="${f(r * 0.12)}" fill="${l}"/>`;
}
const arcPts = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n }, (_, i) => { const a = (a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1))) * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const beads = (pts, r, cols, o) => pts.map((p, i) => ball(p[0], p[1], r, cols[i % cols.length], o)).join("");
const RAINBOW = ["pink", "yellow", "blue", "purple", "orange", "teal", "red", "lime"];
function flag(x, y, h, c, dir = 1) { return line(x, y, x, y - h, 3) + shape(`M${x} ${y - h}L${x + dir * 26} ${y - h + 8}L${x} ${y - h + 17}Z`, PAL[c][0], { sw: 2.8 }) + ball(x, y - h - 3, 4, "gold", { sw: 2.2, plain: 1 }); }
/* a balloon on a string */
function floaty(x, y, r, c, sx, sy) { return curve(`M${f(x)} ${f(y + r)}Q${f(x + (sx - x) * 0.2 + 6)} ${f((y + sy) / 2)} ${f(sx)} ${f(sy)}`, 1.8, T < 1 ? "#8d877c" : "#6b5a48") + shape(`M${f(x - 3.5)} ${f(y + r * 1.22 + 3)}L${f(x + 3.5)} ${f(y + r * 1.22 + 3)}L${f(x)} ${f(y + r * 1.1 - 3)}Z`, PAL[c] ? PAL[c][1] : c, { sw: 2 }) + ball(x, y, r, c, { ry: r * 1.14 }); }

/* ---------- nature ---------- */
const TRUNKS = { green: ["brown", "orange"], pink: ["red", "brown"], blue: ["blue", "navy"], yellow: ["blue", "teal"], purple: ["navy", "purple"], lime: ["brown", "green"], teal: ["navy", "teal"], red: ["green", "lime"], navy: ["purple", "navy"], orange: ["brown", "red"] };
function tree(c, v = 0) {
  const [a, b] = TRUNKS[c] || ["brown", "orange"];
  let s = shadow(0, 2, 44, 10);
  s += chain([[-11, 0], [9, -30], [-9, -60], [8, -88]], 13, a) + chain([[11, 0], [-9, -30], [9, -60], [-8, -88]], 13, b);
  s += cap(-6, -86, -34, -108, 12, a) + cap(6, -86, 34, -108, 12, b);
  const cr = v === 1
    ? [[-30, -128, 27], [30, -130, 27], [0, -160, 30], [-50, -108, 22], [50, -110, 22], [-18, -112, 26], [22, -114, 26], [0, -136, 27]]
    : v === 2
      ? [[-26, -132, 26], [26, -134, 26], [0, -172, 26], [-20, -158, 24], [20, -160, 24], [-40, -112, 21], [40, -114, 21], [0, -120, 27], [0, -146, 24]]
      : [[-36, -124, 28], [36, -126, 28], [0, -150, 32], [-58, -104, 23], [58, -106, 23], [-22, -104, 28], [24, -102, 28], [0, -122, 29]];
  for (const [x, y, r] of cr) s += ball(x, y, r, c);
  return s;
}
function bush(c = "green", n = 4) {
  const set = n >= 5 ? [[-34, -12, 15], [34, -12, 15], [-17, -24, 18], [17, -24, 18], [0, -13, 19]] : n === 3 ? [[-16, -11, 14], [16, -11, 14], [0, -20, 17]] : [[-26, -11, 14], [26, -11, 14], [-9, -22, 17], [11, -15, 17]];
  return shadow(0, 2, n * 9, 6) + set.map(([x, y, r]) => ball(x, y, r, c)).join("");
}
function flower(c = "pink", s = 1) {
  let o = shadow(0, 2, 14 * s, 4 * s) + cap(0, 0, 0, -22 * s, 6 * s, "green", { sw: 2.2 }) + ball(-9 * s, -8 * s, 6 * s, "lime", { rx: 9 * s, ry: 5 * s, rot: 25, sw: 2.2, plain: 1 });
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; o += ball(Math.cos(a) * 12 * s, -30 * s + Math.sin(a) * 12 * s, 9 * s, c, { sw: 2.4 }); }
  return o + ball(0, -30 * s, 7 * s, c === "yellow" ? "orange" : "yellow", { sw: 2.4 });
}
function tuft(x, y) { return `<path d="M${x - 6} ${y}q2 -9 4 -1q2 -11 4 0q3 -8 4 1" fill="none" stroke="#4E9A50" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`; }
function tinyFlower(x, y, c) { let s = ""; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; s += `<circle cx="${f(x + Math.cos(a) * 4)}" cy="${f(y + Math.sin(a) * 4)}" r="3.2" fill="${c}"/>`; } return s + `<circle cx="${x}" cy="${y}" r="2.6" fill="#FFE98A"/>`; }
function dog(c = "pink") {
  return shadow(0, 2, 34, 7) + cap(-18, 0, -18, -20, 9, c, { sw: 2.6 }) + cap(16, 0, 16, -20, 9, c, { sw: 2.6 }) + cap(-20, -24, 18, -24, 13, c) + cap(22, -26, 30, -46, 11, c, { sw: 2.6 }) + cap(-24, -28, -36, -44, 8, c, { sw: 2.6 }) + ball(-38, -48, 5, c, { sw: 2.2 }) + cap(26, -52, 46, -48, 13, c) + cap(22, -58, 16, -74, 9, c, { sw: 2.6 }) + cap(31, -60, 34, -76, 9, c, { sw: 2.6 }) + `<circle cx="38" cy="-52" r="2.2" fill="${OUT}"/>` + ball(52, -47, 3.6, "black", { sw: 0.1, plain: 1 });
}
function cottage(roof = "pink", door = "teal") {
  let s = shadow(0, 3, 62, 11) + rrect(-48, -70, 96, 70, 10, PAL.cream[0]) + `<rect x="24" y="-66" width="20" height="62" rx="8" fill="${tone(PAL.cream[1])}"/>`;
  s += shape("M-15 0V-30a15 15 0 0 1 30 0V0Z", PAL[door][0], { sw: 3 }) + `<circle cx="8" cy="-16" r="2.4" fill="${OUT}"/>`;
  s += `<circle cx="-28" cy="-42" r="9.500" fill="${tone(PAL.sky[2])}" stroke="${OUT}" stroke-width="2.800"/>` + `<circle cx="28" cy="-42" r="9.500" fill="${tone(PAL.sky[2])}" stroke="${OUT}" stroke-width="2.800"/>`;
  for (const [y, n, r] of [[-78, 5, 15], [-98, 4, 14.500], [-116, 3, 14], [-132, 2, 13], [-146, 1, 12]]) for (let i = 0; i < n; i++) s += ball((i - (n - 1) / 2) * (r * 1.56), y, r, roof);
  return s;
}
function archGate(n = 11, rx = 62, ry = 84) { return shadow(-rx, 2, 16, 5) + shadow(rx, 2, 16, 5) + beads(arcPts(0, 0, rx, ry, 180, 360, n), 13.500, RAINBOW); }

/* cloud sticker: lobes share one outline */
let uid = 0;
function cloud(lobes, o = {}) {
  const id = "cl" + (++uid), sw = o.sw || 4.5, shade = o.shade || "#CFE3F5";
  const c = (dx, dy, extra, attr) => lobes.map(([x, y, r]) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r + extra)}" ${attr}/>`).join("");
  return `<clipPath id="${id}">${c(0, 0, 0, "")}</clipPath><g>${c(0, 0, sw, `fill="${OUT}"`)}${c(0, 0, 0, `fill="${shade}"`)}<g clip-path="url(#${id})">${c(-4, -15, -2, 'fill="#fff"')}</g></g>`;
}
const CLOUD_A = [[-150, 30, 58], [-92, -8, 70], [-10, -40, 92], [84, -6, 74], [150, 30, 56], [-60, 40, 62], [40, 44, 66], [-10, 30, 70]];
const CLOUD_B = [[-120, 20, 50], [-56, -18, 66], [30, -26, 74], [110, 18, 54], [-20, 30, 58], [50, 34, 52]];

module.exports = { OUT, SW, W, H, PAL, RAINBOW, mix, tone, setT, getT: () => T, P, f, rng, ball, hiss, cap, chain, shadow, shape, flat, rrect, line, curve, star, arcPts, beads, flag, floaty, tree, bush, flower, tuft, tinyFlower, dog, cottage, archGate, cloud, CLOUD_A, CLOUD_B };
