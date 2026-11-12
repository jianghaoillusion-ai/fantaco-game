import sys,os,json
from pathlib import Path
import numpy as np,cv2
from PIL import Image,ImageDraw
T=Path(os.environ['TMPDIR']);sys.path.insert(0,'review/cast8/xiaosong/final-scripts');sys.argv=['meas.py',str(T),'0','0','0','0','15','2']
from seg import *
from meas import measure
b=measure('bulu','assets/chars/bulu.png',30,246.5,394,(268,150),'bulu')
a=load('review/cast9/candidate-sister.png');A=a[:,:,3]>=128;y,x=np.indices(A.shape);h,s,v=hsv(a);chin=249.5;waist=368
sk=skinmask(a);f=comp_from_seed(sk,(270,210));f&=y<=249
fc=cv2.morphologyEx(np.pad(f,30).astype('uint8'),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))[30:-30,30:-30]>0
face=fill(fc)&A&(y<=249)
pink=A&((h>=300)|(h<=4))&(s>.25)&(v>.35);hat=fill(cv2.dilate((pink&(y<65)).astype('uint8'),np.ones((3,3),np.uint8))>0)&A&(y<65)&~((h>5)&(h<45)&(v<.62))
hand=comp_from_seed(sk,(148,246));hand=cv2.dilate(hand.astype('uint8'),np.ones((3,3),np.uint8),iterations=4)>0
head=A&(y<=249)&~hat&~hand
# Boundary under bow: actual visible brown hair only. Rounded crown concealed by bow is not inferred.
head&=~((y<45)&(x<230))
head&=(x>=168)&(y>=44)
ys,xs=np.where(head);top=int(ys.min());rest=sk&head&~(cv2.dilate(face.astype('uint8'),np.ones((3,3),np.uint8))>0)
n,l,st,c=cv2.connectedComponentsWithStats(rest.astype('uint8'),connectivity=4);ears=np.zeros_like(A)
fy,fx=np.where(face)
for i in range(1,n):
 if st[i,4]>=60 and (c[i,0]<fx.min()+8 or c[i,0]>fx.max()-8):ears|=l==i
ears=fill(cv2.dilate(ears.astype('uint8'),np.ones((3,3),np.uint8),iterations=2)>0)&head&~face
hair=head&~face&~ears
brown=A&(h>=5)&(h<=40)&(s>.25)&(v<.66)&(v>.1)
b2=cv2.dilate(cv2.erode(brown.astype('uint8'),np.ones((3,3),np.uint8)),np.ones((3,3),np.uint8),iterations=2)>0
b2&=A&~sk&~pink&(y>249)&(y<600)
n,l,st,c=cv2.connectedComponentsWithStats(b2.astype('uint8'));long=np.zeros_like(A)
for i in range(1,n):
 if st[i,4]>=150:long|=l==i
cx=int(round((fx.min()+fx.max())/2));sh=round(chin+34);row=A[sh];left=right=cx
while left>0 and row[left-1]:left-=1
while right<539 and row[right+1]:right+=1
fw=max((np.ptp(np.where(face[yy])[0])+1,yy) for yy in range(fy.min(),fy.max()+1) if face[yy].any())
res=dict(top=top,chin=chin,waist=waist,total=685-top,total_hat=685-int(np.where(A)[0].min()),headH=chin-top,ratio=(chin-top)/(685-top),faceW=int(fw[0]),faceW_y=int(fw[1]),headW=int(max(np.ptp(np.where(head[yy])[0])+1 for yy in range(top,250) if head[yy].any())),headArea=int(head.sum()),faceArea=int(face.sum()),earArea=int(ears.sum()),hair=int(hair.sum()),hairLong=int(hair.sum()+long.sum()),shFull=right-left+1,shRight=right-cx,sh_y=sh,body=waist-chin,waist2foot=685-waist,leg=None)
legs={}
for k,p in [('jiejie','review/cast9/candidate-sister.png'),('feifei','assets/chars/feifei.png')]:
 aa=load(p);xx=np.where(aa[595,:,3]>=128)[0];runs=[z for z in np.split(xx,np.where(np.diff(xx)>1)[0]+1) if len(z)>=12];legs[k]=[dict(x0=int(z.min()),x1=int(z.max()),width=len(z)) for z in runs]
legs['y']=595;legs['ratio_left']=legs['jiejie'][0]['width']/legs['feifei'][0]['width'];legs['ratio_right']=legs['jiejie'][1]['width']/legs['feifei'][1]['width']
o=np.zeros_like(a);o[A]=[190,190,190,255];o[face]=[255,170,60,255];o[hair]=[200,60,200,255];o[ears]=[60,190,60,255];o[hat]=[120,120,255,255];o[long]=[120,60,120,255]
Image.fromarray(o).save('review/cast9/mask-sister.png')
Path('review/cast9/sister-measurements.json').write_text(json.dumps(dict(bulu=b,jiejie=res,legs=legs),indent=2))
print(json.dumps(dict(jiejie=res,legs=legs),indent=2))
