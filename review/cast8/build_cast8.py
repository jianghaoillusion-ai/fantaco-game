"""cast8 免費內建生圖接縫修復＋本機等比圖層合成。
只重出姐姐/精靈，絕不寫哈特。來源及生成提示見 provenance.md。
TMPDIR 必須是外接碟；全部縮放都是 x/y 相同倍率。
"""
import io,os,subprocess
from pathlib import Path
import numpy as np,cv2
from PIL import Image,ImageDraw,ImageFilter
R=Path(__file__).resolve().parents[2];T=Path(os.environ['TMPDIR']);os.chdir(R)
def source(k,ref='f346cdf'):
 return Image.open(io.BytesIO(subprocess.check_output(['git','show',f'{ref}:assets/chars/{k}.png']))).convert('RGBA')
def poly(points):
 m=Image.new('L',(540,720));ImageDraw.Draw(m).polygon(points,fill=255);return m

def layer(im,mask):
 a=np.array(im);a[:,:,3]=(a[:,:,3].astype(float)*np.array(mask)/255).astype('uint8');return Image.fromarray(a)
def rect(box):
 m=Image.new('L',(540,720));ImageDraw.Draw(m).rectangle(box,fill=255);return m

def trans(im,s,anchor,target):
 # single isotropic affine in premultiplied RGBA through Pillow RGBa
 dx=target[0]-s*anchor[0];dy=target[1]-s*anchor[1]
 return im.convert('RGBa').transform((540,720),Image.Transform.AFFINE,(1/s,0,-dx/s,0,1/s,-dy/s),Image.Resampling.BICUBIC).convert('RGBA')
def put(out,im,s=1,anchor=(0,0),target=(0,0)):
 out.alpha_composite(trans(im,s,anchor,target))
k='spirit';im=source(k)
# Restore the original dark cuff contour, selecting only non-cyan pixels.
a=np.array(im);orig=np.array(source(k,'525ab99f5d635f75cf3553877422fa018a81d35f'));rgb=orig[:,:,:3];dark=rgb.max(2)<105
for y in range(315,382):
 for x in range(137,173):
  if dark[y-5,x] and orig[y-5,x,3]>40:a[y,x]=orig[y-5,x]
im=Image.fromarray(a)
headmask=poly([(194,233),(195,180),(210,169),(230,158),(259,158),(280,156),(310,158),(340,174),(343,209),(357,209),(338,245),(310,264),(290,282),(264,286),(238,278),(218,264)])
# Blue-only top edge excludes the crown without trimming tufts.
a=np.array(im);blue=(a[:,:,2]>a[:,:,0].astype(float)*1.15)&(a[:,:,2]>a[:,:,1].astype(float)*1.03)
h=np.array(headmask);h[:190]=np.where(blue[:190],h[:190],0);headmask=Image.fromarray(h)
facemask=poly([(228,215),(238,208),(251,207),(263,205),(276,204),(290,207),(303,212),(313,230),(309,254),(298,270),(284,281),(266,284),(250,280),(237,270),(230,254)])
# Hair/ears base and slightly smaller independent face; an expanded face patch covers the old features.
head=layer(im,headmask)
body=layer(im,rect((0,283,539,719)))
# raised hand is above the neck cut, retain original hand and arm together
hand=layer(im,poly([(110,245),(193,245),(205,290),(223,325),(212,386),(133,391)]))
out=Image.new('RGBA',(540,720))
put(out,body,.925,(270,685),(270,685));put(out,hand,.925,(270,685),(270,685))
# original crown, never scaled
hatmask=rect((0,0,539,176));hm=np.array(hatmask);hm[145:177][blue[145:177]]=0
put(out,head,1.585,(270,282),(270,313))
put(out,layer(im,facemask.filter(ImageFilter.GaussianBlur(.45))),1.60,(270,282),(270,313))
# Restore the original front-facing crown/base layer after the enlarged hair.
hat=trans(layer(im,Image.fromarray(hm)),1,(270,161),(270,126))
out.alpha_composite(hat)
hat.getchannel('A').save(R/'review/cast8/mask-spirit-crown.png')
spirit=out


jiejie=Image.open(R/'review/cast8/source/jiejie-seam-repair.png').convert('RGBA')
# Hair/head layer is uniformly reduced 15%, anchored at the hair top; face stays independent.
small=trans(jiejie,.85,(270,40),(270,40))
a=np.array(jiejie).astype(float);b=np.array(small).astype(float)
y=np.indices(a.shape[:2])[0];w=np.clip((260-y)/70,0,1)[:,:,None]
head_zone=poly([(190,0),(420,0),(420,260),(196,260),(196,170),(190,120)])
w*=np.array(head_zone.filter(ImageFilter.GaussianBlur(2)))[:,:,None]/255
# Clothing must stay on its body layer: do not drag pink shoulder pixels upward with the hair.
pink=((b[:,:,0]>b[:,:,1]*1.08)&(b[:,:,2]>b[:,:,1]*1.03))|((a[:,:,0]>a[:,:,1]*1.08)&(a[:,:,2]>a[:,:,1]*1.03))
w[(y>190)&pink]=0
# The raised hand crosses the head bounding box. Keep both original and shifted skin
# pixels out of the hair layer, preventing an extra fingertip beside the cheek.
x=np.indices(a.shape[:2])[1]
hand_skin=np.zeros((720,540),bool)
for z in (a,b):
 hsv=cv2.cvtColor(z[:,:,:3].astype('uint8'),cv2.COLOR_RGB2HSV)
 hand_skin|=(hsv[:,:,0]<30)&(hsv[:,:,1]<190)&(hsv[:,:,2]>150)&(z[:,:,3]>10)
hand_skin=cv2.dilate(hand_skin.astype('uint8'),np.ones((9,9),np.uint8))>0
w[hand_skin&(x<215)&(y>65)&(y<200)]=0
# Premultiplied crossfade solely at the neck/hair joining strip.
for z in (a,b):z[:,:,:3]*=z[:,:,3:4]/255
c=a*(1-w)+b*w
c[:,:,:3]=np.divide(c[:,:,:3]*255,c[:,:,3:4],out=np.zeros_like(c[:,:,:3]),where=c[:,:,3:4]>0)
jiejie=Image.fromarray(np.clip(c,0,255).astype('uint8'))
original=source('jiejie')
fm=poly([(228,127),(242,121),(256,118),(269,117),(282,112),(298,117),(308,132),(309,155),(302,170),(285,183),(266,188),(248,183),(235,172),(229,154)])
put(jiejie,layer(original,fm.filter(ImageFilter.GaussianBlur(.7))),1.85,(267,187),(267,247))
# The face cutout carries a few brown hair pixels at its perimeter. Restore the intact
# hair texture only outside the cheek, after compositing the face, to avoid a rectangular seam.
join=Image.new('L',(540,720));jd=ImageDraw.Draw(join);jd.ellipse((334,218,371,259),fill=255)
join=join.filter(ImageFilter.GaussianBlur(2))
body_source=Image.open(R/'review/cast8/source/jiejie-seam-repair.png').convert('RGBA')
a=np.array(jiejie);b=np.array(body_source);jm=np.array(join)
brown=(a[:,:,0]>a[:,:,2]*1.2)&(a[:,:,1]>a[:,:,2])&(a[:,:,1]<125)&(b[:,:,1]<125)
jm[~brown]=0
jiejie=Image.composite(body_source,jiejie,Image.fromarray(jm))
a=np.array(jiejie);a[233:237,346:350,:3]=np.array(body_source)[233:237,346:350,:3];jiejie=Image.fromarray(a)
# Preserve the original split hair strand beside the enlarged left cheek; remove only
# the pale blend residue, outside the opaque face core.
left_join=Image.new('L',(540,720));ImageDraw.Draw(left_join).ellipse((195,211,213,233),fill=255)
lm=np.array(left_join.filter(ImageFilter.GaussianBlur(1)))
a=np.array(jiejie);b=np.array(body_source)
keep=(b[:,:,3]>128)&(b[:,:,1]<130)&(b[:,:,0]>b[:,:,2]*1.2)&(a[:,:,0]<235)
lm[~keep]=0
jiejie=Image.composite(body_source,jiejie,Image.fromarray(lm))
def finish(im):
 a=np.array(im);solid=(a[:,:,3]>=128).astype('uint8')
 band=cv2.dilate(solid,np.ones((3,3),np.uint8))!=cv2.erode(solid,np.ones((3,3),np.uint8))
 sm=cv2.GaussianBlur(a[:,:,3],(3,3),.55);a[:,:,3][band]=sm[band]
 core=a[:,:,3]>=128
 _,idx=cv2.distanceTransformWithLabels((~core).astype('uint8'),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
 fringe=(a[:,:,3]>0)&~core;a[:,:,:3][fringe]=a[:,:,:3][core][idx[fringe]-1]
 # Reject attached, low-alpha ghost silhouettes farther than the antialias transition.
 distance=cv2.distanceTransform((~core).astype('uint8'),cv2.DIST_L2,5);a[:,:,3][distance>1.5]=0
 n,l,ss,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8'),8);a[l!=1+np.argmax(ss[1:,4])]=0
 sole=np.where(a[:,:,3]>=128)[0].max();dy=685-int(sole)
 if dy:
  b=np.zeros_like(a)
  if dy>0:b[dy:]=a[:-dy]
  else:b[:dy]=a[-dy:]
  a=b
 a[a[:,:,3]==0]=0
 return Image.fromarray(a)
assert str(T).startswith('/Volumes/外接資料碟/')
spirit=finish(spirit)
# Restore a continuous 1.75px dark contour along the original raised cuff.
line=Image.new('RGBA',(2160,2880));d=ImageDraw.Draw(line)
pts=[(166,351),(165,355),(164,359),(162,363),(161,367),(161,371),(160,375),(160,379),(160,383),(162,387),(163,390),(163,393),(168,397)]
d.line([(x*4,y*4) for x,y in pts],fill=(29,49,60,245),width=7,joint='curve')
spirit.alpha_composite(line.resize((540,720),Image.Resampling.LANCZOS))
# Remove any detached sub-128-alpha islands left by supersampled line drawing.
a=np.array(spirit);n,l,ss,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8'),8);a[l!=1+np.argmax(ss[1:,4])]=0;spirit=Image.fromarray(a)
for key,im in [('jiejie',finish(jiejie)),('spirit',spirit)]:
 im.save(R/f'assets/chars/{key}.png')
 im.save(R/f'assets/chars/{key}.webp',lossless=True,exact=True,method=6)
