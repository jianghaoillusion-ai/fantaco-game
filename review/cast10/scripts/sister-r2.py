"""Repaint side strips with rigid horizontal translation, never resize anatomy.
Middle cloth stays exact. Smooth displacement only guides newly painted contour.
"""
from pathlib import Path
from PIL import Image
import numpy as np, cv2, subprocess, io, json
O=Path('review/cast10')
def old(p): return np.array(Image.open(io.BytesIO(subprocess.check_output(['git','show','39b59fe:'+p]))).convert('RGBA'))
b=old('assets/chars/jiejie.png'); n=b.copy(); hsv=cv2.cvtColor(b[:,:,:3],cv2.COLOR_RGB2HSV)
hair=(hsv[:,:,0]>2)&(hsv[:,:,0]<24)&(hsv[:,:,1]>65)&(hsv[:,:,2]<180)&(b[:,:,3]>0)
protect=cv2.dilate(hair.astype('uint8'),np.ones((3,3),np.uint8))>0
protect[367:]=False
protect[:363]=True;protect[431:]=True
# Skin and watch on the hand remain exact too.
skin=(hsv[:,:,0]<25)&(hsv[:,:,1]>35)&(hsv[:,:,2]>150)&(b[:,:,3]>0)
hand=cv2.dilate(skin.astype('uint8'),np.ones((5,5),np.uint8))>0
protect[385:431,285:] |= (hand[385:431,285:] & (b[385:431,285:,3]>0))
smooth=lambda t: (max(0,min(1,t)))**2*(3-2*max(0,min(1,t)))
rows=[]
for y in range(363,431):
 pink=(hsv[y,:,0]>140)&(hsv[y,:,0]<179)&(hsv[y,:,1]>80)&(hsv[y,:,2]>80)
 xs=np.where(pink[150:325])[0]+150
 runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1)
 run=next((r for r in runs if len(r) and r[0]<=265<=r[-1]),None)
 if run is None:continue
 
 if y>=367:
  xs=np.where(b[y,:,3]>=128)[0]; runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1);run=next(r for r in runs if r[0]<=265<=r[-1])
 l,r=int(run[0]),int(run[-1]); dl=6*smooth((y-363)/12)*(1-smooth((y-399)/31));dr=3*smooth((y-363)/11)*(1-smooth((y-374)/11))
 for side,edge,delta in [(-1,l,dl),(1,r,dr)]:
  if delta==0:continue
  for x in range(edge-17,edge+18):
   if protect[y,x]:continue
   dist=(x-edge)*side
   if dist < -12 or dist>delta+5:continue
   sx=x-side*delta; i=int(np.floor(sx));f=sx-i
   # Premultiplied alpha prevents dark transparent RGB from creating fringes.
   v=b[y,i:i+2].astype(float);a=v[:,3]/255; rgb=v[:,:3]*a[:,None]
   aa=a[0]*(1-f)+a[1]*f; c=rgb[0]*(1-f)+rgb[1]*f
   sample=np.r_[c/aa if aa>0 else [0,0,0],aa*255]
   w=smooth((dist+12)/7)
   n[y,x]=np.round(sample*w+b[y,x]*(1-w)).clip(0,255).astype('uint8')
 rows.append([y,l,r,dl,dr])
# Keep the original hand-to-belt silhouette; extending cloth must never cut
# a new transparent notch in the original junction.
keep=(n[:,:,3]<128)&(b[:,:,3]>=128);keep[:,:295]=False;keep[:375]=False;keep[400:]=False
n[keep]=b[keep]
n[protect]=b[protect]; changed=np.any(n!=b,axis=2)
Image.fromarray(n).save('assets/chars/jiejie.png');Image.fromarray(n).save('assets/chars/jiejie.webp',lossless=True,exact=True)
for expr in ['happy','happy-open']:
 p='assets/chars/expr/jiejie-'+expr+'.png';a=old(p);a[changed]=n[changed];Image.fromarray(a).save(p)
Image.fromarray((protect*255).astype('uint8')).save(O/'sister-protected-mask.png');Image.fromarray((changed*255).astype('uint8')).save(O/'sister-changes-mask.png')
y,x=np.where(changed)
widths=[]
for yy in [349,369,375,380,384,395,410,430]:
 vals=[]
 for a in [b,n]:
  # Continuous opaque central garment component; excludes separate sleeve.
  xs=np.where(a[yy,:,3]>=128)[0];runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1);run=next(r for r in runs if r[0]<=265<=r[-1]);vals.append([int(run[0]),int(run[-1]),len(run)])
 widths.append(dict(y=yy,before=vals[0],after=vals[1],percent=(vals[1][2]/vals[0][2]-1)*100))
r=dict(changedPixels=int(changed.sum()),changedY=[int(y.min()),int(y.max())],headProtectedDifference=int(np.any(n[protect]!=b[protect],axis=1).sum()),legsDifference=int(np.any(n[520:]!=b[520:],axis=2).sum()),widths=widths,rows=rows)
(O/'sister-edit.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if k!='rows'},indent=2))
