// 小頌獨立量測：CPU 4x 節流下合成／生成動畫 fps、動畫實際動到哪些屬性、音效開關、震動開關（模擬沒有 navigator.vibrate 的 iOS）。
// 用法：node anim-audio-haptic-check.mjs <after埠> [before埠]
import { chromium, devices } from '/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = f => fileURLToPath(new URL(f, import.meta.url));
const [afterPort, beforePort] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const d = devices['iPhone 13'];
const out = { env: 'macOS headless Chromium（Playwright），iPhone 13 尺寸 390×664、DPR3，沒有錄影；不是 iPhone 實機', fps: [], props: {}, audio: {}, haptics: {} };

async function open(port, { noVibrate = false } = {}) {
  const context = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(noVibrate => {
    if (noVibrate) { delete Navigator.prototype.vibrate; }
    else { window.__vib = []; Navigator.prototype.vibrate = function (ms) { window.__vib.push(ms); return true; }; }
    window.__labelClicks = []; const oc = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () { if (this.tagName === 'LABEL') window.__labelClicks.push({ during: window.event?.type || null, trusted: window.event?.isTrusted ?? null, hasSwitch: !!this.querySelector('input[switch]') }); return oc.apply(this, arguments); };
    window.__starts = []; window.__osc = 0;
    const os = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function () { window.__starts.push({ dur: this.buffer?.duration, t: performance.now() }); return os.apply(this, arguments); };
    const oo = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function () { window.__osc++; return oo.apply(this, arguments); };
    window.__gains = []; const ocn = AudioNode.prototype.connect; AudioNode.prototype.connect = function (dst) { if (this instanceof AudioBufferSourceNode && dst instanceof GainNode && this.buffer?.duration < 1) window.__gains.push(dst.gain.value); return ocn.apply(this, arguments); };
  }, noVibrate);
  await page.goto(`http://127.0.0.1:${port}/index.html`); await page.waitForFunction(() => window.__GAME);
  await page.evaluate(() => { const g = __GAME, s = g.save(); s.profile = { nickname: '審查' }; s.unlockedClumps = ['all']; s.flags = { seenOpen: true, 'seen-intro-v1': true }; s.discovered = { 'star:1': 1, 'star:2': 1, 'star:3': 1, 'star:4': 1 }; s.orders = []; s.energy = 99; g.show('play'); });
  await page.waitForTimeout(900);
  const cdp = await context.newCDPSession(page);
  const send = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y, id: 1 }] });
  const reset = () => page.evaluate(() => { const s = __GAME.save(); s.energy = 99; s.orders = []; s.board = Array(63).fill(null); s.board[24] = { uid: 'a', kind: 'item', chain: 'star', tier: 1 }; s.board[26] = { uid: 'b', kind: 'item', chain: 'star', tier: 1 }; s.board[38] = { uid: 'gen', kind: 'gen', gen: 'star', tier: 1 }; __GAME.refresh(); });
  const center = async uid => { const b = await page.locator(`[data-uid="${uid}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const dragTo = async (from, to, beforeUp) => { const a = await center(from), b = await center(to); await send('touchStart', a); for (let i = 1; i <= 6; i++) { await send('touchMove', { x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6 }); await page.waitForTimeout(16); } await beforeUp?.(); await send('touchEnd'); };
  const tap = async uid => { const a = await center(uid); await send('touchStart', a); await send('touchEnd'); };
  const startCollect = () => page.evaluate(() => new Promise(res => { window.__ft = []; window.__props = new Set(); window.__maxAnims = 0; window.__collect = true; const tick = t => { __ft.push(t); const an = document.getAnimations().filter(a => a.playState === 'running'); __maxAnims = Math.max(__maxAnims, an.length); for (const a of an) for (const k of a.effect?.getKeyframes?.() || []) for (const p of Object.keys(k)) if (!['offset', 'computedOffset', 'easing', 'composite'].includes(p)) __props.add(p); if (__ft.length === 1) res(); if (__collect) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
  const stopCollect = () => page.evaluate(() => { __collect = false; return { t: __ft, props: [...__props], maxAnims: __maxAnims }; });
  return { context, page, cdp, send, reset, center, dragTo, tap, startCollect, stopCollect, errors };
}
const stats = ds => { const mean = ds.reduce((a, b) => a + b, 0) / ds.length; return { frames: ds.length, meanFps: +(1000 / mean).toFixed(2), minFps: +(1000 / Math.max(...ds)).toFixed(2), maxIntervalMs: +Math.max(...ds).toFixed(1), dropped: ds.reduce((n, x) => n + Math.max(0, Math.round(x / (1000 / 60)) - 1), 0), over25ms: ds.filter(x => x > 25).length }; };

// ---------- fps ----------
for (const [version, port] of [['修後', afterPort], ['修前', beforePort]]) {
  if (!port) continue;
  for (const rate of [4, 1]) {
    const g = await open(port); await g.cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const runs = { 閒置: [], 合成: [], 生成: [] }; const props = new Set(); let maxAnims = 0;
    for (let i = 0; i < 6; i++) {
      await g.reset(); await g.page.waitForTimeout(500);
      await g.startCollect(); await g.page.waitForTimeout(700); let r = await g.stopCollect(); runs.閒置.push(...r.t.slice(1).map((t, k) => t - r.t[k]));
      await g.dragTo('a', 'b', g.startCollect); await g.page.waitForTimeout(750); r = await g.stopCollect();
      const tier = await g.page.evaluate(() => __GAME.save().board[26]?.tier); if (tier !== 2) throw Error('合成沒成立');
      runs.合成.push(...r.t.slice(1).map((t, k) => t - r.t[k])); r.props.forEach(p => props.add(p)); maxAnims = Math.max(maxAnims, r.maxAnims);
      await g.page.waitForTimeout(400);
      await g.startCollect(); await g.tap('gen'); await g.page.waitForTimeout(750); r = await g.stopCollect();
      const made = await g.page.evaluate(() => __GAME.save().board.filter(Boolean).length); if (made < 3) throw Error('生成沒成立');
      runs.生成.push(...r.t.slice(1).map((t, k) => t - r.t[k])); r.props.forEach(p => props.add(p)); maxAnims = Math.max(maxAnims, r.maxAnims);
    }
    for (const [action, ds] of Object.entries(runs)) { const row = { version, cpuThrottle: rate, action, runs: 6, ...stats(ds) }; out.fps.push(row); console.log(JSON.stringify(row)); }
    if (rate === 4) out.props[version] = { animatedProperties: [...props], maxConcurrentAnimations: maxAnims, errors: g.errors };
    if (version === '修後' && rate === 1) {
      // 動畫中途截圖（證據）
      await g.reset(); await g.page.waitForTimeout(400);
      await g.dragTo('a', 'b'); await g.page.waitForTimeout(60); await g.page.screenshot({ path: here('merge-mid-1.png') }); await g.page.waitForTimeout(90); await g.page.screenshot({ path: here('merge-mid-2.png') });
      await g.page.waitForTimeout(700); await g.tap('gen'); await g.page.waitForTimeout(90); await g.page.screenshot({ path: here('spawn-mid.png') });
    }
    await g.context.close();
  }
}

// ---------- 音效開關 ----------
{
  const g = await open(afterPort); await g.reset();
  await g.tap('a'); await g.page.waitForTimeout(1500); // 第一次手勢解鎖音訊，等三個音檔解碼
  const short = () => g.page.evaluate(() => ({ short: __starts.filter(s => s.dur < 1).map(s => +s.dur.toFixed(3)), osc: __osc, gains: __gains }));
  const s0 = await short();
  await g.dragTo('a', 'b'); await g.page.waitForTimeout(700); const s1 = await short();
  await g.tap('gen'); await g.page.waitForTimeout(700); const s2 = await short();
  await g.page.evaluate(() => { const s = __GAME.save(); s.orders = [{ id: 'chk', npc: 'xiaoka', need: { chain: 'star', tier: 2 }, reward: { coins: 1, seeds: 0, diamonds: 0 } }]; __GAME.refresh(); });
  await g.page.waitForTimeout(300); await g.page.locator('.order[data-id="chk"] .give').tap({ force: true }); await g.page.waitForTimeout(900); const s3 = await short();
  // 關音效
  await g.page.evaluate(() => { const t = document.querySelector('#tog-sfx'); t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true })); });
  await g.reset(); await g.page.waitForTimeout(400); const o0 = await short();
  await g.dragTo('a', 'b'); await g.page.waitForTimeout(600); await g.tap('gen'); await g.page.waitForTimeout(600);
  await g.page.evaluate(() => { const s = __GAME.save(); s.orders = [{ id: 'chk2', npc: 'xiaoka', need: { chain: 'star', tier: 2 }, reward: { coins: 1, seeds: 0, diamonds: 0 } }]; __GAME.refresh(); });
  await g.page.waitForTimeout(300); await g.page.locator('.order[data-id="chk2"] .give').tap({ force: true }); await g.page.waitForTimeout(900); const o1 = await short();
  out.audio = { 開_解鎖後: s0, 開_合成後: s1, 開_生成後: s2, 開_交單後: s3, 關_動作前: o0, 關_三個動作後: o1, 關音效後新增短音效次數: o1.short.length - o0.short.length, 關音效後新增振盪器次數: o1.osc - o0.osc, errors: g.errors };
  console.log(JSON.stringify(out.audio)); await g.context.close();
}

// ---------- 震動 ----------
for (const [label, noVibrate] of [['模擬iOS（沒有navigator.vibrate）', true], ['有navigator.vibrate（Android路徑）', false]]) {
  const g = await open(afterPort, { noVibrate }); const res = {};
  const snap = () => g.page.evaluate(() => ({ labelClicks: __labelClicks.slice(), vib: window.__vib?.slice() ?? null }));
  const clear = () => g.page.evaluate(() => { __labelClicks.length = 0; if (window.__vib) __vib.length = 0; });
  const order = async id => { await g.page.evaluate(id => { const s = __GAME.save(); s.orders = [{ id, npc: 'xiaoka', need: { chain: 'star', tier: 2 }, reward: { coins: 1, seeds: 0, diamonds: 0 } }]; __GAME.refresh(); window.__sw = []; const sw = document.querySelector(`.order[data-id="${id}"] .haptic-switch`); sw?.addEventListener('click', e => __sw.push({ trusted: e.isTrusted, connected: sw.isConnected, disabled: sw.disabled, checked: sw.checked, rendered: sw.getClientRects().length > 0 })); }, id); await g.page.waitForTimeout(300); const done0 = await g.page.evaluate(() => __GAME.save().ordersDone || 0); await g.page.locator(`.order[data-id="${id}"] .give`).tap({ force: true }); await g.page.waitForTimeout(900); return g.page.evaluate(d0 => ({ delivered: (__GAME.save().ordersDone || 0) - d0, switchClicks: __sw }), done0); };
  for (const on of [true, false]) {
    await g.page.evaluate(on => { const t = document.querySelector('#tog-haptics'); t.checked = on; t.dispatchEvent(new Event('change', { bubbles: true })); }, on);
    await g.reset(); await g.page.waitForTimeout(400); await clear();
    await g.dragTo('a', 'b'); await g.page.waitForTimeout(600); const afterMerge = await snap(); await clear();
    const ord = await order('h' + on); const afterOrder = await snap();
    res[on ? '震動開' : '震動關'] = { 拿起加合成: afterMerge, 點交付: { ...ord, ...afterOrder } };
  }
  res.errors = g.errors; out.haptics[label] = res; console.log(label, JSON.stringify(res)); await g.context.close();
}
await browser.close();
fs.writeFileSync(here('anim-audio-haptic-check.json'), JSON.stringify(out, null, 1));
