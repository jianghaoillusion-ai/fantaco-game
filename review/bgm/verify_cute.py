"""第 2 輪：節奏／音程重複與接點圖；不改音檔。"""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from compose_cute import SONGS, bar_events, run, FF, SR, OUT

def longest(a,b):
    best=0; row=[0]*(len(b)+1)
    for x in a:
        nxt=[0]*(len(b)+1)
        for j,y in enumerate(b):
            if x==y: nxt[j+1]=row[j]+1; best=max(best,nxt[j+1])
        row=nxt
    return best

report={'melody':{},'pairs':{},'files':{}}
melodies=[]
fig,axes=plt.subplots(3,1,figsize=(12,8),sharex=True)
for k,s in enumerate(SONGS):
    events=[(bar*4+off,n,d) for bar in range(24) for off,n,d in bar_events(s,bar)]
    melodies.append([n for _,n,_ in events])
    shapes={tuple((off,d) for off,_,d in bar_events(s,b)) for b in range(24)}
    report['melody'][s['stem']]={'distinct_bar_rhythms':len(shapes),'section_A_notes':sum(len(bar_events(s,b)) for b in range(8)), 'section_B_notes':sum(len(bar_events(s,b)) for b in range(8,16))}
    assert len(shapes)>=4
    for at,n,d in events: axes[k].plot([at,at+d],[n,n],lw=3)
    axes[k].axvspan(32,64,alpha=.12,color='orange'); axes[k].set_title(s['stem']+' | A: 1-8, B: 9-16, A variation: 17-24'); axes[k].set_ylabel('Semitones')
axes[-1].set_xlabel('Beat'); fig.tight_layout(); fig.savefig(OUT/'r2-melody-sections.png'); plt.close(fig)
for i,j in [(0,1),(0,2),(1,2)]:
    a,b=melodies[i],melodies[j]
    equal=longest(a,b); intervals=longest(np.diff(a),np.diff(b))+1
    report['pairs'][f'{i}-{j}']={'same_scale_notes':equal,'same_intervals_notes':intervals}
    assert equal<9 and intervals<9, '三首仍有九音共用片段'
fig,axes=plt.subplots(3,2,figsize=(12,8))
for i,s in enumerate(SONGS):
    for j,ext in enumerate(['mp3','ogg']):
        name=s['stem']+'.'+ext
        x=np.frombuffer(run([FF,'-v','error','-i',str(OUT/name),'-f','f32le','-ac','2','-ar',str(SR),'-']).stdout,dtype='<f4').reshape(-1,2)
        mono=x.mean(axis=1); n=len(x); w=480
        joined=np.r_[mono[-w:],mono[:w]]
        axes[i,j].plot(np.arange(-w,w)/SR*1000,joined,lw=.6); axes[i,j].axvline(0,color='red'); axes[i,j].set_title(name); axes[i,j].set_xlabel('ms at loop boundary')
        power=np.abs(np.fft.rfft(mono))**2; f=np.fft.rfftfreq(n,1/SR)
        d2=np.abs(np.diff(np.r_[mono[-96:],mono[:96]],n=2))
        stats={'below_100hz_percent':float(100*power[f<100].sum()/power.sum()),'seam_second_diff_max':float(d2.max()),'whole_second_diff_p999':float(np.quantile(np.abs(np.diff(mono,n=2)),.999))}
        stats['above_5khz_percent']=float(100*power[f>5000].sum()/power.sum())
        boundaries=[round(b*4*60/s['bpm']*SR) for b in range(1,24)]
        inner=[float(np.abs(np.diff(mono[q-96:q+96],n=2)).max()) for q in boundaries]
        stats['inner_bar_second_diff_median']=float(np.median(inner))
        stats['inner_bar_second_diff_max']=max(inner)
        stats['inner_bar_second_diff_all']=inner
        stats['section_energy_change_db']=[]
        for b in [8,16]:
            q=round(b*4*60/s['bpm']*SR); w100=4800
            pre=np.sqrt(np.mean(mono[q-w100:q]**2)); post=np.sqrt(np.mean(mono[q:q+w100]**2))
            stats['section_energy_change_db'].append(float(20*np.log10(post/pre)))
        assert stats['below_100hz_percent']<1
        report['files'][name]=stats
fig.tight_layout(); fig.savefig(OUT/'r2-seams.png'); plt.close(fig)
(OUT/'r2-structure-check.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
