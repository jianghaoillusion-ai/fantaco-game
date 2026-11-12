// 小頌獨立重跑：手指點／高亮格／實際落格／浮起圖示位置。每格 5 個落點（中心＋四邊內縮 3px）。
import { chromium, devices } from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const URL0 = 'http://127.0.0.1:8923/index.html';
const scenarios = [
  ['iPhone SE（DPR2）', 'iPhone SE', 0],
  ['iPhone 13（DPR3）', 'iPhone 13', 0],
  ['iPhone 15 Pro（DPR3）', 'iPhone 15 Pro', 0],
  ['iPhone SE（DPR2）＋捲動 80px', 'iPhone SE', 80],
  ['iPhone 13（DPR3）＋捲動 120px', 'iPhone 13', 120],
];
const browser = await chromium.launch({ headless: true });
const out = [];
for (const [name, dev, scroll] of scenarios) {
  const d = devices[dev];
  const context = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, isMobile: true, hasTouch: true, userAgent: d.userAgent });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL0); await page.waitForFunction(() => window.__GAME);
  await page.evaluate(() => { const g = __GAME, s = g.save(); s.profile = { nickname: '審查' }; s.unlockedClumps = ['all']; s.flags = { seenOpen: true, 'seen-intro-v1': true }; s.discovered = { 'star:1': 1, 'star:2': 1 }; s.orders = []; g.show('play'); });
  await page.waitForTimeout(400);
  if (scroll) {
    // 版面尺寸不變，只讓整份文件可以往上捲（body 下方加空白），棋盤會跟著往上移 scroll px
    await page.addStyleTag({ content: 'html{overflow-y:auto!important;height:auto!important}body{overflow:visible!important;height:' + d.viewport.height + 'px!important;margin-bottom:600px!important}' });
    await page.evaluate(y => window.scrollTo(0, y), scroll); await page.waitForTimeout(100);
  }
  const cdp = await context.newCDPSession(page);
  const send = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y, id: 1 }] });
  const samples = [];
  for (let dest = 0; dest < 63; dest++) {
    for (const [pn, fx, fy] of [['中', .5, .5], ['上', .5, 0], ['下', .5, 1], ['左', 0, .5], ['右', 1, .5]]) {
      const src = dest === 24 ? 38 : 24;
      await page.evaluate(src => { const s = __GAME.save(); s.board = Array(63).fill(null); s.board[src] = { uid: 'drag-test', kind: 'item', chain: 'star', tier: 1 }; __GAME.refresh(); }, src);
      const c = await page.evaluate(({ src, dest, fx, fy }) => {
        const rect = i => document.querySelector(`.cell[data-r="${Math.floor(i / 7)}"][data-c="${i % 7}"]`).getBoundingClientRect();
        const a = rect(src), inset = 3; let b = rect(dest);
        // 只取「看得到」的格子範圍：扣掉會裁切的祖先與蓋在上面的工具列
        const el = document.querySelector(`.cell[data-r="${Math.floor(dest / 7)}"][data-c="${dest % 7}"]`);
        let top = b.top, bottom = b.bottom, left = b.left, right = b.right;
        for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) { const st = getComputedStyle(p); if (st.overflow !== 'visible' || st.clipPath !== 'none') { const q = p.getBoundingClientRect(); top = Math.max(top, q.top + p.clientTop); bottom = Math.min(bottom, q.top + p.clientTop + p.clientHeight); left = Math.max(left, q.left + p.clientLeft); right = Math.min(right, q.left + p.clientLeft + p.clientWidth); } }
        const tb = document.querySelector('.toolbar')?.getBoundingClientRect(); if (tb && tb.top < bottom && tb.top > top) bottom = tb.top;
        const hidden = { top: top - b.top, bottom: b.bottom - bottom };
        b = { x: left, y: top, width: right - left, height: bottom - top };
        return { a: { x: a.x + a.width / 2, y: a.y + a.height / 2 }, f: { x: b.x + inset + (b.width - 2 * inset) * fx, y: b.y + inset + (b.height - 2 * inset) * fy }, cell: { w: a.width, h: a.height }, hidden, scrollY, vv: visualViewport.scale };
      }, { src, dest, fx, fy });
      await send('touchStart', c.a);
      for (let k = 1; k <= 5; k++) await send('touchMove', { x: c.a.x + (c.f.x - c.a.x) * k / 5, y: c.a.y + (c.f.y - c.a.y) * k / 5 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const v = await page.evaluate(() => {
        const f = document.querySelector('#drag-float'), r = f?.getBoundingClientRect(), hot = document.querySelector('#board .cell.merge-hot, #board .cell.merge-bad');
        if (!r) return { on: false, cx: NaN, cy: NaN, hot: null, iconCell: null };
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        const under = [...document.querySelectorAll('#board .cell')].find(el => { const q = el.getBoundingClientRect(); return cx >= q.left && cx < q.right && cy >= q.top && cy < q.bottom; });
        const id = el => el ? +el.dataset.r * 7 + +el.dataset.c : null;
        return { on: f?.classList.contains('on'), cx, cy, hot: id(hot), iconCell: id(under) };
      });
      await send('touchEnd'); await page.waitForTimeout(15);
      const actual = await page.evaluate(() => __GAME.save().board.findIndex(x => x?.uid === 'drag-test'));
      samples.push({ dest, pt: pn, finger: c.f, actual, hot: v.hot, iconCell: v.iconCell, dx: v.cx - c.f.x, dy: v.cy - c.f.y, cellH: c.cell.h, cellW: c.cell.w, hidden: c.hidden, floatOn: v.on, scrollY: c.scrollY });
    }
  }
  const shown = samples.filter(s => s.floatOn), n = shown.length, err = shown.map(s => Math.hypot(s.dx, s.dy + 32));
  const boardTop = await page.evaluate(() => document.querySelector('#board').getBoundingClientRect().top);
  const row = {
    name, viewport: d.viewport, dpr: d.deviceScaleFactor, scrollY: samples[0].scrollY, cell: [samples[0].cellW, samples[0].cellH], drags: samples.length, boardTopOnScreen: boardTop,
    lastRowHiddenPx: Math.max(...samples.map(s => s.hidden.bottom)), floatNotShown: samples.filter(s => !s.floatOn).length,
    misjudged: samples.filter(s => s.actual !== s.dest).length,
    highlightMismatch: samples.filter(s => s.hot !== s.dest).length,
    iconCenterInOtherCell: samples.filter(s => s.iconCell !== s.dest).length,
    iconOffsetMeanPx: { dx: shown.reduce((a, s) => a + s.dx, 0) / n, dy: shown.reduce((a, s) => a + s.dy, 0) / n },
    residualVsMinus32: { mean: err.reduce((a, b) => a + b, 0) / n, max: Math.max(...err) }, errors,
    bad: samples.filter(s => s.actual !== s.dest || s.hot !== s.dest || !s.floatOn).slice(0, 20),
  };
  console.log(JSON.stringify(row));
  out.push({ ...row, samples });
  if (name.startsWith('iPhone 13（DPR3）＋')) {
    // 留一張拖曳中截圖當證據
    await page.evaluate(() => { const s = __GAME.save(); s.board = Array(63).fill(null); s.board[24] = { uid: 'drag-test', kind: 'item', chain: 'star', tier: 1 }; __GAME.refresh(); });
    const p = await page.evaluate(() => { const r = i => document.querySelector(`.cell[data-r="${Math.floor(i / 7)}"][data-c="${i % 7}"]`).getBoundingClientRect(); const a = r(24), b = r(40); return { a: { x: a.x + a.width / 2, y: a.y + a.height / 2 }, b: { x: b.x + b.width / 2, y: b.y + b.height / 2 } }; });
    await send('touchStart', p.a); await send('touchMove', { x: (p.a.x + p.b.x) / 2, y: (p.a.y + p.b.y) / 2 }); await send('touchMove', p.b);
    await page.waitForTimeout(80);
    await page.evaluate(p => { const m = document.createElement('i'); m.id = 'finger-mark'; m.style.cssText = `position:fixed;z-index:999;left:${p.x - 5}px;top:${p.y - 5}px;width:10px;height:10px;border-radius:50%;background:red;pointer-events:none`; document.body.append(m); }, p.b);
    await page.screenshot({ path: fileURLToPath(new URL('drag-scrolled-iphone13.png', import.meta.url)) });
    await send('touchEnd');
  }
  await context.close();
}
await browser.close();
fs.writeFileSync(new URL('drop-check.json', import.meta.url), JSON.stringify(out));
