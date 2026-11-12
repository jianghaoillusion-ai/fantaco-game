from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,cv2,json,re
O=Path('review/cast10');m=json.loads((O/'measurements.json').read_text())['spirit']
im=Image.open('assets/chars/spirit.png').convert('RGBA');im.save('assets/chars/expr/spirit-happy-open.png');a=np.array(im)
mask=np.zeros(a.shape[:2],np.uint8);cv2.ellipse(mask,(270,291),(29,20),0,0,360,255,-1);rgb=cv2.inpaint(a[:,:,:3],mask,5,cv2.INPAINT_TELEA)
closed=Image.fromarray(np.dstack([rgb,a[:,:,3]]));hi=closed.resize((1620,2400),Image.Resampling.LANCZOS);d=ImageDraw.Draw(hi);pts=[]
for t in np.linspace(0,1,60):pts.append((round(((1-t)**2*257+2*(1-t)*t*275+t*t*294)*3),round(((1-t)**2*285+2*(1-t)*t*301+t*t*285)*3)))
d.line(pts,fill=(112,52,35,255),width=5);ca=np.array(hi.resize((540,800),Image.Resampling.LANCZOS));out=a.copy();out[270:313,239:306]=ca[270:313,239:306];closed=Image.fromarray(out);closed.save('assets/chars/expr/spirit-happy.png');closed.crop((155,125,390,360)).resize((512,512),Image.Resampling.LANCZOS).save('assets/chars/avatars/spirit.png')
metric=dict(w=540,h=800,headTop=m['top'],chin=m['chin'],head=m['headH'],feet=765,bboxTop=m['hatTop'],contentL=m['contentL'],contentR=m['contentR'],faceL=m['faceL'],faceR=m['faceR'])
p=Path('js/portraits.js');s=p.read_text();s,n=re.subn(r'  spirit: \{[^\n]*\},','  spirit: { '+', '.join(f'{k}: {v}' for k,v in metric.items())+' },',s);assert n==1;p.write_text(s)
p=Path('data/cast-metrics.json');obj=json.loads(p.read_text());obj['chars']['spirit'].update(metric);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
