"""Cast6: visible silhouettes, reproducible masks, no character image mutations.

Run with ~/media-tools/venv/bin/python docs/cast-v2/measure_cast6.py.
Manual exclusions/landmarks are in review/cast6/landmarks.json.
"""
from pathlib import Path
import io
import json
import subprocess
import hashlib
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'review/cast6'
IDS = ['feifei', 'apiao', 'sika', 'bulu', 'jiejie', 'hate', 'spirit']
NAMES = ['飛飛', '阿飄', '西卡', '布魯', '微笑姐姐', '哈特', '氣球精靈']
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
FIELDS = [('head_height','頭高'), ('ratio','頭身比'), ('face_width','臉最寬'),
          ('jaw_width','下顎寬'), ('head_width','含髮頭寬'), ('head_area','頭部面積'),
          ('head_area_no_ears','頭部面積扣耳'), ('ear_area','耳朵面積'),
          ('hair_area','可見髮量'), ('shoulder_right','右肩外輪廓單側'),
          ('shoulder_total','y280肩膀外輪廓合計'), ('shoulder_relative_total','下巴+34肩寬合計'), ('torso_length','下巴到腰'),
          ('chin_to_crotch','下巴到胯下'), ('leg_length','腿長'), ('body_height','總高')]
ALPHA = 128
DELTA_E = 18
# Same-program baseline is assigned after all four sprites are measured.
# Independent reviewer numbers are recorded separately; never mix definitions.
REFERENCE = {}

def font(n): return ImageFont.truetype(FONT,n)
def fmt(v): return '無法驗證' if v is None else f'{v:.4f}' if isinstance(v,float) else str(v)
def polys(points):
    im=Image.new('L',(540,720)); d=ImageDraw.Draw(im)
    for p in points: d.polygon([tuple(x) for x in p],fill=255)
    return np.array(im)>0
def largest(m):
    n,l,s,_=cv2.connectedComponentsWithStats(m.astype('uint8'),8)
    return l==(1+np.argmax(s[1:,4])) if n>1 else m
def fill(m):
    a=np.pad(m.astype('uint8'),1); b=a.copy()
    cv2.floodFill(b,None,(0,0),2)
    return (a.astype(bool)|(b==0))[1:-1,1:-1]
def sample(a,xy):
    x,y=xy; return np.median(a[y-4:y+5,x-4:x+5,:3].reshape(-1,3),axis=0)
def lab(rgb): return cv2.cvtColor(np.asarray(rgb,dtype='float32').reshape(-1,1,3)/255,cv2.COLOR_RGB2LAB).reshape(-1,3)

def measure(key,im,s):
    a=np.array(im); opaque=a[:,:,3]>=ALPHA; ygrid=np.indices(opaque.shape)[0]
    exclusion=polys(s['exclude']); chin=s['chin']; cx=s['cx']
    if s.get('blue_hair_crown_boundary'):
        # Follow visible blue tufts instead of cutting a horizontal head top.
        blue=(a[:,:,2].astype(float)>a[:,:,0]*1.15)&(a[:,:,2].astype(float)>a[:,:,1]*1.03)
        exclusion &= ~blue
    head=largest(opaque & (ygrid<=chin) & ~exclusion)
    # Uniform ΔE rule on all four sprites, plus enclosed feature hole filling.
    skin_sample=np.mean([sample(a,p) for p in s['cheeks']],axis=0)
    labs=lab(a[:,:,:3]).reshape(720,540,3)
    skin=(np.linalg.norm(labs-lab(skin_sample)[0],axis=2)<=DELTA_E)&head
    ear_zone=polys(s['ears']); face=fill(largest(skin & ~ear_zone))&head
    ears=np.zeros_like(head)
    for poly in s['ears']: ears |= fill(skin & polys([poly])) & head
    hair=head & ~face & ~ears;long_mask=np.zeros_like(head)
    if 'long_hair' in s:
        t=s['long_hair']; x0,y0,x1,y1=t['box']
        region=np.zeros_like(head);region[y0:y1,x0:x1]=True
        if 'visible_regions' in t:region &= polys(t['visible_regions'])
        region &= ~polys(t.get('exclude',[]))
        # Tail color sampling is separate, as in the reviewer's method.
        color=np.zeros_like(head)
        for point in t.get('samples',[t['sample']]):color |= np.linalg.norm(labs-lab(sample(a,point))[0],axis=2)<=DELTA_E
        candidates=region & opaque & color
        _,components=cv2.connectedComponents((hair|candidates).astype('uint8'),8)
        connected_labels=np.unique(components[hair])
        # Clothing occludes some tails: explicit visible-hair seed pixels join
        # their own connected components, never inferred hidden hair.
        for x,y in t.get('tail_seeds',[]):connected_labels=np.append(connected_labels,components[y,x])
        connected_labels=connected_labels[connected_labels!=0]
        long_mask=candidates & np.isin(components,connected_labels);hair |= long_mask
    yy,xx=np.where(head); top=int(yy.min()); sole=int(np.where(opaque)[0].max())
    widths=[int(np.count_nonzero(row)) for row in face]
    shoulder_x=np.where(opaque[280])[0]; right=int(shoulder_x.max()-cx)
    left=int(cx-shoulder_x.min()); waist=s['waist']; crotch=s['crotch']
    r=dict(id=key,top=top,chin=chin,sole_y=sole,head_height=chin-top+1,
           ratio=(chin-top+1)/(sole-top+1),face_width=max(widths),
           jaw_width=widths[chin-30],head_width=int(xx.max()-xx.min()+1),
           head_area=int(head.sum()),head_area_no_ears=int((head&~ears).sum()),ear_area=int(ears.sum()),hair_area=int(hair.sum()),long_hair_area=int(long_mask.sum()),
           shoulder_right=right,shoulder_total=None if s.get('left_occluded',False) else left+right,
           shoulder_chin34_right=int(np.where(opaque[chin+34])[0].max()-cx),
           shoulder_chin34_left=None if s.get('left_occluded',False) else int(cx-np.where(opaque[chin+34])[0].min()),
           torso_length=waist-chin,chin_to_crotch=None if crotch is None else crotch-chin,
           leg_length=None if crotch is None else sole-crotch,body_height=sole-top+1,
           waist_to_sole=sole-waist,skin_sample_rgb=skin_sample.tolist(),
           visible_only=key=='hate',crotch_estimated=key in ['bulu','spirit'])
    r['shoulder_relative_total']=None if r['shoulder_chin34_left'] is None else r['shoulder_chin34_left']+r['shoulder_chin34_right']
    for name,m in [('hair',hair),('face',face),('ears',ears)]+([('long-hair',long_mask)] if 'long_hair' in s else []):
        Image.fromarray((m*255).astype('uint8')).save(OUT/f'mask-{key}-{name}-binary.png')
    colors=np.zeros_like(a);colors[hair]=[0,225,225,150];colors[face]=[20,210,80,110]
    colors[ears]=[20,90,240,140];colors[exclusion&opaque]=[100,100,100,160]
    overlay=Image.alpha_composite(im,Image.fromarray(colors))
    bg=Image.new('RGBA',(540,800),'#f4f1eb');bg.alpha_composite(overlay)
    d=ImageDraw.Draw(bg)
    for y in [top,chin,280,waist]+([] if crotch is None else [crotch]):
        d.line((100,y,430,y),fill='#a07060',width=1);d.text((5,y-8),str(y),font=font(15),fill='#333333')
    d.text((10,728),'青：髮　綠：臉　藍：耳　灰：排除',font=font(20),fill='#333333')
    d.text((10,758),'alpha≥128；Lab ΔE≤18；y280量肩',font=font(19),fill='#333333')
    bg.convert('RGB').save(OUT/f'mask-{key}.png')
    Image.fromarray((head*255).astype('uint8')).save(ROOT/f'docs/cast-v2/{key}-head-mask.png')
    return r

def labels(r):
    return [f'頭身比 {fmt(r["ratio"])}　頭高 {fmt(r["head_height"])}',
            f'臉寬 {fmt(r["face_width"])}　頭寬 {fmt(r["head_width"])}',
            f'頭部面積 {fmt(r["head_area"])}',f'髮量 {fmt(r["hair_area"])}',
            f'肩寬 {fmt(r.get("shoulder_relative_total"))}／單側{fmt(r["shoulder_right"])}',f'身長 {fmt(r["torso_length"])}　腿長 {fmt(r["leg_length"])}',
            f'總高 {fmt(r["body_height"])}　腳底 {r["sole_y"]}',
            '舊量法參考，未重驗' if r.get('legacy') else '可見範圍；遮蔽不算通過']

def make():
    specs=json.loads((OUT/'landmarks.json').read_text())
    legacy=json.loads(subprocess.check_output(['git','show','3b3f1d9:docs/cast-v2/measurements.json'],cwd=ROOT))
    rows=[];images={}
    for key,name in zip(IDS,NAMES):
        im=Image.open(ROOT/f'assets/chars/{key}.png').convert('RGBA');images[key]=im
        if key in specs:r=measure(key,im,specs[key])
        else:
            old=next(r for r in legacy if r['id']==key)
            r=dict(old,head_width=old['hair_width'],shoulder_right=None,shoulder_total=None,jaw_width=None,chin_to_crotch=None,legacy=True)
            r['chin']=json.loads((ROOT/'docs/cast-v2/landmarks.json').read_text())[key]['chin']
        r['name']=name; rows.append(r)
    blue=next(r for r in rows if r['id']=='bulu')
    REFERENCE.update({f:blue[f] for f,_ in FIELDS})
    deltas={r['id']:{f:None if r.get(f) is None else round((r[f]/REFERENCE[f]-1)*100,2) for f,_ in FIELDS} for r in rows if r['id'] in specs and r['id']!='bulu'}
    # Comparison captions use the independently reviewed values when available.
    caption_path=OUT/'reviewer-labels.json'
    captions=json.loads(caption_path.read_text()) if caption_path.exists() else {}
    for face_mode in [False,True]:
        canvas=Image.new('RGB',(3920,1080 if not face_mode else 800),'#f4f1eb');d=ImageDraw.Draw(canvas)
        d.text((20,12),'cast6 第2輪草稿｜原尺寸不縮放｜'+('頭部下巴對齊' if face_mode else '七人腳底對齊'),font=font(28),fill='#27343c')
        baseline=330 if face_mode else 745
        d.line((0,baseline,3920,baseline),fill='#86969b',width=2)
        for i,r in enumerate(rows):
            im=images[r['id']]
            if face_mode:im=im.crop((0,r['chin']-280,540,r['chin']+100));pos=(i*560+10,50)
            else:pos=(i*560+10,baseline-r['sole_y'])
            canvas.paste(im,pos,im);y=450 if face_mode else 770
            d.text((i*560+20,y),r['name'],font=font(27),fill='#27343c')
            for j,line in enumerate(captions.get(r['id'],labels(r))):d.text((i*560+20,y+40+j*29),line,font=font(20),fill='#43505b')
        filename='cmp-faces.png' if face_mode else 'cmp-cast.png';canvas.save(OUT/filename)
        canvas.save(ROOT/('docs/cmp-cast-v2-faces.png' if face_mode else 'docs/cmp-cast-v2.png'))
    for key in ['jiejie','hate','spirit']:
        r=next(r for r in rows if r['id']==key)
        canvas=Image.new('RGBA',(540,790),'#f4f1eb')
        for k in ['bulu',key]:
            im=images[k].copy();im.putalpha(im.getchannel('A').point(lambda a:round(a*.5)))
            sole=next(x['sole_y'] for x in rows if x['id']==k);canvas.alpha_composite(im,(0,725-sole))
        d=ImageDraw.Draw(canvas);d.line((0,725,540,725),fill='#777777',width=2)
        d.text((10,8),f'布魯 × {r["name"]}｜各50%',font=font(22),fill='#27343c')
        d.text((10,750),'原尺寸，只平移對齊腳底',font=font(22),fill='#27343c')
        canvas.convert('RGB').save(OUT/f'overlay-{key}-vs-blue.png')
        canvas.convert('RGB').save(ROOT/f'docs/cast-v2/overlay-{key}-vs-blue.png')
        before=Image.open(io.BytesIO(subprocess.check_output(['git','show',f'6c0c0f8:assets/chars/{key}.png'],cwd=ROOT))).convert('RGBA')
        original=Image.open(io.BytesIO(subprocess.check_output(['git','show',f'525ab99^:assets/chars/{key}.png'],cwd=ROOT))).convert('RGBA')
        cmp=Image.new('RGB',(1620,790),'#f4f1eb');d=ImageDraw.Draw(cmp)
        for i,(im,title) in enumerate([(original,'原設定'),(before,'cast6 第1輪'),(images[key],'cast6 第2輪草稿')]):
            sole=int(np.where(np.array(im)[:,:,3]>=128)[0].max());cmp.paste(im,(i*540,735-sole),im)
            d.text((i*540+20,10),title,font=font(27),fill='#27343c')
        d.line((0,735,1620,735),fill='#86969b',width=2);cmp.save(OUT/f'before-after-{key}.png')
    audit=Image.new('RGB',(2160,840),'#f4f1eb');ad=ImageDraw.Draw(audit)
    for i,key in enumerate(specs):
        audit.paste(Image.open(OUT/f'mask-{key}.png'),(i*540,40))
        ad.text((i*540+20,8),NAMES[IDS.index(key)],font=font(24),fill='#27343c')
    audit.save(OUT/'mask-audit.png');audit.save(ROOT/'docs/cast-v2/mask-audit.png')
    for key,box in [('jiejie',(295,225,390,405)),('spirit',(210,10,330,70))]:
        crop=images[key].crop(box)
        bg=Image.new('RGBA',crop.size,'#f4f1eb');bg.alpha_composite(crop)
        bg.convert('RGB').resize((crop.width*4,crop.height*4),Image.Resampling.NEAREST).save(OUT/f'detail-{key}.png')
    a=np.array(images['spirit']);op=a[:,:,3]>=ALPHA
    blue_pixels=(a[:,:,2].astype(float)>a[:,:,0]*1.15)&(a[:,:,2].astype(float)>a[:,:,1]*1.03)&op
    crown='精靈皇冠下緣沿藍髮顏色辨識，不再用水平矩形裁頭。藍髮：B>1.15R且B>1.03G，alpha≥128；範圍x215–324。\n\n|列y|藍髮像素|其他不透明（冠或邊線）|\n|---|---:|---:|\n'
    for y in range(44,53):crown+=f'|{y}|{int(blue_pixels[y,215:325].sum())}|{int((op&~blue_pixels)[y,215:325].sum())}|\n'
    crown+='\n舊矩形框敏感度（只作診斷，不用作最終頭高）：\n\n|排除至y|得到頭頂|頭高|\n|---|---:|---:|\n'
    for end in [44,47,50,53]:
        mask=op.copy();mask[specs['spirit']['chin']+1:]=False;mask[:end+1,215:326]=False
        top=int(np.where(largest(mask))[0].min());crown+=f'|{end}|{top}|{specs["spirit"]["chin"]-top+1}|\n'
    crown+='\n最終藍髮首列y44，頭高211。y44僅1個藍色像素，仍有約2–3px邊線判讀不確定性，不稱精密通過。\n'
    (OUT/'crown-boundary.md').write_text(crown)
    hashes={k:hashlib.sha1((ROOT/f'assets/chars/{k}.png').read_bytes()).hexdigest() for k in specs}
    batch=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest()[:16]
    table=f'第2輪同程式可見像素量測；素材批次 `{batch}`。此表不補遮蔽；正式門檻請看小頌獨立量測。\n\n'
    for k,h in hashes.items():table+=f'- `assets/chars/{k}.png` SHA1 `{h}`\n'
    table+='\n|項目|布魯基準|布魯本次重算|姐姐|哈特|精靈|\n|---|---:|---:|---:|---:|---:|\n'
    for f,label in FIELDS:
        cells=[]
        for key in ['jiejie','hate','spirit']:
            r=next(r for r in rows if r['id']==key);delta=deltas[key][f]
            caveat='；遮蔽，不作通過關卡' if key=='hate' and f in ['head_height','ratio','head_width','head_area','head_area_no_ears','hair_area','body_height'] else ''
            if f in ['leg_length','chin_to_crotch'] and key=='spirit':caveat+='；衣襬附近估計'
            cells.append('無法驗證' if delta is None else f'{fmt(r[f])}（{delta:+.2f}%）'+(' 參考、非關卡' if f=='ear_area' else ' 超標' if abs(delta)>5 else '')+caveat)
        table+='|'+label+'|'+fmt(REFERENCE[f])+'|'+fmt(blue[f])+'|'+'|'.join(cells)+'|\n'
    (OUT/'visible-measurements.md').write_text(table)
    table+='\n所有差距只對照本支程式重算的布魯。此程式的膚色/耳朵遮罩與小頌不同，髮量不能混用他的分母；遮蔽部分未補、姐姐腿根被裙子蓋住，因此本表不能證明全部通過。小頌第2輪表另存 xiaosong-r2/。\n'
    (OUT/'visible-measurements.md').write_text(table)
    (OUT/'visible-measurements.json').write_text(json.dumps(dict(alpha=ALPHA,delta_e=DELTA_E,batch=batch,asset_sha1=hashes,reviewer_reference=REFERENCE,rows=rows,deltas=deltas),ensure_ascii=False,indent=2)+'\n')
    (ROOT/'docs/cast-v2/visible-measurements.md').write_text(table)
    (ROOT/'docs/cast-v2/visible-measurements.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'docs/cast-v2/vs-blue.json').write_text(json.dumps(deltas,ensure_ascii=False,indent=2)+'\n')
    print(table)

if __name__=='__main__':make()
