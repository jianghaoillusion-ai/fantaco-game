"""curl check of immutable public preview and all 28 audio URLs; no downloads retained."""
import json,subprocess,concurrent.futures
from pathlib import Path
P=Path(__file__).resolve().parent
base='https://rawcdn.githack.com/jianghaoillusion-ai/fantaco-game/97963f922b7cb4a4cf10fa8278c211241d2bea1a/'
paths=['index.html','review/bgm/loop-test.html','js/audio.js']+[f"assets/audio/bgm-{s['id']}.{e}" for s in json.loads((P/'scores-bgm3.json').read_text()) for e in ('mp3','ogg')]
def check(path):
 r=subprocess.run(['curl','-L','--max-time','60','--retry','2','-sS','-o','/dev/null','-w','%{http_code} %{content_type}',base+path],capture_output=True,text=True)
 expected={'.mp3':'audio/mpeg','.ogg':'audio/ogg','.html':'text/html','.js':'javascript'}[Path(path).suffix]
 return dict(path=path,url=base+path,status_and_mime=r.stdout,pass_=r.returncode==0 and r.stdout.startswith('200 ') and expected in r.stdout)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(check,paths))
report={'base':base,'checks':rows,'pass':all(r['pass_'] for r in rows)}
(P/'public-http-r2.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));assert report['pass']
