"""第2輪修補前後證據；讀取固定r1提交，不改角色檔。"""
import os,sys,io,json,subprocess
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parent;R=O.parents[1];os.chdir(R)
sys.path.insert(0,str(O/'xiaosong/final-scripts'));sys.argv=['evidence',os.environ['TMPDIR']]
from holes import holes
font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',20)
regions=[('jiejie',(185,102,215,142),'jiejie-fringe-repair-r2'),('jiejie',(320,105,375,190),'jiejie-ear-r2'),('spirit',(235,118,307,146),'spirit-crown-repair-r2'),('spirit',(152,340,202,402),'spirit-cuff-repair-r2')]
result={}
for k in ['jiejie','spirit']:
 p=Path(os.environ['TMPDIR'])/(k+'-r1.png');p.write_bytes(subprocess.check_output(['git','show',f'f95dfff:assets/chars/{k}.png']))
 result[k]={str(t):{'before':holes(str(p),t)[1],'after':holes(f'assets/chars/{k}.png',t)[1]} for t in [128,200]}
for k,box,name in regions:
 before=Image.open(Path(os.environ['TMPDIR'])/(k+'-r1.png')).convert('RGBA').crop(box)
 after=Image.open(f'assets/chars/{k}.png').convert('RGBA').crop(box)
 w,h=after.size;out=Image.new('RGB',(w*18,h*12+80),'#eee')
 for i,im in enumerate([before,after]):
  for j,c in enumerate(['white','#302d38',None]):
   if c:
    bg=Image.new('RGBA',im.size,c);bg.alpha_composite(im);z=bg.convert('RGB')
   else:z=im.getchannel('A').convert('RGB')
   x=j*w*6;y=i*(h*6+40)
   out.paste(z.resize((w*6,h*6),Image.Resampling.NEAREST),(x,y+40))
   ImageDraw.Draw(out).text((x+2,y+4),('r1 ' if i==0 else 'r2 ')+['白底','深底','透明度'][j],font=font,fill='black')
 out.save(O/(name+'.png'))
(O/'holes-r2.json').write_text(json.dumps(result,indent=2)+'\n')
