"""量測與審查圖：所有像素門檻 alpha>=128；不修改遊戲圖。
小頌 cast7 基準值獨立列出；新圖色彩分割為暫測，尚未通過小頌校準。
"""
from pathlib import Path
import os,io,json,subprocess,hashlib
import numpy as np,cv2
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2];O=R/'review/cast8';os.chdir(R)
IDS=['feifei','apiao','sika','bulu','jiejie','hate','spirit'];NAMES=['飛飛','阿飄','西卡','布魯','微笑姐姐','哈特','氣球精靈']
F='/System/Library/Fonts/STHeiti Medium.ttc'
def font(n):return ImageFont.truetype(F,n)
def src(k,ref):return Image.open(io.BytesIO(subprocess.check_output(['git','show',f'{ref}:assets/chars/{k}.png']))).convert('RGBA')
def poly(ps):
 m=Image.new('L',(540,720));d=ImageDraw.Draw(m)
 for p in ps:d.polygon([tuple(z) for z in p],fill=255)
 return np.array(m)>0

def largest(m):
 n,l,s,_=cv2.connectedComponentsWithStats(m.astype('uint8'),8);return l==1+np.argmax(s[1:,4])
def fill(m):
 a=np.pad(m.astype('uint8'),1);b=a.copy();cv2.floodFill(b,None,(0,0),2);return (a.astype(bool)|(b==0))[1:-1,1:-1]
imgs={k:Image.open(R/f'assets/chars/{k}.png').convert('RGBA') for k in IDS}
reference={'head_height':216.5,'ratio':216.5/655,'face_width':133,'head_width':204,'head_area':32965,'face_area':15867,'hair_area':15553,'hair_all':15553,'shoulder_width':161,'shoulder_right':83,'torso_length':147.5,'leg_length':214,'total_height':655,'with_hat':655,'waist_to_sole':291,'top':30,'chin':246.5,'waist':394,'sole':685}
rows={'bulu':reference,'hate':dict(head_height=217.5,ratio=217.5/657,face_width=137,head_width=194,head_area=32626,face_area=15478,hair_area=15562,hair_all=15562,shoulder_width=None,shoulder_right=83,torso_length=149.5,leg_length=223,total_height=657,with_hat=663,waist_to_sole=290,top=28,chin=245.5,waist=395,sole=685)}
spec={
'jiejie':dict(chin=248,waist=391,crotch=None,cx=268,ears=[[(329,115),(356,115),(356,155),(334,164)]],exclude=[[(0,0),(190,0),(190,250),(0,250)],[(0,0),(540,0),(540,41),(0,41)]]),
'spirit':dict(chin=313,waist=421,crotch=545,cx=270,ears=[[(150,236),(199,238),(221,290),(181,273)],[(333,233),(399,204),(375,260),(334,279)]],exclude=[])}
for k,s in spec.items():
 a=np.array(imgs[k]);y,x=np.indices((720,540));solid=a[:,:,3]>=128;head=solid&(y<=s['chin'])
 for p in s['exclude']:head &= ~poly([p])
 if k=='spirit':
  blue=(a[:,:,2]>a[:,:,0].astype(float)*1.15)&(a[:,:,2]>a[:,:,1].astype(float)*1.03);head&=(y>=190)|(cv2.dilate(blue.astype('uint8'),np.ones((5,5),np.uint8))>0);head&=~(np.array(Image.open(O/'mask-spirit-crown.png'))>=128)
 head=largest(head)
 hsv=cv2.cvtColor(a[:,:,:3],cv2.COLOR_RGB2HSV);earzone=poly(s['ears'])
 skin=(hsv[:,:,0]<26)&(hsv[:,:,1]>45)&(hsv[:,:,1]<180)&(hsv[:,:,2]>140)&head&~earzone
 # Closing small colour gaps prevents eyelashes/white eye reflections from leaking into hair.
 skin=cv2.morphologyEx(skin.astype('uint8'),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))>0
 face=fill(largest(skin))&head&~earzone
 if k=='jiejie':
  original_face=[(228,127),(242,121),(256,118),(269,117),(282,112),(298,117),(308,132),(309,155),(302,170),(285,183),(266,188),(248,183),(235,172),(229,154)]
  roi=poly([[(round(267+(px-267)*1.85),round(248+(py-187)*1.85)) for px,py in original_face]])
  face &= roi
 ears=head&earzone;hair=head&~face&~ears
 hy,hx=np.where(head);fwrow=int(np.argmax(face.sum(1)));fwxs=np.where(face[fwrow])[0];noearx=np.where(head&~(cv2.dilate(earzone.astype('uint8'),np.ones((11,11),np.uint8))>0))[1];sole=int(np.where(solid)[0].max());top=int(hy.min());chin=s['chin']+.5
 sr=solid[int(chin)+34];xs=np.where(sr)[0];runs=np.split(xs,np.where(np.diff(xs)>1)[0]+1);body=next((z for z in runs if s['cx'] in z),max(runs,key=len))
 long=hair.copy()
 if k=='jiejie':
  roi=poly([[(192,249),(259,249),(225,350),(186,381),(163,350)],[(314,249),(377,249),(411,315),(349,297),(341,382),(300,380)]])
  brown=(hsv[:,:,0]<25)&(hsv[:,:,1]>80)&(hsv[:,:,2]<185)&solid
  long|=brown&roi&(y>chin)
 rows[k]=dict(head_height=chin-top,ratio=(chin-top)/(sole-top),face_width=int(max(face.sum(1))),head_width=int(hx.max()-hx.min()+1),head_width_no_ears=int(noearx.max()-noearx.min()+1),face_width_row=fwrow,face_width_x=[int(fwxs.min()),int(fwxs.max())],head_area=int(head.sum()),face_area=int(face.sum()),hair_area=int(hair.sum()),hair_all=int(long.sum()),shoulder_width=len(body),shoulder_right=int(body.max()-s['cx']),torso_length=s['waist']-chin,leg_length=None if s['crotch'] is None else sole-s['crotch'],waist_to_sole=sole-s['waist'],total_height=sole-top,with_hat=sole-int(np.where(solid)[0].min()),top=top,chin=chin,waist=s['waist'],sole=sole)
 c=a.copy();c[hair,:3]=[0,190,210];c[face,:3]=[30,210,60];c[ears,:3]=[230,130,20]
 Image.fromarray(c).save(O/f'mask-{k}.png')
 for name,mask in [('head',head),('face',face),('hair',hair),('ears',ears),('hair-all',long)]:Image.fromarray((mask*255).astype('uint8')).save(O/f'mask-{k}-{name}.png')
old=json.loads((R/'review/cast7/measurements.json').read_text())['rows']
for k in IDS[:3]:
 a=old[k];rows[k]={**a,'total_height':a['body_height']-1,'with_hat':int(np.where(np.array(imgs[k])[:,:,3]>=128)[0].max()-np.where(np.array(imgs[k])[:,:,3]>=128)[0].min()),'shoulder_width':a['visible_shoulder_span'],'hair_all':None,'legacy':True}
fields=[('ratio','頭身比'),('face_width','臉寬'),('head_width','含髮頭寬'),('head_area','頭部面積'),('hair_area','髮量：下巴以上'),('hair_all','髮量：含長髮'),('shoulder_width','肩全寬含袖'),('shoulder_right','右肩單邊'),('torso_length','身長'),('leg_length','腿長'),('total_height','總高不含配件'),('with_hat','總高含配件'),('head_height','頭高'),('waist_to_sole','腰到腳底')]
def fmt(v):return '無法量測' if v is None else f'{v:.4f}' if isinstance(v,float) and v<1 else f'{v:g}'
lines=['# cast8 暫測數字（尚未驗收）','','布魯、哈特使用小頌 cast7 第2次審查值（哈特逐像素未變）。新圖遵守髮頂／下巴／腰線定義，以像素遮罩暫測；臉髮色彩分割仍有誤差，不能宣稱 ±5% 全過。遮罩一併交付。飛飛、阿飄、西卡沿用 cast7 標記，未重新獨立驗收。','','|項目|布魯基準|姐姐暫測（差距）|哈特定稿（差距）|精靈暫測（差距）|','|---|---:|---:|---:|---:|']
for f,label in fields:
 cells=[]
 for k in ['jiejie','hate','spirit']:
  v=rows[k].get(f);b=reference.get(f);cells.append('無法量測' if v is None or b is None else f'{fmt(v)}（{100*(v/b-1):+.2f}%）')
 lines.append('|'+label+'|'+fmt(reference.get(f))+'|'+'|'.join(cells)+'|')
(O/'measurements.md').write_text('\n'.join(lines)+'\n');(O/'measurements.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
# Validation is independent of proportional segmentation.
validation={}
for k in ['jiejie','hate','spirit']:
 a=np.array(imgs[k]);alpha=a[:,:,3];solid=(alpha>=128).astype('uint8');band=cv2.dilate(solid,np.ones((3,3),np.uint8))!=cv2.erode(solid,np.ones((3,3),np.uint8));hard=(alpha==255)&(cv2.dilate((alpha==0).astype('uint8'),np.ones((3,3),np.uint8))>0)&band
 n,l,ss,_=cv2.connectedComponentsWithStats(solid,8)
 validation[k]=dict(size=list(imgs[k].size),mode=imgs[k].mode,sole=int(np.where(solid)[0].max()),webp_equal=bool(np.array_equal(a,np.array(Image.open(R/f'assets/chars/{k}.webp').convert('RGBA')))),hard_edge_pixels=int(hard.sum()),edge_mid_alpha_percent=float(100*((alpha>0)&(alpha<255)&band).sum()/band.sum()),small_components_under8=int(sum(ss[1:,4]<8)),alpha_positive_components=int(cv2.connectedComponents((alpha>0).astype('uint8'),8)[0]-1),sha256=hashlib.sha256((R/f'assets/chars/{k}.png').read_bytes()).hexdigest())
 assert validation[k]['size']==[540,720] and validation[k]['sole']==685 and validation[k]['webp_equal']
validation['hate_pixels_changed_vs_5b125dc']=int(np.any(np.array(imgs['hate'])!=np.array(src('hate','5b125dc')),axis=2).sum())
assert validation['hate_pixels_changed_vs_5b125dc']==0
validation['unchanged_files']={f'assets/chars/{k}.{ext}':(R/f'assets/chars/{k}.{ext}').read_bytes()==subprocess.check_output(['git','show',f'f346cdf:assets/chars/{k}.{ext}']) for k in ['feifei','apiao','sika','bulu','hate'] for ext in ['png','webp']}
assert all(validation['unchanged_files'].values())
(O/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
# Review figures.
def bg(im,color='#f3f0ea'):
 b=Image.new('RGBA',im.size,color);b.alpha_composite(im);return b.convert('RGB')
def label(im,txt,pos=(12,8),size=24):ImageDraw.Draw(im).text(pos,txt,font=font(size),fill='#252525')
for k in ['jiejie','hate','spirit']:
 a=np.array(imgs[k]).astype(float);b=np.array(imgs['bulu']).astype(float);aa=a[:,:,3:4]/255;ba=b[:,:,3:4]/255
 mix=.5*aa*a[:,:,:3]+.5*ba*b[:,:,:3]+(1-.5*aa-.5*ba)*245
 c=Image.new('RGB',(1080,800),'#f3f0ea');c.paste(Image.fromarray(mix.astype('uint8')),(0,55));c.paste(bg(imgs[k]),(540,55));label(c,'兩人各50%・腳底 y685');label(c,NAMES[IDS.index(k)]+' 新版',(552,8));ImageDraw.Draw(c).line((0,740,1079,740),fill='#d85055',width=2);dd=ImageDraw.Draw(c)
 for key,color in [('top','#0098b0'),('chin','#d83830'),('waist','#b08020')]:
  py=rows[k][key]+55;dd.line((540,py,1079,py),fill=color,width=1);dd.text((548,py-20),f'{key} y{rows[k][key]}',font=font(16),fill=color)
 c.save(O/f'overlay-{k}-vs-blue.png')
 boxes={'jiejie':[(180,70,370,260),(188,225,374,280),(160,365,340,420)],'spirit':[(155,115,398,210),(202,275,342,337),(150,350,195,410)],'hate':[(310,35,390,185),(168,170,230,248),(215,240,330,280)]}[k]
 c=Image.new('RGB',(1620,1100),'#f3f0ea');c.paste(bg(imgs[k]),(0,70));label(c,NAMES[IDS.index(k)]+' 邊緣、接縫放大')
 for i,box in enumerate(boxes):
  crop=imgs[k].crop(box);scale=min(500/crop.width,310/crop.height);size=(round(crop.width*scale),round(crop.height*scale));z=crop.resize(size,Image.Resampling.NEAREST)
  for j,color in enumerate(['white','#302d38']):c.paste(bg(z,color),(550+j*530,65+i*340))
  label(c,str(box),(550,40+i*340),18)
 c.save(O/f'edges-{k}.png')
for k in ['jiejie','spirit']:
 c=Image.new('RGB',(1080,790),'#f3f0ea');c.paste(bg(src(k,'525ab99')),(0,55));c.paste(bg(imgs[k]),(540,55));label(c,'原設定 origin/main');label(c,'cast8 新版',(552,8));c.save(O/f'before-after-{k}.png')
c=Image.new('RGB',(1050,640),'#f3f0ea')
for i,(im,box,title) in enumerate([(src('spirit','525ab99'),(137,310,187,378),'原設定黑線'),(src('spirit','f346cdf'),(137,315,187,383),'cast7 缺口'),(imgs['spirit'],(150,350,200,418),'cast8 修補後')]):
 z=im.crop(box).resize((300,408),Image.Resampling.NEAREST);c.paste(bg(z),(i*350+20,70));label(c,title,(i*350+12,15),24)
label(c,'原設定／cast7 區域與新版有等比縮放、位置差異。',(12,520),22);label(c,'補回原黑線，再沿袖口描回 1.75px 深色連續線。',(12,555),22);c.save(O/'spirit-cuff.png')
c=Image.new('RGB',(3780,1300),'#f3f0ea');d=ImageDraw.Draw(c)
for i,k in enumerate(IDS):
 im=imgs[k];a=np.array(im);dy=685-int(np.where(a[:,:,3]>=128)[0].max());c.paste(bg(im),(i*540,60+dy));label(c,NAMES[i],(i*540+15,12),30)
 r=rows[k]
 for j,(f,title) in enumerate(fields):
  label(c,title+' '+fmt(r.get(f)),(i*540+15,800+j*32),23)
 if r.get('legacy'):label(c,'沿用 cast7；未重驗',(i*540+15,1257),22)
label(c,'姐姐／精靈暫測，未宣稱全數 ±5% 通過',(4*540+15,1257),20)
d.line((0,745,3779,745),fill='#c94055',width=3)
for y in [30,246,394,471]:d.line((0,y+60,3779,y+60),fill='#8ca3bb',width=1)
c.save(O/'cmp-seven.png')
print(json.dumps({'rows':{k:rows[k] for k in ['jiejie','spirit']},'validation':validation},ensure_ascii=False,indent=2))

# Exact 4x diagnostic crops requested in cross-review, including source-coordinate landmarks.
for k in ['jiejie','spirit']:
 r=rows[k];marked=bg(imgs[k]);d=ImageDraw.Draw(marked)
 for key,color in [('top','#00a0c0'),('chin','#e04030'),('waist','#d09900')]:
  py=r[key];d.line((0,py,539,py),fill=color,width=1);d.text((8,max(0,py-22)),f'{key} y{py}',font=font(17),fill=color)
 fy=r['face_width_row'];fx0,fx1=r['face_width_x'];d.line((fx0,fy,fx1,fy),fill='#00a040',width=1)
 d.text((8,fy+2),f'face y{fy} x{fx0}..{fx1}',font=font(15),fill='#008030')
 marked.save(O/f'landmarks-{k}.png')
 box=(140,int(r['chin'])-22,410,int(r['chin'])+18);marked.crop(box).resize(((box[2]-box[0])*4,(box[3]-box[1])*4),Image.Resampling.NEAREST).save(O/f'chin-4x-{k}.png')
for name,box in [('jiejie-neck-4x',(0,225,540,285)),('jiejie-fingers-4x',(180,112,216,180)),('spirit-crown-4x',(150,95,370,170))]:
 k='jiejie' if name.startswith('jiejie') else 'spirit';z=bg(imgs[k]).crop(box);z.resize((z.width*4,z.height*4),Image.Resampling.NEAREST).save(O/(name+'.png'))

with (O/'measurements.md').open('a') as f:
 f.write('\n臉寬定位（最寬列）：姐姐 y'+str(rows['jiejie']['face_width_row'])+'、x'+str(rows['jiejie']['face_width_x'])+'；精靈 y'+str(rows['spirit']['face_width_row'])+'、x'+str(rows['spirit']['face_width_x'])+'。見 landmarks 圖。\n')
 f.write('\n扣除耳朵區域及5px邊界的含髮頭寬暫測：姐姐 '+str(rows['jiejie']['head_width_no_ears'])+' px，精靈 '+str(rows['spirit']['head_width_no_ears'])+' px；布魯基準 204 px。耳緣標記仍有誤差，不用這項宣稱通過。\n')
