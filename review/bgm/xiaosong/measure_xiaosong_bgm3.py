"""小頌 bgm3 獨立量測。只讀音檔與樂譜，不寫任何音檔；輸出 bgm3-measure.json 與 bgm3-*.png。
用法：PYTHONDONTWRITEBYTECODE=1 ~/media-tools/venv/bin/python review/bgm/xiaosong/measure_xiaosong_bgm3.py
所有 PCM 都放記憶體（ffmpeg 走 pipe），不落地 WAV。
"""
import sys, json, hashlib, subprocess, re, itertools
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
AUDIO = ROOT / 'assets/audio'
FF = '/Users/haomini/media-tools/bin/ffmpeg'
FP = '/Users/haomini/media-tools/bin/ffprobe'
SR = 48000
GUARD = 9216
scores = json.loads((ROOT / 'review/bgm/scores-bgm3.json').read_text())
IDS = [s['id'] for s in scores]
S = {s['id']: s for s in scores}


def decode(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', str(path), '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)


def loud(pcm):
    p = subprocess.run([FF, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       input=pcm.astype('<f4').tobytes(), capture_output=True)
    t = p.stderr.decode('utf-8', 'replace').split('Summary:')[-1]
    g = lambda k: float(re.search(k + r':\s*(-?[\d.]+)', t).group(1))
    return dict(lufs=g('I'), lra=g('LRA'), true_peak=g('Peak'))


def db(x):
    return float(10 * np.log10(max(1e-24, np.mean(np.square(x)))))


def ring(x, q, frames, ks):
    return x[q + (np.asarray(ks) % frames)]


def dip_at(x, q, frames, centre=0):
    """2ms 窗、±6ms，每 0.5ms 一格；回傳中間比兩端低多少 dB（和 audio.js 同一個定義）。"""
    w = 96
    vals = []
    for ms in np.arange(-6, 6.01, .5):
        at = centre + int(round(ms * 48)) - w // 2
        vals.append(db(ring(x, q, frames, at + np.arange(w))))
    return max(0.0, min(vals[0], vals[-1]) - min(vals))


def d2_at(x, q, frames, centre=0):
    seg = ring(x, q, frames, centre + np.arange(-96, 96))
    return float(np.max(np.abs(np.diff(seg, n=2, axis=0))))


def player_origin(x, frames, guard=GUARD):
    """逐行照 js/audio.js prepareLoopBuffer 重寫。"""
    nominal = dip_at(x, guard, frames)
    origin, best = guard, np.inf
    for d in range(-480, 481):
        q = guard + d
        if q < 2 or q + frames + 2 > len(x):
            continue
        score = d2_at(x, q, frames) + abs(d) * 1e-12
        if score < best and dip_at(x, q, frames) <= nominal + .01:
            best, origin = score, q
    return origin


def circ_corr(a, b):
    """兩段等長單聲道訊號的最大循環互相關（正規化）與位移。"""
    A, B = np.fft.rfft(a - a.mean()), np.fft.rfft(b - b.mean())
    c = np.fft.irfft(A * np.conj(B), n=len(a))
    k = int(np.argmax(c))
    return float(c[k] / (np.linalg.norm(a - a.mean()) * np.linalg.norm(b - b.mean()))), k


def probe(path):
    j = json.loads(subprocess.run([FP, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)],
                                  capture_output=True, check=True).stdout)
    st = j['streams'][0]
    return dict(codec=st['codec_name'], sample_rate=int(st['sample_rate']), channels=st['channels'],
                bit_rate=int(j['format'].get('bit_rate', 0)), duration=float(j['format']['duration']),
                tags={**j['format'].get('tags', {}), **st.get('tags', {})})


def analyse_file(sid, ext):
    s = S[sid]
    path = AUDIO / f'bgm-{sid}.{ext}'
    x = decode(path)
    frames = s['samples']
    out = dict(id=sid, ext=ext, bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
               probe=probe(path), decoded_samples=len(x), expected_samples=frames + 2 * GUARD,
               excess=len(x) - frames - 2 * GUARD, loop_frames=frames, loop_seconds=frames / SR)
    origin = player_origin(x, frames)
    out['player_origin'] = origin
    L = x[origin:origin + frames]
    mono = L.mean(axis=1)
    beat = 60 / s['bpm']
    bars = [int(round(b * s['meter'] * beat * SR)) - s['origin_shift_samples'] - (origin - GUARD) for b in range(1, s['bars'])]
    adj = np.abs(np.diff(L, axis=0)).max(axis=1)
    out['seam'] = dict(
        jump=float(np.max(np.abs(L[0] - L[-1]))),
        adj_p50=float(np.percentile(adj, 50)), adj_p99=float(np.percentile(adj, 99)),
        d2=d2_at(x, origin, frames), d2_inner_max=max(d2_at(x, origin, frames, q) for q in bars),
        d2_inner_median=float(np.median([d2_at(x, origin, frames, q) for q in bars])),
        dip=dip_at(x, origin, frames), dip_inner_max=max(dip_at(x, origin, frames, q) for q in bars),
        pre100_db=db(L[-4800:]), post100_db=db(L[:4800]),
        min10ms_last150_db=min(db(L[len(L) - 7200 + k:len(L) - 7200 + k + 480]) for k in range(0, 6721, 240)),
    )
    # 接點二階差在全曲的排名（隨機 4000 個位置的同一個指標）
    rng = np.random.default_rng(7)
    ref = np.array([d2_at(x, origin, frames, int(q)) for q in rng.integers(200, frames - 200, 4000)])
    out['seam']['d2_percentile_in_song'] = float((ref < out['seam']['d2']).mean() * 100)
    # 尾端連續近靜音（10ms 窗 < -40 dBFS）
    quiet = 0
    for k in range(400):
        e = len(L) - k * 48
        if db(L[e - 480:e]) >= -40:
            break
        quiet += 1
    out['seam']['tail_quiet_ms'] = quiet
    # 全曲 50ms 窗近靜音比例與最長
    w = 2400
    e = np.array([db(L[i:i + w]) for i in range(0, len(L) - w, w)])
    q = e < -40
    longest = cur = 0
    for v in q:
        cur = cur + 1 if v else 0
        longest = max(longest, cur)
    out['quiet_fraction_pct'] = float(q.mean() * 100)
    out['longest_quiet_ms'] = longest * 50
    # 檔案頭尾數位靜音、緩衝區是不是真的同一圈（不是靜音、不是別的東西）
    nz = np.flatnonzero(np.abs(x).max(axis=1) > 1e-4)
    out['file_lead_silence_samples'] = int(nz[0])
    out['file_trail_silence_samples'] = int(len(x) - 1 - nz[-1])
    out['guard_head_db'] = db(x[:GUARD])
    out['guard_tail_db'] = db(x[GUARD + frames:GUARD + frames + GUARD])
    n = 2000
    pre_a, pre_b = x[origin - n:origin], x[origin + frames - n:origin + frames]
    post_a, post_b = x[origin:origin + n], x[origin + frames:origin + frames + n]
    out['periodic_error_pre_db'] = db(pre_a - pre_b) - db(pre_b)
    out['periodic_error_post_db'] = db(post_a - post_b) - db(post_a)
    # 響度
    out['loop'] = loud(L)
    out['whole_file'] = loud(x)
    out['max_abs'] = float(np.max(np.abs(x)))
    out['clipped_samples'] = int(np.sum(np.abs(x) >= 0.999))
    # 頻譜分布
    spec = np.abs(np.fft.rfft(mono)) ** 2
    f = np.fft.rfftfreq(len(mono), 1 / SR)
    tot = spec.sum()
    out['spectrum'] = dict(below_100hz_pct=float(spec[f < 100].sum() / tot * 100),
                           below_200hz_pct=float(spec[f < 200].sum() / tot * 100),
                           above_5k_pct=float(spec[f > 5000].sum() / tot * 100),
                           centroid_hz=float((spec * f).sum() / tot))
    return out, L, x


def krumhansl(chroma):
    maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    res = []
    for i in range(12):
        res.append((float(np.corrcoef(chroma, np.roll(maj, i))[0, 1]), names[i] + ' 大調'))
        res.append((float(np.corrcoef(chroma, np.roll(mnr, i))[0, 1]), names[i] + ' 小調'))
    res.sort(reverse=True)
    return res[:2]


def main():
    import librosa
    report = dict(files=[], songs={}, pairs=[])
    loops, feats = {}, {}
    for sid in IDS:
        for ext in ('mp3', 'ogg'):
            r, L, x = analyse_file(sid, ext)
            report['files'].append(r)
            if ext == 'mp3':
                loops[sid] = L
            else:
                loops[sid + '.ogg'] = L
            print(sid, ext, r['excess'], r['player_origin'], round(r['loop']['lufs'], 2), r['loop']['true_peak'],
                  'jump', round(r['seam']['jump'], 4), 'd2', round(r['seam']['d2'], 4), '/', round(r['seam']['d2_inner_max'], 4),
                  'dip', round(r['seam']['dip'], 1), '/', round(r['seam']['dip_inner_max'], 1), 'quiet', r['seam']['tail_quiet_ms'], flush=True)

    # ---- 是不是真的由 repo 裡的程式合成（無取樣）＋ A/B/C 是否就是那三首樣本 ----
    sys.path.insert(0, str(ROOT / 'review/bgm'))
    import compose_full as CF
    import compose_cute as CC
    samples = ['cute-a-glock-bubbles', 'cute-b-uke-hop', 'cute-c-whistle-parade']
    for i, sid in enumerate(IDS):
        mono = loops[sid].mean(axis=1)
        if i < 3:
            synth = CC.synth(CC.SONGS[i])
            old = decode(ROOT / 'review/bgm' / (samples[i] + '.mp3')).mean(axis=1)
            m = min(len(old), len(mono))
            c_old, k_old = circ_corr(mono[:m], old[:m]) if abs(len(old) - len(mono)) < 4 else (None, None)
        else:
            synth, _ = CF.new_synth(CF.SCORES[i - 3])
            c_old = k_old = None
        sm = synth.mean(axis=1)
        c, k = circ_corr(mono, sm) if len(sm) == len(mono) else (None, None)
        report['songs'][sid] = dict(resynth_corr=c, resynth_shift=k, resynth_len=len(sm),
                                    sample_corr=c_old, sample_shift=k_old, sample=samples[i] if i < 3 else None)
        print('resynth', sid, c, c_old, flush=True)

    # ---- 每首的音樂特徵（從音檔量，不是抄樂譜）----
    for sid in IDS:
        s = S[sid]
        mono = loops[sid].mean(axis=1)
        y = librosa.resample(mono.astype(np.float32), orig_sr=SR, target_sr=22050)
        tempo, _ = librosa.beat.beat_track(y=y, sr=22050, start_bpm=s['bpm'])
        tempo_free, _ = librosa.beat.beat_track(y=y, sr=22050)
        chroma = librosa.feature.chroma_cqt(y=y, sr=22050, hop_length=512)
        keys = krumhansl(chroma.mean(axis=1))
        oenv = librosa.onset.onset_strength(y=y, sr=22050, hop_length=256)
        t = np.arange(len(oenv)) * 256 / 22050 + (s['origin_shift_samples'] + (next(r for r in report['files'] if r['id'] == sid and r['ext'] == 'mp3')['player_origin'] - GUARD)) / SR
        beat = 60 / s['bpm']
        # 一拍內 12 格、一小節內（每拍 12 格）的起音輪廓
        pb = np.zeros(12); cb = np.zeros(12)
        nb = s['meter'] * 12
        pbar = np.zeros(nb); cbar = np.zeros(nb)
        for tt, v in zip(t, oenv):
            ph = (tt / beat) % 1
            pb[int(ph * 12) % 12] += v; cb[int(ph * 12) % 12] += 1
            pm = (tt / beat) % s['meter']
            pbar[int(pm * 12) % nb] += v; cbar[int(pm * 12) % nb] += 1
        pb /= np.maximum(cb, 1); pbar /= np.maximum(cbar, 1)
        # 以樂譜拍點為格的 chroma（移到主音=0，才能跨調比較）
        tonic = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}[s['key'].split()[0]]
        ct = np.arange(chroma.shape[1]) * 512 / 22050 + t[0]
        nbeats = s['meter'] * s['bars']
        bc = np.zeros((nbeats, 12))
        idx = np.floor((ct / beat) % nbeats).astype(int)
        for b in range(nbeats):
            sel = chroma[:, idx == b]
            if sel.shape[1]:
                bc[b] = np.roll(sel.mean(axis=1), -tonic)
        mel = librosa.feature.melspectrogram(y=y, sr=22050, n_mels=40)
        mfcc = librosa.feature.mfcc(S=librosa.power_to_db(mel), n_mfcc=13).mean(axis=1)
        ev = np.array(s['events'], dtype=float)
        feats[sid] = dict(beat_profile=pb, bar_profile=pbar, beat_chroma=bc, mfcc=mfcc, chroma_mean=np.roll(chroma.mean(axis=1), -tonic), events=ev)
        iv = np.diff(ev[:, 1]).astype(int)
        report['songs'][sid].update(
            name=s['name'], claimed_key=s['key'], claimed_bpm=s['bpm'], meter=s['meter'], bars=s['bars'],
            measured_bpm_guided=float(np.atleast_1d(tempo)[0]), measured_bpm_free=float(np.atleast_1d(tempo_free)[0]),
            measured_key=[dict(key=k, r=round(r, 3)) for r, k in keys],
            melody_notes=int(len(ev)), melody_range=[int(ev[:, 1].min()), int(ev[:, 1].max())],
            notes_per_bar=len(ev) / s['bars'],
            melody_onsets_in_bar=sorted({round(float(o % s['meter']), 3) for o in ev[:, 0]}),
            distinct_bar_rhythms=len({tuple(round(float(o % s['meter']), 3) for o in ev[(ev[:, 0] // s['meter']) == b, 0]) for b in range(s['bars'])}),
            distinct_bar_melodies=len({tuple(int(p) for p in ev[(ev[:, 0] // s['meter']) == b, 1]) for b in range(s['bars'])}),
            mean_abs_interval=float(np.abs(iv).mean()), leaps_over_fifth_pct=float((np.abs(iv) > 7).mean() * 100),
            stepwise_pct=float((np.abs(iv) <= 2).mean() * 100),
        )

    def grams(ev, n=4):
        iv = np.diff(ev[:, 1]).astype(int)
        return {tuple(iv[i:i + n]) for i in range(len(iv) - n + 1)}

    def best_lag_corr(A, B):
        """兩段拍格 chroma 序列（已移到主音），找最像的對齊：取 16 拍一段滑動比對。"""
        n = 16
        best = -1
        a = A[:n].ravel(); a = (a - a.mean()) / (a.std() + 1e-9)
        for lag in range(0, len(B)):
            b = np.roll(B, -lag, axis=0)[:n].ravel(); b = (b - b.mean()) / (b.std() + 1e-9)
            best = max(best, float((a * b).mean()))
        return best

    for a, b in itertools.combinations(IDS, 2):
        fa, fb = feats[a], feats[b]
        ga, gb = grams(fa['events']), grams(fb['events'])
        g3a, g3b = grams(fa['events'], 3), grams(fb['events'], 3)
        pair = dict(a=a, b=b,
                    melody_4gram_jaccard=len(ga & gb) / max(1, len(ga | gb)),
                    melody_3gram_jaccard=len(g3a & g3b) / max(1, len(g3a | g3b)),
                    beat_profile_corr=float(np.corrcoef(fa['beat_profile'], fb['beat_profile'])[0, 1]),
                    bar_profile_corr=float(np.corrcoef(fa['bar_profile'], fb['bar_profile'])[0, 1]) if len(fa['bar_profile']) == len(fb['bar_profile']) else None,
                    beat_chroma_best_corr=best_lag_corr(fa['beat_chroma'], fb['beat_chroma']),
                    timbre_mfcc_dist=float(np.linalg.norm(fa['mfcc'][1:] - fb['mfcc'][1:])),
                    bpm_diff=abs(S[a]['bpm'] - S[b]['bpm']), same_key=S[a]['key'] == S[b]['key'], same_meter=S[a]['meter'] == S[b]['meter'],
                    same_rhythm_cell=report['songs'][a]['melody_onsets_in_bar'] == report['songs'][b]['melody_onsets_in_bar'])
        report['pairs'].append(pair)
    # 對照組：同一首自己的前 16 拍對自己其他位置（排除 0 位移）——讓「像」長什麼樣有個基準
    for sid in IDS:
        A = feats[sid]['beat_chroma']; n = 16
        a = A[:n].ravel(); a = (a - a.mean()) / (a.std() + 1e-9)
        best = -1
        for lag in range(n, len(A) - n + 1):
            b = np.roll(A, -lag, axis=0)[:n].ravel(); b = (b - b.mean()) / (b.std() + 1e-9)
            best = max(best, float((a * b).mean()))
        report['songs'][sid]['self_beat_chroma_repeat_corr'] = best

    (HERE / 'bgm3-measure.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')

    # ---------------- 圖 ----------------
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    F = {(r['id'], r['ext']): r for r in report['files']}
    # 1) 接點波形
    fig, ax = plt.subplots(14, 4, figsize=(22, 38))
    for i, sid in enumerate(IDS):
        for j, ext in enumerate(('mp3', 'ogg')):
            L = loops[sid if ext == 'mp3' else sid + '.ogg']
            for k, half in enumerate((12000, 480)):
                seg = np.concatenate([L[-half:], L[:half]]).mean(axis=1)
                t = (np.arange(-half, half)) / 48
                a = ax[i, j * 2 + k]
                a.plot(t, seg, lw=.5, color='#33658a' if ext == 'mp3' else '#c05746')
                a.axvline(0, color='k', lw=.6, ls='--')
                a.set_ylim(-.6, .6)
                a.set_title(f'{sid}.{ext}  seam +/-{half/48:.0f} ms  jump={F[(sid, ext)]["seam"]["jump"]:.4f}', fontsize=9)
    fig.tight_layout(); fig.savefig(HERE / 'bgm3-seams-waveform.png', dpi=70); plt.close(fig)
    # 2) 接點 vs 曲內小節線
    fig, ax = plt.subplots(2, 1, figsize=(16, 9))
    xs = np.arange(28)
    lab = [f'{r["id"]}.{r["ext"]}' for r in report['files']]
    ax[0].bar(xs - .2, [r['seam']['d2'] for r in report['files']], .4, label='seam (loop point)')
    ax[0].bar(xs + .2, [r['seam']['d2_inner_max'] for r in report['files']], .4, label='max over inner bar lines')
    ax[0].set_title('click index: max |2nd difference| within +/-2 ms'); ax[0].legend()
    ax[1].bar(xs - .2, [r['seam']['dip'] for r in report['files']], .4, label='seam (loop point)')
    ax[1].bar(xs + .2, [r['seam']['dip_inner_max'] for r in report['files']], .4, label='max over inner bar lines')
    ax[1].set_title('energy dip depth at the point (dB, 2 ms window)'); ax[1].legend()
    for a in ax:
        a.set_xticks(xs); a.set_xticklabels(lab, rotation=70, fontsize=8)
    fig.tight_layout(); fig.savefig(HERE / 'bgm3-seam-vs-inner.png', dpi=80); plt.close(fig)
    # 3) 兩兩比較矩陣
    def mat(key):
        M = np.full((14, 14), np.nan)
        for p in report['pairs']:
            if p[key] is None: continue
            i, j = IDS.index(p['a']), IDS.index(p['b'])
            M[i, j] = M[j, i] = p[key]
        return M
    fig, ax = plt.subplots(2, 3, figsize=(24, 15))
    for a, (key, title) in zip(ax.ravel(), [
            ('melody_4gram_jaccard', 'melody: shared 4-interval patterns (Jaccard, 0=nothing shared)'),
            ('melody_3gram_jaccard', 'melody: shared 3-interval patterns (Jaccard)'),
            ('beat_chroma_best_corr', 'audio: best 16-beat chroma match, key-normalised (1=same passage)'),
            ('beat_profile_corr', 'audio: onset profile inside one beat (corr)'),
            ('bar_profile_corr', 'audio: onset profile inside one bar, same meter only (corr)'),
            ('timbre_mfcc_dist', 'audio: timbre distance (MFCC, larger=more different)')]):
        M = mat(key)
        im = a.imshow(M, cmap='viridis')
        a.set_xticks(range(14)); a.set_yticks(range(14)); a.set_xticklabels(IDS, rotation=70); a.set_yticklabels(IDS)
        for i in range(14):
            for j in range(14):
                if not np.isnan(M[i, j]): a.text(j, i, f'{M[i, j]:.2f}', ha='center', va='center', fontsize=6, color='w')
        a.set_title(title, fontsize=11); fig.colorbar(im, ax=a, fraction=.04)
    fig.tight_layout(); fig.savefig(HERE / 'bgm3-pairwise.png', dpi=75); plt.close(fig)
    # 4) 前 8 小節旋律鋼琴捲簾＋一小節起音輪廓
    fig, ax = plt.subplots(14, 2, figsize=(20, 34), gridspec_kw=dict(width_ratios=[3, 1]))
    for i, sid in enumerate(IDS):
        s = S[sid]; ev = feats[sid]['events']
        tonic = int(ev[:, 1].min())
        sel = ev[ev[:, 0] < 8 * s['meter']]
        for o, p, d in sel:
            ax[i, 0].plot([o, o + min(d, .9)], [p, p], lw=4, color='#7b2d8e', solid_capstyle='butt')
        for b in range(9): ax[i, 0].axvline(b * s['meter'], color='#bbb', lw=.5)
        ax[i, 0].set_title(f'{sid}  {s["key"].split()[0]} major  {s["bpm"]} BPM  {s["meter"]}/4  first 8 bars of melody (MIDI pitch)', fontsize=9)
        bp = feats[sid]['bar_profile']
        ax[i, 1].bar(np.arange(len(bp)) / 12, bp, 1 / 12, color='#2a9d8f')
        ax[i, 1].set_title(f'{sid} measured onset profile in one bar (beats)', fontsize=9)
    fig.tight_layout(); fig.savefig(HERE / 'bgm3-melody-rhythm.png', dpi=65); plt.close(fig)
    # 5) 頻譜縮圖
    fig, ax = plt.subplots(7, 2, figsize=(20, 26))
    for a, sid in zip(ax.ravel(), IDS):
        y = librosa.resample(loops[sid].mean(axis=1).astype(np.float32)[:SR * 16], orig_sr=SR, target_sr=22050)
        M = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=22050, n_mels=96, hop_length=256), ref=np.max)
        a.imshow(M, origin='lower', aspect='auto', cmap='magma', vmin=-70, vmax=0, extent=[0, 16, 0, 96])
        a.set_title(f'{sid} first 16 s mel spectrogram (mp3)', fontsize=10)
    fig.tight_layout(); fig.savefig(HERE / 'bgm3-spectrograms.png', dpi=60); plt.close(fig)
    print('done')


if __name__ == '__main__':
    main()
