import numpy as np, sys, cv2, json
from PIL import Image
sys.path.insert(0,sys.argv[1]); T=sys.argv[1]
from seg import load,hsv,comp_from_seed,fill,skinmask
K3=np.ones((3,3),np.uint8)
def dil(m,k=1): return cv2.dilate(m.astype(np.uint8),K3,iterations=k)>0
def ero(m,k=1): return cv2.erode(m.astype(np.uint8),K3,iterations=k)>0
CLOSE=int(sys.argv[5]); EARD=int(sys.argv[6])
def rowspan(m,y):
    xs=np.where(m[y])[0]; return (xs.min(),xs.max()) if len(xs) else None
def measure(n,p,top,chin,waist,seed,kind,open_k=0,FOOT=685,hairseed=(268,160),crowny=150,handy=283,bodyy=298,CL=(204,333)):
    x=load(p); A=x[...,3]>=128; h,s,v=hsv(x); sk=skinmask(x)
    H,W=A.shape; yy,xx=np.mgrid[0:H,0:W]
    ci=int(np.floor(chin))            # last row counted as head
    sk2=ero(sk,open_k) if open_k else sk
    f=comp_from_seed(sk2,seed)
    if open_k: f=dil(f,open_k)&sk
    f&=yy<=ci
    if kind=='spirit': f&=(xx<=CL[1])&(xx>=CL[0])
    EL=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(CLOSE,CLOSE))
    fc=cv2.morphologyEx(np.pad(f,30).astype(np.uint8),cv2.MORPH_CLOSE,EL)[30:-30,30:-30]>0
    face=fill(fc)&A&(yy<=ci)
    if kind=='spirit': face&=(xx<=CL[1])&(xx>=CL[0])
    zone=A&(yy>=top)&(yy<=ci)
    hat=np.zeros_like(A)
    if kind=='jiejie':
        pink=A&((h>=300)|(h<=4))&(s>0.25)&(v>0.35)
        bowz=(yy<125)&(xx>250)&~dil(face,2)
        hat=fill(dil(pink&bowz,1))&A&bowz&~((h>5)&(h<45)&(v<0.62))   # bow (r2: big, right side)
        hand=comp_from_seed(sk,(170,170)); handz=dil(hand,4)
        cloth=A&pink&(yy>=200)
        zone&=~hat&~handz&~dil(cloth,1)&~face | face
        zone&=~((xx<170))            # anything left of hair = arm/sleeve
    if kind=='spirit':
        blue=A&(h>=195)&(h<=245)&(s>0.35)
        hair_blue=comp_from_seed(blue&(yy<300),hairseed)
        crownzone=(yy<crowny)
        hat=A&crownzone&~dil(hair_blue,1)
        hat=hat|(A&(yy<top))
        zone&=~hat
        zone&=~((xx<200)&(yy>=handy))      # raised hand
        body=A&(yy>=bodyy)&~sk&~face&((blue)|(v>0.85)|((h>30)&(h<60)))   # collar/shoulder under chin
        zone&=~(body&~dil(face,2))|face
    head=zone|face
    # ears = skin comps in head not in face
    rest=(sk&head&~dil(face,1)).astype(np.uint8)
    nl,lab,st,_=cv2.connectedComponentsWithStats(rest,connectivity=4)
    ears=np.zeros_like(A); fy,fx=np.where(face)
    for i in range(1,nl):
        cxi=_[i][0]
        if st[i,4]>=60 and (cxi<fx.min()+8 or cxi>fx.max()-8) and not (kind=='jiejie' and _[i][1]<140): ears|=lab==i
    ears=fill(dil(ears,EARD))&head&~face
    hair=head&~face&~ears
    fy,fx=np.where(face)
    fw=max((np.where(face[y])[0].max()-np.where(face[y])[0].min()+1,y) for y in range(fy.min(),fy.max()+1))
    hw=max((rowspan(head,y)[1]-rowspan(head,y)[0]+1,y) for y in range(top,ci+1) if rowspan(head,y))
    noear=head&~dil(ears,2)
    hw2=max((rowspan(noear,y)[1]-rowspan(noear,y)[0]+1,y) for y in range(top,ci+1) if rowspan(noear,y))
    cx=int(round((fx.min()+fx.max())/2))
    ysh=int(round(chin+34)); row=A[ysh]
    l=cx; 
    while l>0 and row[l-1]: l-=1
    r=cx
    while r<W-1 and row[r+1]: r+=1
    # leg split: first row below waist where, between outermost body pixels around centre, a transparent gap separates two legs down to the feet
    split=None
    for y in range(int(waist),FOOT-20):
        ok=True
        for y2 in range(y,FOOT-25):
            xs=np.where(A[y2,120:420])[0]
            runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1)
            big=[r_ for r_ in runs if len(r_)>=12]
            if len(big)<2: ok=False;break
        if ok: split=y;break
    hair_all=None
    if kind=='jiejie':
        brown=A&(h>=5)&(h<=40)&(s>0.25)&(v<0.66)&(v>0.10)
        b2=dil(ero(brown,1),2)&A&~sk&~pink
        nl2,lab2,st2,_c=cv2.connectedComponentsWithStats((b2&(yy>ci)&(yy<600)).astype(np.uint8))
        hair_all=np.zeros_like(A)
        for i in range(1,nl2):
            if st2[i,4]>=150: hair_all|=lab2==i
    R=dict(top=top,chin=chin,waist=waist,total=FOOT-top,headH=chin-top,ratio=(chin-top)/(FOOT-top),faceW=int(fw[0]),faceW_y=int(fw[1]),
           headW=int(hw[0]),headW_y=int(hw[1]),headW_noear=int(hw2[0]),headArea=int(head.sum()),faceArea=int(face.sum()),earArea=int(ears.sum()),hair=int(hair.sum()),
           hairLong=int(hair.sum()+(hair_all.sum() if hair_all is not None else 0)),
           shFull=int(r-l+1),shRight=int(r-cx),sh_y=ysh,cx=cx,body=waist-chin,waist2foot=FOOT-waist,split=split,leg=(FOOT-split) if split else None)
    if kind in('jiejie','spirit'):
        ay=np.where(A.any(1))[0]; R['total_hat']=FOOT-int(ay.min())
    o=np.zeros((H,W,3),np.uint8)+255; o[A]=(205,205,205); o[hair]=(200,60,200); o[face]=(255,170,60); o[ears]=(60,190,60); o[hat]=(120,120,255)
    if hair_all is not None: o[hair_all]=(120,60,120)
    for y,c in [(top,(255,0,0)),(ci,(255,0,0)),(int(waist),(0,0,255)),(ysh,(0,150,0))]+([(split,(0,0,0))] if split else []): o[y,::2]=c
    Image.fromarray(o).resize((W*2,H*2),Image.NEAREST).save(f'{T}/dbg-{n}.png')
    np.savez_compressed(f'{T}/mask-{n}.npz',head=head,face=face,ears=ears,hair=hair,hat=hat)
    return R
if __name__=='__main__':
    R={}
    R['bulu']=measure('bulu','assets/chars/bulu.png',30,246.5,394,(268,150),'bulu')
    R['spirit9']=measure('spirit9',T+'/spirit-c9.png',125,314.5,421.5,(268,240),'spirit',open_k=3)
    R['spirit']=measure('spirit','assets/chars/spirit.png',int(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]),(268,250),'spirit',open_k=3,FOOT=765,hairseed=(268,170),crowny=150,handy=283,bodyy=305,CL=(int(sys.argv[7]),int(sys.argv[8])))
    json.dump(R,open(T+'/R.json','w'),indent=1,default=float)
    for k in list(R['spirit'].keys()):
        b=R['bulu'].get(k)
        def d(v):
            return '' if b in(None,0) or v is None or k in('top','chin','waist','cx','sh_y','faceW_y','headW_y','split') else ' (%+.1f%%)'%((v-b)/b*100)
        print('%-12s'%k, b, '|', R['spirit9'].get(k), d(R['spirit9'].get(k)), '|', R['spirit'].get(k), d(R['spirit'].get(k)))
