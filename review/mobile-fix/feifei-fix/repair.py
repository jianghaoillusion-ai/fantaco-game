"""Reproducible alpha repair from 33ada91; no RGB edits where baseline alpha > 0."""
from pathlib import Path
from io import BytesIO
import subprocess,json
import numpy as np,cv2
from scipy import ndimage as ndi
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3]; OUT=Path(__file__).resolve().parent
BASE='33ada91'
def original(p):return np.array(Image.open(BytesIO(subprocess.check_output(['git','show',BASE+':'+str(p)],cwd=ROOT))).convert('RGBA'))
def comps(m):
 n,l,s,c=cv2.connectedComponentsWithStats(m.astype('uint8'),8);return n,l,s
ref=original(Path('assets/chars/feifei.png'))
sift=cv2.SIFT_create();k1,d1=sift.detectAndCompute(cv2.cvtColor(ref[:,:,:3],cv2.COLOR_RGB2GRAY),(ref[:,:,3]>240).astype('uint8')*255)
rows=[]
files=sorted(list(Path('assets/chars/avatars').glob('feifei*.png'))+list(Path('assets/chars/expr').glob('feifei*.png')))
for p in files:
 old=original(p);a=old[:,:,3];h,w=a.shape
 match_scale=1/1.85 if '/avatars/' in str(p) else 1.
 match_img=cv2.resize(old,None,fx=match_scale,fy=match_scale,interpolation=cv2.INTER_AREA)
 k2,d2=sift.detectAndCompute(cv2.cvtColor(match_img[:,:,:3],cv2.COLOR_RGB2GRAY),(match_img[:,:,3]>240).astype('uint8')*255)
 good=[m for m,n in cv2.BFMatcher().knnMatch(d1,d2,k=2) if m.distance<.7*n.distance]
 M,inliers=cv2.estimateAffine2D(np.float32([k1[m.queryIdx].pt for m in good]),np.float32([k2[m.trainIdx].pt for m in good])/match_scale,method=cv2.RANSAC,ransacReprojThreshold=2)
 r=cv2.warpAffine(ref,M,(w,h)); yy,xx=np.indices((h,w)); inv=cv2.invertAffineTransform(M);rx=inv[0,0]*xx+inv[0,1]*yy+inv[0,2];ry=inv[1,0]*xx+inv[1,1]*yy+inv[1,2]
 # Approved source defines interior; erosion avoids extending the expression silhouette.
 interior=cv2.erode((r[:,:,3]>=250).astype('uint8'),np.ones((3,3),np.uint8)).astype(bool)
 # Transparent cutouts enclosed by actual expression artwork are also holes if reference supports them.
 enclosed=ndi.binary_fill_holes(a>0)&(a==0)&(r[:,:,3]>128)
 repair=((a<250)&interior)|enclosed
 new=old.copy();fill=repair&(a==0)
 new[fill,:3]=r[fill,:3];new[repair,3]=255
 # Expression eye highlights differ from happy reference: never copy its white glints.
 eyes=(((rx-214)/29)**2+((ry-167)/29)**2<1)|(((rx-290)/31)**2+((ry-189)/29)**2<1)
 dark=(a>=180)&(old[:,:,0]<85)&(old[:,:,1]<65)&(old[:,:,2]<60)
 _,nearest=ndi.distance_transform_edt(~dark,return_indices=True)
 eye_fill=fill&(eyes|((r[:,:,0]>130)|(r[:,:,1]>100)|(r[:,:,2]>100)))
 new[eye_fill,:3]=old[nearest[0][eye_fill],nearest[1][eye_fill],:3]
 # Keep RGB of all originally visible pixels exactly, including semitransparent pixels.
 # Hair cyan spill only; bottle and outfit are excluded by reference coordinates.
 rgb=old[:,:,:3].astype(float)
 hair=(ry<485)&((rx<190)|((rx>310)&(ry>185))|(ry<155))
 def blue(arr):
  c=arr[:,:,:3].astype(float)
  return hair&(c[:,:,2]>c[:,:,0]*1.05)&(c[:,:,1]>c[:,:,0]*1.02)&((c[:,:,2]-c[:,:,0])>2)&(arr[:,:,3]>0)
 cyan=blue(new)|blue(old)
 new[cyan,3]=0
 # Remove detached exterior residue, never islands inside the approved body.
 n,l,s=comps(new[:,:,3]>0);largest=1+np.argmax(s[1:,4]);specks=np.zeros(a.shape,bool)
 for i in range(1,n):
  if i!=largest and not np.any(interior[l==i]):specks|=l==i
 new[specks,3]=0
 # Remove faint exterior matte and smooth only the outer two-pixel edge.
 support=ndi.binary_fill_holes(new[:,:,3]>127)
 dist=ndi.distance_transform_edt(support)
 edge=(dist<=1)&~interior
 blurred=cv2.GaussianBlur(new[:,:,3],(3,3),.55)
 new[edge,3]=np.minimum(new[:,:,3],blurred)[edge]
 new[(new[:,:,3]<24)&~interior,3]=0
 # Smoothing can disconnect tiny outer pixels; remove these after smoothing too.
 n,l,s=comps(new[:,:,3]>0);largest=1+np.argmax(s[1:,4])
 for i in range(1,n):
  if i!=largest:new[l==i,3]=0
 def metrics(arr):
  al=arr[:,:,3];holes=(al<250)&interior&~cyan
  hn,hl,hs=comps(holes)
  nn,ll,ss=comps(al>0);large=1+np.argmax(ss[1:,4]);frags=[i for i in range(1,nn) if i!=large and not np.any(interior[ll==i])]
  zn,zl,zs=comps((al==0)&interior&~cyan)
  enclosed_zero=ndi.binary_fill_holes(al>0)&(al==0)
  en,el,es=comps(enclosed_zero)
  col=arr[:,:,:3].astype(float)
  full_blue=(col[:,:,2]>col[:,:,0]*1.05)&(col[:,:,1]>col[:,:,0]*1.02)&((col[:,:,2]-col[:,:,0])>2)&(al>0)
  return dict(independent_enclosed_holes=en-1,independent_enclosed_area=int(enclosed_zero.sum()),full_image_blue_pixels=int(full_blue.sum()),all_detached_components=nn-2,transparent_holes=zn-1,transparent_hole_area=int(((al==0)&interior&~cyan).sum()),holes=hn-1,hole_area=int(holes.sum()),fragments=len(frags),fragment_area=int(sum(ss[i,4] for i in frags)),halo_pixels=int(blue(arr).sum()))
 # RGB invariant stronger than requested p99 gate.
 assert np.array_equal(old[a>0,:3],new[a>0,:3])
 Image.fromarray(new).save(ROOT/p)
 row=dict(path=str(p),before=metrics(old),after=metrics(new),filled_pixels=int(((a==0)&(new[:,:,3]>0)).sum()),alpha_restored_pixels=int((new[:,:,3]>a).sum()),alpha_changed_pixels=int((a!=new[:,:,3]).sum()),rgb_visible_max=0,alignment=M.tolist(),alignment_inliers=int(inliers.sum()),method='SIFT/RANSAC 對齊核准 feifei.png；僅 alpha=0 的洞取參考色，眼部洞用周圍原有深色取色，避免複製開心版高光；其餘只補 alpha。去除頭髮青藍漏色、外部碎屑與淡邊，外緣局部平滑。')
 rows.append(row)
 # Each sheet: head (eyes/hair) + lower hair/edge, checker/dark/light backgrounds.
 # Transform approved head rectangle into target coordinate, clip to canvas.
 pts=cv2.transform(np.float32([[[125,28],[425,280]]]),M)[0];x0,y0=np.maximum(0,np.floor(pts[0])).astype(int);x1,y1=np.minimum([w,h],np.ceil(pts[1])).astype(int)
 crops=[(x0,y0,x1,y1),(max(0,x1-int(100*M[0,0])),max(0,y1-int(60*M[1,1])),min(w,x1+5),min(h,y1+int(170*M[1,1])))]
 panels=[]
 for box in crops:
  for bg in [(70,70,70),(248,236,213)]:
   cw,ch=box[2]-box[0],box[3]-box[1];scale=min(3,700/cw,680/ch);size=(int(cw*scale),int(ch*scale));panel=Image.new('RGB',(size[0]*2,size[1]+26),bg);d=ImageDraw.Draw(panel)
   for j,ar in enumerate([old,new]):
    im=Image.fromarray(ar).crop(box).resize(size,Image.Resampling.NEAREST);panel.paste(im,(j*size[0],26),im);d.text((j*size[0]+6,5),'BEFORE' if j==0 else 'AFTER',fill=(240,60,80))
   panels.append(panel)
 sheet=Image.new('RGB',(max(z.width for z in panels),sum(z.height for z in panels)),(100,100,100));y=0
 for panel in panels:sheet.paste(panel,(0,y));y+=panel.height
 sheet.save(OUT/('before-after-'+p.parent.name+'-'+p.stem+'.png'))
 print(p,row['before'],row['after'],'filled',row['filled_pixels'])
(OUT/'counts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
