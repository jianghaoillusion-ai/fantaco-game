import json,sys,numpy as np
from PIL import Image
T=sys.argv[1]; S=T+'/shots'
cache={}
def abox(root,src):
    p=root+'/'+src.split('?')[0]
    if p not in cache:
        a=np.array(Image.open(p).convert('RGBA'))[...,3]; ys,xs=np.where(a>=128); cache[p]=(xs.min(),ys.min(),xs.max()+1,ys.max()+1,a.shape[1],a.shape[0])
    return cache[p]
allrows=[]
for tag,root in [('new','.'),('base',T+'/base')]:
    R=json.load(open(f'{S}/render-{tag}.json'))
    for o in R:
        w,h=o['vp']; vis=[r for r in o['rows'] if r['visible']]; line=[]
        for r in vis:
            x0,y0,x1,y1,nw,nh=abox(root,r['src']); L,Tp,W,H=r['rect']; s=H/nh; sx=W/nw
            exp=(L+x0*sx,Tp+y0*s,L+x1*sx,Tp+y1*s)
            im=np.array(Image.open(f"{S}/px-{tag}-{o['sc']}-{w}x{h}-{r['id']}.png").convert('RGB')).astype(int)
            m=(255-im).max(2)>90   # solid ink
            ys=np.where(m.sum(1)>=2)[0]; xs=np.where(m.sum(0)>=2)[0]
            got=(xs.min(),ys.min(),xs.max()+1,ys.max()+1) if len(ys) else None
            clip=[]
            for a in r['anc']:
                al,at,ar,ab=a['rect']
                if exp[0]<al-0.5 or exp[1]<at-0.5 or exp[2]>ar+0.5 or exp[3]>ab+0.5: clip.append(a['sel']+' '+a['ov'])
            off=[] 
            if exp[1]<-0.5: off.append('top')
            if exp[3]>h+0.5: off.append('bottom')
            if exp[0]<-0.5: off.append('left')
            if exp[2]>w+0.5: off.append('right')
            d=dict(tag=tag,vp=f'{w}x{h}',sc=o['sc'],id=r['id'],cls=r['cls'].replace('story-actor','').strip(),scale=round(s,4),aspect_ok=abs(s-sx)<0.002,nat=r['natural'],expFoot=round(exp[3],2),gotFoot=got[3] if got else None,expTop=round(exp[1],2),gotTop=got[1] if got else None,expL=round(exp[0],1),gotL=got[0] if got else None,expR=round(exp[2],1),gotR=got[2] if got else None,clip=clip,off=off,tr=r['transform'],src=r['src'])
            allrows.append(d)
json.dump(allrows,open(T+'/ana.json','w'),indent=0,default=int)
import collections
for tag in ['new','base']:
    print('=====',tag)
    g=collections.OrderedDict()
    for d in allrows:
        if d['tag']==tag: g.setdefault((d['vp'],d['sc']),[]).append(d)
    for k,v in g.items():
        feet=[d['gotFoot'] for d in v]; ef=[d['expFoot'] for d in v]
        print(k[0],k[1],'| '+'  '.join('%s foot px %s (geo %.1f) top px %s (geo %.1f) x %s-%s (geo %.0f-%.0f) s=%.3f%s%s%s'%(d['id'],d['gotFoot'],d['expFoot'],d['gotTop'],d['expTop'],d['gotL'],d['gotR'],d['expL'],d['expR'],d['scale'],'' if d['aspect_ok'] else ' ASPECT!',' CLIP:'+str(d['clip']) if d['clip'] else '',' OFF:'+str(d['off']) if d['off'] else '') for d in v),'| spread px',max(feet)-min(feet),'geo %.2f'%(max(ef)-min(ef)))
