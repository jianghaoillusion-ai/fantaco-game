/* The ten repairable landmarks, all built out of balloons. Local coords: base centre at 0,0, up is -y. */
const A = require("./art.cjs");
const { OUT, PAL, RAINBOW, ball, cap, chain, shadow, shape, flat, rrect, line, curve, star, arcPts, beads, flag, floaty, flower, tone, P, f } = A;
const roofRows = (rows, c) => rows.map(([y, n, r, dx = 0]) => Array.from({ length: n }, (_, i) => ball(dx + (i - (n - 1) / 2) * r * 1.56, y, r, Array.isArray(c) ? c[i % c.length] : c)).join("")).join("");
const win = (x, y, w, h) => shape(`M${x - w / 2} ${y}V${y - h + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y}Z`, PAL.sky[0], { sw: 3 }) + `<path d="M${x - w / 2 + 4} ${y - h + w / 2 + 2}a${w / 2 - 4} ${w / 2 - 4} 0 0 1 ${w / 2 - 4} -${w / 2 - 4}" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>`;

const B = {};

B.stage = () => {
  let s = shadow(0, 6, 118, 18);
  // backdrop curtain
  s += shape("M-74 -30V-150H74V-30Z", PAL.pink[0]) + flat("M-50 -148h16v116h-16ZM-8 -148h16v116h-16ZM34 -148h16v116h-16Z", PAL.pink[1], 0.75) + flat("M-74 -150h148v14h-148Z", PAL.pink[2], 0.7);
  s += star(0, -92, 20, "gold") + star(-42, -70, 9, "white") + star(42, -70, 9, "white");
  // floor
  s += cap(-92, -22, 92, -22, 20, "yellow") + cap(-102, -6, 102, -6, 22, "orange");
  // columns
  for (const x of [-88, 88]) s += beads([[x, -44], [x, -74], [x, -104], [x, -134]], 17, x < 0 ? ["blue", "white", "blue", "white"] : ["white", "blue", "white", "blue"]);
  // arch + smile
  s += beads(arcPts(0, -150, 88, 62, 180, 360, 11), 15, RAINBOW);
  s += ball(0, -222, 26, "yellow") + `<circle cx="-9" cy="-227" r="3.200" fill="${OUT}"/><circle cx="9" cy="-227" r="3.200" fill="${OUT}"/>` + curve("M-11 -216q11 11 22 0", 3);
  return s;
};

B.florist = () => {
  let s = shadow(0, 5, 92, 15);
  s += rrect(-58, -84, 116, 84, 12, PAL.cream[0]) + `<rect x="30" y="-80" width="24" height="76" rx="9" fill="${tone(PAL.cream[1])}"/>`;
  s += shape("M-40 0V-36a16 16 0 0 1 32 0V0Z", PAL.teal[0], { sw: 3 }) + `<circle cx="-15" cy="-20" r="2.600" fill="${OUT}"/>`;
  s += rrect(6, -58, 40, 30, 6, PAL.sky[2], { sw: 3 }) + line(26, -58, 26, -28, 2.6);
  // awning
  s += shape("M0 -62h52v10a6.500 6.500 0 0 1 -13 0a6.500 6.500 0 0 1 -13 0a6.500 6.500 0 0 1 -13 0a6.500 6.500 0 0 1 -13 0Z", PAL.white[0], { sw: 2.8 }) + flat("M13 -61h13v9a6.500 6.500 0 0 1 -13 0ZM39 -61h12v9a6.500 6.500 0 0 1 -12 0Z", PAL.pink[0]);
  s += roofRows([[-92, 5, 17], [-114, 4, 16.500], [-134, 3, 16], [-152, 2, 15], [-168, 1, 14]], "pink");
  s += `<g transform="translate(0 -188) scale(.62)">${flower("yellow", 1).replace(/<ellipse[^>]*opacity="\.16"\/>/, "")}</g>`;
  s += `<g transform="translate(-82 4)">${flower("red", 1.1)}</g><g transform="translate(78 6)">${flower("purple", 1.05)}</g><g transform="translate(54 10) scale(.8)">${flower("yellow", 1)}</g><g transform="translate(-58 10) scale(.8)">${flower("blue", 1)}</g>`;
  return s;
};

B.hall = () => {
  let s = shadow(0, 8, 170, 24);
  const tower = (x, h, w, roof, bead) => {
    let t = rrect(x - w / 2, -h, w, h, 9, PAL.cream[0]) + `<rect x="${x + w / 2 - 16}" y="${-h + 4}" width="12" height="${h - 8}" rx="6" fill="${tone(PAL.cream[1])}"/>`;
    const n = Math.round(w / 19);
    t += beads(Array.from({ length: n }, (_, i) => [x + (i - (n - 1) / 2) * (w / n + 1.5), -h]), w / n / 2 + 2.5, [bead]);
    return t + roof;
  };
  // side towers
  for (const [x, c, fc] of [[-104, "blue", "red"], [104, "blue", "yellow"]]) {
    s += flag(x, -222, 34, fc, x < 0 ? -1 : 1);
    s += tower(x, 150, 58, roofRows([[-166, 3, 15, x], [-187, 2, 14, x], [-206, 1, 13, x]], "pink"), c);
    s += win(x, -92, 22, 34);
  }
  // wall between
  s += rrect(-128, -56, 256, 56, 8, PAL.cream[0]) + beads(Array.from({ length: 12 }, (_, i) => [-121 + i * 22, -58]), 11, ["orange", "yellow"]);
  // keep
  s += flag(0, -306, 40, "yellow");
  s += tower(0, 196, 116, roofRows([[-212, 5, 17], [-236, 4, 16.500], [-258, 3, 16], [-278, 2, 15], [-296, 1, 14]], "pink"), "yellow");
  s += win(-30, -138, 22, 32) + win(30, -138, 22, 32);
  // trophy
  s += shape("M-13 -116h26v8a13 13 0 0 1 -26 0Z", PAL.gold[0], { sw: 3 }) + shape("M-5 -96h10v6h6v5h-22v-5h6Z", PAL.gold[1], { sw: 2.6 }) + curve("M-13 -113q-10 2 -6 10M13 -113q10 2 6 10", 2.8);
  // door with bead arch
  s += shape("M-24 0V-48a24 24 0 0 1 48 0V0Z", PAL.brown[0]) + line(0, -70, 0, 0, 2.6) + `<circle cx="-7" cy="-30" r="2.800" fill="${OUT}"/><circle cx="7" cy="-30" r="2.800" fill="${OUT}"/>`;
  s += beads([[-32, -8], [-32, -30], [-30, -52], [-18, -70], [0, -78], [18, -70], [30, -52], [32, -30], [32, -8]], 10.5, ["blue", "sky"]);
  // pennants
  s += curve("M-76 -150Q-88 -128 -104 -150", 2.4) + curve("M76 -150Q88 -128 104 -150", 2.4);
  for (const [x, y, c] of [[-84, -139, "red"], [-95, -140, "yellow"], [84, -139, "blue"], [95, -140, "pink"]]) s += shape(`M${x - 5} ${y}h10l-5 11Z`, PAL[c][0], { sw: 2.2 });
  return s;
};

B.bench = () => {
  let s = shadow(-70, -72, 50, 8);
  s += cap(-104, -78, -104, -98, 9, "brown", { sw: 2.6 }) + cap(-36, -78, -36, -98, 9, "brown", { sw: 2.6 });
  s += cap(-108, -128, -32, -128, 14, "orange") + cap(-108, -113, -32, -113, 14, "yellow") + cap(-112, -96, -28, -96, 16, "orange");
  s += cap(-106, -100, -106, -132, 9, "brown", { sw: 2.6 }) + cap(-34, -100, -34, -132, 9, "brown", { sw: 2.6 });
  // signpost with balloons
  s += shadow(80, -62, 16, 5) + cap(80, -64, 80, -138, 10, "brown", { sw: 2.8 });
  s += shape("M58 -128h44l16 13l-16 13h-44Z", PAL.yellow[0], { sw: 3 }) + curve("M70 -115h26", 3);
  s += floaty(62, -196, 17, "red", 80, -142) + floaty(100, -204, 17, "blue", 80, -142) + floaty(82, -226, 18, "yellow", 80, -142);
  return s;
};

B.lookout = () => {
  let s = shadow(0, 6, 86, 16);
  s += chain([[-18, 0], [14, -40], [-14, -80], [12, -116]], 20, "brown") + chain([[18, 0], [-14, -40], [14, -80], [-12, -116]], 20, "orange");
  s += cap(-10, -112, -62, -140, 16, "brown") + cap(10, -112, 62, -140, 16, "orange");
  // back crown
  for (const [x, y, r] of [[-70, -170, 34], [70, -172, 34], [-36, -222, 36], [38, -224, 36], [0, -250, 34], [-98, -140, 26], [98, -142, 26]]) s += ball(x, y, r, "green");
  // ladder
  s += line(-34, -132, -52, 0, 3.4) + line(-6, -132, -22, 0, 3.4);
  for (let i = 0; i < 5; i++) { const y = -18 - i * 24, k = (-y) / 132; s += cap(-50 + 18 * k, y, -22 + 16 * k, y, 8, "yellow", { sw: 2.4 }); }
  // deck + hut
  s += cap(-66, -134, 66, -134, 16, "brown");
  s += rrect(-36, -196, 72, 56, 9, PAL.cream[0]) + `<rect x="16" y="-192" width="16" height="48" rx="7" fill="${tone(PAL.cream[1])}"/>`;
  s += `<circle cx="-10" cy="-166" r="13" fill="${tone(PAL.sky[2])}" stroke="${OUT}" stroke-width="3"/>` + line(-10, -179, -10, -153, 2.4) + line(-23, -166, 3, -166, 2.4);
  s += roofRows([[-204, 4, 14.500], [-223, 3, 14], [-240, 2, 13], [-254, 1, 12]], "red");
  s += flag(0, -264, 30, "yellow");
  // telescope
  s += cap(34, -160, 64, -176, 12, "blue", { sw: 2.8 }) + ball(68, -178, 7, "gold", { sw: 2.4 }) + line(46, -150, 46, -138, 3);
  // front crown
  for (const [x, y, r] of [[-74, -196, 26], [76, -200, 26], [-58, -150, 22], [84, -150, 20]]) s += ball(x, y, r, "lime");
  return s;
};

B.sack = () => {
  let s = shadow(0, 6, 96, 18);
  const body = "M-74 -6C-118 -40 -102 -122 -44 -150C-30 -158 30 -158 44 -150C102 -122 118 -40 74 -6C44 10 -44 10 -74 -6Z";
  const [b, sh, l] = P("purple");
  s += `<path d="${body}" fill="${sh}"/><path d="M-70 -12C-106 -44 -92 -118 -40 -146C-26 -153 22 -153 34 -146C80 -120 92 -52 64 -16C36 0 -42 2 -70 -12Z" fill="${b}"/><ellipse cx="-50" cy="-84" rx="22" ry="38" fill="${l}" opacity=".6" transform="rotate(18 -50 -84)"/><ellipse cx="-58" cy="-104" rx="7" ry="15" fill="#fff" opacity="${0.9 * Math.max(0.15, A.getT())}" transform="rotate(22 -58 -104)"/>`;
  s += shape(body, "none");
  if (A.getT() < 1) s += `<g opacity="${f(0.6 * (1 - A.getT()))}">${curve("M-84 -52q26 20 58 8M34 -128q22 14 34 44M-18 -22q30 10 62 -6M-66 -112q10 -16 30 -22", 2.6)}</g>`;
  s += star(18, -70, 17, "gold") + star(-22, -34, 9, "gold") + star(52, -104, 8, "gold") + star(54, -36, 7, "white");
  // open mouth
  s += shape("M-62 -176C-62 -196 62 -196 62 -176C62 -160 44 -150 0 -150S-62 -160 -62 -176Z", PAL.purple[2]) + `<ellipse cx="0" cy="-176" rx="48" ry="12" fill="${tone("#5B3F9A")}" stroke="${OUT}" stroke-width="3"/>`;
  // things popping out
  s += line(-20, -176, -44, -236, 5) + line(-20, -176, -44, -236, 2, "#fff") + star(-46, -242, 12, "gold");
  s += `<g transform="rotate(14 26 -200)">${rrect(12, -226, 30, 42, 5, "#FFFFFF", { sw: 2.8 })}<path d="M27 -212c-6 -8 -14 2 0 12c14 -10 6 -20 0 -12Z" fill="${tone(PAL.red[0])}"/></g>`;
  s += floaty(-4, -252, 16, "pink", -2, -180) + floaty(52, -246, 14, "teal", 10, -180);
  // drawstring
  s += cap(-50, -150, 50, -150, 13, "gold") + ball(-12, -138, 8, "gold", { rx: 11, ry: 7, rot: 30, sw: 2.6 }) + ball(12, -138, 8, "gold", { rx: 11, ry: 7, rot: -30, sw: 2.6 }) + ball(0, -144, 6, "yellow", { sw: 2.6 });
  s += star(-92, -170, 7, "white") + star(86, -196, 6, "yellow");
  return s;
};

function lolly(x, y, r, c, c2) {
  return cap(x, y, x, y - 60, 7, "white", { sw: 2.4 }) + ball(x, y - 60 - r, r, c) + `<path d="M${x} ${y - 60 - r}m0 0a${r * 0.22} ${r * 0.22} 0 1 1 ${r * 0.3} ${r * 0.1}a${r * 0.5} ${r * 0.5} 0 1 1 ${-r * 0.75} ${-r * 0.2}a${r * 0.72} ${r * 0.72} 0 0 1 ${r * 1.05} ${-r * 0.42}" fill="none" stroke="${tone(PAL[c2][2])}" stroke-width="${r * 0.2}" stroke-linecap="round"/>`;
}
B.stall = () => {
  let s = shadow(0, 6, 132, 18);
  s += lolly(-124, 2, 22, "red", "white") + lolly(126, 2, 22, "teal", "white");
  s += cap(-88, -52, -88, -132, 12, "white") + cap(88, -52, 88, -132, 12, "white");
  // back
  s += rrect(-80, -124, 160, 74, 4, "#FFE3EC", { sw: 3 });
  s += rrect(-66, -92, 132, 8, 4, PAL.brown[0], { sw: 2.6 }) + beads([[-48, -104], [-24, -104], [0, -104], [24, -104], [48, -104]], 10, ["yellow", "teal", "pink", "purple", "orange"]);
  // counter
  s += rrect(-98, -58, 196, 58, 10, PAL.cream[0]) + flat("M-92 -40h184v14h-184Z", PAL.pink[0], 0.9) + `<rect x="-92" y="-14" width="184" height="10" rx="5" fill="${tone(PAL.cream[1])}"/>`;
  s += ball(-60, -72, 13, "red") + ball(-32, -72, 13, "yellow") + shape("M8 -60h34l-5 -24h-24Z", PAL.sky[2], { sw: 2.8 }) + ball(18, -78, 5, "pink", { sw: 2 }) + ball(30, -74, 5, "lime", { sw: 2 }) + ball(25, -84, 5, "orange", { sw: 2 });
  s += ball(66, -72, 13, "purple");
  // awning
  const n = 8, w = 224 / n; let stripes = "";
  for (let i = 0; i < n; i++) { const x = -112 + i * w; stripes += shape(`M${f(x)} -168h${f(w)}v32a${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(-w)} 0Z`, i % 2 ? PAL.white[0] : PAL.pink[0], { sw: 3 }); }
  s += stripes + flat("M-110 -166h220v8h-220Z", "#FFFFFF", 0.35);
  s += beads(Array.from({ length: 9 }, (_, i) => [-104 + i * 26, -172]), 12, ["pink", "white"]);
  // candy sign
  s += shape("M-34 -206l-22 -14v28Z", PAL.yellow[0], { sw: 3 }) + shape("M34 -206l22 -14v28Z", PAL.yellow[0], { sw: 3 }) + ball(0, -206, 22, "orange", { rx: 36 }) + curve("M-14 -222q10 16 0 32M8 -224q10 18 0 36", 3, tone("#FFF0D2"));
  return s;
};

B.lamp = () => {
  let s = "";
  const T = A.getT();
  const post = (x, y, k) => {
    let p = shadow(x, y + 2, 20 * k, 6 * k) + ball(x, y - 6 * k, 11 * k, "navy", { rx: 15 * k, ry: 9 * k, sw: 3 });
    p += cap(x, y - 10 * k, x, y - 92 * k, 11 * k, "navy", { sw: 3 });
    if (T > 0.5) p += `<circle cx="${x}" cy="${y - 118 * k}" r="${44 * k}" fill="#FFF3A6" opacity=".4"/><circle cx="${x}" cy="${y - 118 * k}" r="${32 * k}" fill="#FFF6BF" opacity=".55"/>`;
    p += shape(`M${x - 13 * k} ${y - 96 * k}h${26 * k}l${-5 * k} ${10 * k}h${-16 * k}Z`, PAL.gold[1], { sw: 2.8 });
    p += ball(x, y - 118 * k, 23 * k, T > 0.5 ? "yellow" : "white") + (T > 0.5 ? star(x, y - 116 * k, 8 * k, "white", { sw: 2 }) : "");
    p += shape(`M${x - 8 * k} ${y - 142 * k}h${16 * k}l${-8 * k} ${-10 * k}Z`, PAL.gold[0], { sw: 2.6 });
    return p;
  };
  // stepping stones
  for (const [x, y, rx] of [[-62, 12, 20], [-22, 2, 17], [22, 6, 19], [64, -4, 17]]) s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.4}" fill="${tone("#DCE2FF")}" stroke="${OUT}" stroke-width="2.600"/>`;
  s += post(-98, -18, 0.86) + post(0, -44, 0.8) + post(98, -14, 0.92);
  s += curve("M-98 -108Q-50 -76 0 -116", 2.4) + curve("M0 -116Q50 -78 98 -106", 2.4);
  for (const [x, y, c] of [[-72, -94, "pink"], [-48, -92, "teal"], [-24, -100, "yellow"], [26, -100, "purple"], [50, -92, "orange"], [74, -92, "pink"]]) s += ball(x, y + 8, 7, T > 0.5 ? c : "white", { sw: 2.2 });
  return s;
};

B.show = () => {
  let s = shadow(0, 6, 124, 18);
  // curtains
  for (const x of [-100, 100]) s += beads([[x, -40], [x, -70], [x, -100], [x, -130], [x, -160]], 17, ["red"]);
  s += shape("M-84 -30V-176H84V-30Z", "#FFE9B8") + flat("M-84 -176h168v18h-168Z", PAL.gold[0], 0.8);
  s += star(-58, -132, 9, "gold") + star(60, -120, 8, "gold") + star(-52, -76, 7, "white") + star(56, -70, 7, "white");
  // floor
  s += cap(-96, -22, 96, -22, 20, "gold") + cap(-106, -6, 106, -6, 22, "red");
  // hat
  const [b, sh, l] = P("black");
  s += `<path d="M-40 -40L-46 -128H46L40 -40Z" fill="${sh}"/><path d="M-38 -40L-44 -128H26L22 -40Z" fill="${b}"/><rect x="-34" y="-122" width="9" height="56" rx="4.500" fill="${l}" opacity=".8"/>` + shape("M-40 -40L-46 -128H46L40 -40Z", "none");
  s += flat("M-42.500 -66h85l-1.500 22h-82Z", PAL.red[0]) + curve("M-42 -66h84", 3);
  s += `<ellipse cx="0" cy="-128" rx="46" ry="10" fill="${tone("#221D2C")}" stroke="${OUT}" stroke-width="3.200"/>`;
  s += cap(-58, -38, 58, -38, 15, "black");
  // out of the hat
  s += line(18, -128, 46, -176, 5) + line(18, -128, 46, -176, 2, "#fff") + star(50, -184, 13, "gold");
  s += `<g transform="rotate(-16 -22 -150)">${rrect(-36, -172, 28, 40, 5, "#FFFFFF", { sw: 2.8 })}<path d="M-22 -146c-9 -7 -9 -14 0 -22c9 8 9 15 0 22Zm-3 0h6l2 6h-10Z" fill="${OUT}"/></g>`;
  s += floaty(4, -206, 15, "purple", 4, -132);
  // valance
  s += beads(arcPts(0, -176, 100, 26, 180, 360, 11), 14, ["gold", "red"]);
  return s;
};

B.fountain = () => {
  const T = A.getT();
  let s = shadow(0, 8, 128, 22);
  const water = T > 0.5 ? PAL.sky[0] : "#D8D2C6";
  // back rim
  s += beads(arcPts(0, -26, 108, 34, 200, 340, 9), 13, ["blue", "white"]);
  s += `<ellipse cx="0" cy="-22" rx="104" ry="33" fill="${tone(water)}" stroke="${OUT}" stroke-width="3.600"/>`;
  if (T > 0.5) s += `<ellipse cx="-44" cy="-28" rx="26" ry="6" fill="#BFE7FF"/><ellipse cx="50" cy="-14" rx="20" ry="5" fill="#BFE7FF"/>`;
  // pedestal
  s += cap(0, -22, 0, -70, 26, "cream") + `<ellipse cx="0" cy="-82" rx="52" ry="15" fill="${tone(PAL.cream[1])}" stroke="${OUT}" stroke-width="3.400"/><ellipse cx="0" cy="-86" rx="42" ry="10" fill="${tone(water)}" stroke="${OUT}" stroke-width="2.800"/>`;
  if (T > 0.5) s += curve("M-8 -96C-30 -122 -52 -92 -60 -44", 6, "#BFE7FF") + curve("M8 -96C30 -122 52 -92 60 -44", 6, "#BFE7FF") + curve("M-8 -96C-30 -122 -52 -92 -60 -44", 2, "#fff") + curve("M8 -96C30 -122 52 -92 60 -44", 2, "#fff");
  s += cap(0, -86, 0, -108, 16, "cream") + star(0, -124, 16, "gold");
  // front rim
  s += beads(arcPts(0, -20, 110, 36, 12, 168, 12), 14, ["white", "blue"]);
  // balloons rising
  if (T > 0.5) {
    s += floaty(-52, -196, 18, "red", -4, -128) + floaty(50, -206, 18, "blue", 4, -128) + floaty(-18, -246, 19, "yellow", 0, -130) + floaty(22, -284, 18, "pink", 2, -130) + floaty(-66, -286, 15, "teal", -52, -230) + floaty(72, -292, 14, "purple", 52, -238) + floaty(-8, -336, 15, "orange", -10, -280);
  } else {
    s += floaty(-40, -150, 12, "red", -4, -128) + floaty(36, -156, 11, "blue", 4, -128);
  }
  return s;
};

/* footprint of each landmark in local units: [left, top, width, height] */
const BOX = {
  stage: [-124, -256, 248, 290], florist: [-108, -216, 216, 246], hall: [-176, -356, 352, 392], bench: [-128, -256, 262, 200],
  lookout: [-134, -304, 268, 336], sack: [-126, -280, 252, 312], stall: [-156, -246, 314, 276], lamp: [-146, -180, 292, 212],
  show: [-134, -236, 268, 268], fountain: [-134, -366, 268, 404]
};

module.exports = { B, BOX };
