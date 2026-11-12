"""對齊指定原設定後，檢查去色影響；唯讀 PNG，輸出證據 JSON。"""
import json
import cv2,numpy as np
from PIL import Image
from build_cast7 import source,MAIN,ROOT,OUT

def regions(mask):
 n,l,s,_=cv2.connectedComponentsWithStats(mask.astype('uint8'),8)
 return [dict(x=int(x),y=int(y),width=int(w),height=int(h),pixels=int(a)) for x,y,w,h,a in s[1:]]
result={}
for k,dy in [('jiejie',2),('spirit',5)]:
 src=source(MAIN,k);aligned=Image.new('RGBA',(540,720));aligned.alpha_composite(src,(0,dy));a=np.array(aligned);b=np.array(Image.open(ROOT/f'assets/chars/{k}.png'))
 h=cv2.cvtColor(a[:,:,:3],cv2.COLOR_RGB2HSV);cyan=(h[:,:,0]>=80)&(h[:,:,0]<=100)&(h[:,:,1]>60)
 noncyan=(a[:,:,3]>=128)&~cyan
 rgbchange=np.any(a[:,:,:3]!=b[:,:,:3],axis=2)
 core=cv2.erode((noncyan).astype('uint8'),np.ones((7,7),np.uint8))>0
 hs=cv2.cvtColor(b[:,:,:3],cv2.COLOR_RGB2HSV);remaining=(hs[:,:,0]>=80)&(hs[:,:,0]<=100)&(hs[:,:,1]>60)&(b[:,:,3]>=128)
 result[k]=dict(noncyan_solid_became_transparent=regions(noncyan&(b[:,:,3]<128)),noncyan_solid_rgb_changed=regions(noncyan&rgbchange),core_noncyan_changed_pixels=int((core&np.any(a!=b,axis=2)).sum()),remaining_cyan_regions=regions(remaining),webp_equal=bool(np.array_equal(b,np.array(Image.open(ROOT/f'assets/chars/{k}.webp')))),sole_y=int(np.where(b[:,:,3]>=128)[0].max()))
(OUT/'cleanup-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
