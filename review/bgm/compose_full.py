"""14 首原創配樂。A/B/C 沿用已核准樂譜；其餘各自旋律、節奏、配器。
只用 Python/numpy/ffmpeg；所有尾音循環相加，頻域濾波不引入起始瞬態。
"""
import os, json, tempfile, hashlib, sys
from pathlib import Path
import numpy as np
from compose_cute import SONGS, synth, tone, SR, FF, run, write_wav, measure, bar_events
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/audio'
# id, name, key, tonic, bpm, meter, bars, instrument, arrangement, motif, rhythm, progression
SCORES=[
 ('bulu','第二願：布魯','D',62,108,4,20,'wood','木琴躲貓貓：三連小跳與高低應答',[2,7,4,9,5,2,0,4],[0,.5,1.5,2.25,3.5],[0,1,3,4,5,3,1,4]),
 ('hate','最後一願：哈特','Bb',58,124,4,20,'organ','短風琴魔術步：切分和弦與空拍問答',[7,4,0,2,5,9,7,11],[.25,1,1.75,3,3.5],[0,3,0,4,1,5,3,4]),
 ('ending','漫天氣球','Eb',63,102,3,24,'bell','氣球圓舞：三拍柔鐘與長音雲朵',[4,7,12,9,5,7,2,11],[0,1.5,2.25],[0,5,3,0,1,3,4,4]),
 ('castle','微笑城堡','A',69,116,4,20,'bell','小鐘鐘塔：雙聲部卡農與整拍撥弦',[0,4,11,7,9,4,2,5],[0,.75,1.5,2.5,3.25],[0,4,5,2,3,0,1,4]),
 ('slope','飛飛的出發坡','E',64,132,4,20,'pluck','彈跳起跑：附點上行與雙拍踏步',[0,2,4,7,9,12,7,4],[0,.75,1.5,2,2.75,3.5],[0,0,3,4,5,1,3,4]),
 ('hill','阿飄的探險丘','F#',66,118,3,24,'whistle','丘陵迴旋：三拍木管與交錯琶音',[9,7,2,4,0,5,4,11],[.0,.5,1.75,2.5],[0,1,5,4,3,2,1,4]),
 ('bagvalley','魔法袋谷','B',59,110,4,20,'pluck','魔法口袋：五音短句與搖擺分解和弦',[4,9,7,2,12,7,9,0],[.0,.67,2,2.67,3.67],[0,5,1,4,3,1,0,4]),
 ('candylane','西卡的糖果巷','Ab',68,134,4,20,'wood','糖果踢踏：短木琴與反拍鈴答句',[12,7,9,4,7,2,5,11],[.5,1,1.5,2.75,3.25,3.75],[0,3,5,1,4,0,3,4]),
 ('lamplight','布魯的夜燈林','F',65,100,3,24,'organ','夜燈搖籃：輕風琴長句與稀疏星光',[5,4,9,7,2,0,4,11],[0,1.25,2.5],[0,3,1,5,3,0,4,4]),
 ('theater','哈特的魔術劇場','Db',61,104,4,20,'pluck','玩偶小劇場：撥弦停頓與低音回答',[7,0,4,2,9,5,11,7],[0,1.5,2,3.25],[0,2,3,4,5,3,1,4]),
 ('plaza','漫天氣球廣場','C',60,126,4,20,'whistle','廣場跳格子：短笛呼喊與拉丁式木塊',[12,9,4,7,0,2,7,11],[0,.5,1.25,2.5,3],[0,3,1,4,0,5,3,4]),
]

# Independently written answer phrases and final cadences, not a shared reversal.
ANSWERS={
 'bulu':[12,9,4,2,7,5,9,0], 'hate':[9,5,12,7,4,2,11,5],
 'ending':[12,16,14,9,7,12,5,2], 'castle':[16,12,7,11,14,9,5,4],
 'slope':[7,9,12,14,9,4,2,7], 'hill':[4,12,9,5,2,7,11,9],
 'bagvalley':[9,12,2,7,4,14,9,5], 'candylane':[7,14,12,4,9,5,2,7],
 'lamplight':[9,12,7,4,5,2,9,7], 'theater':[4,2,7,12,5,9,2,11],
 'plaza':[7,12,16,9,14,7,4,12]}
CADENCES={
 'bulu':[9,5,2,7,11], 'hate':[2,11,7,5,2], 'ending':[14,7,11],
 'castle':[14,11,7,2,11], 'slope':[11,7,5,2,7,11], 'hill':[5,9,7,2],
 'bagvalley':[11,2,7,5,2], 'candylane':[14,11,5,7,2,11],
 'lamplight':[5,2,11], 'theater':[11,7,2,5], 'plaza':[2,5,11,7,2]}

def new_synth(s):
 id,name,key,tonic,bpm,meter,bars,kind,style,motif,rhythm,prog=s
 beat=60/bpm;n=round(bars*meter*beat*SR);x=np.zeros((n,2));events=[]
 scale=[0,2,4,5,7,9,11]
 def add(note,at,dur,voice,gain,pan=0):
  y=tone(note,dur*beat,voice);idx=(round(at*beat*SR)+np.arange(len(y)))%n
  x[idx]+=y[:,None]*gain*np.sqrt(np.array([(1-pan)/2,(1+pan)/2]))
 for bar in range(bars):
  deg=prog[bar%8]; chord=[tonic+scale[(deg+k)%7]+12*((deg+k)//7) for k in (0,2,4)]
  # Each score has its own answer phrase and cadence back to the next tonic.
  phrase=ANSWERS[id] if (bar//4)%3==1 else motif
  if id in ('ending','lamplight'):phrase=ANSWERS[id] if bar>=bars//2 else motif
  for j,off in enumerate(rhythm):
   note=phrase[(j+bar*3)%len(phrase)]
   if bar==bars-1: note=CADENCES[id][j%len(CADENCES[id])]
   dur=min(.85,(rhythm[j+1]-off)*.83) if j+1<len(rhythm) else meter-off+.22
   if kind=='organ':dur*=1.25
   midi=tonic+note+(12 if kind in ('wood','bell','whistle') else 0)
   add(midi,bar*meter+off,dur,kind,.19,.12)
   events.append([round(bar*meter+off,4),midi,round(dur,4)])
  at=bar*meter
  # Deliberately different accompaniment logic, not a single backing with swapped instruments.
  if id=='bulu':
   for j,off in enumerate([0,1.333,2.667]):add(chord[j]-12,at+off,.45,'wood',.16,-.25)
   for off in [1,3]:add(chord[1],at+off,.35,'pluck',.10)
  elif id=='hate':
   for off in [.75,2.5]:
    for note in chord:add(note,at+off,.3,'organ',.08,-.3)
   for off in [0,2]:add(chord[0]-12,at+off,.35,'wood',.17)
  elif id=='ending':
   add(chord[0]-12,at,1.6,'organ',.13)
   for j in range(3):add(chord[j],at+1+j*.5,1.3,'pluck',.10,-.25)
  elif id=='castle':
   for j in range(4):add(chord[j%3],at+j,.5,'pluck',.12,-.3)
   if bar%2: add(tonic+motif[(bar-1)%8]+12,at+.5,1.2,'bell',.10,.35)
  elif id=='slope':
   for j,off in enumerate([0,1.5,2,3.5]):add(chord[j%3]-12,at+off,.5,'wood',.17)
   for note in chord:add(note,at+1,.6,'pluck',.10,-.25)
  elif id=='hill':
   for j,off in enumerate([0,.75,1.5,2.25]):add(chord[j%3],at+off,.6,'wood',.14,-.3)
  elif id=='bagvalley':
   for j,off in enumerate([0,.67,1.67,2.67]):add(chord[j%3]-12,at+off,.9,'pluck',.18,-.2)
   add(chord[2]+12,at+3.33,.65,'bell',.07,.4)
  elif id=='candylane':
   for off in [0,2]:add(chord[0]-12,at+off,.6,'organ',.14)
   for off in [.75,2.25,3.5]:add(chord[1]+12,at+off,.4,'bell',.07,-.3)
  elif id=='lamplight':
   for j in range(3):add(chord[j],at+j*.9,1.6,'pluck',.11,-.35)
   if bar%2==0:add(chord[2]+12,at+2.25,1.2,'bell',.07,.3)
  elif id=='theater':
   for off in [.5,2.5]:
    for note in chord:add(note,at+off,.65,'wood',.07,-.2)
   for j,off in enumerate([1,3,3.5]):add(chord[j]-12,at+off,.5,'pluck',.16)
  elif id=='plaza':
   for j,off in enumerate([0,.75,1.5,2.5,3.25]):add(chord[j%3],at+off,.25,'organ',.09,-.3)
   for off in [0,2]:add(chord[0]-12,at+off,.3,'pluck',.16)
   for off in [1,1.75,3]:add(82,at+off,.09,'wood',.04,.3)
 # A quiet sustained dominant across the boundary is a scored cadence, never end padding.
 tail_note=CADENCES[id][-1]
 tail_start={'bulu':.5,'hate':.75,'ending':.9,'castle':.4,'slope':.6,'hill':.8,'bagvalley':.67,'candylane':.25,'lamplight':1.0,'theater':.75,'plaza':.5}[id]
 add(tonic+tail_note,bars*meter-tail_start,tail_start+.8,'pluck',.10,-.15)
 dry=x.copy()
 for delay in [.113,.239,.397,.613,.887,1.237]:x+=.18*np.exp(-delay/.7)*np.roll(dry,round(delay*SR),axis=0)
 freq=np.fft.rfftfreq(n,1/SR);hp=1/np.sqrt(1+(110/np.maximum(freq,.0001))**4);hp[0]=0
 x=np.fft.irfft(np.fft.rfft(x,axis=0)*(hp/np.sqrt(1+(freq/7200)**6))[:,None],n=n,axis=0)
 candidates=np.arange(-480,1);score=np.sum(x[candidates%n]**2+x[(candidates-1)%n]**2,axis=1)
 shift=int(candidates[np.argmin(score)]);x=np.roll(x,-shift,axis=0)
 return x*.7/np.max(np.abs(x)),dict(id=id,name=name,key=key+' 大調',bpm=bpm,meter=meter,bars=bars,instrument=kind,style=style,origin_shift_samples=shift,events=events)

def playback_origin(pcm, frames, guard):
 # Same complete-cycle selection as prepareLoopBuffer, measured after encoding.
 from verify_loop import dip
 width=round(.002*SR);span=round(.008*SR)
 def seam(q):return np.concatenate([pcm[q+frames-span:q+frames],pcm[q:q+span]])
 nominal=dip(seam(guard),span);best=float('inf');origin=guard
 for delta in range(-480,481):
  q=guard+delta;joined=seam(q)
  score=float(np.max(np.abs(np.diff(joined[span-width:span+width],n=2,axis=0))))+abs(delta)*1e-12
  if score<best and dip(joined,span)<=nominal+.01:best=score;origin=q
 return origin

def main():
 temp=os.environ.get('TMPDIR','');assert temp.startswith('/Volumes/') and Path('/Volumes/外接資料碟').is_mount()
 Path(temp).mkdir(parents=True,exist_ok=True);results=[]
 previous={s['id']:s for s in json.loads((Path(__file__).parent/'scores-bgm3.json').read_text())} if (Path(__file__).parent/'scores-bgm3.json').exists() else {}
 with tempfile.TemporaryDirectory(dir=temp,prefix='full-') as td:
  td=Path(td)
  for i in range(14):
   scene=['village','journey','candy'][i] if i<3 else SCORES[i-3][0]
   if len(sys.argv)>1 and scene not in sys.argv[1:] and scene in previous:
    results.append(previous[scene]);continue
   if i<3:
    s=SONGS[i];x=synth(s)
    info=dict(id=['village','journey','candy'][i],name=['微笑村','神祕魔法袋','第一願：西卡'][i],key=s['key'],bpm=s['bpm'],meter=4,bars=24,instrument=s['instrument'],style=s['style'],sample=s['stem'],origin_shift_samples=s['origin_shift_samples'],events=[[b*4+o,s['tonic']+p,d] for b in range(24) for o,p,d in bar_events(s,b)])
   else:x,info=new_synth(SCORES[i-3])
   raw=td/'raw.wav';write_wav(raw,x);x*=10**((-16-measure(raw)['lufs'])/20)
   assert np.max(np.abs(x))<.89,(info['id'],'peak')
   master=td/'master.wav';write_wav(master,x)
   info.update(samples=len(x),duration_seconds=len(x)/SR,files={})
   base=x.copy();original_shift=info['origin_shift_samples']
   # Search complete-circle origins before the downbeat; no fade, trim or inserted samples.
   candidates=np.arange(0,round(SR*.35),97)
   smooth=np.array([np.max(np.abs(np.diff(base[(-q-96)%len(base):(-q+96)%len(base)],n=2,axis=0))) if q>96 else 1 for q in candidates])
   candidates=[0]+[int(candidates[k]) for k in np.argsort(smooth)[:31]]
   for rotation in candidates[:8]:
    x=np.roll(base,rotation,axis=0)
    info['origin_shift_samples']=original_shift-rotation
    guard=9216
    info['loop_start_samples']=guard
    info['encoded_samples']=len(x)+2*guard
    write_wav(master,np.concatenate([x[-guard:],x,x[:guard]]))
    for ext,codec in [('mp3',['-c:a','libmp3lame','-b:a','128k']),('ogg',['-c:a','libvorbis','-q:a','6' if info['id']=='hate' else '4'])]:
     dest=td/f"bgm-{info['id']}.{ext}";run([FF,'-v','error','-y','-i',str(master),'-map_metadata','-1',*codec,str(dest)])
     pcm=np.frombuffer(run([FF,'-v','error','-i',str(dest),'-f','f32le','-ar',str(SR),'-ac','2','-']).stdout,dtype='<f4').reshape(-1,2)
     encoded_samples=len(pcm);origin=playback_origin(pcm,len(x),guard);pcm=pcm[origin:origin+len(x)]
     from verify_loop import db,dip
     joined=np.concatenate([pcm,pcm,pcm]);n=len(pcm)
     points=[round(b*info['meter']*60/info['bpm']*SR)-info['origin_shift_samples']-(origin-guard) for b in range(1,info['bars'])]
     seam=dip(joined,n);inner=max(dip(joined,n+q) for q in points)
     d2=float(np.max(np.abs(np.diff(joined[n-96:n+96],n=2,axis=0))))
     inner2=max(float(np.max(np.abs(np.diff(joined[n+q-96:n+q+96],n=2,axis=0)))) for q in points)
     m=measure(dest);m.update(bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),decoded_samples=encoded_samples,measured_loop_origin_samples=origin,loop_samples=n,tail_100ms_dbfs=db(pcm[-4800:]),seam_dip_db=seam,inner_max_dip_db=inner,seam_second_difference=d2,inner_max_second_difference=inner2,clipped_samples=int(np.sum(np.abs(pcm)>=1)),boundary_delta=float(np.max(np.abs(pcm[0]-pcm[-1]))))
     m['checks']=dict(length=n==len(x) and encoded_samples==len(x)+2*guard,loudness=-17<=m['lufs']<=-15,peak=m['true_peak_dbtp']<=-1,no_clipping=m['clipped_samples']==0,tail=m['tail_100ms_dbfs']>-35,no_hole=seam<=inner+1,no_extra_transient=d2<=inner2)
     info['files'][ext]=m
    if all(all(m['checks'].values()) for m in info['files'].values()):break
   results.append(info);print(info['id'],[(e,v['checks']) for e,v in info['files'].items()],flush=True)
  assert all(all(m['checks'].values()) for s in results for m in s['files'].values()), '音檔未過，不更新正式音檔與樂譜 JSON'
  for staged in td.glob('bgm-*.*'):staged.replace(OUT/staged.name)
  (Path(__file__).parent/'scores-bgm3.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
