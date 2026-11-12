#!/usr/bin/env python3
"""原創試聽曲；只使用 numpy、Python 標準庫與 ffmpeg。無外部取樣。
TMPDIR 必須指定外接碟。執行後生成六個音檔與 validation.json。
"""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import wave
import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parent
FF = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or str(Path.home() / 'media-tools/bin/ffmpeg')
FP = os.environ.get('FFPROBE') or shutil.which('ffprobe') or str(Path.home() / 'media-tools/bin/ffprobe')
# Each row is one bar: (onset in beats, scale semitone, duration in beats).
# The first eight bars ask, the next eight answer; the final eight reprise
# the first section with a new register/ending. No borrowed melody or samples.
SONGS = [
 dict(stem='cute-a-glock-bubbles',style='鐵琴泡泡音樂盒',instrument='合成鐵琴、柔木琴琶音；無鼓、無沙鈴、無獨立低音',key='C 大調',tonic=60,bpm=120,kind='bell',
 chords=[0,5,3,4,1,3,4,4, 3,0,1,5,3,1,4,4, 0,5,3,4,1,3,4,4],
 motifs=[[7,12,4],[9,4,7,0],[12,9],[11,2,7,5],[2,9,5],[9,12,5,7],[11,7,2],[5,11,7],
 [17,12,9,5,9],[16,7,12,4],[14,9,5,2,5],[12,4,9],[17,9,12,5],[14,5,9,2],[11,14,7,2],[5,2,11,7]],
 rhythms=[[(0,1.2),(1.5,.45),(2.5,1.3)],[(.5,.4),(1.25,.5),(2,.6),(3.25,.5)],[(0,1.5),(2.5,1.2)],[(0,.5),(.75,.5),(2,1),(3.5,.4)],
 [(0,.4),(.5,.4),(1.5,.6),(2.5,.4),(3.25,.6)],[(.25,.6),(1.25,.6),(2.25,.5),(3.25,.5)]]),
 dict(stem='cute-b-uke-hop',style='烏克麗麗搖擺跳跳',instrument='合成撥弦主奏、反拍刷弦、分解和弦撥弦低音、輕沙鈴；無木塊與鼓',key='F 大調',tonic=65,bpm=112,kind='pluck',
 chords=[0,0,3,1,4,3,1,4, 5,1,3,4,0,5,1,4, 0,0,3,1,4,3,1,4],
 motifs=[[0,7,9,4],[4,0,7],[9,5,12,7],[2,9,5,12,9],[7,2,11],[5,12,9,5],[9,2,5,4],[11,5,7],
 [9,4],[5,9,2],[12,5,9],[11,2],[7,4,0],[12,9,4],[5,2],[7,11,2,5],],
 rhythms=[[(0,.55),(.67,.25),(1.67,.6),(3,.7)],[(.67,.7),(2,.5),(3.67,.25)],[(0,.5),(1.67,.25),(2,.6),(3.67,.25)],[(.67,.25),(1,.5),(1.67,.25),(2.67,.5),(3.67,.25)],
 [(0,1.4),(2.67,1.1)],[(.67,.7),(2,.6),(3,.6)],[(0,1),(1.67,.6),(3,1)]]),
 dict(stem='cute-c-whistle-parade',style='口哨氣球小遊行',instrument='帶氣聲滑音的合成口哨、短風琴、木琴應答、輕小鼓與木質短低音；無沙鈴',key='G 大調',tonic=67,bpm=128,kind='whistle',
 chords=[0,3,1,4,0,5,1,4, 3,1,0,5,1,3,4,4, 0,3,1,4,0,5,1,4],
 motifs=[[4,7],[5,9,12],[2,5,9,2],[7,11],[12,7,4],[9,4],[5,2,9],[11,7,2],
 [9,12,5,9,12],[14,9,5,2],[7,12,4,7,4],[12,9,4,9],[14,5,9,2,5],[12,5,9],[11,14,7,5],[2,11,7]],
 rhythms=[[(0,1.5),(2,1.5)],[(0,.7),(1,.7),(2,1.5)],[(0,.65),(1,.65),(2,.65),(3,.65)],[(.5,1.1),(2,1.5)],
 [(0,.4),(.5,.4),(1.5,.4),(2.5,.4),(3,.8)],[(0,.7),(1.5,.4),(2,.4),(3,.7)]]),
]


def bar_events(s, bar):
    notes=s['motifs'][bar % 16]
    if s['kind']=='bell': r=s['rhythms'][(bar%4) if bar%16<8 else 4+bar%2]
    elif s['kind']=='pluck': r=s['rhythms'][bar%4 if bar%16<8 else 4+bar%3]
    else: r=s['rhythms'][bar%4 if bar%16<8 else 4+bar%2]
    # Rhythm determines the event count: truncate extra motif notes, or cycle
    # a shorter motif. Verification uses these rendered events, not the raw table.
    events=[(off,notes[j%len(notes)],dur) for j,(off,dur) in enumerate(r)]
    if bar>=16:
        events=[(off,note+(12 if bar in (18,20) else 0),dur) for off,note,dur in events]
    if bar==23:
        events = {
            'bell': [(0,11,1.2),(1.5,7,.8),(3,2,.5),(3.5,11,.8)],
            'pluck': [(0,7,.7),(1.67,5,.6),(2.67,2,.5),(3.67,11,.7)],
            'whistle': [(0,11,1.4),(1.5,7,1.1),(3,2,1.12)],
        }[s['kind']]
    return events


def run(args):
    return subprocess.run(args, check=True, capture_output=True)


def measure(path):
    log = run([FF, '-hide_banner', '-i', str(path), '-af',
               'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']).stderr.decode()
    data = json.loads(re.search(r'\{\s*"input_i".*?\}', log, re.S).group())
    return {'lufs': float(data['input_i']), 'true_peak_dbtp': float(data['input_tp'])}


def write_wav(path, signal):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(signal, -1, 1)*32767).astype('<i2').tobytes())


def tone(midi, seconds, kind):
    # Let struck/plucked strings decay naturally; fold all overflow into the loop.
    if kind == 'bell': seconds = max(seconds, 2.8)
    elif kind == 'pluck': seconds = max(seconds, 1.6)
    t = np.arange(round(seconds*SR))/SR
    f = 440*2**((midi-69)/12)
    attack = 1-np.exp(-t/0.004)
    release = np.minimum(1, (seconds-t)/0.025).clip(0, 1)
    if kind == 'whistle':
        phase = 2*np.pi*f*(t-.0009*(1-np.exp(-t/.035))) + .045*np.sin(2*np.pi*5*t)
        y = np.sin(phase) + .07*np.sin(2*phase)
        breath=np.random.default_rng(900+int(midi)).normal(size=len(t))
        y += .018*np.diff(breath,prepend=0)
        env = (1-np.exp(-t/.025))*release*np.minimum(1, (seconds-t)/.055).clip(0, 1)
    elif kind == 'bell':
        y = np.sin(2*np.pi*f*t)*np.exp(-t/0.36)
        y += .36*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.085)
        y += .18*np.sin(2*np.pi*f*5.4*t)*np.exp(-t/.045)
        env = attack*release
    elif kind == 'wood':
        y = np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*3*t)*np.exp(-t/.055)
        env = attack*np.exp(-t/.12)*release
    elif kind == 'organ':
        y = np.sin(2*np.pi*f*t)+.12*np.sin(4*np.pi*f*t)
        env = (1-np.exp(-t/.015))*np.exp(-t/.18)*release
    else:
        y = sum(np.sin(2*np.pi*f*h*t)*np.exp(-t*(3.6+h*1.1))/h**1.55 for h in range(1,7))
        env = attack*release
    return y*env


def synth(s):
    beat = 60/s['bpm']; n = round(24*4*beat*SR)
    x = np.zeros((n,2)); rng = np.random.default_rng(731+ s['bpm'])
    def add(y, at, gain, pan=0):
        idx = (round(at*beat*SR)+np.arange(len(y))) % n
        stereo = y[:,None]*gain*np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])
        x[idx] += stereo
    scale = [0,2,4,5,7,9,11]
    for bar in range(24):
        degree = s['chords'][bar]
        chord = [s['tonic']+scale[(degree+k)%7]+12*((degree+k)//7) for k in (0,2,4)]
        for off,note,dur in bar_events(s,bar):
            register=0 if s['kind']=='pluck' else 12
            seconds=max(.65,dur*beat) if s['kind']=='bell' else dur*beat
            add(tone(s['tonic']+register+note,seconds,s['kind']),bar*4+off,.27,.08)
        if s['kind']=='bell':
            # Drumless music box: open arpeggios, no shared bass/percussion loop.
            positions=[0,1,2,3] if bar%16<8 else [.5,1.5,2.5,3.5]
            for j,off in enumerate(positions):
                add(tone(chord[j%3],.8,'wood'),bar*4+off,.105,-.2)
            if bar%16>=8:
                add(tone(chord[2]+12,.8,'bell'),bar*4+3.75,.055,.3)
        elif s['kind']=='pluck':
            # Swung offbeats and real ukulele register (C4 upward), arpeggiated bass.
            for off in ([.67,1.67,2.67,3.67] if bar%16<8 else [.67,2.67]):
                for j,note in enumerate(chord):
                    add(tone(note,.35,'pluck'),bar*4+off+j*.035,.11,-.15)
            for j,off in enumerate([0,1,2,3]):
                note=[chord[0]-12,chord[1]-12,chord[2]-12,chord[1]-12][j]
                add(tone(note,.3,'pluck'),bar*4+off,.16)
            for off in [0,.67,1,1.67,2,2.67,3,3.67]:
                t=np.arange(int(SR*.06))/SR
                y=np.diff(rng.normal(size=len(t)),prepend=0)*np.exp(-t/.018)*(1-np.exp(-t/.002))
                add(y,bar*4+off,.018,.2)
        else:
            # March: quarter-note oom-pah, snare backbeats and occasional rolls.
            for off in [1,3]:
                for note in chord:
                    add(tone(note,.21,'organ'),bar*4+off,.10,-.2)
            for off,note in [(0,chord[0]-12),(2,chord[2]-12)]:
                add(tone(note,.26,'wood'),bar*4+off,.19)
            hits=[1,3] if bar%4!=3 else [1,2.5,3,3.5,3.75]
            for off in hits:
                t=np.arange(int(SR*.1))/SR
                noise=rng.normal(size=len(t))
                y=(.45*noise+.4*np.sin(2*np.pi*190*t))*np.exp(-t/.022)*(1-np.exp(-t/.002))
                add(y,bar*4+off,.06 if off%1==0 else .03,.1)
            if bar%16>=8:
                for off,note in [(1,chord[2]+12),(2.75,chord[1]+12)]:
                    add(tone(note,.2,'wood'),bar*4+off,.13,.25)
    # 循環卷積殘響，所有音尾折回下一輪，沒有末尾淡出或空拍。
    dry = x.copy()
    for delay in [.113,.173,.239,.307,.397,.499,.613,.743,.887,1.051,1.237,1.447]:
        x += .24*np.exp(-delay/.8)*np.roll(dry,round(delay*SR),axis=0)
    # 頻域週期高通：100Hz 為 -3dB，避免濾波啟動狀態破壞接點。
    freq=np.fft.rfftfreq(n,1/SR)
    hp=1/np.sqrt(1+(100/np.maximum(freq,.0001))**4); hp[0]=0
    lp=1/np.sqrt(1+(freq/7800)**6)
    x=np.fft.irfft(np.fft.rfft(x,axis=0)*(hp*lp)[:,None],n=n,axis=0)
    # Move the circular file origin by at most 10 ms to a joint-channel
    # low-energy point before the downbeat. This rotates EVERY sample, never fades/cuts a tail.
    # The musical downbeat remains on the same 96-beat periodic grid.
    candidates = np.arange(-480, 1)
    score = np.sum(x[candidates % n]**2 + x[(candidates-1) % n]**2, axis=1)
    shift = int(candidates[np.argmin(score)])
    s['origin_shift_samples'] = shift
    x = np.roll(x, -shift, axis=0)
    return x*.75/np.max(np.abs(x))


def seam_stats(x):
    delta=float(np.max(np.abs(x[0]-x[-1])))
    p99=float(np.quantile(np.abs(np.diff(x,axis=0)),.99))
    width=int(.1*SR)
    pre=float(np.sqrt(np.mean(x[-width:]**2))); post=float(np.sqrt(np.mean(x[:width]**2)))
    joined=np.concatenate([x[-width:],x[:width]])
    return dict(boundary_delta=delta, derivative_p99=p99,
                pre_100ms_rms=pre, post_100ms_rms=post,
                energy_change_db=float(20*np.log10(post/pre)),
                joined_200ms_peak=float(np.max(np.abs(joined))),
                sample_peak=float(np.max(np.abs(x))), clipped_samples=int(np.sum(np.abs(x)>=1)))


def main():
    temp=os.environ.get('TMPDIR','')
    if not temp.startswith('/Volumes/') or not Path('/Volumes/外接資料碟').is_mount():
        raise SystemExit('請把 TMPDIR 設在已掛載的外接碟。')
    Path(temp).mkdir(parents=True,exist_ok=True)
    results=[]
    with tempfile.TemporaryDirectory(prefix='cute-',dir=temp) as td:
        td=Path(td)
        for s in SONGS:
            x=synth(s); raw=td/'raw.wav'; master=td/'master.wav'
            write_wav(raw,x); initial=measure(raw)
            gain=-16-initial['lufs']
            # 固定增益，避免動態正規化器每輪起始狀態不同。
            x*=10**(gain/20)
            assert np.max(np.abs(x))<.87, '峰值過高，需調整編曲動態'
            write_wav(master,x)
            result={k:v for k,v in s.items() if k not in ['motifs','chords','tonic','kind','rhythms']}
            result.update(samples=len(x), duration_seconds=len(x)/SR, bars=24, master=measure(master),master_seam=seam_stats(x),files={})
            for ext,codec in [('mp3',['-c:a','libmp3lame','-b:a','320k']),('ogg',['-c:a','libvorbis','-q:a','5'])]:
                dest=OUT/(s['stem']+'.'+ext)
                run([FF,'-v','error','-y','-i',str(master),'-map_metadata','-1',*codec,str(dest)])
                decoded=np.frombuffer(run([FF,'-v','error','-i',str(dest),'-f','f32le','-ar',str(SR),'-ac','2','-']).stdout,dtype='<f4').reshape(-1,2)
                m=measure(dest); m.update(seam_stats(decoded))
                ebu=run([FF,'-hide_banner','-i',str(dest),'-af','ebur128=peak=true','-f','null','-']).stderr.decode()
                m['ebur128_summary']=ebu.rsplit('Summary:',1)[-1].split('[out#')[0].strip()
                ei=float(re.search(r'I:\s*([-\d.]+)',m['ebur128_summary'])[1])
                ep=float(re.search(r'Peak:\s*([-\d.]+)',m['ebur128_summary'])[1])
                assert -17<=ei<=-15 and ep<=-1
                probe=json.loads(run([FP,'-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(dest)]).stdout)
                m.update(ffprobe=probe, decoded_samples=len(decoded),decoded_duration_seconds=len(decoded)/SR)
                assert len(decoded)==len(x), '解碼長度不符，可能有編碼器 padding'
                assert -17<=m['lufs']<=-15 and m['true_peak_dbtp']<=-1
                assert m['clipped_samples']==0 and m['boundary_delta']<.04
                assert m['boundary_delta']<max(.003,2*m['derivative_p99'])
                # 強拍有自然起音；能量差記錄但不當作爆音，另查接點樣本差與無靜音。
                assert min(m['pre_100ms_rms'],m['post_100ms_rms'])>.005
                result['files'][dest.name]=m
            results.append(result)
            print(json.dumps(result,ensure_ascii=False),flush=True)
    (OUT/'validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__': main()
