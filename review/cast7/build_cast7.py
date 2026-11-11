"""本機免費 Pillow/OpenCV 修邊；來源鎖定，不讀浮動 HEAD。"""
from pathlib import Path
import io,json,subprocess
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'review/cast7'
BASE='78bb5adcc143f7f433c46d1992067bb01f3a6a34'
MAIN='525ab99f5d635f75cf3553877422fa018a81d35f'
FONT='/System/Library/Fonts/STHeiti Medium.ttc'
def source(commit,k):return Image.open(io.BytesIO(subprocess.check_output(['git','show',f'{commit}:assets/chars/{k}.png'],cwd=ROOT))).convert('RGBA')
def font(n):return ImageFont.truetype(FONT,n)
def checker(im):
 y,x=np.indices((im.height,im.width));v=np.where((x//12+y//12)%2,218,242).astype('uint8')
 bg=Image.fromarray(np.dstack([v,v,v,np.full_like(v,255)]));bg.alpha_composite(im);return bg.convert('RGB')
def fix_hate():
 before=source(BASE,'hate');a=np.array(before);alpha=a[:,:,3];opaque=(alpha>=128).astype('uint8')
 # Only the screen-right hair silhouette. No eye, ear, hat or inner hair pixels.
 roi=np.zeros_like(opaque);roi[45:171,322:380]=1
 band=(cv2.dilate(opaque,np.ones((3,3),np.uint8))!=cv2.erode(opaque,np.ones((3,3),np.uint8))) & (roi>0)
 smooth=cv2.GaussianBlur(alpha,(5,5),.65)
 a[:,:,3][band]=smooth[band]
 # Keep the original thin hair tip connected at the measurement threshold.
 a[:,:,3][band & (opaque>0)]=np.maximum(a[:,:,3][band & (opaque>0)],128)
 # Extend existing edge RGB into newly covered transparent pixels, avoiding a black fringe.
 _,labels=cv2.distanceTransformWithLabels((opaque==0).astype('uint8'),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
 colors=np.array(before)[:,:,:3][opaque>0]
 new=band&(alpha<128)&(a[:,:,3]>0)
 a[:,:,:3][new]=colors[labels[new]-1]
 after=Image.fromarray(a);after.save(ROOT/'assets/chars/hate.png')
 after.save(ROOT/'assets/chars/hate.webp',lossless=True,method=6,exact=True)
 diff=np.any(a!=np.array(before),axis=2);ys,xs=np.where(diff)
 assert not np.any(diff & ~band)
 mask=Image.fromarray(np.dstack([diff.astype('uint8')*255,np.zeros_like(alpha),np.zeros_like(alpha),diff.astype('uint8')*255]))
 mask.save(OUT/'hate-diff-mask.png')
 box=(310,35,390,185);c=Image.new('RGB',(1200,820),'#eee');d=ImageDraw.Draw(c)
 for i,(im,title) in enumerate([(before,'修改前'),(after,'修改後'),(mask,'差異遮罩（紅）')]):
  crop=checker(im.crop(box)).resize((400,750),Image.Resampling.NEAREST);c.paste(crop,(400*i,50));d.text((400*i+12,10),title,font=font(25),fill='#222')
 c.save(OUT/'hate-hair-edge.png')
 r={'source_commit':BASE,'roi_xyxy':[322,45,380,171],'changed_pixels':int(diff.sum()),'changed_bbox_inclusive':[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())],'outside_roi_changed':int((diff & ~roi.astype(bool)).sum()),'outside_boundary_band_changed':int((diff & ~band).sum())}
 (OUT/'hate-diff.json').write_text(json.dumps(r,indent=2)+'\n');print(r)
if __name__=='__main__':fix_hate()

def restore_originals():
    for k in ['jiejie','spirit']:
        im=source(MAIN,k)
        if k=='spirit':
            assert not np.any(np.array(im)[717:,:,3]), '下移不得裁到原圖內容'
            shifted=Image.new('RGBA',(540,720));shifted.alpha_composite(im,(0,3));im=shifted
        im.save(ROOT/f'assets/chars/{k}.png')
        im.save(ROOT/f'assets/chars/{k}.webp',lossless=True,method=6,exact=True)
    (OUT/'transforms.json').write_text(json.dumps({'status':'僅回復原設定與對齊腳底；比例調整待約束決定','jiejie':{'commit':MAIN,'path':'assets/chars/jiejie.png','scale':1,'translate':[0,0]},'spirit':{'commit':MAIN,'path':'assets/chars/spirit.png','scale':1,'translate':[0,3]},'hate':{'commit':BASE,'path':'assets/chars/hate.png','scale':1,'translate':[0,0],'edit':'右側髮緣 alpha 反鋸齒，見 hate-diff.json'}},ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':restore_originals()
