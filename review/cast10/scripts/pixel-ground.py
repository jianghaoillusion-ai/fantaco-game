"""Measure actual headless screenshot pixels, independently of CAST_METRICS feet."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,cv2,json,os
O=Path('review/cast10');out=[];proof=Image.new('RGB',(1500,650),'white');d=ImageDraw.Draw(proof);font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',21)
for ci,c in enumerate(json.loads((O/'game-check.json').read_text())):
 w,h=c['viewport'];soles=[]
 for ri,r in enumerate([r for r in c['rows'] if r['visible']]):
  im=Image.open(Path(os.environ['TMPDIR'])/f'pixels-{w}x{h}-{r["id"]}.png').convert('RGB');a=np.array(im);m=np.any(a<200,axis=2);n,l,st,_=cv2.connectedComponentsWithStats(m.astype('uint8'));m=l==(1+np.argmax(st[1:,4]));ys,xs=np.where(m);y=int(ys.max());soles.append(dict(id=r['id'],bottomPixelY=y,topPixelY=int(ys.min()),componentPixels=int(m.sum())))
  box=(max(0,int(xs.min())-5),max(0,y-65),min(w,int(xs.max())+6),min(h,y+7));crop=im.crop(box);crop.thumbnail((450,130));proof.paste(crop,(ci*500+15,ri*185+45));d.text((ci*500+15,ri*185+8),f'{w}×{h} {r["id"]} 鞋底 y{y}',font=font,fill='black')
 delta=max(s['bottomPixelY'] for s in soles)-min(s['bottomPixelY'] for s in soles);assert delta<=1,(w,h,soles);out.append(dict(viewport=[w,h],threshold='至少一RGB色版<200；最大連通角色輪廓',soleDeltaPixels=delta,actors=soles))
(O/'pixel-ground-check.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');proof.save(O/'game-sole-pixels.png')
