"""400 Hz 高通後的相對響度；只是手機小喇叭近似，不是實機。"""
import json,re,subprocess
from pathlib import Path
import numpy as np
P=Path(__file__).resolve().parent
rows=[]
for song in json.loads((P/'scores-bgm3.json').read_text()):
 path=P.parents[1]/'assets/audio'/f"bgm-{song['id']}.mp3"
 command=[str(Path.home()/'media-tools/bin/ffmpeg'),'-hide_banner','-nostats','-i',str(path),'-af',f"atrim=start_sample=9216:end_sample={9216+song['samples']},highpass=f=400:p=2,ebur128=peak=true",'-f','null','-']
 log=subprocess.run(command,capture_output=True,check=True).stderr.decode().split('Summary:')[-1]
 rows.append({'id':song['id'],'highpass_400_lufs':float(re.search(r'I:\s*(-?[\d.]+)',log)[1])})
reference=float(np.median([r['highpass_400_lufs'] for r in rows if r['id'] not in ('hate','bagvalley','theater')]))
for row in rows:row['difference_from_other_11_median_db']=round(row['highpass_400_lufs']-reference,2)
report={'method':'ffmpeg 2-pole highpass 400 Hz + ebur128; guard excluded; MP3','not_phone_hardware':True,'reference_median_lufs':reference,'rows':rows,'pass':all(abs(r['difference_from_other_11_median_db'])<=3 for r in rows if r['id'] in ('hate','bagvalley','theater'))}
(P/'phone-r2.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(12,4));ax.bar([r['id'] for r in rows],[r['highpass_400_lufs'] for r in rows],color=['#d69853' if r['id'] in ('hate','bagvalley','theater') else '#7489ac' for r in rows]);ax.axhline(reference-3,color='red',ls='--',label='Other 11 median - 3 dB');ax.set_ylim(-28,-14);ax.set_ylabel('LUFS after 400 Hz highpass');ax.tick_params(axis='x',rotation=45);ax.legend();fig.tight_layout();fig.savefig(P/'phone-r2.png');plt.close(fig)
assert report['pass']
