"""沿用小頌膚色/閉合15/耳擴邊2；定位點由新圖重新標定。"""
import sys,os,json
from pathlib import Path
import cv2,numpy as np
from PIL import Image,ImageDraw
T=Path(os.environ['TMPDIR'])/'r2';sys.path.insert(0,'review/cast9/xiaosong/scripts');sys.argv=['meas9.py',str(T),'0','0','0','0','15','2']
from meas9 import measure
from seg import load,hsv,skinmask,comp_from_seed,fill
O=Path('review/cast9');cfg=json.loads((O/'landmarks-r2.json').read_text())
b=measure('bulu','assets/chars/bulu.png',30,246.5,394,(268,150),'bulu')
a=load(O/'candidate-sister-r2.png');A=a[:,:,3]>=128;y,x=np.indices(A.shape);h,s,v=hsv(a);top=cfg['top'];chin=cfg['chin'];waist=cfg['waist'];ci=int(chin)
sk=skinmask(a);f=comp_from_seed(sk,tuple(cfg['face_seed']))&(y<=ci)
fc=cv2.morphologyEx(np.pad(f,30).astype('uint8'),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))[30:-30,30:-30]>0
face=fill(fc)&A&(y<=ci)
p=Image.new('L',(540,720));ImageDraw.Draw(p).polygon([tuple(z) for z in cfg['head_polygon']],fill=255)
head=A&(np.array(p)>0)&(y>=top)&(y<=ci)
pink=A&((h>=300)|(h<=4))&(s>.25)&(v>.35)
hat=fill(cv2.dilate((pink&(y<cfg['bow_bottom'])).astype('uint8'),np.ones((3,3),np.uint8))>0)&A&(y<cfg['bow_bottom'])
head&=~hat;head|=face
fy,fx=np.where(face);rest=sk&head&(y>=140)&~(cv2.dilate(face.astype('uint8'),np.ones((3,3),np.uint8))>0)
n,l,st,c=cv2.connectedComponentsWithStats(rest.astype('uint8'),connectivity=4);ears=np.zeros_like(A)
for i in range(1,n):
 if st[i,4]>=60 and (c[i,0]<fx.min()+8 or c[i,0]>fx.max()-8):ears|=l==i
ears=fill(cv2.dilate(ears.astype('uint8'),np.ones((3,3),np.uint8),iterations=2)>0)&head&~face
hair=head&~face&~ears
brown=A&(h>=5)&(h<=40)&(s>.25)&(v<.66)&(v>.1)
b2=cv2.dilate(cv2.erode(brown.astype('uint8'),np.ones((3,3),np.uint8)),np.ones((3,3),np.uint8),iterations=2)>0
b2&=A&~sk&~pink&(y>ci)&(y<600)
n,l,st,c=cv2.connectedComponentsWithStats(b2.astype('uint8'));long=np.zeros_like(A)
for i in range(1,n):
 if st[i,4]>=150:long|=l==i
cx=int(round((fx.min()+fx.max())/2));sh=round(chin+34);row=A[sh];left=right=cx
while left>0 and row[left-1]:left-=1
while right<539 and row[right+1]:right+=1
fw=max((np.ptp(np.where(face[yy])[0])+1,yy) for yy in range(fy.min(),fy.max()+1) if face[yy].any())
res=dict(top=top,chin=chin,waist=waist,total=685-top,total_hat=685-int(np.where(A)[0].min()),headH=chin-top,ratio=(chin-top)/(685-top),faceW=int(fw[0]),faceW_y=int(fw[1]),headW=int(max(np.ptp(np.where(head[yy])[0])+1 for yy in range(top,ci+1) if head[yy].any())),headArea=int(head.sum()),faceArea=int(face.sum()),earArea=int(ears.sum()),hair=int(hair.sum()),hairLong=int(hair.sum()+long.sum()),shFull=right-left+1,sh_y=sh,body=waist-chin,waist2foot=685-waist,leg=None,faceL=int(fx.min()),faceR=int(fx.max()))
legs={}
for k,pth in [('jiejie',O/'candidate-sister-r2.png'),('feifei','assets/chars/feifei.png')]:
 aa=load(pth);out={}
 for yy in [572,590,595,608,620,632]:
  xx=np.where(aa[yy,:,3]>=128)[0];runs=[z for z in np.split(xx,np.where(np.diff(xx)>1)[0]+1) if len(z)>=12];out[str(yy)]=[dict(x0=int(z.min()),x1=int(z.max()),width=len(z)) for z in runs]
 legs[k]=out
sums={k:[] for k in ['jiejie','feifei']}
for k,pth in [('jiejie',O/'candidate-sister-r2.png'),('feifei','assets/chars/feifei.png')]:
 aa=load(pth)
 for yy in range(580,611):
  xx=np.where(aa[yy,:,3]>=128)[0];runs=[z for z in np.split(xx,np.where(np.diff(xx)>1)[0]+1) if len(z)>=12]
  if len(runs)==2:sums[k].extend(map(len,runs))
legs['average']={k:float(np.mean(z)) for k,z in sums.items()};legs['ratio']=legs['average']['jiejie']/legs['average']['feifei']
o=np.zeros_like(a);o[A]=[190,190,190,255];o[face]=[255,170,60,255];o[hair]=[200,60,200,255];o[ears]=[60,190,60,255];o[hat]=[120,120,255,255];o[long]=[120,60,120,255]
Image.fromarray(o).save(O/'mask-sister-r2.png');(O/'measurements-r2.json').write_text(json.dumps(dict(bulu=b,jiejie=res,legs=legs),indent=2));print(json.dumps(dict(jiejie=res,legs=legs),indent=2))
