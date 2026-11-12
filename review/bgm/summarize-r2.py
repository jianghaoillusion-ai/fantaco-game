"""Merge final validation evidence, with gates, without rerunning accepted audio tests."""
import json,subprocess,hashlib
from pathlib import Path
P=Path(__file__).resolve().parent
load=lambda n:json.loads((P/n).read_text())
v=load('validation-bgm3.json');p=load('public-r2.json');r=load('validation-r2.json');h=load('public-http-r2.json');phone=load('phone-r2.json')
g=p['game'];loop=p['loop_test']
checks={
 'public_commit': '/97963f922b7cb4a4cf10fa8278c211241d2bea1a/' in p['base'],
 'curl_http_mime':h['pass'], 'regressions':r['pass'], 'phone_proxy':phone['pass'],
 'no_overlap':g['overlap_violations']==0 and loop['after_stop']['max']==1,
 'one_start_per_new_region':all(x['new_starts']==(0 if i==8 else 1) for i,x in enumerate(g['enter'])),
 'same_scene_no_restart':all(x['new_starts']==0 and x['new_stops']==0 for x in g['same_scene']),
 'cache_max_3':max(x['alive']['loop'] for x in g['enter'])<=3,
 'no_retained_raw_decode':all(x['alive']['decoded']==0 for x in g['enter']),
 'audition_all_28':len(loop['plays'])==28 and all('循環播放中' in x['status'] for x in loop['plays']),
 'no_js_errors':not(g['page_errors'] or loop['page_errors'] or p['fallback']['page_errors']),
 'no_failed_bgm_request':not any('/assets/audio/' in u for u in g['failed_requests']),
}
unchanged=[]
for s in v['audio']:
 if s['id'] in ('hate','bagvalley','theater'):continue
 for ext in ('mp3','ogg'):
  rel=f"assets/audio/bgm-{s['id']}.{ext}"
  assert subprocess.check_output(['git','show','b7dff00:'+rel])==(P.parents[1]/rel).read_bytes()
  unchanged.append(rel)
stings=[]
for file in (P.parents[1]/'assets/audio').glob('*'):
 if file.name.startswith(('feixiang-sting.','sting-clear.')):
  rel='assets/audio/'+file.name
  same=subprocess.check_output(['git','show','22a7d6d:'+rel])==file.read_bytes()
  stings.append({'path':rel,'unchanged_from_start_main':same,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
checks['stings_unchanged']=all(s['unchanged_from_start_main'] for s in stings)
assert all(checks.values()), checks
v['round2']={'playback_commit':'97963f922b7cb4a4cf10fa8278c211241d2bea1a','actual_environment':'macOS headless Chromium '+p['browser'],'iphone_safari':'尚待我的王實機測試','checks':checks,'regression_checks':r['checks'],'public_base':p['base'],'public_region_switches':g['enter'],'public_same_scene':g['same_scene'],'public_audition':loop['after_stop'],'phone_proxy':phone,'unchanged_audio_from_r1':unchanged,'stings':stings,'details':['public-r2.json','public-http-r2.json','validation-r2.json'],'non_audio_request_failures':g['failed_requests']}
v['round2_pass']=all(checks.values())
(P/'validation-bgm3.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(checks,indent=2))
