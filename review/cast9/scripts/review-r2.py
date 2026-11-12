from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,cv2,subprocess,io,json,hashlib
R=Path.cwd();O=R/'review/cast9';M=json.loads((O/'measurements-r2.json').read_text());old=json.loads((O/'measurements.json').read_text());rows=old.copy();rows.update({k:M[k] for k in ['bulu','jiejie']});rows['bulu']['total_hat']=655
font=lambda n:ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',n)
def src(k,ref):return Image.open(io.BytesIO(subprocess.check_output(['git','show',f'{ref}:assets/chars/{k}.png']))).convert('RGBA')
def bg(size):
 a=Image.new('RGBA',size,'#f2f2f5');d=ImageDraw.Draw(a)
 for y in range(0,size[1],20):
  for x in range(0,size[0],20):
   if (x//20+y//20)%2:d.rectangle((x,y,x+19,y+19),fill='#e4e4e9')
 return a
sis=Image.open(O/'candidate-sister-r2.png').convert('RGBA');blue=Image.open('assets/chars/bulu.png').convert('RGBA');sp=Image.open('assets/chars/spirit.png').convert('RGBA');fei=Image.open('assets/chars/feifei.png').convert('RGBA')
for key,im in [('sister',sis),('spirit',sp)]:
 out=bg((1080,780));d=ImageDraw.Draw(out);d.text((20,10),('姐姐第2輪' if key=='sister' else '精靈仍為cast8，待尺寸決定')+' vs 布魯｜各50%透明',font=font(23),fill='black')
 for v in [blue,im]:
  v=v.copy();v.putalpha(v.getchannel('A').point(lambda x:round(x*.5)));out.alpha_composite(v,(0,50))
 for v,col in [(blue,(30,100,240,255)),(im,(235,50,80,255))]:
  a=np.array(v)[:,:,3]>=128;e=a&(cv2.erode(a.astype('uint8'),np.ones((3,3),np.uint8))==0);r=np.zeros((720,540,4),np.uint8);r[e]=col;out.alpha_composite(Image.fromarray(r),(540,50))
 d.line((0,735,1080,735),fill='#666666',width=2);out.convert('RGB').save(O/f'overlay-{key}-vs-blue.png')
for key,k,im in [('sister','jiejie',sis),('spirit','spirit',sp)]:
 out=bg((1620,1160));d=ImageDraw.Draw(out)
 for i,(title,img) in enumerate([('原設定 origin/main',src(k,'origin/main')),('cast8',src(k,'65216ca')),('cast9第2輪' if key=='sister' else 'cast9仍未改／待決定',im)]):
  d.text((i*540+20,12),title,font=font(26),fill='black');out.alpha_composite(img,(i*540,55))
  box=([(208,55,350,201),(180,40,375,260),(177,46,390,240)][i] if key=='sister' else [(185,130,355,285),(155,120,400,320),(155,120,400,320)][i]);crop=img.crop(box);crop.thumbnail((440,320));crop=crop.resize((round(crop.width*min(440/crop.width,320/crop.height)),round(crop.height*min(440/crop.width,320/crop.height))),Image.Resampling.LANCZOS);out.alpha_composite(crop,(i*540+(540-crop.width)//2,825))
 d.text((20,780),'臉部等比放大供目視；尺寸以原圖量測',font=font(23),fill='black');out.convert('RGB').save(O/f'before-after-{key}.png')
# same-height single-leg evidence
out=bg((1080,650));d=ImageDraw.Draw(out)
for i,(name,im,key) in enumerate([('姐姐第2輪',sis,'jiejie'),('飛飛',fei,'feifei')]):
 crop=im.crop((100,520,400,700)).resize((600,360),Image.Resampling.NEAREST);out.alpha_composite(crop,(i*540-30,85));d.text((i*540+20,15),name+'｜同高 y595',font=font(24),fill='black')
 for q in M['legs'][key]['595']:
  x0=i*540-30+(q['x0']-100)*2;x1=i*540-30+(q['x1']-100)*2;yy=235;d.line((x0,yy,x1,yy),fill='red',width=3);d.text((x0,yy-30),str(q['width'])+' px',font=font(21),fill='red')
d.text((20,465),'y595：左57/54=105.6%；右57/57=100.0%',font=font(25),fill='black');d.text((20,510),f"y580～610小腿中段平均：{M['legs']['average']['jiejie']:.2f} / {M['legs']['average']['feifei']:.2f} = {M['legs']['ratio']:.3f}",font=font(24),fill='black');d.text((20,555),'同一高度、單腿外輪廓；襪子與裸腿的外緣比較',font=font(23),fill='black');out.convert('RGB').save(O/'legs-sister-vs-feifei.png')
for key,im,boxes in [('sister',sis,[('蝴蝶結',(245,18,405,115)),('手指、髮邊',(130,123,213,215)),('瀏海、眼線',(195,130,350,190)),('下巴與脖子',(220,216,345,272)),('袖口',(110,245,215,345)),('襪口',(187,545,340,607)),('鞋底',(180,622,350,690))]),('spirit',sp,[('皇冠頂',(210,0,280,70)),('帽髮交界',(190,95,350,175)),('耳朵',(150,220,240,282)),('下巴與脖子',(220,285,340,345)),('袖口',(130,350,240,450)),('腿部',(200,520,350,620)),('鞋底',(180,620,350,690))])]:
 out=Image.new('RGB',(1350,1450),'#eeeeef');d=ImageDraw.Draw(out);d.text((10,5),'第2輪姐姐' if key=='sister' else '精靈未改：cast8舊圖，尚未通過',font=font(23),fill='black')
 for i,(label,box) in enumerate(boxes):
  crop=im.crop(box);scale=min(400/crop.width,160/crop.height);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST);d.text((8,i*200+40),label,font=font(20),fill='black')
  for j,col in enumerate(['white','#20283b','black']):
   tile=Image.new('RGBA',(440,165),col)
   if j<2:tile.alpha_composite(crop,(10,0))
   else:tile.paste(crop.getchannel('A').convert('RGB'),(10,0))
   out.paste(tile.convert('RGB'),(j*450,i*200+70))
 out.save(O/f'edges-{key}.png')
fields=[('ratio','頭高／不含帽總高'),('faceW','臉寬'),('headArea','頭部面積'),('hair','髮量（下巴以上）'),('shFull','肩外輪廓全寬'),('body','身長'),('leg','腿長（分開點起）'),('total','總高不含配件'),('total_hat','總高含配件')]
ids=['feifei','apiao','sika','bulu','jiejie','hate','spirit'];names=['飛飛','阿飄','西卡','布魯','姐姐第2輪','哈特不改','精靈待決定'];out=Image.new('RGBA',(3780,1200),'#f5f5f7');d=ImageDraw.Draw(out)
for i,(k,name) in enumerate(zip(ids,names)):
 im=sis if k=='jiejie' else Image.open(f'assets/chars/{k}.png').convert('RGBA');sole=int(np.where(np.array(im)[:,:,3]>=128)[0].max());out.alpha_composite(im,(540*i,85+685-sole));d.text((540*i+30,15),name,font=font(32),fill='black')
 for j,(f,label) in enumerate(fields):
  v=rows[k].get(f);txt='未量／遮蔽' if v is None else f'{v:.4f}' if f=='ratio' else f'{v:g}';d.text((540*i+15,820+j*34),label+'：'+txt,font=font(22),fill='black')
 d.text((540*i+15,1140),'第2輪實測' if k in ['bulu','jiejie'] else '像素未改，沿用前輪數字',font=font(21),fill='#555555')
d.line((0,770,3780,770),fill='#555555',width=2);d.text((20,1172),'精靈的原帽／不含帽身高／畫布條件互相衝突，仍待選擇；不是全數驗收通過。',font=font(22),fill='#aa2222');out.convert('RGB').save(O/'cmp-seven.png')
lines=['# cast9 第2輪量測','','沿用小頌量法，姐姐重新定位；布魯與姐姐本輪實測，精靈像素未改，沿用已核對的cast8數字。','姐姐髮頂46、下巴236.5、腰388.5、腳底685。頭區遮罩見mask-sister-r2.png。','頭區多邊形排除舉手；耳朵排除y140以上髮絲高光。肩外輪廓包含頭髮及袖子，不是肩骨寬。裙子遮住分腿點，不捏造腿長。','','|項目|布魯|姐姐（差距）|精靈（差距）|','|---|---:|---:|---:|']
for f,label in fields+[('headH','頭高'),('hairLong','髮量含長髮'),('waist2foot','腰到腳底')]:
 b=rows['bulu'].get(f);cells=[]
 for k in ['jiejie','spirit']:
  v=rows[k].get(f);cells.append('未量／遮蔽' if v is None or not b else f'{v:.4f}（{100*(v/b-1):+.1f}%）' if f=='ratio' else f'{v:g}（{100*(v/b-1):+.1f}%）')
 lines.append('|'+label+'|'+str(b)+'|'+'|'.join(cells)+'|')
(O/'measurements.md').write_text('\n'.join(lines)+'\n');(O/'measurements.json').write_text(json.dumps(rows,indent=2))
a=np.array(sis);al=a[:,:,3];hard=(al==255)&(cv2.dilate((al==0).astype('uint8'),np.ones((3,3),np.uint8))>0);hate=Path('assets/chars/hate.png').read_bytes();orig=subprocess.check_output(['git','show','5b125dc:assets/chars/hate.png'])
v={'sister':{'size':list(sis.size),'sole':int(np.where(al>=128)[0].max()),'components_alpha_positive':cv2.connectedComponents((al>0).astype('uint8'))[0]-1,'hard_edge_pixels':int(hard.sum())},'hate':{'sha256':hashlib.sha256(hate).hexdigest(),'reference_sha256':hashlib.sha256(orig).hexdigest(),'file_identical':hate==orig}}
(O/'validation-r2.json').write_text(json.dumps(v,indent=2));print(json.dumps(v,indent=2))
