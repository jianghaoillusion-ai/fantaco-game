"""Restore enclosed white body opacity, preserving every original RGB value."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,cv2,json,subprocess
from io import BytesIO
root=Path(__file__).resolve().parents[2];rows=[]
for name in ['face','wave']:
 p=root/f'assets/mascot/sticker/{name}.png';a=np.array(Image.open(BytesIO(subprocess.check_output(['git','show',f'9f25700:assets/mascot/sticker/{name}.png'],cwd=root))).convert('RGBA'));old=a.copy()
 contours,_=cv2.findContours((a[:,:,3]>0).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 mask=np.zeros(a.shape[:2],dtype='uint8');cv2.drawContours(mask,[c for c in contours if cv2.contourArea(c)>=100],-1,1,cv2.FILLED)
 # Only neutral white pixels enclosed by existing outlines; no re-drawing or color substitution.
 fill=(mask>0)&(a[:,:,:3].min(axis=2)>240);a[:,:,3][fill]=255
 Image.fromarray(a).save(p)
 wp=p.with_suffix('.webp');w=np.array(Image.open(BytesIO(subprocess.check_output(['git','show',f'9f25700:assets/mascot/sticker/{name}.webp'],cwd=root))).convert('RGBA'));w[:,:,3]=a[:,:,3];Image.fromarray(w).save(wp,lossless=True,exact=True)
 assert np.array_equal(np.array(Image.open(p))[:,:,:3],old[:,:,:3])
 assert np.array_equal(a[old[:,:,3]>0],old[old[:,:,3]>0]), 'visible pixels must stay identical'
 def small(v):
  _,_,stats,_=cv2.connectedComponentsWithStats((v>0).astype('uint8'),8);return int(sum(stats[1:,4]<100))
 rows.append(dict(name=name,alpha_changed=int(np.count_nonzero(a[:,:,3]!=old[:,:,3])),small_before=small(old[:,:,3]),small_after=small(a[:,:,3]),rgb_max_difference=0))
 canvas=Image.new('RGB',(a.shape[1]*4,a.shape[0]*2+30),'#503860');d=ImageDraw.Draw(canvas)
 for i,v in enumerate([old,a]):
  im=Image.fromarray(v).resize((a.shape[1]*2,a.shape[0]*2));canvas.paste(im,(i*a.shape[1]*2,30),im)
 d.text((4,8),'BEFORE',fill='white');d.text((a.shape[1]*2+4,8),'AFTER: ALPHA ONLY',fill='white');canvas.save(root/f'review/mobile-fix/mobile2-mascot-{name}.png')
(root/'review/mobile-fix/mobile2-mascot-alpha.json').write_text(json.dumps(rows,indent=2))
print(rows)
