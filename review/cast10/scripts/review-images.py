from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,cv2,json,subprocess,io
O=Path('review/cast10');M=json.loads((O/'measurements.json').read_text());S=json.loads((O/'game-scales.json').read_text());old=json.loads(Path('review/cast9/measurements.json').read_text())
# Spirit body is unchanged: use independent r1 reviewer measurements consistently.
M['bulu'].update(hair=15088,headArea=32965,faceW=134,ratio=.3305,total=655)
M['spirit'].update(hair=16005,headArea=31434,faceW=128,ratio=.2967,total=632,totalHat=758)
f=lambda n:ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',n)
def load(k):return Image.open('assets/chars/'+k+'.png').convert('RGBA')
def prev(k):return Image.open(io.BytesIO(subprocess.check_output(['git','show','39b59fe:assets/chars/'+k+'.png']))).convert('RGBA')
def bg(sz,col='#f3f3f5'):return Image.new('RGBA',sz,col)
def put(o,im,x,y,scale=1):
 if scale!=1:im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 o.alpha_composite(im,(round(x),round(y)))
def sole(im):return int(np.where(np.array(im)[:,:,3]>=128)[0].max())
sp=load('spirit');bu=load('bulu');sis=load('jiejie')
# Comparison has no local transformations: all source pixels share 1px per pixel.
o=bg((1620,875));d=ImageDraw.Draw(o)
for i,(title,im) in enumerate([('原設定 origin/main',Image.open(O/'source/spirit-original-main.png').convert('RGBA')),('cast9',prev('spirit')),('cast10 全身重畫',sp)]):
 put(o,im,i*540,820-sole(im));d.text((i*540+20,15),title,font=f(28),fill='black')
d.line((0,820,1620,820),fill='#777777',width=2);o.convert('RGB').save(O/'before-after-spirit.png')
o=bg((1080,860));d=ImageDraw.Draw(o)
for i,im in enumerate([prev('jiejie'),sis]):
 put(o,im,i*540,65);d.text((i*540+20,15),['cast9 姐姐','cast10 姐姐'][i],font=f(28),fill='black');d.rectangle((i*540+205,65+364,i*540+325,65+429),outline='#d94a35',width=2)
d.text((20,805),'修改 y364～429 腰身、腰帶與裙腰；頭、腿、腳不動',font=f(26),fill='black');o.convert('RGB').save(O/'before-after-sister.png')
o=bg((1080,875));d=ImageDraw.Draw(o);d.text((15,12),'布魯＋精靈｜各 50% 透明｜腳底對齊',font=f(26),fill='black')
for im in [bu,sp]:
 semi=im.copy();semi.putalpha(semi.getchannel('A').point(lambda a:round(a*.5)));put(o,semi,0,820-sole(im))
for im,col in [(bu,(30,100,230,255)),(sp,(220,50,70,255))]:
 a=np.array(im)[:,:,3]>=128;edge=a&~cv2.erode(a.astype('uint8'),np.ones((3,3),np.uint8)).astype(bool);r=np.zeros((*a.shape,4),np.uint8);r[edge]=col;put(o,Image.fromarray(r),540,820-sole(im))
d.line((0,820,1080,820),fill='#777777');o.convert('RGB').save(O/'overlay-spirit-vs-blue.png')
for key,im,boxes in [('spirit',sp,[('帽頂',(210,0,300,85)),('帽髮交界',(185,110,355,170)),('耳與黑髮',(150,190,230,285)),('下巴脖子',(215,300,335,350)),('袖口',(130,350,215,425)),('褲襠',(235,525,295,590)),('鞋底',(160,710,380,770))]),('sister',sis,[('左接縫 8x',(200,358,230,380)),('右接縫 8x',(300,358,330,380)),('髮絲接縫',(270,325,320,355)),('腰帶與裙腰',(190,375,330,435))])]:
 o=bg((1380,len(boxes)*220+55));d=ImageDraw.Draw(o);d.text((15,5),'白底｜深底｜alpha；放大檢查',font=f(24),fill='black')
 for i,(label,box) in enumerate(boxes):
  crop=im.crop(box);sc=8 if "8x" in label else min(430/crop.width,170/crop.height);crop=crop.resize((round(crop.width*sc),round(crop.height*sc)),Image.Resampling.NEAREST);d.text((15,55+i*220),label,font=f(21),fill='black')
  for j,col in enumerate(['white','#20283b','black']):
   tile=bg((450,180),col)
   if j<2:put(tile,crop,5,0)
   else:tile.paste(crop.getchannel('A').convert('RGB'),(5,0))
   put(o,tile,j*460,85+i*220)
 o.convert('RGB').save(O/('edges-'+key+'.png'))
# Requested review crops: exact nearest-neighbour 4x before/after.
o=bg((1100,460));d=ImageDraw.Draw(o)
for j,box in enumerate([(270,325,320,355),(205,370,320,405)]):
 for i,im in enumerate([prev('jiejie'),sis]):
  c=im.crop(box).resize(((box[2]-box[0])*4,(box[3]-box[1])*4),Image.Resampling.NEAREST);put(o,c,i*550+20,j*220+45);d.text((i*550+20,j*220+8),['cast9','cast10'][i]+str(box),font=f(21),fill='black')
o.convert('RGB').save(O/'sister-review-crops.png')
fields=[('ratio','頭高／不含帽總高'),('faceW','臉寬'),('headArea','頭部面積'),('hair','髮量（下巴以上）'),('shoulder','肩外輪廓寬'),('body','身長'),('leg','腿長'),('total','不含帽總高'),('totalHat','含帽／配件總高')]
ids=['feifei','apiao','sika','bulu','jiejie','hate','spirit'];names=['飛飛','阿飄','西卡','布魯','微笑姐姐','哈特','氣球精靈'];o=bg((3780,1260));d=ImageDraw.Draw(o)
for i,(k,name) in enumerate(zip(ids,names)):
 im=load(k);sc=S[k]['scale'];put(o,im,i*540+(540-im.width*sc)/2,660-sole(im)*sc,sc);d.text((i*540+20,15),name,font=f(32),fill='black')
 row=M[k] if k in M else old[k]
 for j,(field,label) in enumerate(fields):
  v=row.get(field,row.get({'shoulder':'shFull','totalHat':'total_hat'}.get(field,field)));txt='遮蔽／未量' if v is None else f'{v:.4f}' if field=='ratio' else f'{v:g}'
  d.text((i*540+15,710+j*37),label+'：'+txt,font=f(23),fill='black')
 d.text((i*540+15,1060),'本輪量測' if k in ['bulu','spirit'] else '沿用 cast9（頭腿未改）',font=f(21),fill='#555555');d.text((i*540+15,1100),f'遊戲主講倍率 {sc:.4f}',font=f(21),fill='#555555')
d.line((0,660,3780,660),fill='#555555',width=2);d.text((25,1150),'按 visualScale(vh=820, 主講角色=1) 排列；主圖實際鞋底同線。遊戲對話同時最多三人，七人為比較展示。',font=f(28),fill='black');d.text((25,1195),'數值是素材 px／px²；肩寬含袖子與頭髮；裙子遮住腿根不假造腿長。實際遊戲另見 game-alignment.png。',font=f(25),fill='#555555');o.convert('RGB').save(O/'cmp-seven.png')
# Actual headless screenshots, not a reconstruction. Diagnostic hides bubble only.
o=bg((1530,950));d=ImageDraw.Draw(o);d.text((15,10),'實際遊戲：桌機＋手機；診斷畫面只隱藏對話框，露出腳底',font=f(26),fill='black')
for file,x in [('game-1100x820-feet.png',10),('game-390x844-feet.png',1130)]:put(o,Image.open(O/file).convert('RGBA'),x,65)
d.text((15,905),'正式對話畫面（含對話框）另存 game-1100x820.png、game-390x844.png；未改正式 CSS。',font=f(23),fill='black');o.convert('RGB').save(O/'game-alignment.png')
# Final right junction, exact 8x nearest-neighbour baseline/current evidence.
o=bg((1000,650),'white');d=ImageDraw.Draw(o)
for i,im in enumerate([prev('jiejie'),sis]):
 c=im.crop((295,360,350,410)).resize((440,400),Image.Resampling.NEAREST);put(o,c,20+i*500,40);d.text((20+i*500,10),['cast9 8x','cast10 r2 8x'][i],font=f(20),fill='black')
o.convert('RGB').save(O/'right-junction-8x.png')
