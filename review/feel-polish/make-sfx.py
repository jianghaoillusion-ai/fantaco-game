"""Original additive synthesis. No samples, services or paid generators."""
import numpy as np, wave, subprocess, json, os
from pathlib import Path
root=Path(__file__).resolve().parents[2]
subprocess.run(['python3',str(root/'review/feel-polish/guard-audio.py')],check=True)
tmp=Path(os.environ['TMPDIR']);sr=48000
result=[]
for name,duration,notes in [('merge',.30,[(0,659),(.055,988),(.105,1319)]),('generate',.18,[(0,740),(.045,1109)]),('order',.42,[(0,784),(.09,988),(.18,1568)])]:
 t=np.arange(round(duration*sr))/sr;y=np.zeros(len(t))
 for start,freq in notes:
  u=np.maximum(0,t-start);env=(1-np.exp(-u/.002))*np.exp(-u/.045)*(t>=start)
  phase=2*np.pi*freq*(u+.0008*(1-np.exp(-u/.01)))
  y+=env*(np.sin(phase)+.15*np.sin(phase*2)+.04*np.sin(phase*3))
 y*=np.minimum(1,(duration-t)/.015);y*=.16/max(abs(y))
 wav=tmp/(name+'.wav')
 with wave.open(str(wav),'wb') as w:w.setparams((1,2,sr,0,'NONE',''));w.writeframes((y*32767).astype('<i2').tobytes())
 for ext,codec in [('mp3','libmp3lame'),('ogg','libvorbis')]:
  subprocess.run(['/Users/haomini/media-tools/bin/ffmpeg','-y','-v','error','-i',str(wav),'-c:a',codec,'-q:a','4',str(root/'assets/audio'/('sfx-'+name+'.'+ext))],check=True)
 result.append(dict(name=name,seconds=duration,peak_dbfs=float(20*np.log10(max(abs(y)))),rms_dbfs=float(20*np.log10(np.sqrt(np.mean(y*y)))),playback_gain=.16*.85))
 wav.unlink()
(root/'review/feel-polish/sfx-levels.json').write_text(json.dumps(result,indent=2)+'\n')

subprocess.run(['python3',str(root/'review/feel-polish/guard-audio.py')],check=True)
