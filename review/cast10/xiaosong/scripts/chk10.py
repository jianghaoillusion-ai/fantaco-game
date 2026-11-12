import sys,numpy as np,cv2,json
T=sys.argv[1]; sys.path.insert(0,T)
from seg import load,hsv,skinmask,fill
from PIL import Image
K3=np.ones((3,3),np.uint8)
print('--- A crown')
for n,p,ht in [('orig',T+'/spirit-orig.png',None),('c9',T+'/spirit-c9.png',None),('new','assets/chars/spirit.png',None)]:
    x=load(p);A=x[...,3]>=128;h,s,v=hsv(x);H,W=A.shape;yy,xx=np.mgrid[0:H,0:W]
    blue=A&(h>=195)&(h<=245)&(s>0.35)
    nl,lab,st,cen=cv2.connectedComponentsWithStats((blue&(yy<H*0.42)).astype(np.uint8),connectivity=4)
    i=1+np.argmax(st[1:,4]); hb=lab==i; top=int(np.where(hb.any(1))[0].min()); xs=np.where(hb.any(0))[0]
    ay=np.where(A.any(1))[0].min()
    hat=A&(yy<top+18)&~(cv2.dilate(hb.astype(np.uint8),K3)>0)
    nl2,lab2,st2,_=cv2.connectedComponentsWithStats(hat.astype(np.uint8)); j=1+np.argmax(st2[1:,4]); hm=lab2==j
    hx=np.where(hm.any(0))[0]; hy=np.where(hm.any(1))[0]
    ys=np.where(A.any(1))[0]
    print(n,'hair ring top',top,'ring x',xs.min(),xs.max(),'w',xs.max()-xs.min()+1,'| crown top',ay,'height above ring top',top-ay,'| crown mask bbox w',hx.max()-hx.min()+1,'h',hy.max()-hy.min()+1,'area',int(hm.sum()),'| figure h',ys.max()-ay+1)
print('--- B png/webp/expr')
for n in ['spirit','jiejie','hate','bulu','feifei','apiao','sika']:
    p=load(f'assets/chars/{n}.png'); w=np.array(Image.open(f'assets/chars/{n}.webp').convert('RGBA'))
    e=load(f'assets/chars/expr/{n}-happy.png'); eo=load(f'assets/chars/expr/{n}-happy-open.png')
    f=lambda z:int(np.where((z[...,3]>=128).any(1))[0].max())
    print(n,p.shape[:2],'webp diff',int((p!=w).any(2).sum()) if p.shape==w.shape else 'SIZE '+str(w.shape),'| expr',e.shape[:2],eo.shape[:2],'main vs open diff',int((p!=eo).any(2).sum()) if p.shape==eo.shape else 'size','closed vs open diff',int((e!=eo).any(2).sum()),'| feet main/closed/open',f(p),f(e),f(eo))
print('--- C edges')
for n in ['spirit','jiejie','bulu','feifei']:
    x=load(f'assets/chars/{n}.png'); al=x[...,3]; A=al>=128; h,s,v=hsv(x)
    ys=np.where(A.any(1))[0]; print(n,'size',x.shape[:2],'foot y',ys.max(),'top y',ys.min(),'corners',[int(al[i,j]) for i in(0,-1) for j in(0,-1)],'border alpha max',int(max(al[0].max(),al[-1].max(),al[:,0].max(),al[:,-1].max())))
    nl,lab,st,_=cv2.connectedComponentsWithStats((al>0).astype(np.uint8),connectivity=8); print('  comps alpha>0:',nl-1,[(int(st[i,4]),int(al[lab==i].max())) for i in range(1,nl) if st[i,4]<5000][:8])
    nl2,_,st2,_=cv2.connectedComponentsWithStats(A.astype(np.uint8),connectivity=8); print('  comps alpha>=128:',nl2-1)
    op=al>=250; zero=al==0; hard=op&(cv2.dilate(zero.astype(np.uint8),K3)>0); print('  hard-cut px',int(hard.sum()))
    edge=A&~(cv2.erode(A.astype(np.uint8),K3)>0); semi=((al>0)&(al<255))
    print('  contour px',int(edge.sum()),'with semi-transparent neighbour %.1f%%'%(100*np.mean([semi[max(0,y-1):y+2,max(0,x_-1):x_+2].any() for y,x_ in zip(*np.where(edge))])))
    ring=A&~(cv2.erode(A.astype(np.uint8),K3,iterations=2)>0)
    cyan=ring&(h>=160)&(h<=200)&(s>0.35)&(v>0.5); print('  cyan px on rim',int(cyan.sum()), 'bbox', (np.where(cyan)[1].min(),np.where(cyan)[0].min(),np.where(cyan)[1].max(),np.where(cyan)[0].max()) if cyan.any() else None)
    white=ring&(s<0.12)&(v>0.9); print('  near-white px on rim',int(white.sum()),'of',int(ring.sum()))
    vv=np.where(A,v,1.0); mn=cv2.erode(vv.astype(np.float32),np.ones((5,5),np.uint8)); light=edge&(mn>0.45)
    nl3,lab3,st3,_=cv2.connectedComponentsWithStats(light.astype(np.uint8),connectivity=8); big=sorted([(int(st3[i,4]),int(st3[i,0]),int(st3[i,1])) for i in range(1,nl3)],reverse=True)[:6]
    print('  contour px lacking dark outline',int(light.sum()),'largest runs (n,x,y)',big)
    holes=fill(A)&~A; nl4,lab4,st4,_=cv2.connectedComponentsWithStats(holes.astype(np.uint8)); print('  enclosed transparent holes',[(int(st4[i,4]),int(st4[i,0]),int(st4[i,1])) for i in range(1,nl4)])
    cs,_=cv2.findContours(A.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cs,key=len)
    print('  perimeter %.0f, after 1.5px smoothing %.0f ratio %.3f'%(cv2.arcLength(c,True),cv2.arcLength(cv2.approxPolyDP(c,1.5,True),True),cv2.arcLength(cv2.approxPolyDP(c,1.5,True),True)/cv2.arcLength(c,True)))
    # semi-transparent halo far from body
    far=(al>0)&~(cv2.dilate(A.astype(np.uint8),K3,iterations=3)>0); print('  faint px >3px outside body',int(far.sum()),'max alpha',int(al[far].max()) if far.any() else 0)
print('--- D sister diff')
a=load('assets/chars/jiejie.png'); b=load(T+'/jiejie-c9.png'); d=(a!=b).any(2); ys,xs=np.where(d)
print('diff px',int(d.sum()),'y',ys.min(),ys.max(),'x',xs.min(),xs.max(),'alpha-changed px',int((a[...,3]!=b[...,3]).sum()),'rgb-only',int(((a[...,:3]!=b[...,:3]).any(2)&(a[...,3]==b[...,3])).sum()))
Aa=a[...,3]>=128; Ab=b[...,3]>=128
for y in range(ys.min()-2,ys.max()+3):
    r=np.where(d[y])[0]
    def span(M):
        q=np.where(M[y,200:330])[0]; return (int(q.min()+200),int(q.max()+200),int(q.max()-q.min()+1)) if len(q) else None
    # torso width = central run containing x=265
    def run(M):
        l=265
        while M[y,l-1]: l-=1
        rr=265
        while M[y,rr+1]: rr+=1
        return l,rr,rr-l+1
    print(y,'changed',len(r),(int(r.min()),int(r.max())) if len(r) else '', 'run@265 before',run(Ab),'after',run(Aa))
for nm in ['jiejie-happy','jiejie-happy-open']:
    import subprocess
    old=np.array(Image.open(__import__('io').BytesIO(subprocess.run(['git','show',f'39b59fe:assets/chars/expr/{nm}.png'],capture_output=True).stdout)).convert('RGBA'))
    new=load(f'assets/chars/expr/{nm}.png'); dd=(old!=new).any(2); y2,x2=np.where(dd); print(nm,'diff',int(dd.sum()),'y',y2.min(),y2.max(),'x',x2.min(),x2.max(),'same mask as main:',bool((dd==d).all()))
print('--- E source uniform scale')
src=load('review/cast10/source/spirit-built-in.png'); fin=load('assets/chars/spirit.png')
def bb(z):
    m=z[...,3]>=128; y,x=np.where(m); return x.min(),x.max(),y.min(),y.max()
sb=bb(src); fb=bb(fin); print('src',src.shape,sb,'fin',fb,'sx',(fb[1]-fb[0]+1)/(sb[1]-sb[0]+1),'sy',(fb[3]-fb[2]+1)/(sb[3]-sb[2]+1))
best=None
for sc in np.arange(0.515,0.531,0.0005):
    r=cv2.resize(src,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    # premult grey
    g=(cv2.cvtColor(r[...,:3],cv2.COLOR_RGB2GRAY).astype(np.float32)*(r[...,3]/255.)).astype(np.float32)
    G=(cv2.cvtColor(fin[...,:3],cv2.COLOR_RGB2GRAY).astype(np.float32)*(fin[...,3]/255.)).astype(np.float32)
    Gp=np.pad(G,((40,40),(300,300)))
    if g.shape[0]>Gp.shape[0] or g.shape[1]>Gp.shape[1]: continue
    res=cv2.matchTemplate(Gp,g,cv2.TM_CCORR_NORMED); _,mx,_,loc=cv2.minMaxLoc(res)
    if best is None or mx>best[0]: best=(mx,sc,loc,r)
mx,sc,loc,r=best; print('best uniform scale %.4f corr %.5f offset'%(sc,mx),loc[0]-300,loc[1]-40)
canvas=np.zeros((880,1140,4),np.float32); canvas[loc[1]:loc[1]+r.shape[0],loc[0]:loc[0]+r.shape[1]]=r; c2=canvas[40:840,300:840]
both=(c2[...,3]>250)&(fin[...,3]>250); dif=np.abs(c2[...,:3]-fin[...,:3].astype(np.float32)).mean(2)
print('mean abs colour diff inside body %.2f /255 ; p95 %.1f ; head region (y<325) %.2f ; body region %.2f'%(dif[both].mean(),np.percentile(dif[both],95),dif[both&(np.arange(800)[:,None]<325)].mean(),dif[both&(np.arange(800)[:,None]>=325)].mean()))
print('alpha mismatch px',int(((c2[...,3]>=128)!=(fin[...,3]>=128)).sum()))
