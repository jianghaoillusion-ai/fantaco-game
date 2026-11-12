"""Local alpha-only cleanup. Baseline is the user's specified main commit."""
from pathlib import Path
from io import BytesIO
import subprocess,json
import numpy as np
import cv2
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'review/mobile-fix'
files=sorted(list((ROOT/'assets/chars').rglob('*.png'))+list((ROOT/'assets/chars').rglob('*.webp'))+list((ROOT/'assets/mascot/sticker').glob('*.png'))+list((ROOT/'assets/mascot/sticker').glob('*.webp')))
def parts(alpha):
 n,l,s,_=cv2.connectedComponentsWithStats((alpha>0).astype('uint8'),8)
 return n,l,s
rows=[]
for path in files:
 rel=str(path.relative_to(ROOT))
 raw=subprocess.check_output(['git','show','22a7d6d:'+rel],cwd=ROOT)
 original=Image.open(BytesIO(raw)); original_mode=original.mode
 old=np.array(original.convert('RGBA'));new=old.copy();a=new[:,:,3]
 n,l,st=parts(a);before=sum(st[1:,4]<100)
 # Filled original silhouettes protect eye highlights and other enclosed islands.
 contours,_=cv2.findContours((old[:,:,3]>0).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 protected=np.zeros(a.shape,dtype='uint8')
 cv2.drawContours(protected,[c for c in contours if cv2.contourArea(c)>=100],-1,1,cv2.FILLED)
 # Remove extremely faint matte and detached specks; retain enclosed artwork.
 a[a<16]=0
 if 'feifei' in rel:
  rgb=old[:,:,:3].astype(float)
  # Only the outermost two pixels, never interior hair/bottle transparency.
  _,bg_labels=cv2.connectedComponents((old[:,:,3]==0).astype('uint8'),8)
  border=np.unique(np.concatenate([bg_labels[0,:],bg_labels[-1,:],bg_labels[:,0],bg_labels[:,-1]]))
  exterior=np.isin(bg_labels,border[border!=0])
  distance=cv2.distanceTransform((~exterior).astype('uint8'),cv2.DIST_L2,5)
  spill=(rgb[:,:,2]>rgb[:,:,0]*1.22)&(rgb[:,:,1]>rgb[:,:,0]*1.10)&(old[:,:,3]<255)&(distance<=2)
  a[spill]=0
 nn,ll,ss=parts(a)
 for i in range(1,nn):
  if ss[i,4]<100 and not np.any(protected[ll==i]):a[ll==i]=0
 # Keep PNG/WebP alpha identical without changing the WebP's original RGB.
 if '/sticker/' in rel and path.suffix=='.webp':
  a[:]=np.array(Image.open(path.with_suffix('.png')).convert('RGBA'))[:,:,3]
 n2,l2,st2=parts(a);after=sum(st2[1:,4]<100)
 changed=bool(np.any(old!=new));rgbdiff=int(np.max(np.abs(old[:,:,:3].astype(int)-new[:,:,:3].astype(int))))
 if changed or not np.array_equal(np.array(Image.open(path).convert("RGBA")),new):
  im=Image.fromarray(new)
  if path.suffix=='.webp':im.save(path,lossless=True,exact=True)
  else:im.save(path)
  # Full image at native resolution on dark checkerboard, so faint matte stays visible.
  h,w=old.shape[:2]; yy,xx=np.indices((h,w));bg=np.where(((xx//16+yy//16)%2)[...,None],72,112).astype('uint8');bg=np.repeat(bg,3,axis=2)
  canv=Image.new('RGB',(w*2,h+30));d=ImageDraw.Draw(canv);d.text((8,8),'BEFORE',fill='white');d.text((w+8,8),'AFTER (alpha only)',fill='white')
  for j,arr in enumerate([old,new]):
   base=Image.fromarray(bg).convert('RGBA');base.alpha_composite(Image.fromarray(arr));canv.paste(base,(w*j,30))
  name=rel.replace('assets/','').replace('/','-').replace('.','-')
  canv.save(OUT/f'alpha-cleanup-{name}.png')
  if '/avatars/feifei-' in rel:
   marked=old.copy();removed=old[:,:,3]!=new[:,:,3];marked[removed]=[255,30,30,255]
   base=Image.fromarray(bg).convert('RGBA');base.alpha_composite(Image.fromarray(marked));base.save(OUT/f'alpha-mask-{name}.png')
 actual=np.array(Image.open(path).convert('RGBA'))
 rgb_max=int(np.abs(old[:,:,:3].astype(int)-actual[:,:,:3].astype(int)).max())
 opaque=old[:,:,3]==255
 p99=float(np.percentile(np.abs(old[:,:,:3][opaque].astype(int)-actual[:,:,:3][opaque].astype(int)),99)) if opaque.any() else 0
 rows.append(dict(path=rel,use='交貨框／頭像' if '/avatars/' in rel else '故事表情' if '/expr/' in rel else '眠花糖故事／主畫面' if '/sticker/' in rel else '故事備援立繪'+('（WebP 備援；目前角色程式未引用）' if path.suffix=='.webp' else ''),before=int(before),after=int(after),changed=changed,alpha_pixels=int(np.count_nonzero(old[:,:,3]!=a)),faint_before=int(np.count_nonzero((old[:,:,3]>0)&(old[:,:,3]<16))),faint_after=int(np.count_nonzero((a>0)&(a<16))),opaque_removed=int(np.count_nonzero((old[:,:,3]==255)&(a==0))),protected_components=int(sum(ss[i,4]<100 and np.any(protected[ll==i]) for i in range(1,nn))),opaque_rgb_p99=p99,rgb_max=rgb_max,original_mode=original_mode,saved_mode=Image.open(path).mode))
 assert rgbdiff==0
 if changed:
  actual=np.array(Image.open(path).convert('RGBA'));mask=old[:,:,3]==255
  assert np.array_equal(old[:,:,:3],actual[:,:,:3]), rel
  assert np.percentile(np.abs(old[:,:,:3][mask].astype(int)-actual[:,:,:3][mask].astype(int)),99)==0
j=json.loads((ROOT/'data/chains.json').read_text())
for rel in sorted({x['img'] for ch in j['chains'].values() for x in ch['items']}):
 a=np.array(Image.open(ROOT/rel).convert('RGBA'));n,l,st=parts(a[:,:,3]);count=int(sum(st[1:,4]<100))
 rows.append(dict(path=rel,use='交貨需求道具／棋盤（原圖已透明，保留原有光效）',before=count,after=count,changed=False,alpha_pixels=0,opaque_rgb_p99=0,rgb_max=0))
(OUT/'alpha-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print('Audited',len(rows),'changed',sum(x['changed'] for x in rows),'fragments',sum(x['before'] for x in rows),'->',sum(x['after'] for x in rows),'opaque RGB p99=0')
