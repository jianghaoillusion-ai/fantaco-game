"""核對原臉覆回、原尺寸皇冠與本次證據的 SHA256；不修改圖檔。"""
import ast,json,hashlib,io,subprocess
from pathlib import Path
import numpy as np,cv2
from PIL import Image,ImageFilter
R=Path(__file__).resolve().parents[2];O=R/'review/cast8';p=O/'build_cast8.py'
tree=ast.parse(p.read_text());nodes=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))];ns={'__file__':str(p)};exec(compile(ast.Module(body=nodes,type_ignores=[]),str(p),'exec'),ns);ns['R']=R
polys={'jiejie':[(228,127),(242,121),(256,118),(269,117),(282,112),(298,117),(308,132),(309,155),(302,170),(285,183),(266,188),(248,183),(235,172),(229,154)],'spirit':[(228,215),(238,208),(251,207),(263,205),(276,204),(290,207),(303,212),(313,230),(309,254),(298,270),(284,281),(266,284),(250,280),(237,270),(230,254)]}
out={}
for k,s,anchor,target,blur,dy in [('jiejie',1.885,(267,187),(267,249),.7,1),('spirit',1.65,(270,282),(270,313),.45,0)]:
 im=ns['trans'](ns['layer'](ns['source'](k),ns['poly'](polys[k]).filter(ImageFilter.GaussianBlur(blur))),s,anchor,target)
 if dy:
  z=Image.new('RGBA',(540,720));z.alpha_composite(im,(0,dy));im=z
 a=np.array(im);b=np.array(Image.open(R/f'assets/chars/{k}.png'));core=cv2.erode((a[:,:,3]==255).astype('uint8'),np.ones((5,5),np.uint8))>0;diff=np.abs(a[:,:,:3].astype(int)-b[:,:,:3].astype(int))
 out[k]={'original':'f346cdf:assets/chars/'+k+'.png','scale':s,'core_pixels':int(core.sum()),'changed_rgb_pixels':int(np.any(diff,axis=2)[core].sum()),'max_rgb_error':int(diff[core].max()),'note':'覆回區往內縮2px；外圈髮緣接合修補不屬於五官保真保證。'}
(O/'face-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
new=np.array(Image.open(R/'assets/chars/spirit.png'));old=np.array(ns['source']('spirit'))
roi=np.zeros((720,540),bool);roi[40:125,150:350]=True;roi&=old[:,:,3]>=250
shifted=new[5:90,150:350];ref=old[40:125,150:350];mask=roi[40:125,150:350]
r={'source':'f346cdf:assets/chars/spirit.png','scale_x':1,'scale_y':1,'translate':[0,-35],'upper_crown_roi_source':[150,40,350,125],'opaque_roi_pixels':int(mask.sum()),'rgb_changed_pixels':int(np.any(shifted[:,:,:3]!=ref[:,:,:3],axis=2)[mask].sum()),'top_y':int(np.where(new[:,:,3]>=128)[0].min()),'bottom_y':int(np.where(new[:,:,3]>=128)[0].max()),'layer_order':'皇冠原尺寸圖層最後覆於頭髮上方','note':'最外圈經 alpha 平滑與去背，未宣稱帽子逐像素不變。'}
(O/'crown-audit.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
manifest={str(f.relative_to(R)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(O.rglob('*.png'))}
for k in ['jiejie','spirit','hate']:
 for ext in ['png','webp']:
  f=R/f'assets/chars/{k}.{ext}';manifest[str(f.relative_to(R))]=hashlib.sha256(f.read_bytes()).hexdigest()
(O/'image-sha256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'face':out,'crown':r},ensure_ascii=False))
