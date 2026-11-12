"""cast10: whole-source uniform spirit resize; sister fabric edge repaint, no head/leg transform."""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,cv2,subprocess,io,json
O=Path('review/cast10'); O.mkdir(exist_ok=True)
def baseline(path):return Image.open(io.BytesIO(subprocess.check_output(['git','show','39b59fe:'+path]))).convert('RGBA')
im=Image.open(O/'source/spirit-built-in.png').convert('RGBA');a=np.array(im)
# Remove isolated alpha fragments only, retain continuous antialiased perimeter.
n,lab,st,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8')); biggest=1+np.argmax(st[1:,4]);removed=int(((lab!=biggest)&(a[:,:,3]>0)).sum());a[lab!=biggest]=0
im=Image.fromarray(a);y,x=np.where(a[:,:,3]>=128);scale=758/(y.max()-y.min());sz=(round(im.width*scale),round(im.height*scale));im=im.resize(sz,Image.Resampling.LANCZOS);a=np.array(im);y,x=np.where(a[:,:,3]>=128);offset=(round(270-(x.min()+x.max())/2),765-int(y.max()));out=Image.new('RGBA',(540,800));out.alpha_composite(im,offset)
a=np.array(out);n,lab,st,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8'));a[lab!=1+np.argmax(st[1:,4])]=0
# Smooth alpha only: RGB artwork geometry is never warped.
a[:,:,3]=np.array(Image.fromarray(a[:,:,3]).filter(ImageFilter.GaussianBlur(.30)));a[a[:,:,3]==0]=0
out=Image.fromarray(a);out.save('assets/chars/spirit.png');out.save('assets/chars/spirit.webp',lossless=True,exact=True)
json.dump(dict(scale=scale,size=sz,offset=offset,removedSourceAlphaFragments=removed),open(O/'normalization.json','w'),indent=2)
# Final round sister implementation (keeps baseline head and legs exact).
import runpy
runpy.run_path(str(O/"scripts/sister-r2.py"))
