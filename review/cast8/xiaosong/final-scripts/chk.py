import sys,numpy as np,cv2; sys.path.insert(0,sys.argv[1]); T=sys.argv[1]
from seg import *
K3=np.ones((3,3),np.uint8)
new={n:load(f'assets/chars/{n}.png') for n in ['bulu','jiejie','hate','spirit']}
org={'jiejie':load(T+'/jiejie-orig.png'),'spirit':load(T+'/spirit-orig.png')}
c7={'jiejie':load(T+'/jiejie-c7.png'),'spirit':load(T+'/spirit-c7.png')}
print('=== crown: new vs origin shifted')
o=org['spirit']; n=new['spirit']
for name,src in [('origin',o),('c7',c7['spirit'])]:
  best=None
  for dy in range(20,45):
    for dx in range(-3,4):
        a=n[5:118]; b=np.roll(src,(-dy,dx),axis=(0,1))[5:118]
        m=(a[...,3]>=250)&(b[...,3]>=250)
        same=((a[...,:3]==b[...,:3]).all(2)&m).sum()
        if best is None or same>best[0]: best=(same,dy,dx,m.sum(),(a[...,3]>=128).sum(),(b[...,3]>=128).sum())
  print(name,'best identical opaque px',best)
def crownbox(x,ymax):
    h,s,v=hsv(x); A=x[...,3]>=128; blue=A&(h>=195)&(h<=245)&(s>0.35)&(v<0.9)
    gold=A&(h>=25)&(h<=55)&(s>0.4)
    # crown = everything above topmost row where blue hair is wide
    rows=np.where(blue[:ymax].sum(1)>40)[0]; yh=rows[0]
    c=A.copy(); c[yh:]=False; ys,xs=np.where(c); return dict(top=int(ys.min()),hairrow=int(yh),w=int(xs.max()-xs.min()+1),x0=int(xs.min()),x1=int(xs.max()),area=int(c.sum()))
print('crown origin',crownbox(o,200)); print('crown new',crownbox(n,200))
print('=== face scale (template match, separate sx/sy)')
def facebox(x,seed):
    f=comp_from_seed(skinmask(x),seed); ys,xs=np.where(f); return xs.min(),ys.min(),xs.max(),ys.max()
def gray(x):
    rgb=x[...,:3].astype(np.float32); a=x[...,3:4].astype(np.float32)/255; return cv2.cvtColor((rgb*a+255*(1-a)).astype(np.uint8),cv2.COLOR_RGB2GRAY)
def match(src,box,dst,srange,label):
    x0,y0,x1,y1=box; patch=gray(src)[y0:y1,x0:x1]; g=gray(dst); best=(-1,)
    for sx in srange:
        for sy in srange:
            p=cv2.resize(patch,None,fx=sx,fy=sy,interpolation=cv2.INTER_AREA if sx<1 else cv2.INTER_CUBIC)
            if p.shape[0]>=g.shape[0] or p.shape[1]>=g.shape[1]: continue
            r=cv2.matchTemplate(g,p,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(r)
            if mx>best[0]: best=(mx,sx,sy,loc)
    # also best with sx==sy
    b2=(-1,)
    for s in srange:
        p=cv2.resize(patch,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC)
        r=cv2.matchTemplate(g,p,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(r)
        if mx>b2[0]: b2=(mx,s,loc)
    print(label,'best corr %.4f sx %.3f sy %.3f at %s | uniform best corr %.4f s %.3f'%(best[0],best[1],best[2],best[3],b2[0],b2[1]))
import json
sj=tuple(int(v) for v in sys.argv[2].split(',')); ss=tuple(int(v) for v in sys.argv[3].split(','))
fb=facebox(c7['jiejie'],sj); print('jiejie c7 facebox',fb)
x0,y0,x1,y1=fb; inner=(x0+8,y0+25,x1-8,y1-8)
match(c7['jiejie'],inner,new['jiejie'],np.arange(1.70,2.001,0.025),'jiejie face')
fb=facebox(c7['spirit'],ss); print('spirit c7 facebox',fb)
x0,y0,x1,y1=fb; inner=(x0+22,y0+12,x1-22,y1-6)
match(c7['spirit'],inner,new['spirit'],np.arange(1.45,1.751,0.025),'spirit face')
print('=== body scale')
match(c7['spirit'],(215,330,330,560),new['spirit'],np.arange(0.85,1.001,0.0125),'spirit torso+legs')
match(c7['spirit'],(150,150,390,215),new['spirit'],np.arange(1.45,1.701,0.0125),'spirit hair band')
match(c7['jiejie'],(180,290,330,420),new['jiejie'],np.arange(0.66,0.90,0.02),'jiejie skirt')
match(c7['jiejie'],(180,520,320,680),new['jiejie'],np.arange(0.66,0.90,0.02),'jiejie legs/shoes')
match(c7['jiejie'],(200,200,320,300),new['jiejie'],np.arange(0.66,0.90,0.02),'jiejie bodice')
