from pathlib import Path
import numpy as np,cv2,json,io,subprocess
from PIL import Image,ImageDraw
O=Path('review/cast10')
def load(p):return np.array(Image.open(p).convert('RGBA'))
def fill(m):
 ff=np.pad((~m).astype('uint8'),1,constant_values=1);cv2.floodFill(ff,None,(0,0),0);return m|(ff[1:-1,1:-1]==1)
def comp(m,seed):
 n,l=cv2.connectedComponents(m.astype('uint8'));i=l[seed[1],seed[0]];assert i;return l==i
def measure(n):
 a=load('assets/chars/'+n+'.png');A=a[:,:,3]>=128;yy,xx=np.indices(A.shape);hsv=cv2.cvtColor(a[:,:,:3],cv2.COLOR_RGB2HSV_FULL).astype(float);h=hsv[:,:,0]*360/255;s=hsv[:,:,1]/255;v=hsv[:,:,2]/255
 skin=A&(h>=5)&(h<=42)&(s>.10)&(s<.66)&(v>.62)
 if n=='bulu':
  top,chin,waist,feet=30,246.5,394,685
  face=comp(skin,(268,150))
  face=fill(cv2.morphologyEx(face.astype('uint8'),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))>0)&A&(yy<=chin)
  head=A&(yy>=top)&(yy<=chin)
 else:
  top,chin,waist,feet=132,320.5,469,765
  haircolor=A&(h>190)&(h<250)&(s>.35)&(yy<260)
  hair=fill(comp(haircolor,(270,180)))
  # Geometric face boundary follows cheek contours; excludes pointed ears.
  pm=Image.new('L',(540,800));ImageDraw.Draw(pm).polygon([(204,202),(338,202),(341,260),(332,296),(307,317),(275,322),(239,317),(215,297),(204,258)],fill=255)
  f=skin&(np.array(pm)>0);face=comp(f,(270,235));face=fill(cv2.morphologyEx(face.astype('uint8'),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))>0)&A&(yy<=chin)
  # Hair component includes all blue strands, not crown's white/gold base.
  head=A&(yy>=top)&(yy<=chin)&(xx>=158)&(xx<=390)
  # Exclude crown above actual blue hair and hand below left ear.
  head&=~((yy<146)&~hair)
  head&=~((xx<207)&(yy>290))
  hand=comp(skin,(163,315));head&=~cv2.dilate(hand.astype("uint8"),np.ones((7,7),np.uint8)).astype(bool)
 ears=skin&head&~cv2.dilate(face.astype('uint8'),np.ones((3,3),np.uint8)).astype(bool)
 nl,lab,stats,cent=cv2.connectedComponentsWithStats(ears.astype('uint8'));em=np.zeros_like(A)
 for i in range(1,nl):
  if stats[i,4]>=60 and (cent[i,0]<230 or cent[i,0]>315):em|=lab==i
 ears=fill(cv2.dilate(em.astype('uint8'),np.ones((3,3),np.uint8),iterations=2)>0)&head&~face
 hair=head&~face&~ears
 fw=max(np.ptp(np.where(face[y])[0])+1 for y in range(a.shape[0]) if face[y].any())
 fy,fx=np.where(face);ysh=round(chin+34);row=A[ysh];cx=round((fx.min()+fx.max())/2);l=r=cx
 while l>0 and row[l-1]:l-=1
 while r<539 and row[r+1]:r+=1
 split=None
 for y in range(round(waist),feet-25):
  if all(len([r for r in np.split(np.where(A[k,150:400])[0],np.where(np.diff(np.where(A[k,150:400])[0])>1)[0]+1) if len(r)>=12])>=2 for k in range(y,feet-25)):split=y;break
 ys,xs=np.where(A);out=dict(top=top,chin=chin,waist=waist,feet=feet,hatTop=int(ys.min()),headH=chin-top,ratio=(chin-top)/(feet-top),faceW=int(fw),faceL=int(fx.min()),faceR=int(fx.max()),headArea=int(head.sum()),hair=int(hair.sum()),shoulder=r-l+1,body=waist-chin,split=split,leg=feet-split,total=feet-top,totalHat=feet-int(ys.min()),contentL=int(xs.min()),contentR=int(xs.max()))
 col=np.full(a.shape[:2]+(3,),245,dtype='uint8');col[A]=(200,200,200);col[head]=(80,180,100);col[hair]=(140,60,190);col[face]=(255,175,90);col[ears]=(80,180,100);Image.fromarray(col).save(O/('mask-'+n+'.png'));np.savez_compressed(O/('mask-'+n+'.npz'),head=head,face=face,hair=hair,ears=ears)
 return out
R={n:measure(n) for n in ['bulu','spirit']}
# Sister widths: central torso silhouette at exposed chest/waist rows, excluding hair/arms.
b=np.array(Image.open(io.BytesIO(subprocess.check_output(['git','show','39b59fe:assets/chars/jiejie.png']))).convert('RGBA'));a=load('assets/chars/jiejie.png')
def pinkwidth(a,y):
 hsv=cv2.cvtColor(a[:,:,:3],cv2.COLOR_RGB2HSV);m=(hsv[y,:,0]>140)&(hsv[y,:,0]<179)&(hsv[y,:,1]>90)&(hsv[y,:,2]>80);xs=np.where(m[205:330])[0]+205;runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1);r=next(r for r in runs if r[0]<=268<=r[-1]);return int(r[-1]-r[0]+1)
R['sisterWidths']={name:dict(y=y,before=pinkwidth(b,y),after=pinkwidth(a,y)) for name,y in [('visibleChest',349),('waist',369)]}
json.dump(R,open(O/'measurements.json','w'),indent=2);print(json.dumps(R,indent=2))
