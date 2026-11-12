import sys,numpy as np,cv2,json,subprocess
T=sys.argv[1]; sys.path.insert(0,T)
from seg import load,hsv,skinmask,fill
from PIL import Image
K3=np.ones((3,3),np.uint8)
# 1 hate pixel compare
a=load('assets/chars/hate.png'); b=load(T+'/hate-ref.png'); print('hate diff px',int((a!=b).any(2).sum()),a.shape)
for n in ['jiejie','hate','spirit','bulu','feifei']:
    p=load(f'assets/chars/{n}.png'); w=np.array(Image.open(f'assets/chars/{n}.webp').convert('RGBA')); print(n,'png vs webp diff px',int((p!=w).any(2).sum()),p.shape)
print('spirit vs cast8 diff',int((load('assets/chars/spirit.png')!=load(T+'/spirit-c8.png')).any(2).sum()))
# 2 edges
for n in ['jiejie','spirit','hate']:
    x=load(f'assets/chars/{n}.png'); al=x[...,3]; A=al>=128; h,s,v=hsv(x)
    ys=np.where(A.any(1))[0]; print(n,'size',x.shape[:2],'foot y',ys.max(),'top y',ys.min(),'corners',[int(al[i,j]) for i in(0,-1) for j in(0,-1)])
    nl,lab,st,_=cv2.connectedComponentsWithStats((al>0).astype(np.uint8),connectivity=8); print('  comps alpha>0:',nl-1,[ (int(st[i,4]),int(al[lab==i].max())) for i in range(1,nl) if st[i,4]<5000][:8])
    nl2,_,st2,_=cv2.connectedComponentsWithStats(A.astype(np.uint8),connectivity=8); print('  comps alpha>=128:',nl2-1)
    op=al>=250; zero=al==0; hard=op&(cv2.dilate(zero.astype(np.uint8),K3)>0); print('  hard-cut px',int(hard.sum()))
    edge=A&~(cv2.erode(A.astype(np.uint8),K3)>0); semi=((al>0)&(al<255)); band=cv2.dilate(edge.astype(np.uint8),K3)>0
    print('  contour px',int(edge.sum()),'with semi-transparent neighbour %.1f%%'%(100*np.mean([semi[max(0,y-1):y+2,max(0,x_-1):x_+2].any() for y,x_ in zip(*np.where(edge))])))
    ring=A&~(cv2.erode(A.astype(np.uint8),K3,iterations=2)>0)
    cyan=ring&(h>=160)&(h<=200)&(s>0.35)&(v>0.5); print('  cyan fringe px on rim',int(cyan.sum()))
    white=ring&(s<0.12)&(v>0.9); print('  near-white px on rim',int(white.sum()),'of',int(ring.sum()))
    # outline darkness: contour px whose 5x5 neighbourhood min V >0.45
    vv=np.where(A,v,1.0); mn=cv2.erode(vv.astype(np.float32),np.ones((5,5),np.uint8)); light=edge&(mn>0.45)
    nl3,lab3,st3,_=cv2.connectedComponentsWithStats(light.astype(np.uint8),connectivity=8); big=sorted([(int(st3[i,4]),int(st3[i,0]),int(st3[i,1])) for i in range(1,nl3)],reverse=True)[:6]
    print('  contour px lacking dark outline',int(light.sum()),'largest runs (n,x,y)',big)
    holes=fill(A)&~A; nl4,lab4,st4,_=cv2.connectedComponentsWithStats(holes.astype(np.uint8)); print('  enclosed transparent holes',[(int(st4[i,4]),int(st4[i,0]),int(st4[i,1])) for i in range(1,nl4)])
    # jaggies: stair-step measure = contour perimeter ratio vs smoothed
    cs,_=cv2.findContours(A.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cs,key=len)
    print('  perimeter %.0f, after 1.5px smoothing %.0f'%(cv2.arcLength(c,True),cv2.arcLength(cv2.approxPolyDP(c,1.5,True),True)))
# 3 legs
def legs(p,y0,y1):
    A=load(p)[...,3]>=128; r={}
    for y in range(y0,y1+1):
        xs=np.where(A[y,100:440])[0]; runs=[q for q in np.split(xs,np.where(np.diff(xs)>1)[0]+1) if len(q)>=12]
        if len(runs)==2: r[y]=(len(runs[0]),len(runs[1]),int(runs[1][0]-runs[0][-1]-1))
    return r
J=legs('assets/chars/jiejie.png',480,684); F=legs('assets/chars/feifei.png',480,684); J8=legs(T+'/jiejie-c8.png',480,684); B=legs('assets/chars/bulu.png',400,684); JO=legs(T+'/jiejie-orig.png',400,684)
for nm,d in [('jiejie9',J),('feifei',F),('jiejie8',J8),('jiejie_orig',JO),('bulu',B)]:
    ks=sorted(d); print(nm,'two-leg rows',ks[0],'-',ks[-1])
def stat(d,y0,y1):
    w=np.array([(d[y][0]+d[y][1])/2 for y in range(y0,y1+1) if y in d]); return w
print('same-y rows (both show two bare legs above shoes):')
for y in range(572,636,6): print(' y',y,'jiejie',J[y][:2],'feifei',F[y][:2],'ratio L %.2f R %.2f'%(J[y][0]/F[y][0],J[y][1]/F[y][1]),'| cast8',J8.get(y,('-','-'))[:2])
wj=stat(J,572,632); wf=stat(F,572,632); w8=stat(J8,572,632)
print('mean single-leg width y572-632: jiejie9 %.1f feifei %.1f ratio %.3f ; cast8 %.1f ratio %.3f'%(wj.mean(),wf.mean(),wj.mean()/wf.mean(),w8.mean(),w8.mean()/wf.mean()))
# leg-only section (hem to shoe top): sister 530-632, feifei 572-632
wjall=stat(J,530,632); print('jiejie9 leg section y530-632: mean %.1f max %.1f min %.1f (min at y%d)'%(wjall.mean(),wjall.max(),wjall.min(),530+int(wjall.argmin())))
print('feifei leg section y572-632: mean %.1f max %.1f min %.1f'%(wf.mean(),wf.max(),wf.min()))
print('ratios: mean %.3f  max %.3f  min(ankle) %.3f'%(wjall.mean()/wf.mean(),wjall.max()/wf.max(),wjall.min()/wf.min()))
wb=stat(B,480,600); print('bulu leg y480-600 mean %.1f min %.1f'%(wb.mean(),wb.min()))
k8=sorted(J8); w8all=stat(J8,k8[0],632); print('cast8 leg rows',k8[0],'mean %.1f min %.1f'%(w8all.mean(),w8all.min()))
json.dump(dict(J={k:v for k,v in J.items()},F=F),open(T+'/legs.json','w'))
