/* Lays the whole kingdom out. scene(levels) -> full SVG; levels = { buildingId: 0..1 } (missing = repaired). */
const A = require("./art.cjs");
const { B, BOX } = require("./buildings.cjs");
const { OUT, W, H, PAL, RAINBOW, f, rng, ball, cap, shadow, shape, rrect, star, arcPts, beads, floaty, tree, bush, flower, tuft, tinyFlower, dog, cottage, archGate, cloud, CLOUD_A, CLOUD_B } = A;

/* ---------- where things are ---------- */
const REGIONS = {
  village:   { plot: [330, 1790, 285, 150], top: "#9BD98F", side: "#5AA85A", gate: [532, 1884] },
  castle:    { plot: [885, 1645, 232, 118], top: "#A8E09B", side: "#5AA85A", gate: [690, 1700] },
  slope:     { plot: [305, 1448, 218, 96],  top: "#9BD98F", side: "#5AA85A", gate: [520, 1500] },
  hill:      { plot: [855, 1272, 226, 110], top: "#8CD384", side: "#4E9A50", gate: [672, 1318] },
  bagvalley: { plot: [335, 1098, 236, 114], top: "#D6C6F8", side: "#9E86D6", gate: [545, 1150] },
  candylane: { plot: [865, 928, 236, 112],  top: "#FFD3E2", side: "#E68FB0", gate: [682, 975] },
  lamplight: { plot: [335, 765, 240, 110],  top: "#A3B0F2", side: "#6373CF", gate: [548, 812] },
  theater:   { plot: [865, 600, 228, 106],  top: "#FFE5AC", side: "#E3B25E", gate: [686, 648] },
  plaza:     { plot: [400, 442, 244, 112],  top: "#FBE9A4", side: "#E8C04A", gate: [600, 500] }
};
const BUILDINGS = {
  stage:    { region: "village",   at: [372, 1812], k: 0.8 },
  florist:  { region: "village",   at: [180, 1782], k: 0.7 },
  hall:     { region: "castle",    at: [890, 1680], k: 0.84 },
  bench:    { region: "slope",     at: [300, 1496], k: 0.9 },
  lookout:  { region: "hill",      at: [862, 1322], k: 0.88 },
  sack:     { region: "bagvalley", at: [330, 1152], k: 0.86 },
  stall:    { region: "candylane", at: [862, 978], k: 0.8 },
  lamp:     { region: "lamplight", at: [330, 822], k: 0.98 },
  show:     { region: "theater",   at: [866, 652], k: 0.86 },
  fountain: { region: "plaza",     at: [398, 490], k: 0.8 }
};
const ROAD = [[356, 1962], [372, 1930], [420, 1895], [505, 1868], [610, 1800], [690, 1700], [660, 1590], [520, 1500], [545, 1410], [672, 1318], [640, 1225], [545, 1150], [570, 1060], [682, 975], [650, 890], [548, 812], [575, 725], [686, 648], [668, 570], [600, 500], [640, 395], [760, 300], [800, 180], [740, 70], [750, -40]];
const RIVER = [[-40, 1278], [140, 1262], [320, 1272], [470, 1318], [600, 1396], [760, 1448], [960, 1462], [1240, 1436]];
const SPURS = { village: [[505, 1868], [430, 1856], [372, 1830]], castle: [[690, 1700], [790, 1712], [888, 1694]], slope: [[520, 1500], [430, 1516], [318, 1510]], hill: [[672, 1318], [760, 1342], [850, 1334]], bagvalley: [[545, 1150], [450, 1176], [340, 1166]], candylane: [[682, 975], [770, 1000], [860, 992]], lamplight: [[548, 812], [470, 842], [400, 836]], theater: [[686, 648], [770, 674], [864, 666]], plaza: [[600, 500], [520, 516], [404, 506]] };

/* ---------- curve helpers ---------- */
function spline(pts, step = 6) {
  const raw = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < 24; j++) { const t = j / 24, t2 = t * t, t3 = t2 * t; raw.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
  }
  raw.push(pts[pts.length - 1]);
  const out = [raw[0]]; let acc = 0;
  for (let i = 1; i < raw.length; i++) { acc += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); if (acc >= step) { out.push(raw[i]); acc = 0; } }
  return out;
}
const dOf = (pts) => pts.map((p, i) => (i ? "L" : "M") + f(p[0]) + " " + f(p[1])).join("");
const near = (p, poly, d) => poly.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < d);
function blob(cx, cy, rx, ry, seed, wob = 0.07) {
  const r = rng(seed), n = 14, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * wob; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  let d = "";
  for (let i = 0; i < n; i++) { const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; if (!i) d += `M${f(p1[0])} ${f(p1[1])}`; d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`; }
  return d + "Z";
}
const at = (x, y, k, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${k})">${s}</g>`;

/* a landmark, more or less inflated: with no air it is a grey, sagging heap of soft balloons */
function landmark(id, t) {
  const { at: [x, y], k } = BUILDINGS[id], [bx, by, bw] = BOX[id];
  A.setT(t);
  let s = `<g transform="scale(${f(1 + 0.02 * (1 - t))} ${f(0.6 + 0.4 * t)}) skewX(${f(-4 * (1 - t))})">${B[id]()}</g>`;
  A.setT(1);
  if (t < 0.3) s += A.hiss(bx + bw * 0.8, by * 0.42, -24);
  return at(x, y, k, s);
}

function scene(levels = {}, opts = {}) {
  const lv = (id) => (levels[id] == null ? 1 : levels[id]);
  const r = rng(20261111);
  const road = spline(ROAD, 5), river = spline(RIVER, 6);
  const spurs = Object.values(SPURS).map((p) => spline(p, 5));
  let g = "";

  /* ground */
  g += `<rect width="${W}" height="${H}" fill="#7BC67A"/>`;
  for (let i = 0; i < 46; i++) { const x = r() * W, y = 120 + r() * (H - 120), rx = 60 + r() * 120; g += `<path d="${blob(x, y, rx, rx * (0.35 + r() * 0.2), 900 + i, 0.12)}" fill="${i % 3 ? "#6DBB6E" : "#8DD386"}" opacity=".75"/>`; }

  /* river */
  const rd = dOf(river);
  g += `<path d="${rd}" fill="none" stroke="${OUT}" stroke-width="72" stroke-linecap="round" stroke-linejoin="round"/><path d="${rd}" fill="none" stroke="#6FB2E4" stroke-width="64.500" stroke-linecap="round" stroke-linejoin="round"/><path d="${rd}" fill="none" stroke="#8EC8F0" stroke-width="52" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -4)"/>`;
  g += `<path d="${rd}" fill="none" stroke="#BFE7FF" stroke-width="6" stroke-linecap="round" stroke-dasharray="46 70" transform="translate(0 -14)"/><path d="${rd}" fill="none" stroke="#BFE7FF" stroke-width="5" stroke-linecap="round" stroke-dasharray="30 96" stroke-dashoffset="50" transform="translate(0 8)"/>`;

  /* region plots */
  let seed = 5;
  for (const [id, R] of Object.entries(REGIONS)) {
    const [cx, cy, rx, ry] = R.plot, d = blob(cx, cy, rx, ry, seed++ * 13, 0.06);
    g += `<path d="${d}" transform="translate(0 16)" fill="${R.side}" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><path d="${d}" fill="${R.top}" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>`;
    g += `<path d="${blob(cx - rx * 0.1, cy - ry * 0.12, rx * 0.74, ry * 0.66, seed * 7, 0.1)}" fill="#fff" opacity=".2"/>`;
    if (id === "plaza") { for (const k of [0.82, 0.56, 0.3]) g += `<ellipse cx="${cx}" cy="${cy + 14}" rx="${rx * k}" ry="${ry * k}" fill="${k === 0.56 ? "#FFF3C4" : "#F6DC84"}" stroke="#E0B94A" stroke-width="2.500"/>`; }
    if (id === "slope") g += at(300, 1496, 0.9, A.shape("M-170 6C-150 -70 -80 -112 0 -112S150 -70 170 6C110 22 -110 22 -170 6Z", "#B4E6A2") + A.flat("M60 -100C120 -78 150 -40 164 4C140 12 110 15 84 16C110 -20 100 -64 60 -100Z", "#8ACF83") + `<ellipse cx="-60" cy="-84" rx="42" ry="12" fill="#D2F2C2" transform="rotate(-16 -60 -84)"/>` + A.shape("M-22 14C-18 -30 -26 -60 -2 -98H22C8 -62 20 -28 28 14Z", "#E6AA62", { sw: 3 }) + `<ellipse cx="5" cy="-20" rx="13" ry="5.500" fill="#F3CC92"/><ellipse cx="2" cy="-48" rx="11" ry="4.500" fill="#F3CC92"/><ellipse cx="8" cy="-76" rx="9" ry="4" fill="#F3CC92"/>`);
    if (id === "village") g += `<path d="${blob(372, 1848, 150, 42, 31, 0.08)}" fill="#E6AA62" stroke="${OUT}" stroke-width="3.200"/><ellipse cx="340" cy="1842" rx="46" ry="11" fill="#F0C386"/>`;
    if (id === "theater") g += `<path d="M806 668h120l14 44h-148Z" fill="#F46464" stroke="${OUT}" stroke-width="3.200" stroke-linejoin="round"/><path d="M822 676h88" stroke="#FF9C94" stroke-width="5" stroke-linecap="round"/>`;
    if (id === "candylane") for (let i = 0; i < 7; i++) { const a = r() * 6.28, q = 0.55 + r() * 0.3; g += `<circle cx="${f(cx + Math.cos(a) * rx * q)}" cy="${f(cy + 20 + Math.sin(a) * ry * q * 0.7)}" r="${f(7 + r() * 5)}" fill="#fff" opacity=".55"/>`; }
    if (id === "lamplight") for (let i = 0; i < 9; i++) { const a = r() * 6.28, q = 0.4 + r() * 0.45; g += star(cx + Math.cos(a) * rx * q, cy + 6 + Math.sin(a) * ry * q * 0.8, 5 + r() * 3, "white", { sw: 1.6 }).replace(/stroke="#2A2218"/, 'stroke="#6373CF"'); }
    if (id === "bagvalley") for (let i = 0; i < 8; i++) { const a = r() * 6.28, q = 0.5 + r() * 0.36; g += star(cx + Math.cos(a) * rx * q, cy + 10 + Math.sin(a) * ry * q * 0.8, 5 + r() * 4, "gold", { sw: 1.8 }); }
  }

  /* roads */
  const roads = [[road, 50], ...spurs.map((s) => [s, 32])];
  for (const [p, w] of roads) g += `<path d="${dOf(p)}" fill="none" stroke="${OUT}" stroke-width="${w + 7.500}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const [p, w] of roads) g += `<path d="${dOf(p)}" fill="none" stroke="#DE9E5A" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const [p, w] of roads) g += `<path d="${dOf(p)}" fill="none" stroke="#E6AA62" stroke-width="${w - 9}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -2.500)"/>`;
  for (let i = 8; i < road.length - 2; i += 9) { const [x, y] = road[i], n = road[i + 1], a = Math.atan2(n[1] - y, n[0] - x) * 180 / Math.PI; g += `<ellipse cx="${f(x)}" cy="${f(y - 2)}" rx="${f(13 + (i % 4))}" ry="${f(7 + (i % 3))}" fill="#F3CB90" transform="rotate(${f(a)} ${f(x)} ${f(y)})"/>`; }

  /* bridge where the road meets the river */
  let cross = 0, best = 1e9;
  road.forEach((p, i) => { for (const q of river) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best) { best = d; cross = i; } } });
  const bridgePts = road.slice(cross - 10, cross + 11);
  let bridge = "";
  bridgePts.forEach((p, i) => { if (i % 2 || i >= bridgePts.length - 1) return; const n = bridgePts[i + 1], a = Math.atan2(n[1] - p[1], n[0] - p[0]) + Math.PI / 2, dx = Math.cos(a) * 31, dy = Math.sin(a) * 31; bridge += cap(p[0] - dx, p[1] - dy, p[0] + dx, p[1] + dy, 12.500, i % 4 ? "yellow" : "orange", { ext: 0.3, sw: 2.8 }); });
  const rail = (side) => bridgePts.filter((_, i) => i % 3 === 1).map((p, i, arr) => { const j = bridgePts.indexOf(p), n = bridgePts[Math.min(bridgePts.length - 1, j + 1)], a = Math.atan2(n[1] - p[1], n[0] - p[0]) + Math.PI / 2; const lift = Math.sin((i + 0.5) / arr.length * Math.PI) * 10; return [p[0] + Math.cos(a) * 38 * side, p[1] + Math.sin(a) * 38 * side - 6 - lift]; });
  g += bridge;

  /* bead borders along the road */
  const beadSet = [];
  for (let i = 4; i < road.length - 3; i += 5) {
    if (Math.abs(i - cross) < 14) continue;
    const [x, y] = road[i], n = road[i + 1], a = Math.atan2(n[1] - y, n[0] - x) + Math.PI / 2;
    for (const side of [-1, 1]) { const p = [x + Math.cos(a) * 33 * side, y + Math.sin(a) * 33 * side]; if (spurs.some((s) => near(p, s, 22))) continue; beadSet.push(p); }
  }
  beadSet.sort((a, b) => a[1] - b[1]).forEach((p, i) => { g += ball(p[0], p[1], 8.500, RAINBOW[(i * 5 + Math.floor(p[0])) % RAINBOW.length], { sw: 2.4, ry: 7.500 }); });

  /* grass detail */
  const plots = Object.values(REGIONS).map((R) => R.plot);
  const inPlot = (x, y, pad = 0) => plots.some(([cx, cy, rx, ry]) => ((x - cx) / (rx + pad)) ** 2 + ((y - cy - 8) / (ry + pad + 8)) ** 2 < 1);
  const free = (x, y, pad) => !inPlot(x, y, pad) && !near([x, y], road, 40 + pad) && !near([x, y], river, 46 + pad) && !spurs.some((s) => near([x, y], s, 26 + pad));
  for (let i = 0; i < 260; i++) { const x = r() * W, y = 150 + r() * (H - 160); if (!free(x, y, 6)) continue; g += i % 3 ? tuft(Math.round(x), Math.round(y)) : tinyFlower(Math.round(x), Math.round(y), ["#FFC0D5", "#FFFFFF", "#FFEA94", "#D6BCF7"][i % 4]); }

  /* ---------- standing things, back to front ---------- */
  const O = [];
  const put = (x, y, k, s, z = 0) => O.push({ y: y + z, s: at(x, y, k, s) });

  for (const id of Object.keys(BUILDINGS)) O.push({ y: BUILDINGS[id].at[1], s: landmark(id, lv(id)) });
  O.push({ y: road[cross][1] + 30, s: beads(rail(1), 9, ["blue", "white"], { sw: 2.4 }) });
  O.push({ y: road[cross][1] - 40, s: beads(rail(-1), 9, ["blue", "white"], { sw: 2.4 }) });

  // village
  put(118, 1860, 0.62, cottage("blue", "orange")); put(566, 1752, 0.52, cottage("yellow", "pink")); put(278, 1716, 0.5, cottage("purple", "teal"));
  put(470, 1866, 0.5, archGate(9, 54, 70), -30);
  put(70, 1750, 0.7, tree("pink", 1)); put(486, 1690, 0.56, tree("yellow", 0)); put(160, 1700, 0.6, tree("green", 2)); put(590, 1870, 0.55, bush("green", 4)); put(250, 1905, 0.7, flower("pink")); put(160, 1920, 0.6, flower("yellow")); put(92, 1905, 0.6, bush("lime", 3));
  put(540, 1900, 0.5, dog("pink")); put(354, 1972, 0.62, archGate(11, 62, 84), 20);
  // castle
  put(742, 1600, 0.58, tree("pink", 0)); put(1080, 1640, 0.66, tree("yellow", 1)); put(1040, 1720, 0.6, bush("green", 5)); put(740, 1730, 0.55, bush("lime", 4)); put(1004, 1750, 0.7, flower("red")); put(775, 1752, 0.62, flower("blue")); put(1100, 1730, 0.6, flower("yellow"));
  put(990, 1700, 0.5, bush("green", 3)); put(790, 1690, 0.5, bush("green", 3));
  // slope
  put(120, 1452, 0.6, tree("green", 0)); put(100, 1400, 0.5, tree("lime", 2)); put(150, 1520, 0.6, bush("green", 4)); put(455, 1530, 0.62, flower("yellow")); put(196, 1538, 0.55, flower("pink"));
  put(470, 1492, 0.46, dog("blue"));
  // hill (forest)
  put(712, 1232, 0.6, tree("green", 0)); put(1020, 1230, 0.7, tree("green", 1)); put(1050, 1320, 0.62, tree("lime", 2)); put(740, 1190, 0.56, tree("teal", 2)); put(985, 1345, 0.6, bush("green", 5)); put(730, 1352, 0.56, bush("lime", 4)); put(960, 1180, 0.55, tree("lime", 0));
  put(790, 1368, 0.6, flower("red"));
  // bag valley
  put(128, 1090, 0.64, tree("purple", 1)); put(486, 1046, 0.56, tree("purple", 0)); put(170, 1168, 0.6, bush("purple", 4)); put(486, 1186, 0.56, bush("pink", 3)); put(215, 1040, 0.5, tree("pink", 2));
  O.push({ y: 1120, s: floaty(470, 1010, 13, "yellow", 474, 1090) + floaty(196, 990, 12, "teal", 200, 1060) });
  put(455, 1120, 0.6, flower("purple"));
  // candy lane
  put(716, 892, 0.56, tree("pink", 2)); put(1046, 900, 0.66, tree("orange", 1)); put(1040, 990, 0.58, cottage("pink", "yellow")); put(735, 1000, 0.56, bush("pink", 4)); put(985, 1020, 0.62, flower("red")); put(700, 968, 0.6, flower("pink"));
  put(775, 880, 0.5, tree("yellow", 0));
  // lamplight
  put(120, 760, 0.66, tree("navy", 1)); put(500, 716, 0.56, tree("purple", 2)); put(190, 700, 0.56, tree("teal", 0)); put(458, 700, 0.5, tree("navy", 0)); put(150, 838, 0.6, bush("navy", 4)); put(505, 846, 0.55, bush("purple", 3));
  // theater
  put(716, 556, 0.54, tree("red", 1)); put(1040, 560, 0.64, tree("yellow", 0)); put(1034, 660, 0.56, bush("green", 4)); put(712, 668, 0.52, bush("lime", 3));
  for (const x of [770, 962]) O.push({ y: 690, s: cap(x, 694, x, 668, 7, "gold", { sw: 2.4 }) + ball(x, 662, 6, "gold", { sw: 2.2 }) });
  // plaza
  put(210, 470, 0.5, archGate(9, 54, 70)); put(588, 452, 0.5, archGate(9, 54, 70));
  put(190, 404, 0.56, tree("pink", 0)); put(566, 372, 0.52, tree("blue", 1)); put(250, 520, 0.6, flower("yellow")); put(545, 528, 0.6, flower("pink")); put(300, 372, 0.5, tree("yellow", 2)); put(505, 366, 0.5, tree("pink", 2));
  put(520, 478, 0.5, dog("yellow"));
  O.push({ y: 520, s: floaty(236, 380, 12, "red", 240, 446) + floaty(566, 360, 12, "blue", 568, 430) });

  /* forests and scatter in the gaps */
  const taken = [];
  const clear = (x, y, k) => [40, 80, 120].every((h) => !near([x, y - h * k], road, 34) && !spurs.some((s) => near([x, y - h * k], s, 30)) && !Object.values(BUILDINGS).some((b) => Math.abs(b.at[0] - x) < 120 && y > b.at[1] && y - b.at[1] < 150));
  const spot = (x, y, d) => free(x, y, 26) && !taken.some((t) => Math.hypot(t[0] - x, t[1] - y) < d) && (taken.push([x, y]), true);
  const TREEC = ["green", "lime", "pink", "yellow", "blue", "green", "teal", "orange"];
  for (let i = 0; i < 900; i++) {
    const edge = r() < 0.55, x = edge ? (r() < 0.5 ? r() * 110 : W - r() * 110) : 40 + r() * (W - 80), y = 110 + r() * (H - 130);
    const kind = r();
    if (kind < 0.42) { if (clear(x, y, 0.7) && spot(x, y, 78)) put(x, y, 0.5 + r() * 0.22, tree(TREEC[Math.floor(r() * TREEC.length)], Math.floor(r() * 3))); }
    else if (kind < 0.72) { if (spot(x, y, 58)) put(x, y, 0.5 + r() * 0.2, bush(r() < 0.75 ? "green" : "lime", 3 + Math.floor(r() * 3))); }
    else if (spot(x, y, 46)) put(x, y, 0.5 + r() * 0.25, flower(["pink", "yellow", "red", "purple", "blue"][Math.floor(r() * 5)]));
  }
  // a few loose balloons drifting over the land
  for (const [x, y, c] of [[610, 1640, "red"], [150, 1330, "yellow"], [1090, 1110, "pink"], [600, 930, "blue"], [1120, 780, "purple"], [90, 610, "orange"]]) O.push({ y: y + 400, s: shadow(x + 14, y + 86, 13, 4) + floaty(x, y, 15, c, x + 5, y + 52) });

  O.sort((a, b) => a.y - b.y);
  g += O.map((o) => o.s).join("");

  /* the far north is still under cloud */
  g += `<defs><linearGradient id="north" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE7FF"/><stop offset=".55" stop-color="#BFE7FF" stop-opacity=".92"/><stop offset="1" stop-color="#BFE7FF" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="250" fill="url(#north)"/>`;
  if (!opts.noClouds) for (const [x, y, k, L] of [[150, 60, 1.1, CLOUD_A], [520, 20, 1.2, CLOUD_B], [900, 50, 1.25, CLOUD_A], [1130, 150, 0.9, CLOUD_B], [330, 150, 1.0, CLOUD_B], [680, 130, 1.1, CLOUD_A], [40, 190, 0.8, CLOUD_B], [990, 210, 0.7, CLOUD_B]]) g += at(x, y, k, cloud(L));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* layout.json numbers come from the same source as the drawing */
function layout() {
  const out = { size: [W, H], cloud: [486, 311], regions: {}, spare: [{ pin: [330, 150], rect: [200, 40, 260, 170] }, { pin: [900, 250], rect: [800, 150, 260, 170] }, { pin: [640, 110], rect: [520, 20, 240, 150] }, { pin: [1040, 400], rect: [960, 320, 200, 150] }] };
  for (const [id, R] of Object.entries(REGIONS)) {
    const [cx, cy, rx, ry] = R.plot; let top = cy - ry, left = cx - rx, right = cx + rx; const buildings = {};
    for (const [bid, b] of Object.entries(BUILDINGS)) if (b.region === id) {
      const [bx, by, bw, bh] = BOX[bid], rect = [b.at[0] + bx * b.k, b.at[1] + by * b.k, bw * b.k, bh * b.k].map(Math.round);
      buildings[bid] = { rect, hammer: [b.at[0], Math.round(b.at[1] + by * b.k * (bid === "fountain" ? 0.5 : 0.92))] };
      top = Math.min(top, rect[1] + 30); left = Math.min(left, rect[0]); right = Math.max(right, rect[0] + rect[2]);
    }
    out.regions[id] = { pin: R.gate, rect: [left - 6, top, right - left + 12, cy + ry + 26 - top].map(Math.round), buildings };
  }
  return out;
}

module.exports = { scene, layout, REGIONS, BUILDINGS, landmark };
