"""Guard artwork details, not just RGB: compare decoded assets to approved base."""
from pathlib import Path
from io import BytesIO
import subprocess
import numpy as np
import cv2
from PIL import Image
root=Path(__file__).resolve().parents[2]
failures=[]; count=0
for path in sorted((root/'assets/chars').rglob('*')):
 if path.suffix not in ('.png','.webp'):continue
 rel=str(path.relative_to(root))
 old=np.array(Image.open(BytesIO(subprocess.check_output(['git','show','22a7d6d:'+rel],cwd=root))).convert('RGBA'))
 new=np.array(Image.open(path).convert('RGBA')); opaque=old[:,:,3]==255
 contours,_=cv2.findContours((old[:,:,3]>0).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 protected=np.zeros(old.shape[:2],dtype='uint8')
 cv2.drawContours(protected,[c for c in contours if cv2.contourArea(c)>=100],-1,1,cv2.FILLED)
 inside=opaque & (protected>0)
 if np.any(new[:,:,3][inside]!=255):failures.append(f'{rel}: enclosed opaque artwork removed ({np.count_nonzero(new[:,:,3][inside]!=255)})')
 assert np.percentile(np.abs(new[:,:,:3][opaque].astype(int)-old[:,:,:3][opaque].astype(int)),99)<=8,rel
 count+=1
for name in ('feifei-sad','feifei-sad-open'):
 rel=f'assets/chars/expr/{name}.png'
 old=np.array(Image.open(BytesIO(subprocess.check_output(['git','show','22a7d6d:'+rel],cwd=root))).convert('RGBA'))
 new=np.array(Image.open(root/rel).convert('RGBA'))
 crop=old[146:186,188:228]; restored=new[146:186,188:228]
 white=(crop[:,:,3]==255)&(crop[:,:,:3].min(axis=2)>220)
 assert white.any() and np.array_equal(crop[white],restored[white]),f'{name}: white eye highlight changed'
print('\n'.join(failures) if failures else f'PASS {count} character images: enclosed opaque alpha preserved, RGB p99 <= 8')
raise SystemExit(bool(failures))
