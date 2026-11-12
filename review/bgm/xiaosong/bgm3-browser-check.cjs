// 小頌 bgm3 獨立瀏覽器檢查（headless Chromium）。不寫任何音檔，只輸出 xiaosong/bgm3-browser.json。
// 用法：source /Volumes/外接資料碟/tools/skills/guizang-env.sh
//       NODE_PATH=/Volumes/外接資料碟/tools/skills/guizang-social-card-skill/node_modules node review/bgm/xiaosong/bgm3-browser-check.cjs
// 自己開一個只讀的本機伺服器（127.0.0.1 隨機埠），跑完就關。BASE_URL 有給就改測那個網址（公開測試網址用）。
const {chromium} = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '../../..');
const scores = JSON.parse(fs.readFileSync(path.join(ROOT, 'review/bgm/scores-bgm3.json')));
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/map.json')));
const NAMES = Object.fromEntries(map.regions.map(r => [r.id, r.name]));
const SECONDS = Object.fromEntries(scores.map(s => [s.id, s.samples / 48000]));
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const requests = [];
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  if (!name) name = 'index.html';
  requests.push(req.url);
  const file = path.join(ROOT, name);
  if (!file.startsWith(ROOT) || name.startsWith('.git') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('missing'); }
  res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'max-age=3600'});
  res.end(fs.readFileSync(file));
});
// 公開網址（raw.githack）用瀏覽器開會先出現一頁英文中繼頁，要按「Open the page」才進得去；這裡照實按一次並記錄。
const interstitial = [];
async function open(page, url) {
  await page.goto(url);
  const btn = page.locator('button', {hasText: 'Open the page'});
  if (await btn.count()) { interstitial.push({url, title: await page.title()}); await Promise.all([page.waitForNavigation(), btn.click()]); }
}
const idOf = loopEnd => Object.keys(SECONDS).find(k => Math.abs(SECONDS[k] - loopEnd) < 1e-3) || `?${loopEnd}`;

// 注入頁面：記錄 AudioContext、循環音源的 start/stop、解碼次數、活著的大 AudioBuffer（WeakRef）、<audio>、音檔 fetch。
function instrument() {
  const P = window.__p = {contexts: 0, events: [], live: 0, max: 0, starts: 0, decodes: 0, bufs: [], audios: [], fetches: [], gains: []};
  const Real = window.AudioContext;
  if (Real) {
    window.AudioContext = class extends Real { constructor(...a) { super(...a); P.contexts++; P.ctx = this; } };
    const mk = Real.prototype.createBufferSource;
    Real.prototype.createBufferSource = function () {
      const s = mk.call(this), st = s.start.bind(s), sp = s.stop.bind(s), ctx = this; let counted = false;
      s.start = (...a) => {
        if (s.loop) {
          counted = true; P.starts++; P.live++; P.max = Math.max(P.max, P.live); P.lastSource = s;
          let e = 0; const d = s.buffer.getChannelData(0); for (let i = 0; i < 48000 && i < d.length; i++) e += d[i] * d[i];
          P.events.push({type: 'start', t: ctx.currentTime, wall: performance.now(), loopStart: s.loopStart, loopEnd: s.loopEnd, offset: a[1] || 0,
            frames: s.buffer.length, rate: s.buffer.sampleRate, first_second_rms: Math.sqrt(e / 48000), liveBefore: P.live - 1, ctxState: ctx.state});
        }
        return st(...a);
      };
      s.stop = (...a) => { if (counted) { counted = false; P.live--; P.events.push({type: 'stop', t: ctx.currentTime, wall: performance.now()}); } return sp(...a); };
      const cn = s.connect.bind(s);
      s.connect = (dest, ...r) => { if (dest instanceof GainNode) { s.__gain = dest; } return cn(dest, ...r); };
      return s;
    };
    const dec = Real.prototype.decodeAudioData;
    Real.prototype.decodeAudioData = function (...a) {
      P.decodes++;
      const p = dec.apply(this, a);
      p.then(b => { P.bufs.push({kind: 'decoded', len: b.length, ref: new WeakRef(b)}); }, () => {});
      return p;
    };
    const cb = Real.prototype.createBuffer;
    Real.prototype.createBuffer = function (ch, len, rate) {
      const b = cb.call(this, ch, len, rate);
      if (len > 200000) P.bufs.push({kind: 'loop', len, ref: new WeakRef(b)});
      return b;
    };
  }
  const A = window.Audio;
  window.Audio = function (...a) { const el = new A(...a); P.audios.push(el); return el; };
  const f = window.fetch;
  window.fetch = function (u, ...r) { if (/assets\/audio\//.test(String(u))) P.fetches.push(String(u)); return f.call(this, u, ...r); };
  window.__alive = async () => {
    for (let i = 0; i < 8; i++) { if (window.gc) window.gc(); await new Promise(r => setTimeout(r, 80)); }
    const a = P.bufs.filter(w => w.ref.deref());
    return {gc: !!window.gc, loop: a.filter(w => w.kind === 'loop').length, decoded: a.filter(w => w.kind === 'decoded').length,
      megabytes: a.reduce((n, w) => n + w.len * 2 * 4, 0) / 1048576, everCreated: P.bufs.length};
  };
  window.__gain = () => P.lastSource?.__gain?.gain.value;
}

(async () => {
  let base = process.env.BASE_URL;
  if (!base) { await new Promise(r => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}/`; }
  const browser = await chromium.launch({headless: true, args: ['--mute-audio', '--autoplay-policy=document-user-activation-required', '--js-flags=--expose-gc']});
  const report = {browser: browser.version(), base: process.env.BASE_URL ? base : 'local read-only server', tested_at: new Date().toISOString()};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  try {
    // ---------- 1) 解碼長度、補零、循環接點（28 檔 × 48k／44.1k）----------
    if (!process.env.SKIP_DECODE) {
      const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await open(page, base + 'review/bgm/loop-test.html');
      report.decode = await page.evaluate(async scores => {
        const {prepareLoopBuffer} = await import('../../js/audio.js?v=bgm3');
        const out = [];
        for (const rate of [48000, 44100]) for (const s of scores) for (const ext of ['mp3', 'ogg']) {
          const bytes = await (await fetch(`../../assets/audio/bgm-${s.id}.${ext}?v=bgm3`)).arrayBuffer();
          const b = await new OfflineAudioContext(2, 1, rate).decodeAudioData(bytes);
          const frames = Math.round(s.samples / 48000 * rate), guard = Math.round(9216 / 48000 * rate);
          const expected = Math.round((s.samples + 18432) / 48000 * rate);
          const ctx = new OfflineAudioContext(2, Math.round(frames * 2.25), rate);
          const prep = prepareLoopBuffer(b, frames, guard, ctx);
          const src = ctx.createBufferSource(); src.buffer = prep.buffer; src.loop = true; src.loopStart = prep.loopStart; src.loopEnd = prep.loopStart + prep.duration;
          src.connect(ctx.destination); src.start(0, prep.loopStart);
          const y = await ctx.startRendering();
          const L = [prep.buffer.getChannelData(0), prep.buffer.getChannelData(1)];
          let err = 0; for (let c = 0; c < 2; c++) { const o = y.getChannelData(c); for (let i = 0; i < o.length; i++) err = Math.max(err, Math.abs(o[i] - L[c][i % frames])); }
          // 沒設 loopEnd、直接循環整個解碼檔會怎樣（對照）：多出來的長度
          const d2 = q => { let m = 0; const w = Math.round(.002 * rate); for (const x of L) for (let k = -w; k < w - 2; k++) { const i = ((q + k) % frames + frames) % frames; m = Math.max(m, Math.abs(x[(i + 2) % frames] - 2 * x[(i + 1) % frames] + x[i])); } return m; };
          const db = (q, w) => { let sum = 0; for (const x of L) for (let k = 0; k < w; k++) sum += x[((q + k) % frames + frames) % frames] ** 2; return 10 * Math.log10(Math.max(1e-24, sum / (2 * w))); };
          const dip = q => { const w = Math.round(.002 * rate), a = []; for (let k = -6; k <= 6; k += .5) a.push(db(q + Math.round(k * rate / 1000) - Math.floor(w / 2), w)); return Math.max(0, Math.min(a[0], a.at(-1)) - Math.min(...a)); };
          const bars = Array.from({length: s.bars - 1}, (_, i) => Math.round((i + 1) * s.meter * 60 / s.bpm * rate - s.origin_shift_samples / 48000 * rate - (prep.codecOrigin - guard)));
          let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
          const seamD2 = d2(0); let below = 0; const N = 1500; for (let i = 0; i < N; i++) if (d2(Math.floor(rnd() * frames)) < seamD2) below++;
          let quiet = 0; for (let k = 0; k < 400; k++) { if (db(frames - Math.round(k * rate / 1000) - Math.round(.01 * rate), Math.round(.01 * rate)) >= -40) break; quiet++; }
          let tailPeak = 0; for (let c = 0; c < 2; c++) { const x = b.getChannelData(c); for (let i = expected; i < b.length; i++) tailPeak = Math.max(tailPeak, Math.abs(x[i])); }
          out.push({id: s.id, ext, rate, decoded: b.length, expected, excess: b.length - expected, origin: prep.codecOrigin, guard, frames,
            loop_vs_concat_max_error: err, jump: Math.max(Math.abs(L[0][0] - L[0][frames - 1]), Math.abs(L[1][0] - L[1][frames - 1])),
            seam_d2: seamD2, inner_d2_max: Math.max(...bars.map(d2)), seam_d2_percentile: below / N * 100,
            seam_dip: dip(0), inner_dip_max: Math.max(...bars.map(dip)), tail_quiet_ms: quiet, extra_tail_peak: tailPeak});
        }
        return out;
      }, scores);
      report.decode_page_errors = errs; await page.close();
      console.log('decode done', report.decode.length);
    }

    // ---------- 2) 遊戲本體 ----------
    const page = await browser.newPage({viewport: {width: 430, height: 900}}); page.setDefaultTimeout(20000);
    const errors = [], consoleErrors = [], failed = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('requestfailed', r => failed.push(r.url()));
    page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
    await page.addInitScript(instrument);
    await open(page, base + (process.env.BASE_URL ? 'index.html' : ''));
    await page.waitForFunction(() => window.__GAME);
    const G = report.game = {};
    const snap = () => page.evaluate(() => { const P = window.__p; return {contexts: P.contexts, live: P.live, max: P.max, starts: P.starts, decodes: P.decodes, fetches: P.fetches.length, audios: P.audios.filter(e => e.src).length, ctxState: P.ctx?.state}; });
    await wait(600);
    G.before_gesture = await snap();
    await page.evaluate(() => { const s = __GAME.save(); s.profile = {nickname: '小頌測試'}; s.unlockedRegions = ['village', 'castle', 'slope', 'hill', 'bagvalley', 'candylane', 'lamplight', 'theater', 'plaza']; s.coins = 100000; s.materials = 1000; __GAME.show('title'); });
    await wait(400);
    G.title_before_gesture = await snap();           // 還沒手勢：不該有聲音、不該抓檔
    await page.mouse.click(8, 8);                    // 第一次真的點擊
    await page.waitForFunction(() => window.__p.live === 1);
    await wait(200);
    G.after_first_gesture = await snap();
    G.first_track = idOf((await page.evaluate(() => window.__p.events.at(-1))).loopEnd);
    await page.evaluate(() => __GAME.show('play')); await wait(300);
    G.title_to_play_same_scene = await snap();       // 首頁→遊玩都是 village，不該重播

    // 2a) 進地區：每進一區，剛好多 1 次播放、不重疊（第 9 項）
    G.enter = [];
    const enterRegion = async id => {
      const before = await snap(); const n0 = await page.evaluate(() => window.__p.events.length);
      await page.evaluate(() => __GAME.show('map'));
      const clicked = await page.evaluate(() => performance.now());
      await page.locator('.region-card').filter({has: page.locator('h3', {hasText: NAMES[id]})}).locator('.actions button').click();
      // 網路慢時新曲要先抓完、解完才會換（設計如此），所以等到真的換成這一區的曲子為止，最多 20 秒。
      try { await page.waitForFunction(sec => { const P = window.__p, st = P.events.filter(e => e.type === 'start').at(-1); return st && Math.abs(st.loopEnd - sec) < 1e-3 && P.live === 1; }, SECONDS[id], {timeout: 20000}); } catch {}
      await wait(500);
      const after = await snap(); const ev = await page.evaluate(n => window.__p.events.slice(n), n0);
      const alive = await page.evaluate(() => window.__alive());
      const rec = {id, region_on_screen: await page.locator('#play').getAttribute('data-region-id'), new_starts: after.starts - before.starts,
        new_decodes: after.decodes - before.decodes, new_fetches: after.fetches - before.fetches, live: after.live, max_live: after.max,
        ms_from_click_to_new_track: ev.filter(e => e.type === 'start').map(e => Math.round(e.wall - clicked))[0] ?? null,
        started: ev.filter(e => e.type === 'start').map(e => ({track: idOf(e.loopEnd), offset: e.offset, liveBefore: e.liveBefore, loopStart: e.loopStart, loopEnd: e.loopEnd, frames: e.frames, rate: e.rate, rms: e.first_second_rms})),
        order: ev.map(e => e.type).join('>'), alive};
      G.enter.push(rec); console.log('enter', id, rec.new_starts, rec.order, JSON.stringify(rec.alive)); return rec;
    };
    for (const id of ['castle', 'slope', 'hill', 'bagvalley', 'candylane', 'lamplight', 'theater', 'plaza']) await enterRegion(id);
    await enterRegion('plaza');      // 同一區再進一次：不該重播
    await enterRegion('theater');    // 還在快取裡：不該重新解碼
    await enterRegion('village');    // 已被 LRU 擠掉：要重新解碼，但只播一次
    await enterRegion('lamplight');  // 以前會連切兩次的區（journey→bulu）
    G.fetch_log = await page.evaluate(() => window.__p.fetches);

    // 2b) 同場景操作不重播（目前在 lamplight）
    const ops = G.same_scene = [];
    const op = async (name, fn) => { const b = await snap(); const n0 = await page.evaluate(() => window.__p.events.length); await fn(); await wait(350); const a = await snap(); ops.push({name, new_starts: a.starts - b.starts, new_stops: (await page.evaluate(n => window.__p.events.slice(n), n0)).filter(e => e.type === 'stop').length, live: a.live, gain: await page.evaluate(() => window.__gain())}); };
    await op('show(play) x3', () => page.evaluate(() => { __GAME.show('play'); __GAME.show('play'); __GAME.show('play'); }));
    await op('圖鑑→回遊玩', () => page.evaluate(() => { __GAME.show('book'); __GAME.show('play'); }));
    await op('地圖→回遊玩（不進別區）', () => page.evaluate(() => { __GAME.show('map'); __GAME.show('play'); }));
    await op('開設定', () => page.click('#btn-hud-settings'));
    await op('音量拉到 0', async () => { await page.locator('#vol-music').fill('0'); await page.locator('#vol-music').dispatchEvent('input'); });
    await op('音量拉到 100', async () => { await page.locator('#vol-music').fill('100'); await page.locator('#vol-music').dispatchEvent('input'); });
    await op('音量拉回 72', async () => { await page.locator('#vol-music').fill('72'); await page.locator('#vol-music').dispatchEvent('input'); });
    await op('關音樂', () => page.locator('#tog-music').uncheck());
    await op('開音樂', () => page.locator('#tog-music').check());
    await op('關設定', () => page.click('#btn-settings-close'));
    await op('地圖修「目前這區」的建築', async () => { await page.evaluate(() => __GAME.show('map')); await page.locator('.region-card.active .bldg button').first().click(); });
    await op('地圖修「別區」的建築', async () => { await page.locator('.region-card:not(.active) .bldg button').first().click(); });
    await op('修完回遊玩', () => page.evaluate(() => __GAME.show('play')));
    G.region_after_restore = await page.locator('#play').getAttribute('data-region-id');
    await op('開關背包', async () => { await page.click('#btn-bag'); await page.click('#btn-bag-close'); });
    await op('故事對話→略過', async () => { await page.evaluate(() => { __GAME.startStory([{speaker: '眠花糖', portrait: 'mascot', text: '測試對話'}], () => {}); }); await page.click('#btn-story-skip'); });
    await op('拖曳合成', async () => {
      await page.evaluate(() => { const s = __GAME.save(); s.unlockedClumps = ['all']; s.board[30] = {kind: 'item', chain: 'star', tier: 1, uid: 'xs-a'}; s.board[37] = {kind: 'item', chain: 'star', tier: 1, uid: 'xs-b'}; __GAME.refresh(); });
      const a = await page.locator('[data-uid="xs-a"]').boundingBox(), b = await page.locator('[data-uid="xs-b"]').boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {steps: 10}); await page.mouse.up();
    });
    G.merge_happened = await page.evaluate(() => __GAME.save().board[37]?.tier === 2);
    await op('交訂單', async () => {
      await page.evaluate(() => { const s = __GAME.save(); s.orders.unshift({id: 'xs-order', npc: 'mascot', need: {chain: 'star', tier: 2}, reward: {coins: 0, seeds: 0, diamonds: 0}}); __GAME.refresh(); });
      await page.locator('.order[data-id="xs-order"] .give').click({force: true}); await wait(1200);
    });
    G.order_delivered = await page.evaluate(() => !__GAME.save().orders.some(o => o.id === 'xs-order'));
    G.track_after_same_scene = idOf((await page.evaluate(() => window.__p.events.filter(e => e.type === 'start').at(-1))).loopEnd);

    // 2c) 暫停／恢復（廣告用）、快速連切、停止
    const before = await snap();
    const t0 = await page.evaluate(async () => { window.__a = await import('./js/audio.js?v=bgm3'); const P = window.__p; const st = P.events.filter(e => e.type === 'start').at(-1); const played = P.ctx.currentTime - st.t; __a.pauseMusic(); return {played, loopEnd: st.loopEnd, startOffset: st.offset}; });
    await wait(300); const paused = await snap();
    await page.evaluate(() => __a.resumeMusic()); await wait(200);
    const resumed = await page.evaluate(() => window.__p.events.filter(e => e.type === 'start').at(-1));
    G.pause_resume = {live_while_paused: paused.live, resume_offset: resumed.offset, expected_offset: (t0.startOffset + t0.played) % t0.loopEnd, same_track: Math.abs(resumed.loopEnd - t0.loopEnd) < 1e-6, live_after: (await snap()).live};
    await page.evaluate(() => { for (const id of ['bulu', 'hate', 'ending', 'castle', 'slope', 'plaza', 'candy']) __a.playMusic(id); });
    await wait(process.env.BASE_URL ? 9000 : 2500); const rapid = await snap();
    G.rapid_switch = {live: rapid.live, max_live_ever: rapid.max, final_track: idOf((await page.evaluate(() => window.__p.events.filter(e => e.type === 'start').at(-1))).loopEnd), alive: await page.evaluate(() => window.__alive())};
    // 主線章節曲（B、C 會在這裡用到）
    G.chapters = [];
    for (const id of ['journey', 'candy', 'bulu', 'hate', 'ending', 'village']) {
      const b = await snap();
      await page.evaluate(id => { const s = __GAME.save(); s.region = 'village'; s.chapter = id; __GAME.show('play'); }, id);
      try { await page.waitForFunction(sec => { const P = window.__p, st = P.events.filter(e => e.type === 'start').at(-1); return st && Math.abs(st.loopEnd - sec) < 1e-3 && P.live === 1; }, SECONDS[id], {timeout: 20000}); } catch {}
      await wait(300);
      const a = await snap();
      G.chapters.push({chapter: id, track: idOf((await page.evaluate(() => window.__p.events.filter(e => e.type === 'start').at(-1))).loopEnd), new_starts: a.starts - b.starts, live: a.live});
    }
    G.alive_after_all = await page.evaluate(() => window.__alive());
    await page.evaluate(() => __a.stopMusic()); await wait(200);
    G.after_stop = await snap();
    G.overlap_violations = await page.evaluate(() => window.__p.events.filter(e => e.type === 'start' && e.liveBefore !== 0).length);
    G.total_events = await page.evaluate(() => window.__p.events.length);
    G.page_errors = errors; G.console_errors = consoleErrors; G.failed_requests = failed;
    await page.close();

    // ---------- 3) 不理會 mp3 無縫標記的解碼器（模擬）：遊戲真的拿去播的那一圈還是不是完整一圈 ----------
    if (!process.env.BASE_URL) {
      const sim = report.mp3_padding_simulation = [];
      for (const lead of [0, 1105, 2257]) {
        const p = await browser.newPage(); const e = []; p.on('pageerror', x => e.push(String(x)));
        await p.addInitScript(instrument);
        await p.addInitScript(lead => {
          const proto = Object.getPrototypeOf(AudioContext.prototype);
          const dec = proto.decodeAudioData;
          proto.decodeAudioData = async function (...a) {
            const b = await dec.apply(this, a); if (!lead) return b;
            const pad = (1152 - ((b.length + lead) % 1152)) % 1152;   // 補到整數個 MP3 frame
            const out = this.createBuffer(b.numberOfChannels, b.length + lead + pad, b.sampleRate);
            for (let c = 0; c < b.numberOfChannels; c++) out.copyToChannel(b.getChannelData(c), c, lead);
            window.__ref = b; window.__padded = {lead, pad};
            return out;
          };
        }, lead);
        await open(p, base + 'review/bgm/loop-test.html'); await p.mouse.click(5, 5);
        const r = await p.evaluate(async ({ids, SECONDS}) => {
          const a = await import('../../js/audio.js?v=bgm3'); document.head.insertAdjacentHTML('afterbegin', '<base href="../../">');
          const out = []; const warn = console.warn; const warns = []; console.warn = (...x) => { warns.push(x.map(String).join(' ')); };
          a.unlockAudio(); await new Promise(r => setTimeout(r, 100));
          for (const id of ids) {
            await a.playMusic(id); await new Promise(r => setTimeout(r, 300));
            const s = window.__p.lastSource, P = window.__p; const used = P.audios.filter(e => e.src).length ? 'html-audio' : 'web-audio';
            const st = P.events.filter(e => e.type === 'start').at(-1);
            let periodicErr = null, seamD2 = null;
            if (used === 'web-audio' && st && Math.abs(st.loopEnd - st.loopStart - SECONDS[id]) < 1e-3) {
              const L = s.buffer.getChannelData(0), n = s.buffer.length, ref = window.__ref?.getChannelData(0);
              let m = 0; for (let k = -96; k < 94; k++) { const i = ((k % n) + n) % n; m = Math.max(m, Math.abs(L[(i + 2) % n] - 2 * L[(i + 1) % n] + L[i])); } seamD2 = m;
              let zeros = 0; for (let i = 0; i < n; i++) if (L[i] === 0) zeros++;
              periodicErr = zeros;
            }
            out.push({id, used, fetched: P.fetches.slice(-2), loopSeconds: st ? st.loopEnd - st.loopStart : null, seam_d2: seamD2, exact_zero_samples_in_loop: periodicErr, padded: window.__padded});
          }
          a.stopMusic(); return {out, warns};
        }, {ids: ['village', 'journey', 'hate', 'plaza'], SECONDS});
        sim.push({lead_zero_samples: lead, results: r.out, warnings: r.warns, page_errors: e}); await p.close();
        console.log('padding sim', lead, JSON.stringify(r.out.map(x => [x.id, x.used, x.seam_d2, x.exact_zero_samples_in_loop])));
      }
    }

    // ---------- 4) 沒有 Web Audio 時退回 <audio> ----------
    {
      const p = await browser.newPage(); const e = []; p.on('pageerror', x => e.push(String(x)));
      await p.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
      await p.addInitScript(instrument);
      await open(p, base + (process.env.BASE_URL ? 'index.html' : ''));
      await p.waitForFunction(() => window.__GAME);
      await p.evaluate(() => { const s = __GAME.save(); s.profile = {nickname: '小頌測試'}; s.settings.sfx = false; s.unlockedRegions = ['village', 'castle', 'slope']; __GAME.show('title'); });
      await p.mouse.click(8, 8); await wait(process.env.BASE_URL ? 4000 : 1200);
      const st = () => p.evaluate(() => window.__p.audios.filter(e => e.src).map(e => ({src: e.src.split('/').pop(), paused: e.paused, t: e.currentTime, volume: e.volume, loop: e.loop, ready: e.readyState})));
      const F = report.fallback = {title: await st()};
      await p.evaluate(() => { __GAME.show('play'); __GAME.show('play'); }); await wait(500); F.play_same = await st();
      await p.evaluate(() => __GAME.show('map')); await p.locator('.region-card').filter({has: p.locator('h3', {hasText: NAMES.castle})}).locator('.actions button').click(); await wait(process.env.BASE_URL ? 4000 : 1200);
      F.castle = await st();
      await p.click('#btn-hud-settings'); await p.locator('#tog-music').uncheck(); await wait(200); F.music_off = await st();
      await p.locator('#tog-music').check(); await wait(200); F.music_on = await st(); await p.click('#btn-settings-close');
      await p.evaluate(() => { const el = window.__p.audios.find(e => e.src); el.currentTime = .192 + 80 * 60 / 116 - .15; }); await wait(900);
      F.after_wrap = await st(); F.page_errors = e; await p.close();
    }

    // ---------- 5) 試聽頁 loop-test.html ----------
    {
      const p = await browser.newPage(); const e = [], ce = []; p.on('pageerror', x => e.push(String(x))); p.on('console', m => { if (m.type() === 'error') ce.push(m.text()); });
      await p.addInitScript(instrument);
      await open(p, base + 'review/bgm/loop-test.html'); await wait(400);
      const T = report.loop_test = {before_click: await p.evaluate(() => ({contexts: window.__p.contexts, fetches: window.__p.fetches.length, audios: document.querySelectorAll('audio').length})), plays: []};
      for (const ext of ['ogg', 'mp3']) {
        await p.selectOption('#format', ext);
        for (let i = 0; i < 14; i++) {
          await p.click(`[data-song="${i}"]`);
          await p.waitForFunction(i => document.querySelector(`[data-song="${i}"]`).getAttribute('aria-pressed') === 'true' && /循環播放中/.test(document.querySelector('#status').textContent) || /不符|失敗/.test(document.querySelector('#status').textContent), i);
          await wait(120);
          T.plays.push({ext, i, status: await p.textContent('#status'), live: await p.evaluate(() => window.__p.live)});
        }
      }
      T.alive = await p.evaluate(() => window.__alive());
      await p.click('#stop'); await wait(200);
      T.after_stop = await p.evaluate(() => ({live: window.__p.live, max: window.__p.max, contexts: window.__p.contexts, starts: window.__p.starts}));
      T.page_errors = e; T.console_errors = ce; await p.close();
    }
  } finally { await browser.close(); server.close(); }
  report.server_requests = requests.length; report.interstitial = interstitial;
  fs.writeFileSync(process.env.OUT || path.join(__dirname, 'bgm3-browser.json'), JSON.stringify(report, null, 1) + '\n');
  console.log('written');
})().catch(e => { console.error(e); process.exitCode = 1; });
