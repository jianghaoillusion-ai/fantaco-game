from pathlib import Path
from PIL import Image
import numpy as np,cv2,json,subprocess,io,hashlib
O=Path('review/cast10')
def arr(p):return np.array(Image.open(p).convert('RGBA'))
def old(p,ref='39b59fe'):return np.array(Image.open(io.BytesIO(subprocess.check_output(['git','show',ref+':'+p]))).convert('RGBA'))
def diff(a,b):return int(np.any(a!=b,axis=-1).sum())
R={}
for n in ['spirit','jiejie']:
 p='assets/chars/'+n+'.png';a=arr(p);alpha=a[:,:,3];ncomp=cv2.connectedComponents((alpha>0).astype('uint8'))[0]-1
 R[n]=dict(size=[a.shape[1],a.shape[0]],sole=int(np.where(alpha>=128)[0].max()),alphaPositiveComponents=ncomp,hardEdgePixels=int(((alpha==255)&(cv2.dilate((alpha==0).astype('uint8'),np.ones((3,3),np.uint8))>0)).sum()),webpPixelDiff=diff(a,arr(p.replace('.png','.webp'))))
 assert R[n]['webpPixelDiff']==0;assert R[n]['sole']==(765 if n=='spirit' else 685)
 if n=='jiejie':
  b=old(p);R[n].update(headIncludingHairDiff=diff(a[:363],b[:363]),legsFeetDiff=diff(a[520:],b[520:]),beltAndBelowDiff=diff(a[376:],b[376:]),changedPixels=diff(a,b));assert all(R[n][k]==0 for k in ['headIncludingHairDiff','legsFeetDiff'])
  for e in ['happy','happy-open']:
   ep='assets/chars/expr/jiejie-'+e+'.png';ea=arr(ep);eb=old(ep);R[n][e]=dict(headDiff=diff(ea[:363],eb[:363]),legsDiff=diff(ea[520:],eb[520:]));assert R[n][e]==dict(headDiff=0,legsDiff=0)
  ap='assets/chars/avatars/jiejie.png';R[n]['avatarBytesSame']=Path(ap).read_bytes()==subprocess.check_output(['git','show','39b59fe:'+ap]);assert R[n]['avatarBytesSame']
 for e in ['happy','happy-open']:assert arr('assets/chars/expr/'+n+'-'+e+'.png').shape==a.shape
p='assets/chars/hate.png';raw=Path(p).read_bytes();R['hate']={'sha256':hashlib.sha256(raw).hexdigest()}
for ref in ['39b59fe','5b125dc']:
 b=subprocess.check_output(['git','show',ref+':'+p]);R['hate'][ref]=dict(sha256=hashlib.sha256(b).hexdigest(),byteIdentical=raw==b);assert raw==b
# No derivative or image of the five protected characters changed.
R['otherArtChanges']=subprocess.check_output(['git','diff','--name-only','39b59fe','--','assets/chars']).decode().splitlines();assert all('/spirit' in p or '/jiejie' in p for p in R['otherArtChanges'])
# Verify final screenshot geometry, including source alpha feet rather than metadata alone.
g=json.loads((O/'game-check.json').read_text());R['game']=[]
for case in g:
 rows=[]
 for r in case['rows']:
  if not r['visible']:continue
  a=arr(r['src'].split('?')[0].lstrip('/'));foot=int(np.where(a[:,:,3]>=128)[0].max());meta=765 if r['id']=='spirit' else 685
  r['actualFoot']=r['foot']+(foot-meta)*r['scale'];rows.append(r)
 delta=max(r['actualFoot'] for r in rows)-min(r['actualFoot'] for r in rows);assert delta<.1;assert not case['errors'];assert all(r['top']>=0 for r in rows)
 R['game'].append(dict(viewport=case['viewport'],actualSoleDelta=delta,visible=[r['id'] for r in rows],errors=case['errors']))
(O/'validation.json').write_text(json.dumps(R,ensure_ascii=False,indent=2)+'\n');print(json.dumps(R,ensure_ascii=False,indent=2))
