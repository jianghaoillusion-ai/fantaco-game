"""Run: ~/media-tools/venv/bin/python review/cast7/validate_cast7.py

RGBA/局部差異/PNG-WebP 同步/邊緣 alpha/原設定還原驗證。
量測沿用 cast6 的 alpha≥128 / Lab ΔE≤18 定義；不補被遮住的肢體。
"""
import sys,os,json,tempfile,math
sys.dont_write_bytecode=True
from pathlib import Path
import numpy as np
import cv2
from PIL import Image,ImageDraw
from build_cast7 import ROOT,OUT,MAIN,BASE,source,checker,font
sys.path.insert(0,str(ROOT/'docs/cast-v2'))
import measure_cast6 as m
IDS=m.IDS;NAMES=m.NAMES
FIELDS=[('ratio','頭身比'),('head_height','頭高'),('face_width','臉寬'),('head_width','頭部外寬含耳'),('head_width_no_ears','頭部外寬扣耳區（含2px線寬）'),('head_area','頭部面積'),('hair_area','髮量含可見長髮'),('visible_shoulder_span','肩位可見外輪廓全寬，含手臂'),('shoulder_relative_total','可分辨的雙肩寬'),('torso_length','身長：下巴至腰'),('leg_length','腿長'),('body_height','總高：不含配件')]
def delta(v,b):return None if v is None else round(100*(v/b-1),2)
def f(v):return '無法驗證' if v is None else f'{v:.4f}' if isinstance(v,float) else str(v)
def edge(a,roi=None):
 alpha=a[:,:,3];solid=(alpha>=128).astype('uint8');band=cv2.dilate(solid,np.ones((3,3),np.uint8))!=cv2.erode(solid,np.ones((3,3),np.uint8))
 if roi is not None:band &= roi
 total=int(band.sum());mid=int(((alpha>0)&(alpha<255)&band).sum())
 n,l,stats,_=cv2.connectedComponentsWithStats(solid,8)
 return dict(boundary_pixels=total,intermediate_alpha_pixels=mid,intermediate_ratio_percent=round(mid/total*100,2),alpha_levels=int(len(np.unique(alpha))),small_components_under_8px=int(sum(stats[1:,4]<8)))
def main():
 imgs={k:Image.open(ROOT/f'assets/chars/{k}.png').convert('RGBA') for k in IDS}
 specs=json.loads((OUT/'landmarks.json').read_text());rows={}
 assert os.environ.get('TMPDIR','').startswith('/Volumes/外接資料碟/'), 'TMPDIR 必須在外接碟'
 with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as tmp:
  m.OUT=OUT;m.ROOT=Path(tmp);(m.ROOT/'docs/cast-v2').mkdir(parents=True)
  for k in specs:
   rows[k]=m.measure(k,imgs[k],specs[k])
   head=np.array(Image.open(m.ROOT/f'docs/cast-v2/{k}-head-mask.png'))>0;ears=np.array(Image.open(OUT/f'mask-{k}-ears-binary.png'))>0
   ear_zone=cv2.dilate(m.polys(specs[k]['ears']).astype('uint8'),np.ones((5,5),np.uint8))>0
   xx=np.where(head & ~ear_zone)[1];rows[k]['head_width_no_ears']=None if k=='spirit' else int(xx.max()-xx.min()+1)
   if k=='hate':
    m.OUT=Path(tmp);before_hate=m.measure(k,source(BASE,k),specs[k]);m.OUT=OUT
 # Other three characters are unchanged: reuse their existing hand-drawn regions,
 # recompute pixel areas, and explicitly keep unannotated measurements unavailable.
 old=json.loads((ROOT/'docs/cast-v2/landmarks.json').read_text())
 for k in IDS[:3]:
  s=old[k];a=np.array(imgs[k]);mask=(a[:,:,3]>=128)&m.polys(s['polygons']);face=mask&m.polys([s['face_region']]) if 'face_region' in s else np.zeros_like(mask)
  top=int(np.where(mask)[0].min());sole=int(np.where(a[:,:,3]>=128)[0].max());chin=s['chin'];yy,xx=np.where(mask)
  rows[k]=dict(id=k,top=top,chin=chin,sole_y=sole,head_height=chin-top+1,ratio=(chin-top+1)/(sole-top+1),face_width=s['face'][1]-s['face'][0]+1,head_width=int(xx.max()-xx.min()+1),head_area=int(mask.sum()),hair_area=None,shoulder_relative_total=s['shoulder'][1]-s['shoulder'][0]+1,torso_length=None if s['waist'] is None else s['waist']-chin,leg_length=None if s['crotch'] is None else sole-s['crotch'],body_height=sole-top+1,note='未改角色；沿用既有手工標註，髮量未獨立標註；無法驗證處不填推估值')
 for k,r in rows.items():
  xs=np.where(np.array(imgs[k])[:,:,3][r['chin']+34]>=128)[0];r['visible_shoulder_span']=int(xs.max()-xs.min())
 blue=rows['bulu'];deltas={k:{field:delta(rows[k].get(field),blue[field]) for field,_ in FIELDS} for k in ['jiejie','hate','spirit']}
 # Do not turn a hidden shoulder into a mirrored passing result.
 validation={}
 for k in ['jiejie','hate','spirit']:
  a=np.array(imgs[k]);original=np.array(source(BASE if k=='hate' else MAIN,k));ref=original.copy()
  if k=='spirit':
   assert not np.any(original[717:,:,3]), '下移不得裁到原圖內容'
   ref=np.zeros_like(original);ref[3:]=original[:-3]
  validation[k]=dict(size=list(imgs[k].size),mode=imgs[k].mode,sole_y=rows[k]['sole_y'],edge=edge(a),webp_matches_png=bool(np.array_equal(a,np.array(Image.open(ROOT/f'assets/chars/{k}.webp').convert('RGBA')))),source_aligned_changed_pixels=int(np.any(a!=ref,axis=2).sum()))
  assert imgs[k].size==(540,720) and validation[k]['webp_matches_png']
  assert rows[k]['sole_y']==685
  if k!='hate':assert validation[k]['source_aligned_changed_pixels']==0
  box={'jiejie':(195,65,235,185),'spirit':(195,165,240,255),'hate':(330,50,380,170)}[k]
  crop=checker(imgs[k].crop(box));crop.resize((crop.width*6,crop.height*6),Image.Resampling.NEAREST).save(OUT/f'edge-detail-{k}.png')
 roi=np.zeros((720,540),bool);roi[45:171,322:380]=True
 validation['hate']['head_width_before']=before_hate['head_width']
 validation['hate']['head_width_after']=rows['hate']['head_width']
 validation['spirit']['cropped_source_bottom_alpha_pixels']=int(np.count_nonzero(np.array(source(MAIN,'spirit'))[717:,:,3]))
 validation['hate']['hair_edge_before']=edge(np.array(source(BASE,'hate')),roi)
 validation['hate']['hair_edge_after']=edge(np.array(imgs['hate']),roi)
 diff=np.any(np.array(imgs['hate'])!=np.array(source(BASE,'hate')),axis=2)
 validation['hate']['outside_roi_changed']=int((diff&~roi).sum());assert validation['hate']['outside_roi_changed']==0
 validation['status']='部分完成：哈特局部修邊，姐姐／精靈回復指定原設定；比例未修改且未通過全部≤5%'
 validation['alpha_definition']='alpha≥128 輪廓的3×3膨脹減侵蝕帶；其中 1..254 像素 / 全帶像素。非全圖半透明比例；比例非零不能證明無背景殘色或所有邊緣無鋸齒。'
 validation['visual_caveat']='姐姐／精靈原圖外緣帶青色描邊／暈邊；保留原圖，尚未清理，不宣稱全部邊緣通過。'
 (OUT/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
 (OUT/'measurements.json').write_text(json.dumps(dict(rows=rows,deltas=deltas),ensure_ascii=False,indent=2)+'\n')
 table='本次是原設定還原基準，不是比例調整完成版。頭身比＝不含配件頭高／不含配件總高。\n\n|項目|布魯|姐姐（差距）|哈特（差距）|精靈（差距）|\n|---|---:|---:|---:|---:|\n'
 for field,label in FIELDS:
  cells=[]
  for k in ['jiejie','hate','spirit']:
   v=rows[k].get(field);d=deltas[k][field];cells.append('無法驗證' if v is None else f'{f(v)}（{d:+.2f}%）'+(' 超標' if abs(d)>5 else ''))
  table+='|'+label+'|'+f(blue[field])+'|'+'|'.join(cells)+'|\n'
 table+='\n姐姐髮量接近基準只發生在未縮放的原尺寸；若長髮隨頭放大1.45倍，該面積會乘2.1025，不能當縮放後通過。右側未舉手的半肩寬另列下方，不把它鏡射當雙肩通過。\n'
 table+='\n|右側半肩寬（下巴+34列）|布魯|姐姐|哈特|精靈|\n|---|---:|---:|---:|---:|\n|像素|'+str(blue['shoulder_chin34_right'])+'|'+ '|'.join(str(rows[k]['shoulder_chin34_right'])+f"（{delta(rows[k]['shoulder_chin34_right'],blue['shoulder_chin34_right']):+.2f}%）" for k in ['jiejie','hate','spirit'])+'|\n'
 table+='\n精靈扣耳頭寬無法驗證：耳朵遮罩未完整包住耳尖，不用尚含耳尖的156或149當扣耳數字。該格不參與可行性判斷。\n'
 table+='\n肩寬：舉手或手臂遮蔽時不使用鏡射補成合計。姐姐裙下腿根無法直接看見；精靈及布魯胯點仍有衣物判讀誤差。臉與髮面積採同一色差演算法，但受陰影影響；請搭配遮罩圖，不能把四位小數當量測精度。哈特帽下遮蔽頭髮不補畫。\n'
 (OUT/'measurements.md').write_text(table)
 # Uniform scaling feasibility: head height is bounded indirectly by ratio AND total height,
 # so this test does not add a stricter head-height requirement to the user's list.
 feasibility='等比縮放：長度乘 s、面積乘 s²。頭身比和總高都允許±5%，因此頭高允許布魯頭高的 0.95² 至 1.05²；以下採這個較寬鬆範圍。\n\n|角色|頭身比＋總高允許 s|頭部面積允許 s|臉寬允許 s|頭部外寬含耳允許 s|髮量允許 s|頭高與面積交集|\n|---|---|---|---|---|---|---|\n'
 ranges={}
 for k in ['jiejie','spirit']:
  r=rows[k];hr=[blue['head_height']*.95**2/r['head_height'],blue['head_height']*1.05**2/r['head_height']];ar=[math.sqrt(blue['head_area']*.95/r['head_area']),math.sqrt(blue['head_area']*1.05/r['head_area'])]
  overlap=max(hr[0],ar[0])<=min(hr[1],ar[1]);ranges[k]=dict(head_scale_range=hr,area_scale_range=ar,overlap=overlap)
  fr=[blue['face_width']*.95/r['face_width'],blue['face_width']*1.05/r['face_width']];wr=[blue['head_width']*.95/r['head_width'],blue['head_width']*1.05/r['head_width']];hair=[math.sqrt(blue['hair_area']*.95/r['hair_area']),math.sqrt(blue['hair_area']*1.05/r['hair_area'])]
  ranges[k].update(face_scale_range=fr,head_width_scale_range=wr,hair_area_scale_range=hair,required_ranges_intersect=max(hr[0],ar[0],fr[0],hair[0])<=min(hr[1],ar[1],fr[1],hair[1]))
  feasibility+=f'|{NAMES[IDS.index(k)]}|{hr[0]:.4f}–{hr[1]:.4f}|{ar[0]:.4f}–{ar[1]:.4f}|{fr[0]:.4f}–{fr[1]:.4f}|{wr[0]:.4f}–{wr[1]:.4f}|{hair[0]:.4f}–{hair[1]:.4f}|'+('有' if overlap else '無')+'|\n'
 feasibility+='\n這是目前可見像素遮罩下的幾何檢查；沒有假設配件算頭，也沒有用改頭型湊數字。姐姐長髮另計入髮量，裙子遮蔽不補估。姐姐的兩個允許區間只差約0.006，少量標註誤差可能改變是否相交，不能僅憑這一項宣稱數學上絕對無解；可見長髮量與臉寬仍另有限制。要同時達標，需要放寬原頭形／等比縮放／部分比例門檻之一。精靈修正白色冠底遮罩後，頭高與面積兩項已有交集；臉寬可與該交集相容；必要項目髮量的區間則不相交，不能沿用舊的兩項無交集結論。頭高區間只是必要條件，交集非空也不代表整個人可行。姐姐的臉寬與面積區間已有明顯衝突，不依靠0.006的邊界差。精靈高皇冠另有畫布空間衝突。未經使用者決定，不做此類造型改動。\n'
 (OUT/'feasibility.md').write_text(feasibility);(OUT/'feasibility.json').write_text(json.dumps(ranges,indent=2)+'\n')
 c=Image.new('RGB',(3920,1120),'#f4f1eb');d=ImageDraw.Draw(c);d.text((20,10),'cast7｜哈特局部修邊；姐姐／精靈原設定還原，比例待決定',font=font(27),fill='#222');baseline=735;d.line((0,baseline,3920,baseline),fill='#888',width=2)
 for i,k in enumerate(IDS):
  r=rows[k];im=imgs[k];c.paste(im,(i*560+10,baseline-r['sole_y']),im);d.text((i*560+20,755),NAMES[i],font=font(25),fill='#222')
  lines=[f'頭身比 {f(r["ratio"])}　臉寬 {f(r["face_width"])}',f'頭部面積 {r["head_area"]}　頭高 {r["head_height"]}',f'髮量 {f(r["hair_area"])}',f'肩位外輪廓 {f(r["visible_shoulder_span"])}（含手臂）',f'身長 {f(r["torso_length"])}　腿長 {f(r["leg_length"])}',f'總高 {r["body_height"]}　腳底 {r["sole_y"]}', '未改角色，依既有標註' if i<3 else '未通過全部比例門檻' if k in ['jiejie','spirit'] else '帽下遮蔽未補估' if k=='hate' else '基準']
  for j,line in enumerate(lines):d.text((i*560+20,800+j*35),line,font=font(22),fill='#333')
 c.save(OUT/'cmp-seven.png')
 for k in ['jiejie','hate','spirit']:
  c=Image.new('RGBA',(540,770),'#f4f1eb');d=ImageDraw.Draw(c)
  for key in ['bulu',k]:
   im=imgs[key].copy();im.putalpha(im.getchannel('A').point(lambda a:round(a*.5)));c.alpha_composite(im,(0,0))
  d.line((0,685,540,685),fill='#777');d.text((10,715),f'布魯 × {NAMES[IDS.index(k)]}｜各50%｜y685',font=font(22),fill='#222');c.convert('RGB').save(OUT/f'overlay-{k}-vs-blue.png')
  c=Image.new('RGB',(1080,790),'#f4f1eb');d=ImageDraw.Draw(c)
  for i,(im,title) in enumerate([(source(BASE if k=='hate' else MAIN,k),'cast6 定案' if k=='hate' else 'main 指定原設定'),(imgs[k],'cast7 局部修邊' if k=='hate' else 'cast7 還原；比例未調整')]):
   c.paste(im,(i*540,50),im);d.text((i*540+15,10),title,font=font(23),fill='#222')
  d.line((0,735,1080,735),fill='#777');c.save(OUT/f'before-after-{k}.png')
 print(table);print(feasibility);print(json.dumps(validation,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
