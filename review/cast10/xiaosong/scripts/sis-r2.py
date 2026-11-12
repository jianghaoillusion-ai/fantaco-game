import sys; T=sys.argv[1]; sys.path.insert(0,T)
import numpy as np, cv2
from PIL import Image,ImageDraw
from zoom import comp
new='assets/chars/jiejie.png'; old=T+'/jiejie-c9.png'
box=(160,335,350,440); k=5
tiles=[]
for bg in [(255,255,255),(40,40,48)]:
    for p in [old,new]:
        tiles.append(comp(p,bg).crop(box).resize(((box[2]-box[0])*k,(box[3]-box[1])*k),Image.NEAREST))
o=Image.new('RGB',(tiles[0].width*2+10,tiles[0].height*2+10),(0,200,0))
for i,t in enumerate(tiles): o.paste(t,((i%2)*(t.width+10),(i//2)*(t.height+10)))
o.save(T+'/v-waist.png')
box=(120,200,430,520)
a=comp(old,(255,255,255)).crop(box).resize((620,640),Image.LANCZOS); b=comp(new,(255,255,255)).crop(box).resize((620,640),Image.LANCZOS)
o=Image.new('RGB',(1250,640),'white'); o.paste(a,(0,0)); o.paste(b,(630,0)); o.save(T+'/v-upper.png')
a=comp(old,(255,255,255)); b=comp(new,(255,255,255)); o=Image.new('RGB',(1090,720),'white'); o.paste(a,(0,0)); o.paste(b,(550,0)); o.save(T+'/v-full.png')
A=np.array(Image.open(new).convert('RGBA')); B=np.array(Image.open(old).convert('RGBA'))
al=A[...,3]
def edge(M,y,side):
    l=265
    while M[y,l-1]>=128: l-=1
    r=265
    while M[y,r+1]>=128: r+=1
    return l if side=='L' else r
L=[edge(al,y,'L') for y in range(360,435)]; Lb=[edge(B[...,3],y,'L') for y in range(360,435)]
R=[edge(al,y,'R') for y in range(360,389)]; Rb=[edge(B[...,3],y,'R') for y in range(360,389)]
print('L after jumps',[ (360+i+1,L[i+1]-L[i]) for i in range(len(L)-1) if abs(L[i+1]-L[i])>=2])
print('L before jumps',[ (360+i+1,Lb[i+1]-Lb[i]) for i in range(len(Lb)-1) if abs(Lb[i+1]-Lb[i])>=2])
print('R after jumps',[ (360+i+1,R[i+1]-R[i]) for i in range(len(R)-1) if abs(R[i+1]-R[i])>=2])
print('R before jumps',[ (360+i+1,Rb[i+1]-Rb[i]) for i in range(len(Rb)-1) if abs(Rb[i+1]-Rb[i])>=2])
print('max L widen',max(b-a for a,b in zip(L,Lb)),'max R widen',max(a-b for a,b in zip(R,Rb)))
d=(A!=B).any(2); K=np.ones((3,3),np.uint8)
hard=(al>=250)&(cv2.dilate((al==0).astype(np.uint8),K)>0)&(cv2.dilate(d.astype(np.uint8),K,iterations=2)>0)
print('hard cut px near changed',int(hard.sum()))
op=d&(al>=250); rgb=A[op][:,:3].astype(int)
print('changed opaque',int(op.sum()),'near-white',int(((rgb.min(1)>235)).sum()),'very dark(outline)',int((rgb.max(1)<90).sum()))
cont=(al>=128)&~(cv2.erode((al>=128).astype(np.uint8),K)>0)
v=A[...,:3].max(2); dark=(v<110)&(al>=128); near=cv2.dilate(dark.astype(np.uint8),np.ones((7,7),np.uint8))>0
yy,xx=np.mgrid[0:720,0:540]; zone=cont&(yy>=362)&(yy<=431)&(xx>=165)&(xx<=325)
print('contour px in zone',int(zone.sum()),'without dark outline within 3px',int((zone&~near).sum()), [(int(a),int(b)) for a,b in zip(*np.where(zone&~near))][:10])
contb=(B[...,3]>=128)&~(cv2.erode((B[...,3]>=128).astype(np.uint8),K)>0); vb=B[...,:3].max(2); nearb=cv2.dilate(((vb<110)&(B[...,3]>=128)).astype(np.uint8),np.ones((7,7),np.uint8))>0
print('before: same check',int((contb&(yy>=362)&(yy<=431)&(xx>=165)&(xx<=325)&~nearb).sum()))
R1=np.array(Image.open(T+'/jiejie-r1.png').convert('RGBA')); print('diff vs r1 px',int((A!=R1).any(2).sum()))
print('rows y0-363 diff',int(d[:364].sum()),'rows y430+ diff',int(d[430:].sum()))
# pink cloth width at chest rows
hs=cv2.cvtColor(A[...,:3],cv2.COLOR_RGB2HSV_FULL).astype(float); hb=cv2.cvtColor(B[...,:3],cv2.COLOR_RGB2HSV_FULL).astype(float)
def pinkw(X,h,y):
    hh=h[y,:,0]*360/255; m=(X[y,:,3]>=128)&((hh>=300)|(hh<=4))&(h[y,:,1]/255>0.2); xs=np.where(m[200:330])[0]; return int(xs.max()-xs.min()+1) if len(xs) else 0
for y in (340,349,355,360): print('pink cloth width y',y,pinkw(B,hb,y),'->',pinkw(A,hs,y))
