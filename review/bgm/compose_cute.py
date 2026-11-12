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
SONGS = [
    dict(stem='cute-a-glock-bubbles', style='鐵琴泡泡', instrument='鐵琴主旋律、柔木琴和弦、圓潤撥弦低音、沙鈴', key='C 大調', tonic=60, bpm=120,
         chords=[0,3,0,4,3,0,1,4],
         motifs=[[4,7,9,7,4,2],[5,9,7,5,4,2],[4,2,0,2,4,7],[7,11,9,7,5,2],
                 [9,12,9,7,5,4],[7,4,2,4,0,4],[5,9,5,4,2,5],[7,5,2,11,7,2]], kind='bell'),
    dict(stem='cute-b-uke-hop', style='烏克麗麗跳跳', instrument='合成烏克麗麗分解與刷弦、木琴短句、輕木塊、撥弦低音', key='F 大調', tonic=65, bpm=112,
         chords=[0,4,3,0,1,3,4,0],
         motifs=[[0,4,7,4,9,7],[2,7,11,7,5,2],[5,9,12,9,7,5],[4,7,4,2,0,4],
                 [2,5,9,5,4,2],[9,5,7,9,12,9],[11,7,5,2,7,5],[4,2,4,7,2,0]], kind='pluck'),
    dict(stem='cute-c-whistle-parade', style='口哨氣球遊行', instrument='合成口哨主旋律、木琴應答、短風琴和弦、輕鼓與沙鈴', key='G 大調', tonic=67, bpm=128,
         chords=[0,1,4,0,3,1,4,4],
         motifs=[[7,4,9,7,2,4],[5,2,9,5,4,2],[11,7,2,7,9,11],[12,7,4,2,4,7],
                 [9,5,12,9,7,5],[9,5,2,4,5,9],[7,11,14,11,9,7],[5,2,7,11,2,7]], kind='whistle'),
]


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
    t = np.arange(round(seconds*SR))/SR
    f = 440*2**((midi-69)/12)
    attack = 1-np.exp(-t/0.004)
    release = np.minimum(1, (seconds-t)/0.025).clip(0, 1)
    if kind == 'whistle':
        phase = 2*np.pi*f*t + .018*np.sin(2*np.pi*5*t)
        y = np.sin(phase) + .045*np.sin(2*phase)
        env = (1-np.exp(-t/.025))*release*np.minimum(1, (seconds-t)/.055).clip(0, 1)
    elif kind == 'bell':
        y = np.sin(2*np.pi*f*t)*np.exp(-t/0.36)
        y += .22*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.085)
        y += .08*np.sin(2*np.pi*f*5.4*t)*np.exp(-t/.045)
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
        degree = s['chords'][bar%8]
        chord = [s['tonic']+scale[(degree+k)%7]+12*((degree+k)//7) for k in (0,2,4)]
        # 三段八小節，第二段留白、第三段加入輕應答，保留呼吸。
        motif = s['motifs'][bar%8]
        offsets = {'bell':[0,.5,1.25,2,2.5,3.25], 'pluck':[0,.75,1.5,2.25,3,3.5], 'whistle':[0,.5,1.5,2,2.75,3.5]}[s['kind']]
        for j,(off,note) in enumerate(zip(offsets,motif)):
            if 8<=bar<16 and j==4: continue
            dur = (.31 if s['kind']=='whistle' else .65)*beat
            add(tone(s['tonic']+12+note,dur,s['kind']),bar*4+off,.22 if s['kind']=='whistle' else .31, .08)
        for off in ([.5,1.5,2.5,3.5] if s['kind']=='pluck' else [0,1.5,2.5]):
            for k,note in enumerate(chord):
                add(tone(note,.48,'pluck' if s['kind']=='pluck' else 'organ' if s['kind']=='whistle' else 'wood'),bar*4+off+k*.018,.085,-.22)
        for off,note in [(0,chord[0]-12),(2,chord[2]-12)]:
            add(tone(note,.5,'pluck'),bar*4+off,.20,0)
        if bar>=16 or s['kind']=='whistle':
            add(tone(chord[1]+12,.28,'wood'),bar*4+3.75,.095,.25)
        for off in np.arange(0,4,.5):
            t=np.arange(int(SR*.055))/SR
            noise=rng.normal(size=len(t)); noise=np.diff(noise,prepend=0)
            y=noise*np.exp(-t/.011)*(1-np.exp(-t/.002))
            add(y,bar*4+off,.009 if off%1==0 else .015,.2)
        for off in [1,3]:
            add(tone(83,.07,'wood'),bar*4+off,.12,-.15)
        for off in [0,2]:
            t=np.arange(int(SR*.11))/SR
            y=np.sin(2*np.pi*(150*t+1.5*(1-np.exp(-t*35))))*np.exp(-t*35)*(1-np.exp(-t/.003))
            add(y,bar*4+off,.075,0)
    # 循環卷積殘響，所有音尾折回下一輪，沒有末尾淡出或空拍。
    x += .07*np.roll(x,round(.17*SR),axis=0)+.035*np.roll(x,round(.29*SR),axis=0)
    # 頻域週期高通：100Hz 為 -3dB，避免濾波啟動狀態破壞接點。
    freq=np.fft.rfftfreq(n,1/SR)
    hp=1/np.sqrt(1+(100/np.maximum(freq,.0001))**4); hp[0]=0
    lp=1/np.sqrt(1+(freq/7800)**6)
    x=np.fft.irfft(np.fft.rfft(x,axis=0)*(hp*lp)[:,None],n=n,axis=0)
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
            result={k:v for k,v in s.items() if k not in ['motifs','chords','tonic','kind']}
            result.update(samples=len(x), duration_seconds=len(x)/SR, bars=24, master=measure(master),master_seam=seam_stats(x),files={})
            for ext,codec in [('mp3',['-c:a','libmp3lame','-b:a','192k']),('ogg',['-c:a','libvorbis','-q:a','5'])]:
                dest=OUT/(s['stem']+'.'+ext)
                run([FF,'-v','error','-y','-i',str(master),'-map_metadata','-1',*codec,str(dest)])
                decoded=np.frombuffer(run([FF,'-v','error','-i',str(dest),'-f','f32le','-ar',str(SR),'-ac','2','-']).stdout,dtype='<f4').reshape(-1,2)
                m=measure(dest); m.update(seam_stats(decoded))
                ebu=run([FF,'-hide_banner','-i',str(dest),'-af','ebur128=peak=true','-f','null','-']).stderr.decode()
                m['ebur128_summary']=ebu.rsplit('Summary:',1)[-1].split('[out#')[0].strip()
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
