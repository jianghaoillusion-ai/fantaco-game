import numpy as np, sys, cv2, json
from PIL import Image
T=sys.argv[1]
def load(p): return np.array(Image.open(p).convert('RGBA'))
def hsv(x):
    h=cv2.cvtColor(x[...,:3],cv2.COLOR_RGB2HSV_FULL).astype(float)
    return h[...,0]*360/255, h[...,1]/255, h[...,2]/255
def comp_from_seed(mask,seed):
    n,lab=cv2.connectedComponents(mask.astype(np.uint8),connectivity=4)
    l=lab[seed[1],seed[0]]; assert l>0,('seed not in mask',seed)
    return lab==l
def fill(mask):
    m=mask.astype(np.uint8); ff=np.pad(1-m,1,constant_values=1).astype(np.uint8)
    cv2.floodFill(ff,None,(0,0),0); return (ff[1:-1,1:-1]==1)|mask
# per character config: top (hair top), chin, waist, seed for face, hat mask fn, exclusion boxes (x0,y0,x1,y1) for hand/arm/shoulder above chin
CFG={
 'bulu':  dict(p='assets/chars/bulu.png',  chin=246.5, waist=394,  seed=(268,150), excl=[]),
 'hate':  dict(p='assets/chars/hate.png',  chin=None,  waist=None, seed=(250,120), excl=[]),
 'jiejie':dict(p='assets/chars/jiejie.png',chin=None,  waist=391.5,seed=(265,150), excl=[]),
 'spirit':dict(p='assets/chars/spirit.png',chin=None,  waist=421.5,seed=(268,240), excl=[]),
}
def skinmask(x):
    h,s,v=hsv(x); return (x[...,3]>=128)&(h>=5)&(h<=42)&(s>0.10)&(s<0.66)&(v>0.62)
if __name__=='__main__':
    for n,c in CFG.items():
        x=load(c['p']); A=x[...,3]>=128; sk=skinmask(x)
        f=comp_from_seed(sk,c['seed']); ys,xs=np.where(f)
        print(n,'face comp bbox x',xs.min(),xs.max(),'y',ys.min(),ys.max(),'area',f.sum())
        # widest row
        w=[(np.where(f[y])[0].max()-np.where(f[y])[0].min()+1,y) for y in range(ys.min(),ys.max()+1)]
        print('  widest',max(w))
        o=np.zeros(x.shape[:2]+(3,),np.uint8)+255; o[A]=(200,200,200); o[sk]=(255,200,120); o[f]=(255,120,0)
        Image.fromarray(o).resize((1080,1440),Image.NEAREST).crop((200,0,900,1000)).save(f'{T}/seg-{n}.png')
