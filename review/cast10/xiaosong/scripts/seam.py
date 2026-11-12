import sys; T=sys.argv[1]; sys.path.insert(0,T)
from zoom import comp
from PIL import Image
import numpy as np
k=14; out=[]
for box in [(203,354,231,384),(298,354,326,384)]:
    for p in [T+"/jiejie-c9.png",'assets/chars/jiejie.png']:
        out.append(comp(p,(255,255,255)).crop(box).resize(((box[2]-box[0])*k,(box[3]-box[1])*k),Image.NEAREST))
o=Image.new('RGB',(sum(i.width for i in out)+30,out[0].height),(0,200,0)); x=0
for i in out: o.paste(i,(x,0)); x+=i.width+10
o.save(T+"/seam.png")
a=np.array(Image.open('assets/chars/jiejie.png').convert('RGBA')); b=np.array(Image.open(T+"/jiejie-c9.png").convert('RGBA'))
for y in range(358,380):
    print(y,'before L',''.join('%4d'%v for v in b[y,208:222,3]),' after L',''.join('%4d'%v for v in a[y,208:222,3]))
for y in range(358,380):
    print(y,'before R',''.join('%4d'%v for v in b[y,306:320,3]),' after R',''.join('%4d'%v for v in a[y,306:320,3]))
