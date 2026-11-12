"""整張等比縮放；不做局部幾何變形。輸入是內建生圖的透明 PNG。"""
from pathlib import Path
import sys,json
import numpy as np,cv2
from PIL import Image,ImageFilter
src,dst=sys.argv[1:3]
im=Image.open(src).convert('RGBA');a=np.array(im)
if a[:,:,3].min()==255: raise ValueError('來源沒有透明背景，不能直接交付')
n,lab,st,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8'))
keep=1+np.argmax(st[1:,4]);removed=(lab!=keep)&(a[:,:,3]>0);removed_count=int(removed.sum());removed_alpha_max=int(a[:,:,3][removed].max()) if removed.any() else 0;a[lab!=keep]=0
ys,xs=np.where(a[:,:,3]>=128);box=(int(xs.min())-2,int(ys.min())-2,int(xs.max())+3,int(ys.max())+3)
im=Image.fromarray(a).crop(box);scale=min(666/im.height,500/im.width)
im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
# Alpha-only gentle antialiasing; RGB and all anatomical geometry unchanged.
im.putalpha(im.getchannel('A').filter(ImageFilter.GaussianBlur(.30)))
a=np.array(im);ys,xs=np.where(a[:,:,3]>=128)
out=Image.new('RGBA',(540,720));out.alpha_composite(im,((540-im.width)//2,685-int(ys.max())))
a=np.array(out);n,lab,st,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8'));keep=1+np.argmax(st[1:,4]);a[lab!=keep]=0
Image.fromarray(a).save(dst)
meta={'removed_source_pixels':removed_count,'removed_source_alpha_max':removed_alpha_max};Path(dst).with_suffix('.normalization.json').write_text(json.dumps(meta,indent=2))
print(json.dumps({'source_size':Image.open(src).size,'crop':box,'uniform_scale':scale,'output':dst,'sole':int(np.where(a[:,:,3]>=128)[0].max())}))
