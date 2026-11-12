"""Measure the actual 48k playback intervals, excluding codec guard samples."""
import os,json,tempfile
from pathlib import Path
import numpy as np
from compose_cute import FF,run,write_wav,measure
P=Path(__file__).resolve().parent
report=json.loads((P/'validation-bgm3.json').read_text())
scores=json.loads((P/'scores-bgm3.json').read_text())
assert report['pass']
assert os.environ['TMPDIR'].startswith('/Volumes/')
with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'],prefix='playback-measure-') as temp:
 for s in scores:
  for ext,metadata in s['files'].items():
   r=next(v for v in report['decoded'] if v['id']==s['id'] and v['ext']==ext and v['rate']==48000)
   path=P.parents[1]/'assets/audio'/f"bgm-{s['id']}.{ext}"
   pcm=np.frombuffer(run([FF,'-v','error','-i',str(path),'-f','f32le','-ar','48000','-ac','2','-']).stdout,dtype='<f4').reshape(-1,2)
   loop=pcm[r['offset']:r['offset']+r['loop_frames']]
   wav=Path(temp)/'loop.wav';write_wav(wav,loop);m=measure(wav)
   assert -17<=m['lufs']<=-15 and m['true_peak_dbtp']<=-1
   metadata['playback_lufs']=m['lufs'];metadata['playback_true_peak_dbtp']=m['true_peak_dbtp']
   r['playback_lufs']=m['lufs'];r['playback_true_peak_dbtp']=m['true_peak_dbtp']
report['audio']=scores
report['actual_loop_loudness_pass']=True
(P/'scores-bgm3.json').write_text(json.dumps(scores,ensure_ascii=False,indent=2)+'\n')
(P/'validation-bgm3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('28 actual playback intervals: loudness and true peak passed; temporary WAV removed')
