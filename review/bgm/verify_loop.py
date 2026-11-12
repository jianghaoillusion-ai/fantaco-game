"""可重跑的補充輪接點驗證；只讀六檔，輸出 JSON。"""
import json
import numpy as np
from compose_cute import SONGS, SR, FF, OUT, run


def db(x):
    return float(20*np.log10(max(1e-12, np.sqrt(np.mean(x*x)))))


def dip(x, q):
    # Centered 2ms RMS windows, moving through +/-6ms; compare 2ms flanks.
    w = round(.002*SR)
    values = [db(x[q+k-w//2:q+k+w//2]) for k in range(-288,289,24)]
    return max(0., min(values[0],values[-1])-min(values))


def stats(x, bpm, shift=0):
    n=len(x); joined=np.concatenate([x,x,x])
    points=[round(b*4*60/bpm*SR)-shift for b in range(1,24)]
    internal=[dip(joined,n+q) for q in points]
    w=round(.05*SR)
    powers=np.mean(x[:n//w*w].reshape(-1,w,2)**2,axis=(1,2))
    pre=db(x[-4800:]); seam=dip(joined,n)
    d2=float(np.max(np.abs(np.diff(joined[n-96:n+96],n=2,axis=0))))
    inner_d2=max(float(np.max(np.abs(np.diff(joined[n+q-96:n+q+96],n=2,axis=0)))) for q in points)
    tail_quiet_ms = 0
    for offset in range(0, 400):
        end = n - offset * 48
        if db(x[end-480:end]) >= -40: break
        tail_quiet_ms += 1
    checks={'no_quiet_tail':tail_quiet_ms == 0, 'exact_samples':n==round(96*60/bpm*SR),
            'tail_energy':pre>=-35,
            'no_boundary_hole':seam<=max(internal)+1,
            'continuous_body':float(np.mean(powers<1e-4))<=.005,
            'no_clipping':bool(np.max(np.abs(x))<1),
            'no_extra_seam_transient':d2<=inner_d2}
    return {'tail_quiet_ms':tail_quiet_ms,'samples':n,'duration':n/SR,'tail_100ms_dbfs':pre,
            'seam_dip_db':seam,'inner_max_dip_db':max(internal),
            'quiet_50ms_percent':float(np.mean(powers<1e-4)*100),
            'boundary_delta':float(np.max(np.abs(x[0]-x[-1]))),
            'seam_second_difference':d2,'inner_max_second_difference':inner_d2,
            'checks':checks}

if __name__=='__main__':
    report={}
    shifts={s['stem']:s.get('origin_shift_samples',0) for s in json.loads((OUT/'validation.json').read_text())}
    for s in SONGS:
        for ext in ['mp3','ogg']:
            name=s['stem']+'.'+ext
            x=np.frombuffer(run([FF,'-v','error','-i',str(OUT/name),'-f','f32le','-ar',str(SR),'-ac','2','-']).stdout,dtype='<f4').reshape(-1,2)
            report[name]=stats(x,s['bpm'],shifts[s['stem']])
    (OUT/'loop-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    assert all(all(r['checks'].values()) for r in report.values()), '循環驗證未過，見 loop-validation.json'
