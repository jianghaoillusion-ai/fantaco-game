from pathlib import Path
import json,subprocess,io,numpy as np
from PIL import Image,ImageDraw
out=Path(__file__).resolve().parent;rows=json.loads((out/'counts.json').read_text());checks=[]
overview=Image.new('RGB',(1600,1760),'#e8d7b2');d=ImageDraw.Draw(overview)
for i,r in enumerate(rows):
 p=r['path'];old=np.array(Image.open(io.BytesIO(subprocess.check_output(['git','show','33ada91:'+p]))).convert('RGBA'));new=np.array(Image.open(p).convert('RGBA'))
 m=(old[:,:,3]>=250)&(new[:,:,3]>=250);delta=np.abs(old[:,:,:3].astype(int)-new[:,:,:3].astype(int));assert delta[old[:,:,3]>0].max()==0
 checks.append({'path':p,'opaque_rgb_p99':float(np.percentile(delta[m].max(axis=1),99)),'opaque_rgb_max':int(delta[m].max()),'all_original_visible_rgb_max':int(delta[old[:,:,3]>0].max()),'size_unchanged':old.shape==new.shape})
 prev=np.array(Image.open(io.BytesIO(subprocess.check_output(['git','show','4b227d8:'+p]))).convert('RGBA'))
 assert np.array_equal(prev[:,:,:3],new[:,:,:3]);assert ((new[:,:,3]==prev[:,:,3])|(new[:,:,3]==0)).all()
 checks[-1].update(round2_all_rgb_max=0,round2_alpha_only_cleared=True)
 x=(i%4)*400;y=(i//4)*440;d.text((x+3,y+5),p.replace('assets/chars/',''),fill='black')
 for j,ar in enumerate([old,new]):
  im=Image.fromarray(ar);im.thumbnail((195,400));overview.paste(im,(x+j*200,y+30),im)
overview.save(out/'overview-before-after.png')
(out/'validation.json').write_text(json.dumps({'baseline':'33ada9198ad30a6cf7271e8340d1276ad97f8e27','checks':checks,'modified_assets':16,'round2_baseline':'4b227d8'},ensure_ascii=False,indent=2)+'\n')
text=(out/'README.md').read_text();start=text.index('| 圖檔');end=text.index('\n## 證據與驗證',start)
table='| 圖檔（assets/chars/ 下） | 透明洞數/面積 前→後 | 缺損數/面積 前→後 | 碎片數 前→後 | 光暈像素 前→後 | 補色像素 | 補洞方法 |\n|---|---:|---:|---:|---:|---:|---|\n'
for r in rows:
 b,a=r['before'],r['after'];method='參考對齊取色＋眼部鄰近深色' if r['filled_pixels'] else '無全透明洞補色；僅 alpha／藍邊整理'
 table+=f"| {r['path'].replace('assets/chars/','')} | {b['transparent_holes']}/{b['transparent_hole_area']} → {a['transparent_holes']}/{a['transparent_hole_area']} | {b['holes']}/{b['hole_area']} → {a['holes']}/{a['hole_area']} | {b['fragments']} → {a['fragments']} | {b['halo_pixels']} → {a['halo_pixels']} | {r['filled_pixels']} | {method} |\n"
table+='\n### 獨立檢查（不使用參考遮罩）\n\n直接對全圖 alpha 做封閉零透明區、全部脫離連通塊、全圖青藍色統計。封閉零透明區含髮絲間隙／手臂縫隙，青藍色含水壺等原設計，所以此表不要求全零，也不把這些值全部叫作瑕疵。參考遮罩內補洞歸零僅代表修補範圍通過，須配合此表與深淺底目視對照。\n\n| 圖檔 | 全圖封閉零透明區 數/面積 前→後 | 全圖青藍像素 前→後 | 全部脫離塊 前→後 | 對齊有效配對 |\n|---|---:|---:|---:|---:|\n'
for r in rows:
 b,a=r['before'],r['after'];table+=f"| {r['path'].replace('assets/chars/','')} | {b['independent_enclosed_holes']}/{b['independent_enclosed_area']} → {a['independent_enclosed_holes']}/{a['independent_enclosed_area']} | {b['full_image_blue_pixels']} → {a['full_image_blue_pixels']} | {b['all_detached_components']} → {a['all_detached_components']} | {r['alignment_inliers']} |\n"
text=text[:start]+table+text[end:];text=text.replace('眼部洞取原圖周圍原有深色','眼部使用兩個橢圓範圍，洞取原圖周圍原有深色；參考色太亮的洞也改取周圍深色，避免對齊誤差把膚色搬進頭髮。頭像先縮至參考尺度配對');text=text.replace('最後再掃一次碎片','最後移除所有脫離主體的碎片');text=text.replace('主體外、不在參考內部的脫離連通塊','主體外、不在參考內部的脫離連通塊（獨立檢查另列全部脫離塊）')
(out/'README.md').write_text(text)
print('total filled',sum(r['filled_pixels'] for r in rows),'all detached after',sum(r['after']['all_detached_components'] for r in rows))
