from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,cv2,subprocess,io,json,hashlib,shutil,os
R=Path.cwd();O=R/'review/cast9';T=Path(os.environ['TMPDIR'])
font=lambda n:ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',n)
def src(k,ref):return Image.open(io.BytesIO(subprocess.check_output(['git','show',f'{ref}:assets/chars/{k}.png']))).convert('RGBA')
def bg(size):
 a=Image.new('RGBA',size,'#f2f2f5');d=ImageDraw.Draw(a)
 for y in range(0,size[1],20):
  for x in range(0,size[0],20):
   if (x//20+y//20)%2:d.rectangle((x,y,x+19,y+19),fill='#e4e4e9')
 return a
sis=Image.open(O/'candidate-sister.png').convert('RGBA');blue=Image.open('assets/chars/bulu.png').convert('RGBA');fei=Image.open('assets/chars/feifei.png').convert('RGBA')
for key,im in [('sister',sis)]:
 out=bg((1080,780));d=ImageDraw.Draw(out);d.text((20,10),'姐姐 vs 布魯｜各 50% 透明、腳底 y685',font=font(24),fill='black')
 for v in [blue,im]:
  v=v.copy();v.putalpha(v.getchannel('A').point(lambda x:round(x*.5)));out.alpha_composite(v,(0,50))
 for v,col in [(blue,(30,100,240,255)),(im,(235,50,80,255))]:
  a=np.array(v)[:,:,3]>=128;e=a&(cv2.erode(a.astype('uint8'),np.ones((3,3),np.uint8))==0);r=np.zeros((720,540,4),np.uint8);r[e]=col;out.alpha_composite(Image.fromarray(r),(540,50))
 d.line((0,735,1080,735),fill='#666666',width=2);out.convert('RGB').save(O/'overlay-sister-vs-blue.png')
# Full originals and a second row of faces at equal displayed face width, no distortion.
old=src('jiejie','origin/main');cast8=src('jiejie','65216ca');out=bg((1620,1190));d=ImageDraw.Draw(out)
for i,(title,im,box) in enumerate([('原設定 origin/main',old,(210,55,350,201)),('cast8',cast8,(180,40,375,260)),('cast9 候選',sis,(167,44,392,262))]):
 d.text((i*540+20,12),title,font=font(26),fill='black');out.alpha_composite(im,(i*540,55));crop=im.crop(box);crop.thumbnail((480,350),Image.Resampling.LANCZOS);out.alpha_composite(crop,(i*540+(540-crop.width)//2,820))
d.text((20,780),'臉部放大：各自等比顯示；不拿裁切框充當尺寸量測',font=font(22),fill='black');out.convert('RGB').save(O/'before-after-sister.png')
# Leg evidence, both same exact pixels and same y.
M=json.loads((O/'sister-measurements.json').read_text());out=bg((1080,520));d=ImageDraw.Draw(out)
for i,(name,im,key) in enumerate([('姐姐',sis,'jiejie'),('飛飛',fei,'feifei')]):
 crop=im.crop((100,520,400,700)).resize((600,360),Image.Resampling.NEAREST);out.alpha_composite(crop,(i*540-30,85));d.text((i*540+20,15),name+'｜同 y595，單腿量外輪廓',font=font(22),fill='black')
 for q in M['legs'][key]:
  x0=i*540-30+(q['x0']-100)*2;x1=i*540-30+(q['x1']-100)*2;yy=85+75*2;d.line((x0,yy,x1,yy),fill='red',width=3);d.text((x0,yy-30),str(q['width'])+' px',font=font(21),fill='red')
d.text((20,465),'畫面左腿：50 / 54 = 92.59%；右腿：51 / 57 = 89.47%',font=font(26),fill='black');out.convert('RGB').save(O/'legs-sister-vs-feifei.png')
# Edges on white/dark and alpha, exact nearest-neighbour enlargement.
boxes=[('蝴蝶結',(220,15,325,65)),('手指縫',(105,195,195,270)),('瀏海、眼線',(195,125,355,205)),('下巴與脖子',(220,225,330,285)),('髮外緣',(160,60,220,160)),('袖口',(120,290,215,380)),('鞋底',(180,620,355,690))]
out=Image.new('RGB',(1350,1400),'#eeeeef');d=ImageDraw.Draw(out)
for i,(label,box) in enumerate(boxes):
 crop=sis.crop(box);scale=min(400/crop.width,160/crop.height);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST);d.text((8,i*200+4),label,font=font(20),fill='black')
 for j,col in enumerate(['white','#20283b','black']):
  tile=Image.new('RGBA',(440,165),col)
  if j<2:tile.alpha_composite(crop,(10,0))
  else:tile.paste(crop.getchannel('A').convert('RGB'),(10,0))
  out.paste(tile.convert('RGB'),(j*450,i*200+32))
out.save(O/'edges-sister.png')
# independent alpha check
A=np.array(sis);al=A[:,:,3];solid=al>=128;hard=(al==255)&(cv2.dilate((al==0).astype('uint8'),np.ones((3,3),np.uint8))>0);hate=Path('assets/chars/hate.png').read_bytes();orig=subprocess.check_output(['git','show','5b125dc:assets/chars/hate.png'])
v=dict(sister=dict(size=list(sis.size),mode=sis.mode,sole=int(np.where(solid)[0].max()),corners_alpha=[int(al[yy,xx]) for yy,xx in [(0,0),(0,539),(719,0),(719,539)]],components_alpha_positive=cv2.connectedComponents((al>0).astype('uint8'),8)[0]-1,hard_edge_pixels=int(hard.sum())),hate=dict(sha256=hashlib.sha256(hate).hexdigest(),reference_sha256=hashlib.sha256(orig).hexdigest(),file_identical=hate==orig))
(O/'validation-sister.json').write_text(json.dumps(v,indent=2));print(json.dumps(v,indent=2))
