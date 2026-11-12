import os,io,subprocess,json
from PIL import Image
import numpy as np

def count(im,rows):
 a=np.array(im.convert('RGBA'));out={}
 for x,y0,y1 in rows:
  c=a[y0:y1+1,x];dark=(c[:,:3].astype(int).sum(1)<200)&(c[:,3]>=128)
  pink=(c[:,0]>120)&(c[:,0]>c[:,1]*1.5)&(c[:,2]>40)&(c[:,3]>=128)
  runs=[r for r in np.split(np.where(dark)[0],np.where(np.diff(np.where(dark)[0])>1)[0]+1) if len(r)>=2]
  good=[r for r in runs if r.min()>0 and r.max()+1<len(c) and pink[max(0,r.min()-2):r.min()].any() and pink[r.max()+1:r.max()+3].any()]
  out[str(x)]={'count':len(good),'segments':[[int(r.min()+y0),int(r.max()+y0)] for r in good]}
 return out
im=Image.open(io.BytesIO(subprocess.check_output(['git','show','origin/main:assets/chars/jiejie.png'])))
r=count(im,[(219,514,580),(227,514,580),(235,514,580),(281,514,580),(289,514,580),(297,514,580)])
candidate=Image.open('review/cast9/candidate-sister-r2.png')
r={'original':r,'r2':count(candidate,[(215,563,613),(223,563,613),(231,563,613),(292,563,613),(300,563,613),(308,563,613)])}
from pathlib import Path
Path('review/cast9/sock-stripes-r2.json').write_text(json.dumps(r,indent=2))
print(json.dumps(r,indent=2))
