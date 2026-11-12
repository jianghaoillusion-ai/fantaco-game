from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,cv2,json,re
O=Path('review/cast9');im=Image.open(O/'candidate-sister-r2.png').convert('RGBA');im.save('assets/chars/jiejie.png');im.save('assets/chars/jiejie.webp',lossless=True,exact=True)
# Same art for talking pose; closed-mouth pose only paints the small mouth region,
# using neighbouring skin and a new curve. No face geometry or head scaling.
im.save('assets/chars/expr/jiejie-happy-open.png')
a=np.array(im);mask=np.zeros(a.shape[:2],np.uint8);cv2.ellipse(mask,(277,210),(23,12),0,0,360,255,-1)
rgb=cv2.inpaint(a[:,:,:3],mask,5,cv2.INPAINT_TELEA);closed=Image.fromarray(np.dstack([rgb,a[:,:,3]]));hi=closed.resize((1620,2160),Image.Resampling.LANCZOS);d=ImageDraw.Draw(hi)
pts=[]
for t in np.linspace(0,1,50):
 x=(1-t)**2*259+2*(1-t)*t*278+t*t*295;y=(1-t)**2*207+2*(1-t)*t*223+t*t*207;pts.append((round(x*3),round(y*3)))
d.line(pts,fill=(113,49,34,255),width=5);closed=hi.resize((540,720),Image.Resampling.LANCZOS)
# Keep every pixel outside mouth edit box identical, including alpha edges.
ca=np.array(closed);out=a.copy();out[196:225,251:304]=ca[196:225,251:304];closed=Image.fromarray(out);closed.save('assets/chars/expr/jiejie-happy.png')
av=closed.crop((165,18,405,258)).resize((256,256),Image.Resampling.LANCZOS);av.save('assets/chars/avatars/jiejie.png')
m=json.loads((O/'measurements-r2.json').read_text())['jiejie'];ys,xs=np.where(a[:,:,3]>=128)
metric=dict(w=540,h=720,headTop=m['top'],chin=m['chin'],head=m['headH'],feet=685,bboxTop=int(ys.min()),contentL=int(xs.min()),contentR=int(xs.max()),faceL=m['faceL'],faceR=m['faceR'])
p=Path('js/portraits.js');s=p.read_text();s,n=re.subn(r'  jiejie: \{[^\n]*\},','  jiejie: { '+', '.join(f'{k}: {v}' for k,v in metric.items())+' },',s);assert n==1;p.write_text(s)
p=Path('data/cast-metrics.json');obj=json.loads(p.read_text());obj['chars']['jiejie'].update(metric);obj['target']['jiejieBody']=m['total'];p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(metric)
