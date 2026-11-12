"""cast10: whole-source uniform spirit resize; sister fabric edge repaint, no head/leg transform."""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,cv2,subprocess,io,json
O=Path('review/cast10'); O.mkdir(exist_ok=True)
def baseline(path):return Image.open(io.BytesIO(subprocess.check_output(['git','show','39b59fe:'+path]))).convert('RGBA')
im=Image.open(O/'source/spirit-built-in.png').convert('RGBA');a=np.array(im)
# Remove isolated alpha fragments only, retain continuous antialiased perimeter.
n,lab,st,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8')); biggest=1+np.argmax(st[1:,4]);removed=int(((lab!=biggest)&(a[:,:,3]>0)).sum());a[lab!=biggest]=0
im=Image.fromarray(a);y,x=np.where(a[:,:,3]>=128);scale=758/(y.max()-y.min());sz=(round(im.width*scale),round(im.height*scale));im=im.resize(sz,Image.Resampling.LANCZOS);a=np.array(im);y,x=np.where(a[:,:,3]>=128);offset=(round(270-(x.min()+x.max())/2),765-int(y.max()));out=Image.new('RGBA',(540,800));out.alpha_composite(im,offset)
a=np.array(out);n,lab,st,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8'));a[lab!=1+np.argmax(st[1:,4])]=0
# Smooth alpha only: RGB artwork geometry is never warped.
a[:,:,3]=np.array(Image.fromarray(a[:,:,3]).filter(ImageFilter.GaussianBlur(.30)));a[a[:,:,3]==0]=0
out=Image.fromarray(a);out.save('assets/chars/spirit.png');out.save('assets/chars/spirit.webp',lossless=True,exact=True)
json.dump(dict(scale=scale,size=sz,offset=offset,removedSourceAlphaFragments=removed),open(O/'normalization.json','w'),indent=2)
# Sister: draw tiny additions of fabric at existing side contours. Sample nearby
# fabric colour; translate narrow outline strips, blend only their inner edge.
base=np.array(baseline('assets/chars/jiejie.png'));hsv=cv2.cvtColor(base[:,:,:3],cv2.COLOR_RGB2HSV)
brown=(hsv[:,:,0]>2)&(hsv[:,:,0]<24)&(hsv[:,:,1]>65)&(hsv[:,:,2]<180)&(base[:,:,3]>0)
protect=cv2.dilate(brown.astype('uint8'),np.ones((3,3),np.uint8))>0
protect[:350]=True;protect[376:]=True
new=base.copy(); rows=[]
for y in range(350,376):
 # Only pink central torso and belt; never change hair, sleeves, hands, skirt.
 pink=(hsv[y,:,0]>140)&(hsv[y,:,0]<179)&(hsv[y,:,1]>90)&(hsv[y,:,2]>80)
 xs=np.where(pink[210:325])[0]+210
 if not len(xs):continue
 runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1);run=next((r for r in runs if r[0]<=268<=r[-1]),None)
 if run is None or len(run)<55:continue
 l,r=int(run[0]),int(run[-1]);d=3.0*np.sin(np.pi*(y-350)/26)**2
 if d<.01:continue
 # Extend outer 8px strip by <=3px without rescaling. Feather to unchanged fabric.
 for side,edge in [(-1,l),(1,r)]:
  if any(protect[y,max(0,min(539,edge+side*k))] for k in range(0,5)):continue
  for x in range(max(0,edge-12),min(540,edge+13)):
   if protect[y,x]:continue
   dist=(x-edge)*side
   if dist < -8 or dist>d+3:continue
   sx=x-side*d;i=int(np.floor(sx));f=sx-i
   sample=base[y,i].astype(float)*(1-f)+base[y,i+1].astype(float)*f
   weight=min(1,max(0,(dist+8)/4))
   new[y,x]=np.round(sample*weight+base[y,x]*(1-weight)).astype('uint8')
 rows.append((y,l,r,d))
new[protect]=base[protect]; changed=np.any(new!=base,axis=2)
Image.fromarray(new).save('assets/chars/jiejie.png');Image.fromarray(new).save('assets/chars/jiejie.webp',lossless=True,exact=True)
# Apply identical body-only patch to both expressions; preserve their own head pixels.
for expr in ['happy','happy-open']:
 e=np.array(baseline('assets/chars/expr/jiejie-'+expr+'.png'));e[changed]=new[changed];Image.fromarray(e).save('assets/chars/expr/jiejie-'+expr+'.png')
Image.fromarray((protect*255).astype('uint8')).save(O/'sister-protected-mask.png');Image.fromarray((changed*255).astype('uint8')).save(O/'sister-changes-mask.png')
y,x=np.where(changed);result=dict(changedPixels=int(changed.sum()),changedY=[int(y.min()),int(y.max())],headProtectedDifference=int(np.any(base[protect]!=new[protect],axis=1).sum()),legsDifference=int(np.any(base[520:]!=new[520:],axis=2).sum()),rows=rows)
json.dump(result,open(O/'sister-edit.json','w'),indent=2);print({k:v for k,v in result.items() if k!='rows'})
