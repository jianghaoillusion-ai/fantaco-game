"""Review-only enclosed-hole alpha restoration proposal; never writes game assets."""
from pathlib import Path
from io import BytesIO
import subprocess
import numpy as np
import cv2
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];out=root/'review/mobile-fix'
rows=[]
for group in ('avatars','expr'):
 for path in sorted((root/'assets/chars'/group).glob('feifei-*.png')):
  if 'happy' in path.name:continue
  old=np.array(Image.open(BytesIO(subprocess.check_output(['git','show','22a7d6d:'+str(path.relative_to(root))]))).convert('RGBA'))
  new=np.array(Image.open(path).convert('RGBA'))
  n,lab,stats,_=cv2.connectedComponentsWithStats((new[:,:,3]==0).astype('uint8'),8)
  border=set(np.concatenate((lab[0],lab[-1],lab[:,0],lab[:,-1])))
  candidate=new.copy();pixels=0
  for i in range(1,n):
   mask=lab==i
   if i not in border and stats[i,4]>=20:
    candidate[mask,3]=255;pixels+=int(mask.sum())
  h,w=new.shape[:2]; canvas=Image.new('RGB',(w*3,h+30),'#474747');d=ImageDraw.Draw(canvas)
  for j,(title,arr) in enumerate([('BASE',old),('R2',new),('PROPOSAL ONLY: fill enclosed holes',candidate)]):
   yy,xx=np.indices((h,w));bg=np.repeat(np.where(((xx//12+yy//12)%2)[...,None],180,230).astype('uint8'),3,axis=2)
   im=Image.fromarray(bg).convert('RGBA');im.alpha_composite(Image.fromarray(arr));canvas.paste(im,(j*w,30));d.text((j*w+5,8),title,fill='white')
  canvas.save(out/f'alpha-hole-proposal-{group}-{path.stem}.png')
  rows.append({'path':str(path.relative_to(root)),'proposal_pixels':pixels})
# Explicit 5x eye check: baseline / R1 / R2.
for name in ['feifei-sad','feifei-sad-open']:
 rel=f'assets/chars/expr/{name}.png'; canvas=Image.new('RGB',(600,230),'#555555');d=ImageDraw.Draw(canvas)
 for j,rev in enumerate(['22a7d6d','b1c9eb6',None]):
  im=Image.open(BytesIO(subprocess.check_output(['git','show',f'{rev}:{rel}']))) if rev else Image.open(root/rel)
  im=im.convert('RGBA').crop((188,146,228,186)).resize((200,200),Image.Resampling.NEAREST)
  bg=Image.new('RGBA',im.size,'#D7BAE9');bg.alpha_composite(im);canvas.paste(bg,(200*j,30));d.text((200*j+5,8),['BASE','R1 (deleted)','R2 (restored)'][j],fill='white')
 canvas.save(out/f'alpha-eye-restored-{name}.png')
import json
(out/'alpha-hole-proposals.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
