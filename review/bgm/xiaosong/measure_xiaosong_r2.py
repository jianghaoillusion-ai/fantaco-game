"""小頌第 2 次獨立量測（對 commit 449b595 的六個音檔）。不引用小夏的 validation.json。
用法：python measure_xiaosong_r2.py <review/bgm 目錄> <輸出目錄>
只讀音檔與 compose_cute.py（在記憶體裡重算母帶做比對），不寫任何音檔。
"""
import json, subprocess, sys, re
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

FF = "/Users/haomini/media-tools/bin/ffmpeg"
FP = "/Users/haomini/media-tools/bin/ffprobe"
SRC = Path(sys.argv[1]); OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
for fp in font_manager.findSystemFonts():
    if "NotoSansTC" in fp or "PingFang" in fp:
        font_manager.fontManager.addfont(fp)
        plt.rcParams["font.family"] = font_manager.FontProperties(fname=fp).get_name(); break
SR = 48000
STEMS = {"cute-a-glock-bubbles": 120, "cute-b-uke-hop": 112, "cute-c-whistle-parade": 128}

# 在記憶體裡載入小夏的合成程式（不執行 main，不寫檔），另做一份「沒有 3ms 平滑」的版本對照
src = (SRC / "compose_cute.py").read_text()
ns = {"__file__": str(SRC / "compose_cute.py"), "__name__": "cc"}; exec(compile(src, "compose_cute", "exec"), ns)
ns2 = {"__file__": str(SRC / "compose_cute.py"), "__name__": "cc2"}
assert "if s['kind']=='pluck':\n        w=round(.003*SR)" in src
exec(compile(src.replace("if s['kind']=='pluck':\n        w=round(.003*SR)", "if False:\n        w=round(.003*SR)"), "compose_nosplice", "exec"), ns2)
SONGS = {s["stem"]: s for s in ns["SONGS"]}


def sh(a):
    return subprocess.run(a, capture_output=True)


def decode(p, extra=()):
    r = sh([FF, "-v", "error", *extra, "-i", str(p), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"])
    return np.frombuffer(r.stdout, dtype="<f4").reshape(-1, 2).astype(np.float64), r.stderr.decode()


def ebu(p):
    log = sh([FF, "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.decode()
    s = log.rsplit("Summary:", 1)[-1]
    g = lambda k: float(re.search(k + r":\s*(-?[\d.]+)", s).group(1))
    return dict(I=g("I"), LRA=g("LRA"), TP=g("Peak"))


def true_peak_np(x, os_=8):
    n = len(x); pk = 0
    for c in range(2):
        X = np.fft.rfft(x[:, c]); Y = np.zeros(n * os_ // 2 + 1, complex); Y[:len(X)] = X
        pk = max(pk, np.max(np.abs(np.fft.irfft(Y, n * os_) * os_)))
    return 20 * np.log10(pk)


def rms(a):
    return float(np.sqrt(np.mean(np.asarray(a) ** 2)) + 1e-12)


def db(v):
    return 20 * np.log10(max(v, 1e-12))


def env_db(mono, center, half_ms, win_ms=2.0):
    """以 center 為中心 ±half_ms 的短窗能量曲線（循環取樣）。"""
    n = len(mono); k = int(win_ms / 1000 * SR); h = int(half_ms / 1000 * SR)
    idx = (center + np.arange(-h, h + k)) % n; seg = mono[idx]
    c = np.cumsum(np.r_[0, seg ** 2]); e = np.sqrt((c[k:] - c[:-k]) / k)
    return 20 * np.log10(e + 1e-9)  # 長度 2h+1，位置 i 對應 center-h+i 起算的窗


def seam(x, bpm):
    n = len(x); mono = x.mean(axis=1); bar = 4 * 60 / bpm * SR
    out = dict(beats=n / (60 / bpm * SR), bars=n / bar)
    d1 = np.abs(np.diff(np.r_[x, x[:1]], axis=0)).max(axis=1)
    out["jump"] = float(d1[-1]); out["diff_p50"], out["diff_p99"], out["diff_max"] = [float(v) for v in np.quantile(d1[:-1], [.5, .99, 1])]
    # 每條小節線（0 = 循環接點，1..23 = 曲內）量一樣的東西，接點拿去跟曲內比
    lines = []
    for b in range(24):
        q = round(b * bar) % n; r = {}
        w = int(.002 * SR); i2 = (q + np.arange(-w, w + 2)) % n
        r["d2"] = float(np.abs(np.diff(mono[i2], n=2)).max())
        for ms in (5, 20, 100):
            k = int(ms / 1000 * SR)
            r[f"pre{ms}"] = db(rms(mono[(q - k + np.arange(k)) % n])); r[f"post{ms}"] = db(rms(mono[(q + np.arange(k)) % n]))
        e = env_db(mono, q, 150, 10)  # 10ms 窗
        h = int(.15 * SR)
        r["min10ms_pre150"] = float(e[:h - int(.01 * SR)].min())  # 小節線前 150ms 內最安靜的 10ms
        # 小節線前「低於 -40 dBFS」的連續長度（ms），從小節線往回數
        e2 = env_db(mono, q, 400, 10)[:int(.4 * SR) - int(.01 * SR)][::-1]
        below = np.argmax(e2 > -40) if (e2 > -40).any() else len(e2)
        r["quiet_run_before_ms"] = float(below / SR * 1000)
        # 2ms 窗在 ±6ms 內的凹洞：最低點比兩側（±6~12ms）平均低多少 dB
        e3 = env_db(mono, q, 12, 2); c = len(e3) // 2; k6 = int(.006 * SR); k2 = int(.002 * SR)
        inner = e3[c - k6:c + k6 - k2].min(); side = np.r_[e3[:c - k6 - k2], e3[c + k6:]].mean()
        r["notch_db"] = float(side - inner)
        lines.append(r)
    out["lines"] = lines
    s0, inn = lines[0], lines[1:]
    for key in ("d2", "pre100", "post100", "pre20", "pre5", "min10ms_pre150", "quiet_run_before_ms", "notch_db"):
        v = np.array([r[key] for r in inn])
        out[key] = dict(seam=s0[key], inner_min=float(v.min()), inner_med=float(np.median(v)), inner_max=float(v.max()))
    step = np.array([r["post100"] - r["pre100"] for r in inn])
    out["step100"] = dict(seam=s0["post100"] - s0["pre100"], inner_min=float(step.min()), inner_med=float(np.median(step)), inner_max=float(step.max()))
    for name, seg in (("head", mono[:int(.05 * SR)]), ("tail", mono[-int(.05 * SR):])):
        z = np.abs(seg) < 1e-4; run = best = 0
        for v in z:
            run = run + 1 if v else 0; best = max(best, run)
        out[f"{name}_zero_run_samples"] = int(best)
    # 全曲有多少時間是「幾乎沒聲音」（50ms 窗 < -40 dBFS），最長一段多長
    k = int(.05 * SR); hop = int(.005 * SR); lm = np.r_[mono, mono[:k]]
    e = np.array([db(rms(lm[i:i + k])) for i in range(0, n, hop)])
    q = e < -40; out["quiet_pct"] = float(q.mean() * 100)
    run = best = 0
    for v in np.r_[q, q]:
        run = run + 1 if v else 0; best = max(best, run)
    out["longest_quiet_ms"] = float(min(best, len(q)) * hop / SR * 1000 + 50) if best else 0.0
    return out


def spectrum(x):
    mono = x.mean(axis=1); P = np.abs(np.fft.rfft(mono)) ** 2; f = np.fft.rfftfreq(len(mono), 1 / SR); tot = P.sum()
    band = lambda a, b: float(P[(f >= a) & (f < b)].sum() / tot * 100)
    return dict(lt60=band(0, 60), lt100=band(0, 100), b100_200=band(100, 200), b200_500=band(200, 500), b500_2k=band(500, 2000),
                b2k_5k=band(2000, 5000), gt5k=band(5000, 24000), gt300=band(300, 24000),
                centroid=float((f * P).sum() / tot)), (f, P)


def tempo_key(x):
    import librosa
    y = x.mean(axis=1).astype(np.float32)
    oenv = librosa.onset.onset_strength(y=y, sr=SR, hop_length=512)
    ac = librosa.autocorrelate(oenv, max_size=len(oenv) // 2)
    lags = np.arange(len(ac)) * 512 / SR
    cand = np.arange(80, 180.01, .5); score = [np.interp(60 / b, lags, ac) + np.interp(120 / b, lags, ac) for b in cand]
    ch = librosa.feature.chroma_cqt(y=y, sr=SR).mean(axis=1)
    maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    mn = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    names = "C C# D D# E F F# G G# A A# B".split(); best = []
    for i in range(12):
        best.append((np.corrcoef(np.roll(maj, i), ch)[0, 1], names[i] + " 大調"))
        best.append((np.corrcoef(np.roll(mn, i), ch)[0, 1], names[i] + " 小調"))
    best.sort(reverse=True)
    onsets = librosa.onset.onset_detect(y=y, sr=SR, units="time")
    # 拍點對齊：起音落在 16 分音符格線上的比例（三連搖擺另算在 1/3 拍格）
    return dict(acf_bpm=float(cand[int(np.argmax(score))]), key=best[0][1], key_r=float(best[0][0]), key2=best[1][1], key2_r=float(best[1][0]),
                onsets_per_sec=len(onsets) / (len(y) / SR)), ch, oenv


res = {}; chroma = {}; specs = {}; sig = {}; oenvs = {}; masters = {}
for stem, bpm in STEMS.items():
    # 重算母帶（含平滑／不含平滑），固定增益對齊到解碼檔
    m1 = ns["synth"](SONGS[stem]); m0 = ns2["synth"](SONGS[stem]); masters[stem] = (m1, m0)
    for ext in ("mp3", "ogg"):
        p = SRC / f"{stem}.{ext}"; r = {}
        pr = json.loads(sh([FP, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(p)]).stdout)
        st = pr["streams"][0]
        r.update(codec=st["codec_name"], sr=st["sample_rate"], ch=st["channels"], bitrate=int(pr["format"]["bit_rate"]) / 1000,
                 probe_dur=float(pr["format"]["duration"]), tags=pr["format"].get("tags", {}), stream_tags=st.get("tags", {}), nstreams=len(pr["streams"]))
        x, err = decode(p); r["decode_err"] = err.strip(); r["samples"] = len(x); r["dur"] = len(x) / SR
        if ext == "mp3":
            xr, _ = decode(p, ("-flags2", "+skip_manual")); r["raw_samples"] = len(xr)
            nz = np.flatnonzero(np.abs(xr).max(axis=1) > 1e-4)
            r["raw_lead_silence"] = int(nz[0]); r["raw_tail_silence"] = int(len(xr) - 1 - nz[-1]); sig[stem + ".raw"] = xr
        r["sample_peak_db"] = db(np.abs(x).max()); r["clipped"] = int((np.abs(x) >= .999).sum())
        r["flat_runs"] = int(((np.abs(x[1:]) > .98) & (x[1:] == x[:-1])).sum())
        r["tp_np"] = float(true_peak_np(x)); r.update(ebu=ebu(p)); r["crest_db"] = r["sample_peak_db"] - db(rms(x))
        r["dc"] = float(np.abs(x.mean(axis=0)).max())
        r["seam"] = seam(x, bpm); sp, fp_ = spectrum(x); r["spec"] = sp
        # 跟重算母帶比：樣本數、相關係數、殘差（dB，相對訊號）
        if len(m1) == len(x):
            g = float((x * m1).sum() / (m1 * m1).sum()); resid = x - g * m1
            r["vs_master"] = dict(same_len=True, corr=float(np.corrcoef(x[:, 0], m1[:, 0])[0, 1]), resid_db=db(rms(resid)) - db(rms(x)))
        else:
            r["vs_master"] = dict(same_len=False, master_len=len(m1))
        if ext == "mp3":
            tk, c, oe = tempo_key(x); r["music"] = tk; chroma[stem] = c; specs[stem] = fp_; sig[stem] = x; oenvs[stem] = oe
        else:
            sig[stem + ".ogg"] = x
        res[p.name] = r
    a, b = res[stem + ".mp3"], res[stem + ".ogg"]
    n = min(a["samples"], b["samples"]); xa, xb = sig[stem][:n].mean(axis=1), sig[stem + ".ogg"][:n].mean(axis=1)
    res[stem + ":pair"] = dict(sample_diff=a["samples"] - b["samples"], corr=float(np.corrcoef(xa, xb)[0, 1]))
    # 母帶層級：音尾有沒有真的繞回開頭——把「不繞回」會是什麼樣子的開頭拿來比
    mm = m0.mean(axis=1); k = int(.15 * SR)
    res[stem + ":master"] = dict(len=len(m1), bars=len(m1) / (4 * 60 / bpm * SR), seam_nosplice=seam(m0, bpm), seam_splice=seam(m1, bpm),
                                 splice_changed_samples=int((np.abs(m1 / np.abs(m1).max() - m0 / np.abs(m0).max()).max(axis=1) > 1e-9).sum()))

import librosa
edges = 100 * 2 ** (np.arange(0, 24) / 3); shapes = {}; mf = {}; sim = {}
for stem in STEMS:
    f, P = specs[stem]; shapes[stem] = np.array([10 * np.log10(P[(f >= lo) & (f < hi)].sum() + 1e-9) for lo, hi in zip(edges[:-1], edges[1:])])
    m = librosa.feature.mfcc(y=sig[stem].mean(axis=1).astype(np.float32), sr=SR, n_mfcc=13); mf[stem] = m[1:].mean(axis=1)
ks = list(STEMS)
# 節奏輪廓：把起音強度折到「一小節」裡（48 格），三首互比
prof = {}
for stem, bpm in STEMS.items():
    oe = oenvs[stem]; t = np.arange(len(oe)) * 512 / SR; pos = (t / (240 / bpm)) % 1; pr_ = np.zeros(48)
    np.add.at(pr_, (pos * 48).astype(int) % 48, oe); prof[stem] = pr_ / pr_.max()
for i in range(3):
    for j in range(i + 1, 3):
        sim[f"{ks[i]} vs {ks[j]}"] = dict(spec_shape_corr=float(np.corrcoef(shapes[ks[i]], shapes[ks[j]])[0, 1]),
                                          mfcc_dist=float(np.linalg.norm(mf[ks[i]] - mf[ks[j]])),
                                          rhythm_profile_corr=float(np.corrcoef(prof[ks[i]], prof[ks[j]])[0, 1]))
res["similarity"] = sim
(OUT / "r2-measure.json").write_text(json.dumps(res, ensure_ascii=False, indent=1, default=float))

# ---------------- 圖 ----------------
for stem, bpm in STEMS.items():
    x = sig[stem]; mono = x.mean(axis=1)
    fig, ax = plt.subplots(2, 1, figsize=(13, 7))
    ax[0].specgram(mono, NFFT=4096, Fs=SR, noverlap=3072, cmap="magma", vmin=-130, vmax=-40)
    ax[0].set_yscale("symlog", linthresh=200); ax[0].set_ylim(40, 16000); ax[0].axhline(100, color="cyan", lw=.8, ls="--")
    ax[0].set_title(f"{stem}.mp3 頻譜（青色虛線 = 100 Hz）"); ax[0].set_ylabel("Hz")
    f, P = specs[stem]; sm = np.convolve(P, np.ones(200) / 200, "same")
    ax[1].semilogx(f[1:], 10 * np.log10(sm[1:] / sm.max() + 1e-12)); ax[1].set_xlim(30, 20000); ax[1].set_ylim(-80, 3)
    ax[1].axvline(100, color="c", ls="--"); ax[1].axvline(300, color="orange", ls=":"); ax[1].set_title("整首平均頻譜（橘線 300 Hz 約為手機喇叭下限）"); ax[1].set_xlabel("Hz"); ax[1].set_ylabel("dB")
    fig.tight_layout(); fig.savefig(OUT / f"r2-{stem}-spectrum.png", dpi=100); plt.close(fig)

    fig, ax = plt.subplots(3, 2, figsize=(14, 9))
    for col, key in enumerate((stem, stem + ".ogg")):
        y = sig[key].mean(axis=1); lp = np.concatenate([y, y]); m = len(y)
        for row, ms in enumerate((250, 10)):
            k = int(ms / 1000 * SR); t = (np.arange(-k, k)) / SR * 1000
            ax[row, col].plot(t, lp[m - k:m + k], lw=.7); ax[row, col].axvline(0, color="r", lw=.8)
            ax[row, col].set_title(f"{'mp3' if col == 0 else 'ogg'} 尾→頭接點 ±{ms} ms（紅線 = 接點）"); ax[row, col].set_xlabel("ms")
        # 2 小節的 20ms 能量：最後一小節 + 第一小節，跟曲內第 8|9 小節線疊在一起比
        bar = 4 * 60 / bpm; h = int(bar * SR); k = int(.02 * SR); hop = k // 4
        for q, lab, col_ in ((0, "循環接點（第24→1小節）", "C3"), (round(8 * bar * SR), "曲內 第8→9小節", "C0"), (round(16 * bar * SR), "曲內 第16→17小節", "C2")):
            seg = y[(q + np.arange(-h, h)) % m]; e = [db(rms(seg[i:i + k])) for i in range(0, len(seg) - k, hop)]
            ax[2, col].plot(np.arange(len(e)) * hop / SR - bar, e, lw=.9, label=lab, color=col_, alpha=.85)
        ax[2, col].axvline(0, color="r", lw=.8); ax[2, col].legend(fontsize=8); ax[2, col].set_ylim(-70, -5)
        ax[2, col].set_title("20 ms 短窗能量（dBFS），小節線前後各一小節"); ax[2, col].set_xlabel("秒")
    fig.suptitle(f"{stem} 循環接點放大（第 2 輪）"); fig.tight_layout(); fig.savefig(OUT / f"r2-{stem}-seam.png", dpi=100); plt.close(fig)

# B：3ms 平滑前後的母帶接點
m1, m0 = masters["cute-b-uke-hop"]; fig, ax = plt.subplots(2, 1, figsize=(13, 7))
for a_, (mm, lab) in zip(ax, ((m0, "沒有 3ms 平滑（純繞回渲染）"), (m1, "交付版：頭尾各 3ms 收到 0 再放開"))):
    y = mm.mean(axis=1); lp = np.concatenate([y, y]); m = len(y); k = int(.02 * SR)
    a_.plot(np.arange(-k, k) / SR * 1000, lp[m - k:m + k], lw=.8); a_.axvline(0, color="r", lw=.8); a_.axvspan(-3, 3, color="orange", alpha=.15)
    a_.set_title(f"cute-b 母帶接點 ±20ms：{lab}"); a_.set_xlabel("ms")
fig.tight_layout(); fig.savefig(OUT / "r2-b-microsplice.png", dpi=100); plt.close(fig)

fig, ax = plt.subplots(3, 1, figsize=(13, 8))
for a_, stem in zip(ax, STEMS):
    y = sig[stem + ".raw"].mean(axis=1); lp = np.concatenate([y, y]); m = len(y); k = int(.12 * SR)
    a_.plot(np.arange(-k, k) / SR * 1000, lp[m - k:m + k], lw=.6); a_.axvline(0, color="r", lw=.8)
    a_.set_title(f"{stem}.mp3：播放器不理會無縫標記時的接點（中間平的那段 = 編碼器補的空白）"); a_.set_xlabel("ms")
fig.tight_layout(); fig.savefig(OUT / "r2-mp3-raw-padding-seam.png", dpi=100); plt.close(fig)

fig, ax = plt.subplots(1, 3, figsize=(17, 4.5))
for stem in STEMS:
    ax[0].plot(edges[:-1], shapes[stem] - shapes[stem].max(), marker="o", ms=3, label=stem)
    ax[2].plot(np.arange(48) / 12, prof[stem], label=stem)
ax[0].set_xscale("log"); ax[0].set_title("三首 1/3 八度頻譜形狀"); ax[0].legend(fontsize=8); ax[0].set_xlabel("Hz"); ax[0].set_ylabel("dB")
w = .27
for i, stem in enumerate(STEMS):
    ax[1].bar(np.arange(12) + (i - 1) * w, chroma[stem] / chroma[stem].max(), w, label=stem)
ax[1].set_xticks(range(12)); ax[1].set_xticklabels("C C# D D# E F F# G G# A A# B".split()); ax[1].set_title("音高分布（chroma）")
ax[2].set_title("一小節內的起音位置（節奏輪廓）"); ax[2].set_xlabel("拍"); ax[2].legend(fontsize=8)
fig.tight_layout(); fig.savefig(OUT / "r2-three-way-compare.png", dpi=100); plt.close(fig)
print("ok")
