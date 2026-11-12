import sys,numpy as np,cv2,json
T=sys.argv[1]; sys.path.insert(0,T)
from seg import load,hsv
from PIL import Image
# name: path, face box (x0,y0,x1,y1) rough, faceW (proper, no ear)
C={'jiejie9':('assets/chars/jiejie.png',(205,125,340,240),124),'jiejie_r1':(T+'/jiejie-r1.png',(200,130,350,255),136),'jiejie_orig':(T+'/jiejie-orig.png',(222,95,312,190),None),'jiejie8':(T+'/jiejie-c8.png',(190,95,350,255),140),
   'feifei':('assets/chars/feifei.png',(170,110,340,250),None),'spirit':('assets/chars/spirit.png',(205,195,340,320),130),'spirit_orig':(T+'/spirit-orig.png',(228,200,312,280),None),'bulu':('assets/chars/bulu.png',(199,110,333,250),134)}
res={}; tiles=[]
for n,(p,b,fw) in C.items():
    x=load(p); h,s,v=hsv(x); x0,y0,x1,y1=b
    # iris = dark-to-mid brown / black disc: v<0.55 ; exclude skin
    m=((v<0.5)&(x[...,3]>200))[y0:y1,x0:x1].astype(np.uint8)
    W=x1-x0
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(max(3,int(W*0.09))|1,)*2)
    op=cv2.morphologyEx(m,cv2.MORPH_OPEN,k)   # keeps only blobs at least iris-thick (removes lashes, outlines, brows)
    nl,lab,st,cen=cv2.connectedComponentsWithStats(op)
    cs=sorted([(st[i,4],i) for i in range(1,nl) if st[i,0]>1 and st[i,1]>1 and st[i,0]+st[i,2]<W-1 and st[i,1]+st[i,3]<y1-y0-1],reverse=True)[:2]
    ir=sorted([(cen[i][0]+x0,cen[i][1]+y0,st[i,2],st[i,3],st[i,4]) for a,i in cs])
    crop=cv2.cvtColor(x[y0:y1,x0:x1,:3].copy(),cv2.COLOR_RGB2BGR); crop[x[y0:y1,x0:x1,3]<128]=255
    sc=300/W; big=cv2.resize(crop,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    for e in ir: cv2.rectangle(big,(int((e[0]-e[2]/2-x0)*sc),int((e[1]-e[3]/2-y0)*sc)),(int((e[0]+e[2]/2-x0)*sc),int((e[1]+e[3]/2-y0)*sc)),(0,0,255),1)
    cv2.imwrite(f'{T}/iris-{n}.png',big)
    if len(ir)==2:
        a,bb=ir; ang=np.degrees(np.arctan2(bb[1]-a[1],bb[0]-a[0])); d=np.hypot(bb[0]-a[0],bb[1]-a[1])
        r=dict(L=[round(float(t),1) for t in a],R=[round(float(t),1) for t in bb],tilt=round(float(ang),1),dist=round(float(d),1),irisW=(a[2]+bb[2])/2,irisH=(a[3]+bb[3])/2,
               aspect=round(float((a[3]+bb[3])/(a[2]+bb[2])),3),LR_area=round(float(a[4]/bb[4]),3),irisW_over_dist=round(float((a[2]+bb[2])/2/d),3))
        if fw: r['dist_over_faceW']=round(float(d/fw),3); r['irisW_over_faceW']=round(float((a[2]+bb[2])/2/fw),3)
        res[n]=r; print(n,json.dumps(r))
    else: print(n,'FAILED',ir)
json.dump(res,open(T+'/iris.json','w'),indent=1)
ims=[Image.open(f'{T}/iris-{n}.png') for n in C]; o=Image.new('RGB',(sum(i.size[0] for i in ims),max(i.size[1] for i in ims)),'white'); xx=0
for i in ims: o.paste(i,(xx,0)); xx+=i.size[0]
o.save(T+'/iris-all.png')
