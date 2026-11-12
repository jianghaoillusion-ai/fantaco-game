"""小頌獨立量測：不引用小夏的 validation.json。"""
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
    # 自己用 FFT 補零過取樣量 true peak，和 ffmpeg 對照（視為循環訊號）
    n = len(x); pk = 0
    for c in range(2):
        X = np.fft.rfft(x[:, c]); Y = np.zeros(n * os_ // 2 + 1, complex); Y[:len(X)] = X
        pk = max(pk, np.max(np.abs(np.fft.irfft(Y, n * os_) * os_)))
    return 20 * np.log10(pk)


def rms(a):
    return float(np.sqrt(np.mean(a ** 2)) + 1e-12)


def db(v):
    return 20 * np.log10(max(v, 1e-12))


def seam(x, bpm):
    n = len(x); mono = x.mean(axis=1)
    looped = np.concatenate([x, x])  # 尾接回頭
    d = np.abs(np.diff(looped, axis=0)).max(axis=1)
    jump = d[n - 1]  # 最後一個樣本 -> 第一個樣本
    allq = np.quantile(np.abs(np.diff(x, axis=0)).max(axis=1), [.5, .99, .999, 1])
    # 二階差分（喀聲偵測）：接點附近 ±2ms 最大值 vs 全曲分位
    lm = np.concatenate([mono, mono]); d2 = np.abs(np.diff(lm, n=2))
    w = int(.002 * SR); click = d2[n - w:n + w].max(); d2q = np.quantile(d2[:n], [.99, .999, 1])
    # 短窗能量：5ms / 20ms / 100ms，接點前後
    out = dict(jump=float(jump), diff_p50=allq[0], diff_p99=allq[1], diff_p999=allq[2], diff_max=allq[3],
               click_d2=float(click), d2_p99=d2q[0], d2_p999=d2q[1], d2_max=d2q[2])
    for ms in (5, 20, 100):
        k = int(ms / 1000 * SR)
        out[f"pre{ms}"] = db(rms(mono[-k:])); out[f"post{ms}"] = db(rms(mono[:k]))
    # 跟曲子內部「同樣音樂位置」比：每 8 小節的小節線（8→9、16→17）前後 100ms 能量差
    bar8 = round(8 * 4 * 60 / bpm * SR); k = int(.1 * SR); inner = []
    for b in (bar8, 2 * bar8):
        inner.append(db(rms(mono[b:b + k])) - db(rms(mono[b - k:b])))
    out["inner_8bar_step_db"] = inner
    out["seam_step_db"] = out["post100"] - out["pre100"]
    # 拍格是否整數：長度 / 一拍樣本數
    out["beats"] = n / (60 / bpm * SR)
    # 靜音檢查：頭尾 30ms 內最長的近零區段（|x|<1e-4）
    for name, seg in (("head", mono[:int(.05 * SR)]), ("tail", mono[-int(.05 * SR):])):
        z = np.abs(seg) < 1e-4; run = best = 0
        for v in z:
            run = run + 1 if v else 0; best = max(best, run)
        out[f"{name}_silent_samples"] = int(best)
    return out


def spectrum(x):
    mono = x.mean(axis=1); P = np.abs(np.fft.rfft(mono)) ** 2; f = np.fft.rfftfreq(len(mono), 1 / SR); tot = P.sum()
    band = lambda a, b: float(P[(f >= a) & (f < b)].sum() / tot * 100)
    return dict(lt60=band(0, 60), lt100=band(0, 100), b100_200=band(100, 200), b200_500=band(200, 500), b500_2k=band(500, 2000),
                b2k_5k=band(2000, 5000), gt5k=band(5000, 24000), gt300=band(300, 24000),
                centroid=float((f * P).sum() / tot)), (f, P)


def tempo_key(x, bpm):
    import librosa
    y = x.mean(axis=1).astype(np.float32)
    t, _ = librosa.beat.beat_track(y=y, sr=SR)
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
    return dict(librosa_bpm=float(np.atleast_1d(t)[0]), acf_bpm=float(cand[int(np.argmax(score))]),
                key=best[0][1], key_r=float(best[0][0]), key2=best[1][1], key2_r=float(best[1][0]),
                onsets_per_sec=len(onsets) / (len(y) / SR)), ch


res = {}; chroma = {}; specs = {}; sig = {}
for stem, bpm in STEMS.items():
    for ext in ("mp3", "ogg"):
        p = SRC / f"{stem}.{ext}"; r = {}
        pr = json.loads(sh([FP, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(p)]).stdout)
        st = pr["streams"][0]
        r.update(codec=st["codec_name"], sr=st["sample_rate"], ch=st["channels"], bitrate=int(pr["format"]["bit_rate"]) / 1000,
                 probe_dur=float(pr["format"]["duration"]), start_time=st.get("start_time"), tags=pr["format"].get("tags", {}),
                 stream_tags=st.get("tags", {}), nstreams=len(pr["streams"]))
        x, err = decode(p); r["decode_err"] = err.strip(); r["samples"] = len(x); r["dur"] = len(x) / SR
        if ext == "mp3":  # 不理會 LAME 無縫標記時（部分播放器）的原始長度
            xr, _ = decode(p, ("-flags2", "+skip_manual")); r["raw_samples"] = len(xr)
            nz = np.flatnonzero(np.abs(xr).max(axis=1) > 1e-4)
            r["raw_lead_silence"] = int(nz[0]); r["raw_tail_silence"] = int(len(xr) - 1 - nz[-1])
        r["sample_peak_db"] = db(np.abs(x).max()); r["clipped"] = int((np.abs(x) >= .999).sum())
        r["flat_runs"] = int(((np.abs(x[1:]) > .98) & (x[1:] == x[:-1])).sum())
        r["tp_np"] = float(true_peak_np(x)); r.update(ebu=ebu(p)); r["crest_db"] = r["sample_peak_db"] - db(rms(x))
        r["dc"] = float(np.abs(x.mean(axis=0)).max()); r["lr_corr"] = float(np.corrcoef(x[:, 0], x[:, 1])[0, 1])
        r["seam"] = seam(x, bpm); sp, fp_ = spectrum(x); r["spec"] = sp
        if ext == "mp3":
            tk, c = tempo_key(x, bpm); r["music"] = tk; chroma[stem] = c; specs[stem] = fp_; sig[stem] = x
        else:
            sig[stem + ".ogg"] = x
        res[p.name] = r
    a, b = res[stem + ".mp3"], res[stem + ".ogg"]
    n = min(a["samples"], b["samples"]); xa, xb = sig[stem][:n].mean(axis=1), sig[stem + ".ogg"][:n].mean(axis=1)
    res[stem + ":pair"] = dict(sample_diff=a["samples"] - b["samples"], corr=float(np.corrcoef(xa, xb)[0, 1]))

# 三首之間像不像：1/3 八度頻譜形狀相關、音色（MFCC）距離
import librosa
edges = 100 * 2 ** (np.arange(0, 24) / 3); shapes = {}; mf = {}
for stem in STEMS:
    f, P = specs[stem]; shapes[stem] = np.array([10 * np.log10(P[(f >= lo) & (f < hi)].sum() + 1e-9) for lo, hi in zip(edges[:-1], edges[1:])])
    m = librosa.feature.mfcc(y=sig[stem].mean(axis=1).astype(np.float32), sr=SR, n_mfcc=13); mf[stem] = m[1:].mean(axis=1)
ks = list(STEMS); sim = {}
for i in range(3):
    for j in range(i + 1, 3):
        sim[f"{ks[i]} vs {ks[j]}"] = dict(spec_shape_corr=float(np.corrcoef(shapes[ks[i]], shapes[ks[j]])[0, 1]),
                                          mfcc_dist=float(np.linalg.norm(mf[ks[i]] - mf[ks[j]])))
res["similarity"] = sim
(OUT / "measure.json").write_text(json.dumps(res, ensure_ascii=False, indent=1, default=float))

# ---- 圖 ----
for stem, bpm in STEMS.items():
    x = sig[stem]; mono = x.mean(axis=1); n = len(mono)
    fig, ax = plt.subplots(2, 1, figsize=(13, 7))
    ax[0].specgram(mono, NFFT=4096, Fs=SR, noverlap=3072, cmap="magma", vmin=-130, vmax=-40)
    ax[0].set_yscale("symlog", linthresh=200); ax[0].set_ylim(40, 16000); ax[0].axhline(100, color="cyan", lw=.8, ls="--")
    ax[0].set_title(f"{stem}.mp3 頻譜（青色虛線 = 100 Hz）"); ax[0].set_ylabel("Hz")
    f, P = specs[stem]; sm = np.convolve(P, np.ones(200) / 200, "same")
    ax[1].semilogx(f[1:], 10 * np.log10(sm[1:] / sm.max() + 1e-12)); ax[1].set_xlim(30, 20000); ax[1].set_ylim(-80, 3)
    ax[1].axvline(100, color="c", ls="--"); ax[1].axvline(300, color="orange", ls=":"); ax[1].set_title("整首平均頻譜（橘線 300 Hz 約為手機喇叭下限）"); ax[1].set_xlabel("Hz"); ax[1].set_ylabel("dB")
    fig.tight_layout(); fig.savefig(OUT / f"{stem}-spectrum.png", dpi=110); plt.close(fig)

    fig, ax = plt.subplots(3, 2, figsize=(14, 9))
    for col, key in enumerate((stem, stem + ".ogg")):
        y = sig[key].mean(axis=1); lp = np.concatenate([y, y]); m = len(y)
        for row, ms in enumerate((250, 10)):
            k = int(ms / 1000 * SR); t = (np.arange(-k, k)) / SR * 1000
            ax[row, col].plot(t, lp[m - k:m + k], lw=.7); ax[row, col].axvline(0, color="r", lw=.8)
            ax[row, col].set_title(f"{'mp3' if col == 0 else 'ogg'} 尾→頭接點 ±{ms} ms（紅線 = 接點）"); ax[row, col].set_xlabel("ms")
        k = int(.005 * SR); hop = k // 4; seg = lp[m - int(.5 * SR):m + int(.5 * SR)]
        e = [db(rms(seg[i:i + k])) for i in range(0, len(seg) - k, hop)]
        ax[2, col].plot((np.arange(len(e)) * hop / SR - .5) * 1000, e, lw=.8); ax[2, col].axvline(0, color="r", lw=.8)
        ax[2, col].set_title("5 ms 短窗能量（dBFS），接點前後各 500 ms"); ax[2, col].set_xlabel("ms")
    fig.suptitle(f"{stem} 循環接點放大"); fig.tight_layout(); fig.savefig(OUT / f"{stem}-seam.png", dpi=110); plt.close(fig)

# mp3 不理會無縫標記時的接點（最壞情況）
fig, ax = plt.subplots(3, 1, figsize=(13, 8))
for a_, stem in zip(ax, STEMS):
    xr, _ = decode(SRC / f"{stem}.mp3", ("-flags2", "+skip_manual")); y = xr.mean(axis=1); lp = np.concatenate([y, y]); m = len(y); k = int(.12 * SR)
    a_.plot(np.arange(-k, k) / SR * 1000, lp[m - k:m + k], lw=.6); a_.axvline(0, color="r", lw=.8)
    a_.set_title(f"{stem}.mp3：播放器不理會無縫標記時的接點（中間平的那段 = 編碼器補的空白）"); a_.set_xlabel("ms")
fig.tight_layout(); fig.savefig(OUT / "mp3-raw-padding-seam.png", dpi=110); plt.close(fig)

fig, ax = plt.subplots(1, 2, figsize=(14, 4.5))
for stem in STEMS:
    ax[0].plot(edges[:-1], shapes[stem] - shapes[stem].max(), marker="o", ms=3, label=stem)
ax[0].set_xscale("log"); ax[0].set_title("三首 1/3 八度頻譜形狀比較"); ax[0].legend(); ax[0].set_xlabel("Hz"); ax[0].set_ylabel("dB")
w = .27
for i, stem in enumerate(STEMS):
    ax[1].bar(np.arange(12) + (i - 1) * w, chroma[stem] / chroma[stem].max(), w, label=stem)
ax[1].set_xticks(range(12)); ax[1].set_xticklabels("C C# D D# E F F# G G# A A# B".split()); ax[1].set_title("音高分布（chroma）"); ax[1].legend()
fig.tight_layout(); fig.savefig(OUT / "three-way-compare.png", dpi=110); plt.close(fig)
print("ok")
