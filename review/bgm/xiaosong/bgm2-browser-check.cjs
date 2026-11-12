// 小頌 bgm2 獨立瀏覽器檢查。不寫任何音檔，只輸出 xiaosong/bgm2-browser.json。
// 用法：NODE_PATH=<playwright 的 node_modules> node bgm2-browser-check.cjs
// 自己開一個只讀的本機伺服器（127.0.0.1 隨機埠），跑完就關。
const {chromium} = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const FF = '/Users/haomini/media-tools/bin/ffmpeg';
const SONGS = [['cute-a-glock-bubbles', 2304000, 120], ['cute-b-uke-hop', 2468571, 112], ['cute-c-whistle-parade', 2160000, 128]];
const TYPES = {'.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.f32': 'application/octet-stream'};
const refs = new Map(); // ffmpeg 解出來的 PCM（放記憶體，不落地）
const requests = [];
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  requests.push(name);
  if (refs.has(name)) { res.writeHead(200, {'content-type': TYPES['.f32']}); return res.end(refs.get(name)); }
  const file = path.join(ROOT, name);
  if (!file.startsWith(ROOT) || name.includes('/') || !fs.existsSync(file)) { res.writeHead(404); return res.end('missing'); }
  res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream'});
  res.end(fs.readFileSync(file));
});

(async () => {
  for (const [stem] of SONGS) for (const ext of ['mp3', 'ogg'])
    refs.set(`ref-${stem}.${ext}.f32`, execFileSync(FF, ['-v', 'error', '-i', path.join(ROOT, `${stem}.${ext}`), '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], {maxBuffer: 64 << 20}));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({headless: true, args: ['--mute-audio', '--autoplay-policy=document-user-activation-required']});
  const report = {browser: browser.version(), decode: [], page: {}};
  try {
    const page = await browser.newPage();
    const errors = [], consoleErrors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    await page.addInitScript(() => {
      const P = window.__p = {contexts: 0, sources: [], starts: 0, stops: 0, fetches: [], taps: []};
      const Real = window.AudioContext;
      window.AudioContext = class extends Real { constructor(...a) { super(...a); P.contexts++; P.ctx = this; } };
      const mk = Real.prototype.createBufferSource;
      Real.prototype.createBufferSource = function () {
        const s = mk.call(this); P.sources.push(s);
        const st = s.start.bind(s), sp = s.stop.bind(s);
        s.start = (...a) => { P.starts++; s.__startedAt = this.currentTime; return st(...a); };
        s.stop = (...a) => { P.stops++; return sp(...a); };
        return s;
      };
      const f = window.fetch; window.fetch = (...a) => { P.fetches.push(String(a[0])); return f(...a); };
      P.audioTags = () => document.querySelectorAll('audio').length;
    });
    await page.goto(base + 'loop-test.html');
    await page.waitForTimeout(600);
    // --- A. 沒點擊之前：不建 AudioContext、不抓檔、不播 ---
    report.page.before_click = await page.evaluate(() => ({contexts: __p.contexts, starts: __p.starts, fetches: __p.fetches.length, audioTags: __p.audioTags()}));

    // --- B. 解碼長度、頭尾對齊、兩種取樣率、循環渲染 ---
    report.decode = await page.evaluate(async (SONGS) => {
      const out = [];
      for (const [stem, samples, bpm] of SONGS) for (const ext of ['mp3', 'ogg']) {
        const bytes = await (await fetch(`${stem}.${ext}`)).arrayBuffer();
        const refRaw = new Float32Array(await (await fetch(`ref-${stem}.${ext}.f32`)).arrayBuffer());
        for (const rate of [48000, 44100]) {
          const b = await new OfflineAudioContext(2, 1, rate).decodeAudioData(bytes.slice(0));
          const expected = Math.round(samples / 48000 * rate), frames = Math.min(expected, b.length);
          const r = {file: `${stem}.${ext}`, rate, decoded: b.length, expected, extra: b.length - expected, channels: b.numberOfChannels};
          const ch = [b.getChannelData(0), b.getChannelData(1)];
          if (rate === 48000) {
            // 跟 ffmpeg 解碼逐樣本比（有效範圍內），確認頭沒有被前移／後移
            let maxdiff = 0; for (let c = 0; c < 2; c++) for (let k = 0; k < frames; k++) maxdiff = Math.max(maxdiff, Math.abs(ch[c][k] - refRaw[k * 2 + c]));
            r.vs_ffmpeg_maxdiff = maxdiff;
            let tailPeak = 0; for (let c = 0; c < 2; c++) for (let k = frames; k < b.length; k++) tailPeak = Math.max(tailPeak, Math.abs(ch[c][k]));
            r.extra_tail_peak = tailPeak; // 多出來的尾塊裡面是什麼（0 = 純補零）
          }
          const render = async (useLoopEnd) => {
            const n = frames * 2 + 4800, oc = new OfflineAudioContext(2, n, rate), s = oc.createBufferSource();
            s.buffer = b; s.loop = true; if (useLoopEnd) { s.loopStart = 0; s.loopEnd = frames / rate; }
            s.connect(oc.destination); s.start(); const o = await oc.startRendering();
            return [o.getChannelData(0), o.getChannelData(1)];
          };
          const y = await render(true);
          let err = 0; for (let c = 0; c < 2; c++) for (let k = 0; k < y[c].length; k++) err = Math.max(err, Math.abs(y[c][k] - ch[c][k % frames]));
          r.loop_vs_ideal_maxerr = err; // 引擎循環 = 把有效範圍頭尾直接相接
          // 接點品質：渲染結果在接點的二階差分、2ms 凹洞，跟曲內 23 條小節線比
          const mono = k => (y[0][k] + y[1][k]) / 2;
          const d2 = q => { let m = 0; for (let k = q - 96; k < q + 96; k++) m = Math.max(m, Math.abs(mono(k + 1) - 2 * mono(k) + mono(k - 1))); return m; };
          const rmsdb = (q, w) => { let p = 0; for (let k = 0; k < w; k++) p += mono(q + k) ** 2; return 10 * Math.log10(Math.max(1e-20, p / w)); };
          const bar = 240 / bpm * rate, inner = []; for (let i = 1; i < 24; i++) inner.push(d2(Math.round(i * bar)));
          r.seam_d2 = d2(frames); r.inner_d2_max = Math.max(...inner);
          { let bigger = 0; for (let q = 1; q < frames - 1; q++) if (Math.abs(mono(q + 1) - 2 * mono(q) + mono(q - 1)) > r.seam_d2) bigger++; r.song_fraction_d2_above_seam = bigger / frames; }
          r.seam_jump = Math.max(Math.abs(y[0][frames] - y[0][frames - 1]), Math.abs(y[1][frames] - y[1][frames - 1]));
          r.pre100_db = rmsdb(frames - rate / 10, rate / 10); r.post100_db = rmsdb(frames, rate / 10);
          let minw = 0; { const w = Math.round(.002 * rate); let lo = 1e9, hi = -1e9; for (let k = -6; k <= 6; k += .25) { const v = rmsdb(frames + Math.round(k * rate / 1000) - (w >> 1), w); lo = Math.min(lo, v); hi = Math.max(hi, v); } minw = lo; r.seam_2ms_min_db = lo; r.seam_2ms_max_db = hi; }
          // 對照：不設 loopEnd（整個 buffer 循環）接點會多出多長的洞
          if (b.length !== frames) {
            const z = await render(false); let run = 0, best = 0;
            for (let k = frames - 200; k < b.length + 200; k++) { if (Math.abs(z[0][k]) + Math.abs(z[1][k]) < 2e-4) { run++; best = Math.max(best, run); } else run = 0; }
            r.no_loopEnd_gap_samples = best;
          }
          out.push(r);
        }
      }
      return out;
    }, SONGS);

    // --- C. 真的按按鈕：六種組合 ---
    report.page.combos = [];
    for (const ext of ['ogg', 'mp3']) {
      await page.selectOption('#format', ext);
      await page.waitForTimeout(150);
      for (let i = 0; i < 3; i++) {
        await page.click(`[data-song="${i}"]`);
        await page.waitForFunction(({ext, i}) => { const t = document.querySelector('#status').textContent; return t.includes(ext.toUpperCase()) && t.includes('循環播放中') && document.querySelector(`[data-song="${i}"]`).getAttribute('aria-pressed') === 'true'; }, {ext, i}, {timeout: 20000});
        await page.waitForTimeout(120);
        report.page.combos.push(await page.evaluate(({i, ext}) => {
          const s = __p.sources.at(-1);
          return {song: i, ext, status: document.querySelector('#status').textContent, loop: s.loop, loopStart: s.loopStart, loopEnd: s.loopEnd,
            bufferLen: s.buffer.length, bufferRate: s.buffer.sampleRate, bufferDur: s.buffer.duration, ctxState: __p.ctx.state, ctxRate: __p.ctx.sampleRate,
            contexts: __p.contexts, starts: __p.starts, stops: __p.stops, audioTags: __p.audioTags()};
        }, {i, ext}));
      }
    }
    // 同一首重按不重開
    const before = await page.evaluate(() => __p.starts);
    await page.click('[data-song="2"]'); await page.waitForTimeout(300);
    report.page.same_song_restart = (await page.evaluate(() => __p.starts)) - before;
    await page.click('#stop'); await page.waitForTimeout(300);
    report.page.after_stop = await page.evaluate(() => ({status: document.querySelector('#status').textContent, starts: __p.starts, stops: __p.stops, pressed: [...document.querySelectorAll('[aria-pressed=true]')].length}));
    // 還沒播就按停止／換格式，不應出錯
    await page.reload(); await page.click('#stop'); await page.selectOption('#format', 'mp3'); await page.waitForTimeout(200);
    report.page.stop_before_play = await page.evaluate(() => ({contexts: __p.contexts, starts: __p.starts, status: document.querySelector('#status').textContent}));

    // --- D. 即時播放實錄：C 的 OGG（45 秒）錄 47.5 秒，看繞回那一刻有沒有洞 ---
    await page.reload();
    await page.evaluate(() => {
      // 用 AudioWorklet 在音訊執行緒錄下送往喇叭的訊號（ScriptProcessor 會掉格，不準）
      const code = `registerProcessor('tap', class extends AudioWorkletProcessor {
        constructor() { super(); this.buf = new Float32Array(48000 * 60); this.n = 0; this.port.onmessage = () => this.port.postMessage(this.buf.slice(0, this.n)); }
        process(inputs) { const c = inputs[0][0]; if (c && this.n + c.length <= this.buf.length) { this.buf.set(c, this.n); } this.n += 128; return true; } });`;
      const url = URL.createObjectURL(new Blob([code], {type: 'application/javascript'}));
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (dest, ...rest) {
        if (dest instanceof AudioDestinationNode) {
          const ctx = this.context, node = this;
          ctx.audioWorklet.addModule(url).then(() => { const w = new AudioWorkletNode(ctx, 'tap', {numberOfInputs: 1, numberOfOutputs: 0}); connect.call(node, w); __p.taps.push({node: w, rate: ctx.sampleRate}); });
        }
        return connect.call(this, dest, ...rest);
      };
    });
    await page.selectOption('#format', 'ogg');
    await page.click('[data-song="2"]');
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('循環播放中'), null, {timeout: 20000});
    await page.waitForTimeout(47500);
    report.page.realtime = await page.evaluate(async () => {
      const rec = __p.taps.at(-1), s = __p.sources.at(-1), b = s.buffer.getChannelData(0), rate = rec.rate;
      const x = await new Promise(res => { rec.node.port.onmessage = e => res(e.data); rec.node.port.postMessage(0); });
      const n = x.length, L = Math.round(s.loopEnd * rate);
      // 錄音比播放晚一點開始。用錄到的第 2 秒那段去找它對應 buffer 的哪個位置（增益 0.65）
      let best = 1e9, pos = -1; const a0 = Math.round(2 * rate), W = 4000;
      for (let cand = a0; cand < a0 + Math.round(1.5 * rate); cand++) { let e = 0; for (let k = 0; k < W; k += 5) e += Math.abs(x[a0 + k] - .65 * b[(cand + k) % L]); if (e < best) { best = e; pos = cand; } }
      const shift = pos - a0; // x[k] 應等於 0.65*b[(k+shift)%L]
      let err = 0, errAt = -1; for (let k = a0; k < n; k++) { const d = Math.abs(x[k] - .65 * b[(k + shift) % L]); if (d > err) { err = d; errAt = k; } }
      const wrap = L - shift; let seamErr = 0; for (let k = wrap - 2400; k < wrap + 2400 && k < n; k++) seamErr = Math.max(seamErr, Math.abs(x[k] - .65 * b[(k + shift) % L]));
      let zrun = 0, zbest = 0; for (let k = wrap - 4800; k < wrap + 4800 && k < n; k++) { if (Math.abs(x[k]) < 1e-5) { zrun++; zbest = Math.max(zbest, zrun); } else zrun = 0; }
      return {rate, recorded_seconds: n / rate, loop_frames: L, align_score: best, record_lag_samples: shift, wrap_recorded: wrap < n - 2400, seconds_after_wrap: (n - wrap) / rate,
        max_err_whole: err, max_err_at_s: errAt / rate, max_err_at_seam_100ms: seamErr, longest_silent_run_near_seam_samples: zbest, sources_started: __p.starts,
        seam_window: Array.from(x.slice(wrap - 480, wrap + 480))};
    });
    await page.click('#stop');
    report.page.page_errors = errors; report.page.console_errors = consoleErrors;
    report.requests = [...new Set(requests)].filter(n => !n.startsWith('ref-'));
  } finally { await browser.close(); server.close(); }
  fs.writeFileSync(path.join(__dirname, 'bgm2-browser.json'), JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify(report, null, 1));
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
