/* Renders the vector map to the webp files the game loads.
 *   node assets/map/src/build-map.cjs            -> writes assets/map/*.webp + layout.json
 *   node assets/map/src/build-map.cjs --preview <dir>  -> PNG previews only
 * Needs Playwright with Chrome; point PLAYWRIGHT at its folder if it is not on the default path. */
const fs = require("fs"), path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT || "/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright");
const A = require("./art.cjs");
const { scene, layout } = require("./scene.cjs");
const OUT = path.resolve(__dirname, "..");
const SCALE = 1.5;
const STEPS = { stage: 3, hall: 2 };   // landmarks with more than one repair step

(async () => {
  const preview = process.argv.indexOf("--preview");
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: A.W, height: A.H }, deviceScaleFactor: preview > 0 ? 1 : SCALE });
  const page = await ctx.newPage();
  const shot = async (svg, clip, transparent) => { await page.setContent(`<body style="margin:0;background:${transparent ? "transparent" : "#7BC67A"}">${svg}</body>`); return page.screenshot({ clip, omitBackground: !!transparent }); };
  const L = layout();

  if (preview > 0) {
    const dir = process.argv[preview + 1];
    fs.writeFileSync(path.join(dir, "map-full.png"), await shot(scene(), { x: 0, y: 0, width: A.W, height: A.H }));
    fs.writeFileSync(path.join(dir, "map-top.png"), await page.screenshot({ clip: { x: 0, y: 0, width: A.W, height: 1000 } }));
    fs.writeFileSync(path.join(dir, "map-bottom.png"), await page.screenshot({ clip: { x: 0, y: 1000, width: A.W, height: 1000 } }));
    const all0 = {}; for (const r of Object.values(L.regions)) for (const b of Object.keys(r.buildings)) all0[b] = 0;
    fs.writeFileSync(path.join(dir, "map-ruin.png"), await shot(scene(all0), { x: 0, y: 0, width: A.W, height: A.H }));
    fs.writeFileSync(path.join(dir, "ruin-top.png"), await page.screenshot({ clip: { x: 0, y: 0, width: A.W, height: 1000 } }));
    fs.writeFileSync(path.join(dir, "ruin-bottom.png"), await page.screenshot({ clip: { x: 0, y: 1000, width: A.W, height: 1000 } }));
    await browser.close(); return;
  }

  const toWebp = async (png, w, q) => page.evaluate(async ([b64, w, q]) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = w || img.width; c.height = Math.round(img.height * c.width / img.width);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/webp", q).split(",")[1];
  }, [png.toString("base64"), w, q]);
  const write = async (name, png, w, q = 0.86) => { const b = Buffer.from(await toWebp(png, w, q), "base64"); fs.writeFileSync(path.join(OUT, name), b); console.log(name, Math.round(b.length / 1024) + "KB"); };

  // whole map, repaired
  const full = await shot(scene(), { x: 0, y: 0, width: A.W, height: A.H });
  const crops = [];
  for (const [id, r] of Object.entries(L.regions)) {
    const [x, y, w, h] = r.rect, cw = Math.max(w, h * 4 / 3), ch = cw * 3 / 4, cx = Math.max(0, Math.min(A.W - cw, x + w / 2 - cw / 2)), cy = Math.max(0, Math.min(A.H - ch, y + h / 2 - ch / 2));
    crops.push([`region-${id}.webp`, { x: cx, y: cy, width: cw, height: ch }, 276]);
    for (const [bid, b] of Object.entries(r.buildings)) { const [bx, by, bw, bh] = b.rect, s = Math.max(bw, bh) * 0.86; crops.push([`thumb-${bid}.webp`, { x: bx + bw / 2 - s / 2, y: by + bh - s - bh * 0.04, width: s, height: s }, 160]); }
  }
  for (const [name, clip, w] of crops) await write(name, await page.screenshot({ clip }), w, 0.9);
  await write("world-map.webp", full, 0, 0.84);
  await write("world-map-sm.webp", full, 480, 0.6);

  // before-repair patches, cut from the same scene so they line up exactly
  const ids = Object.values(L.regions).flatMap((r) => Object.entries(r.buildings));
  const maxSteps = Math.max(...Object.values(STEPS));
  for (let step = 0; step < maxSteps; step++) {
    const levels = {};
    for (const [bid] of ids) { const n = STEPS[bid] || 1; if (step < n) levels[bid] = step / n; }
    await shot(scene(levels), { x: 0, y: 0, width: 10, height: 10 });
    for (const [bid, b] of ids) { if (levels[bid] == null) continue; const [x, y, w, h] = b.rect; await write(step ? `ruin-${bid}-${step}.webp` : `ruin-${bid}.webp`, await page.screenshot({ clip: { x, y, width: w, height: h } }), 0, 0.86); }
  }

  // the cloud that covers closed regions
  const cl = `<svg xmlns="http://www.w3.org/2000/svg" width="486" height="311" viewBox="-243 -150 486 311">${A.cloud(A.CLOUD_A)}</svg>`;
  await write("cloud.webp", await shot(cl, { x: 0, y: 0, width: 486, height: 311 }, true), 0, 0.9);
  const cl2 = `<svg xmlns="http://www.w3.org/2000/svg" width="486" height="311" viewBox="-243 -168 486 311"><g transform="scale(1.22)">${A.cloud(A.CLOUD_B)}</g></svg>`;
  await write("cloud-b.webp", await shot(cl2, { x: 0, y: 0, width: 486, height: 311 }, true), 0, 0.9);

  fs.writeFileSync(path.join(OUT, "layout.json"), JSON.stringify(L, null, 1).replace(/\[\s+(-?\d+),\s+(-?\d+)(?:,\s+(-?\d+),\s+(-?\d+))?\s+\]/g, (m, a, b, c, d) => (c == null ? `[${a}, ${b}]` : `[${a}, ${b}, ${c}, ${d}]`)) + "\n");
  await browser.close();
})();
