"""User-authorized Pillow composition from existing object artwork; no original overwrite."""
from PIL import Image, ImageDraw
from pathlib import Path
import json, math
root=Path(__file__).resolve().parents[2]
nest=Image.open(root/'assets/tiles/gen-star-1.webp').convert('RGBA')
star=Image.open(root/'assets/tiles/star-1.webp').convert('RGBA')
for tier in (2,3):
 out=Image.new('RGBA',nest.size)
 base=nest.resize((int(nest.width*.88),int(nest.height*.88)),Image.Resampling.LANCZOS)
 out.alpha_composite(base,(int(nest.width*.06),int(nest.height*.12)))
 for x,y,size in ([(.18,.12,.20),(.65,.04,.24)] if tier==2 else [(.12,.17,.19),(.39,.02,.28),(.72,.17,.19)]):
  icon=star.resize((int(nest.width*size),int(nest.height*size)),Image.Resampling.LANCZOS)
  out.alpha_composite(icon,(int(nest.width*x),int(nest.height*y)))
 out.save(root/f'assets/tiles/gen-star-empty-{tier}.webp',lossless=True)
out=Image.new('RGBA',star.size); d=ImageDraw.Draw(out);w,h=out.size
# A plain gold ring attached to the existing star: no mascot silhouette.
d.ellipse((w*.38,h*.05,w*.62,h*.29),outline='#D7AE42',width=max(2,int(w*.035)))
icon=star.resize((int(w*.74),int(h*.74)),Image.Resampling.LANCZOS);out.alpha_composite(icon,(int(w*.13),int(h*.22)))
out.save(root/'assets/tiles/goods-star-charm.webp',lossless=True)
p=root/'data/chains.json';data=json.loads(p.read_text())
for tier in (2,3):data['generators']['star']['tiers'][tier-1]['img']=f'assets/tiles/gen-star-empty-{tier}.webp'
data['chains']['goods']['items'][0].update(name='星星吊飾',img='assets/tiles/goods-star-charm.webp',origin='extended')
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
# Contact sheet includes every currently referenced item and every producer tier.
entries=[(f'{k}-{i["tier"]}',i['img']) for k,c in data['chains'].items() for i in c['items']]+[(f'gen-{k}-{i["tier"]}',i['img']) for k,c in data['generators'].items() for i in c['tiers']]
canvas=Image.new('RGB',(800,math.ceil(len(entries)/8)*125),'#D5D5D5');d=ImageDraw.Draw(canvas)
for n,(label,path) in enumerate(entries):
 x=(n%8)*100;y=(n//8)*125
 for yy in range(y,y+100,10):
  for xx in range(x,x+100,10):d.rectangle((xx,yy,xx+9,yy+9),fill='#FFFFFF' if (xx//10+yy//10)%2 else '#D5D5D5')
 im=Image.open(root/path).convert('RGBA');im.thumbnail((94,94));canvas.paste(im,(x+(100-im.width)//2,y+(100-im.height)//2),im);d.text((x+2,y+104),label,fill='black')
canvas.save(root/'review/mobile-fix/no-characters-in-tiles.png')
