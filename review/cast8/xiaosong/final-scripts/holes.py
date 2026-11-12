import sys,numpy as np,cv2; T=sys.argv[1]; sys.path.insert(0,T)
from seg import load
K3=np.ones((3,3),np.uint8)
def holes(p,thr=200,far=3):
    a=load(p)[...,3]
    low=(a<128).astype(np.uint8); ff=np.pad(low,1,constant_values=1); 
    m=np.zeros((ff.shape[0]+2,ff.shape[1]+2),np.uint8); cv2.floodFill(ff,m,(0,0),2); ext=ff[1:-1,1:-1]==2
    near=cv2.dilate(ext.astype(np.uint8),K3,iterations=far)>0
    h=(a<thr)&~near
    nl,lab,st,_=cv2.connectedComponentsWithStats(h.astype(np.uint8),connectivity=8)
    L=sorted([(int(st[i,4]),int(st[i,0]),int(st[i,1]),int(st[i,2]),int(st[i,3]),int(a[lab==i].min())) for i in range(1,nl)],reverse=True)
    return h,L
if __name__=='__main__':
    for n,p in [('bulu','assets/chars/bulu.png'),('hate','assets/chars/hate.png'),('jiejie','assets/chars/jiejie.png'),('spirit','assets/chars/spirit.png'),('jiejie-c7',T+'/jiejie-c7.png'),('spirit-c7',T+'/spirit-c7.png'),('spirit-origin',T+'/spirit-orig.png'),('jiejie-origin',T+'/jiejie-orig.png')]:
        for thr in (200,128):
            h,L=holes(p,thr); print(n,'thr',thr,'interior low-alpha px',int(h.sum()),'groups',len(L),'top (area,x,y,w,h,minA):',L[:10])
