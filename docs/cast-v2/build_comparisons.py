"""Rebuild measurements and equal-scale comparisons. Never modifies character assets."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
IDS = ['feifei', 'apiao', 'sika', 'bulu', 'jiejie', 'hate', 'spirit']
NAMES = ['飛飛', '阿飄', '西卡', '布魯', '微笑姐姐', '哈特', '氣球精靈']
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
FIELDS = [('head_height','頭高'),('ratio','頭身比'),('face_width','臉寬'),('hair_width','含髮寬'),('head_area','頭部面積'),('hair_area','可見髮量'),('shoulder_width','肩寬'),('torso_length','身長'),('leg_length','腿長'),('body_height','總高'),('waist_to_sole','腰到鞋底')]
def font(n): return ImageFont.truetype(FONT,n)
def fmt(value): return '不可直接量' if value is None else (f'{value:.4f}' if isinstance(value,float) else str(value))
def metrics(im,s):
    a=np.array(im)[:,:,3]
    mask=Image.new('L',im.size);d=ImageDraw.Draw(mask)
    for p in s['polygons']: d.polygon([tuple(x) for x in p],fill=255)
    for p in s.get('exclude',[]): d.polygon([tuple(x) for x in p],fill=0)
    m=(np.array(mask)>0)&(a>=128)
    yy,xx=np.where(m)
    sole=int(np.where(a>=128)[0].max())
    head=s['chin']-s['top']+1;h=sole-s['top']+1
    hair_area=None
    if 'face_region' in s:
        face=Image.new('L',im.size);ImageDraw.Draw(face).polygon([tuple(p) for p in s['face_region']],fill=255)
        hair=m & (np.array(face)==0)
        hair_area=int(hair.sum())
    return dict(head_height=head,ratio=head/h,face_width=s['face'][1]-s['face'][0]+1,hair_width=int(xx.max()-xx.min()+1),head_area=int(m.sum()),hair_area=hair_area,shoulder_width=s['shoulder'][1]-s['shoulder'][0]+1,torso_length=None if s['waist'] is None else s['waist']-s['chin'],leg_length=None if s['crotch'] is None else sole-s['crotch'],body_height=h,waist_to_sole=None if s['waist'] is None else sole-s['waist'],sole_y=sole),m

def labels(r):
    return [f'頭身比 {r["ratio"]:.4f}　頭高 {r["head_height"]}',f'臉寬 {r["face_width"]}　含髮寬 {r["hair_width"]}',f'頭部面積 {r["head_area"]:,} px²',f'髮量 {fmt(r["hair_area"])} px²',f'肩寬 {r["shoulder_width"]}　身長 {fmt(r["torso_length"])}',f'腿長 {fmt(r["leg_length"])}',f'總高 {r["body_height"]}　腳底 y={r["sole_y"]}',f'腰到鞋底 {fmt(r["waist_to_sole"])}']

def make():
    specs=json.loads((OUT/'landmarks.json').read_text())
    # Exact common 1:1 scale, generous columns to avoid overlapping sprites.
    cell=560;w=cell*7
    full=Image.new('RGB',(w,1090),'#f4f1eb');d=ImageDraw.Draw(full)
    faces=Image.new('RGB',(w,850),'#f4f1eb');fd=ImageDraw.Draw(faces)
    audit=Image.new('RGB',(w,790),'#f4f1eb');ad=ImageDraw.Draw(audit)
    d.text((20,12),'PR #5 草稿｜七人同倍率、鞋底對齊｜數值為原圖像素',font=font(27),fill='#263640')
    fd.text((20,12),'頭部同倍率、下巴對齊｜帽、冠、蝴蝶結不計頭部',font=font(27),fill='#263640')
    d.line((0,745,w,745),fill='#a4b0b5',width=2)
    fd.line((0,330,w,330),fill='#a4b0b5',width=2)
    rows=[];images={};masks={}
    for i,(key,name) in enumerate(zip(IDS,NAMES)):
        im=Image.open(ROOT/'assets/chars'/f'{key}.png').convert('RGBA');s=specs[key]
        r,m=metrics(im,s);r.update(id=key,name=name);rows.append(r);images[key]=im;masks[key]=m
        Image.fromarray((m*255).astype('uint8')).save(OUT/f'{key}-head-mask.png')
        full.paste(im,(cell*i+10,745-r['sole_y']),im)
        # Fixed 540x410 crop and 1:1 scale for every head; no individual magnification.
        crop=im.crop((0,s['chin']-280,540,s['chin']+130))
        faces.paste(crop,(cell*i+10,50),crop)
        for canvas,draw,y in [(full,d,775),(faces,fd,490)]:
            draw.text((cell*i+20,y),name,font=font(27),fill='#263640')
            for j,line in enumerate(labels(r)):draw.text((cell*i+20,y+43+j*29),line,font=font(21),fill='#43505b')
        layer=np.zeros((720,540,4),dtype=np.uint8);layer[m]=[255,0,100,110]
        mini=Image.alpha_composite(im,Image.fromarray(layer));md=ImageDraw.Draw(mini)
        md.line((s['shoulder'][0],s['shoulder_y'],s['shoulder'][1],s['shoulder_y']),fill='#00a060',width=3)
        for field,color in [('waist','#ff9000'),('crotch','#8040ff')]:
            if s[field] is not None:md.line((180,s[field],360,s[field]),fill=color,width=2)
        audit.paste(mini,(cell*i+10,10),mini);ad.text((cell*i+20,742),name,font=font(25),fill='#263640')
    full.save(ROOT/'docs/cmp-cast-v2.png');faces.save(ROOT/'docs/cmp-cast-v2-faces.png');audit.save(OUT/'mask-audit.png')
    blue=next(r for r in rows if r['id']=='bulu');deltas={}
    for key in ['jiejie','hate','spirit']:
        r=next(r for r in rows if r['id']==key)
        deltas[key]={f:None if r[f] is None else round((r[f]/blue[f]-1)*100,2) for f,_ in FIELDS}
        canvas=Image.new('RGBA',(540,790),'#f4f1eb')
        for k in ['bulu',key]:
            p=images[k].copy();p.putalpha(p.getchannel('A').point(lambda a:round(a*.5)))
            canvas.alpha_composite(p,(0,40+blue['sole_y']-specs[k]['feet']))
        od=ImageDraw.Draw(canvas);od.line((0,725,540,725),fill='#444444',width=2)
        od.text((12,8),f'布魯 × {r["name"]}｜各 50%｜原尺寸',font=font(21),fill='#263640')
        od.text((12,750),'只平移對齊鞋底，不另外縮放人物',font=font(21),fill='#263640')
        canvas.convert('RGB').save(OUT/f'overlay-{key}-vs-blue.png')
    (OUT/'measurements.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    (OUT/'vs-blue.json').write_text(json.dumps(deltas,ensure_ascii=False,indent=2)+'\n')
    table='|角色|'+ '|'.join(label for _,label in FIELDS)+'|\n|---|'+ '|'.join(['---:']*len(FIELDS))+'|\n'
    for r in rows:table+='|'+r['name']+'|'+'|'.join(fmt(r[f]) for f,_ in FIELDS)+'|\n'
    table+='\n差距按原圖數值直接對布魯計算（不是先除以各自身高）。不可直接量不算通過。\n\n|項目|布魯|姐姐（差距）|哈特（差距）|精靈（差距）|\n|---|---:|---:|---:|---:|\n'
    for f,label in FIELDS:
        cells=[]
        for key in ['jiejie','hate','spirit']:
            r=next(r for r in rows if r['id']==key);delta=deltas[key][f]
            caveat = ''
            if key == 'hate' and f in ['head_area', 'hair_area']:
                caveat = '，遮蔽，無法驗證完整頭部'
            elif key == 'spirit' and f == 'leg_length':
                caveat = '，下襬附近估計'
            elif key == 'jiejie' and f in ['head_height', 'ratio', 'hair_width']:
                caveat = '，壓線，不能穩定確認'
            elif delta is not None and abs(delta)>5:
                caveat = '，超標'
            cells.append('無法驗證' if delta is None else f'{fmt(r[f])}（{delta:+.2f}%'+caveat+'）')
        table+='|'+label+'|'+fmt(blue[f])+'|'+'|'.join(cells)+'|\n'
    table += '\n肩線受衣服和動作影響；髮量為可見像素估計。座標約有2–5px判讀誤差，不能把接近門檻當成精密驗收通過。\n'
    (OUT/'measurements.md').write_text(table);print(table)
if __name__=='__main__': make()
