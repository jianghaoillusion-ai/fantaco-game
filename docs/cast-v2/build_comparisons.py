"""Rebuild draft comparisons from explicit visible-head polygons; no asset reshaping."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
IDS=['feifei','apiao','sika','bulu','jiejie','hate','spirit']
NAMES=['飛飛','阿飄','西卡','布魯','新姐姐','新哈特','新精靈']
FONT='/System/Library/Fonts/STHeiti Medium.ttc'
def font(n):return ImageFont.truetype(FONT,n)
def make():
 specs=json.loads((OUT/'landmarks.json').read_text())
 full=Image.new('RGB',(7*360,940),'#f4f1eb');d=ImageDraw.Draw(full)
 faces=Image.new('RGB',(7*360,440),'#f4f1eb');fd=ImageDraw.Draw(faces)
 audit=Image.new('RGB',(7*360,540),'#f4f1eb');ad=ImageDraw.Draw(audit)
 d.text((24,16),'角色草稿 v2　同一腳底線　等比呈現',font=font(28),fill='#293541')
 d.line((0,736,2520,736),fill='#a4b0b5',width=2)
 rows=[]
 for i,(key,name) in enumerate(zip(IDS,NAMES)):
  im=Image.open(ROOT/'assets/chars'/f'{key}.png').convert('RGBA');s=specs[key]
  mask=Image.new('L',im.size);md=ImageDraw.Draw(mask)
  for poly in s['polygons']:md.polygon([tuple(p) for p in poly],fill=255)
  for poly in s.get('exclude',[]):md.polygon([tuple(p) for p in poly],fill=0)
  a=np.array(im)[:,:,3];m=(np.array(mask)>0)&(a>=128)
  yy,xx=np.where(m);area=int(m.sum());width=int(xx.max()-xx.min()+1)
  head=s['chin']-s['top']+1;body=s['feet']-s['top']+1;ratio=head/body
  rows.append(dict(id=key,name=name,head_height=head,face_width=s['face'][1]-s['face'][0]+1,hair_width=width,head_area=area,body_height=body,ratio=round(ratio,4)))
  Image.fromarray((m*255).astype('uint8')).save(OUT/f'{key}-head-mask.png')
  # Common scale: 0.92; only translation aligns soles, not height normalization.
  scale=.92;pic=im.resize((497,662),Image.Resampling.LANCZOS)
  full.paste(pic,(i*360+(360-497)//2,736-round(s['feet']*scale)),pic)
  d.text((i*360+18,762),name,font=font(25),fill='#263640')
  for j,line in enumerate([f'頭高 {head}　臉寬 {rows[-1]["face_width"]} px',f'含髮寬 {width} px',f'頭部面積 {area:,} px²',f'頭身比 {ratio:.3f}']):d.text((i*360+18,800+j*29),line,font=font(19),fill='#43505b')
  # Uniform face magnification; includes head and ears; hair below chin stays in area mask.
  cx=(s['face'][0]+s['face'][1])/2;box=(round(cx-135),s['top'],round(cx+135),s['top']+270)
  crop=im.crop(box).resize((324,324),Image.Resampling.LANCZOS);faces.paste(crop,(i*360+18,35),crop);fd.text((i*360+24,380),name,font=font(26),fill='#263640')
  mini=im.copy();overlay=np.zeros((720,540,4),dtype=np.uint8);overlay[m]=[255,0,100,110];mini=Image.alpha_composite(mini,Image.fromarray(overlay));mini.thumbnail((324,480));audit.paste(mini,(i*360+18,20),mini);ad.text((i*360+18,500),name,font=font(24),fill='#263640')
 full.save(ROOT/'docs/cmp-cast-v2.png');faces.save(ROOT/'docs/cmp-cast-v2-faces.png');audit.save(OUT/'mask-audit.png')
 (OUT/'measurements.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 table='|角色|頭高 px|臉寬 px|含髮外框寬 px|頭部面積 px²|身高 px|頭身比|\n|---|---:|---:|---:|---:|---:|---:|\n'
 for r in rows:table+='|'+ '|'.join(str(r[k]) for k in ['name','head_height','face_width','hair_width','head_area','body_height','ratio'])+'|\n'
 (OUT/'measurements.md').write_text(table)
 print(table)
if __name__=='__main__':make()
