import sys,numpy as np; from PIL import Image,ImageDraw
T=sys.argv[1]
def comp(p,bg):
    s=Image.open(p).convert('RGBA'); b=Image.new('RGBA',s.size,bg+(255,)); b.alpha_composite(s); return b.convert('RGB')
def alpha(p): return Image.open(p).convert('RGBA').getchannel('A').convert('RGB')
def panel(p,box,k,modes=('w','d','a')):
    ims=[]
    for m in modes:
        im={'w':lambda:comp(p,(255,255,255)),'d':lambda:comp(p,(40,40,48)),'a':lambda:alpha(p),'g':lambda:comp(p,(0,200,0))}[m]()
        ims.append(im.crop(box).resize(((box[2]-box[0])*k,(box[3]-box[1])*k),Image.NEAREST))
    o=Image.new('RGB',(sum(i.size[0] for i in ims)+6*(len(ims)-1),ims[0].size[1]),(255,0,255)); x=0
    for i in ims: o.paste(i,(x,0)); x+=i.size[0]+6
    return o
if __name__=='__main__':
    J='assets/chars/jiejie.png'; S='assets/chars/spirit.png'
    for name,p,box,k in [('i-jj-bang',J,(180,100,250,175),6),('i-jj-rhair',J,(345,170,415,250),6),('i-jj-neck',J,(215,220,345,280),5),('i-jj-lcheek',J,(160,180,230,270),6),
                         ('i-sp-cuff',S,(130,335,200,405),6),('i-sp-crown',S,(205,105,335,150),5),('i-sp-neck',S,(215,295,325,345),5),('i-sp-lear',S,(135,215,225,305),5),
                         ('i-sp-cuff7',T+'/spirit-c7.png',(120,310,190,380),6),('i-sp-cuff0',T+'/spirit-orig.png',(120,305,190,375),6)]:
        panel(p,box,k).save(f'{T}/{name}.png')
