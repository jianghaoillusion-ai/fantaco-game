import os
exec(open('review/cast9/scripts/build-sister-review.py').read().split('for key,im')[0])
# current spirit is retained, explicitly label pending rather than claim redraw.
sp=Image.open('assets/chars/spirit.png').convert('RGBA');out=bg((1080,780));d=ImageDraw.Draw(out);d.text((20,10),'精靈仍為 cast8｜待畫布取捨｜各 50% 透明',font=font(24),fill='black')
for v in [blue,sp]:
 v=v.copy();v.putalpha(v.getchannel('A').point(lambda x:round(x*.5)));out.alpha_composite(v,(0,50))
for v,col in [(blue,(30,100,240,255)),(sp,(235,50,80,255))]:
 a=np.array(v)[:,:,3]>=128;e=a&(cv2.erode(a.astype('uint8'),np.ones((3,3),np.uint8))==0);r=np.zeros((720,540,4),np.uint8);r[e]=col;out.alpha_composite(Image.fromarray(r),(540,50))
d.line((0,735,1080,735),fill='#666666',width=2);out.convert('RGB').save(O/'overlay-spirit-vs-blue.png')
out=bg((1620,800));d=ImageDraw.Draw(out)
for i,(title,im) in enumerate([('原設定 origin/main',src('spirit','origin/main')),('cast8',src('spirit','65216ca')),('cast9：未替換，待決定',sp)]):
 d.text((i*540+20,12),title,font=font(24),fill='black');out.alpha_composite(im,(i*540,65))
out.convert('RGB').save(O/'before-after-spirit.png')
out=Image.new('RGB',(1620,850),'white');d=ImageDraw.Draw(out);d.text((20,10),'精靈尚未替換：沿用 cast8，非 cast9 新版驗收',font=font(28),fill='black')
for i,col in enumerate(['white','#20283b']):
 tile=Image.new('RGBA',(540,720),col);tile.alpha_composite(sp);out.paste(tile.convert('RGB'),(i*540,70))
for i,box in enumerate([(190,100,345,180),(200,245,340,345),(130,350,240,450)]):
 crop=sp.crop(box);crop.thumbnail((500,220));crop=crop.resize((crop.width*2,crop.height*2),Image.Resampling.NEAREST);tile=Image.new('RGBA',crop.size,'#20283b');tile.alpha_composite(crop);out.paste(tile.convert('RGB'),(1090,70+i*250))
out.save(O/'edges-spirit.png')
old=json.loads(Path('review/cast8/measurements.json').read_text());m=json.loads((O/'sister-measurements.json').read_text());oldmm=json.loads(Path('review/cast8/reviewer-measurements-r2.json').read_text());rows={'bulu':m['bulu'],'jiejie':m['jiejie'],'spirit':oldmm['spirit']};rows['spirit']['top']=125;rows['spirit']['headH']=189.5;rows['spirit']['ratio']=189.5/560;rows['spirit']['total']=560;rows['spirit']['chin']=314.5;rows['spirit']['body']=107;rows['spirit']['headArea']=31544;rows['spirit']['hair']=15154;rows['spirit']['hairLong']=15154
mapping={'ratio':'ratio','faceW':'face_width','headArea':'head_area','hair':'hair_area','shFull':'shoulder_width','body':'torso_length','leg':'leg_length','total':'total_height','total_hat':'with_hat'}
for k in ['feifei','apiao','sika','hate']:rows[k]={n:old[k].get(v) for n,v in mapping.items()}
rows['bulu']['total_hat']=655
fields=[('ratio','頭高／不含帽總高'),('faceW','臉寬'),('headArea','頭部面積'),('hair','髮量（下巴以上）'),('shFull','肩外輪廓全寬'),('body','身長'),('leg','腿長（分開點起）'),('total','總高不含配件'),('total_hat','總高含配件')]
ids=['feifei','apiao','sika','bulu','jiejie','hate','spirit'];names=['飛飛','阿飄','西卡','布魯','微笑姐姐','哈特','氣球精靈（未改）'];out=Image.new('RGBA',(3780,1200),'#f5f5f7');d=ImageDraw.Draw(out)
for i,(k,name) in enumerate(zip(ids,names)):
 im=sis if k=='jiejie' else Image.open(f'assets/chars/{k}.png').convert('RGBA');sole=int(np.where(np.array(im)[:,:,3]>=128)[0].max());out.alpha_composite(im,(540*i,85+685-sole));d.text((540*i+30,15),name,font=font(32),fill='black')
 for j,(f,label) in enumerate(fields):
  v=rows[k].get(f);txt='未量／遮蔽' if v is None else f'{v:.4f}' if f=='ratio' else f'{v:g}';d.text((540*i+15,820+j*34),label+'：'+txt,font=font(22),fill='black')
 d.text((540*i+15,1140),'本輪實測' if k in ['bulu','jiejie'] else '像素未改，沿用前輪數字',font=font(21),fill='#555555')
d.line((0,770,3780,770),fill='#555555',width=2);d.text((20,1172),'cast9 工作進度：姐姐新候選；精靈等待畫布／原帽／身高衝突的取捨。尚未全部完成。',font=font(22),fill='#aa2222');out.convert('RGB').save(O/'cmp-seven.png')
(O/'measurements.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
lines=['# cast9 量測（部分完成）','','姐姐、布魯本輪量測；精靈尚未替換，採小頌 cast8 最終報告。長度單位 px，面積 px²。','頭高由可見髮頂到下巴；下巴採臉最低膚色列加 1.5。頭部不含蝴蝶結／帽子，髮量另列長髮。','姐姐原始分割採小頌的膚色、閉合 15、耳擴邊 2 方法，新圖需重新定位及排除舉手。髮頂 y44、下巴249.5、腰368；腰是腰帶中線。','姐姐裙子遮住真正兩腿分開點，不把裙擺當腿長。肩寬包含頭髮、袖子，並非解剖肩骨。','','|項目|布魯|姐姐（差距）|精靈仍為cast8（差距）|','|---|---:|---:|---:|']
for f,label in fields+[('headH','頭高'),('hairLong','髮量含長髮'),('waist2foot','腰到腳底')]:
 b=rows['bulu'].get(f);cells=[]
 for k in ['jiejie','spirit']:
  v=rows[k].get(f);cells.append('未量／遮蔽' if v is None or not b else f'{v:.4f}（{100*(v/b-1):+.1f}%）' if f=='ratio' else f'{v:g}（{100*(v/b-1):+.1f}%）')
 lines.append('|'+label+'|'+str(b)+'|'+'|'.join(cells)+'|')
(O/'measurements.md').write_text('\n'.join(lines)+'\n')
