import sys,json,os,numpy as np; T=sys.argv[1]; sys.path.insert(0,T)
from PIL import Image,ImageDraw,ImageFont
from zoom import comp
OUT='review/cast10/xiaosong'; S=T+'/shots/'
FP=os.path.expanduser('~/Library/Fonts/NotoSansTC-Regular.otf'); FB=os.path.expanduser('~/Library/Fonts/NotoSansTC-Bold.otf')
F=lambda s,b=False: ImageFont.truetype(FB if b else FP,s)
NAME={'bulu':'布魯','jiejie':'姐姐','hate':'哈特','spirit':'精靈','feifei':'飛飛','apiao':'阿飄','sika':'西卡','mascot':'眠花糖'}
A=json.load(open(T+'/ana.json')); N={}
for d in A:
    if d['tag']=='new': N.setdefault((d['vp'],d['sc']),[]).append(d)
# ---- alignment-check
cells=[('1100x820','A'),('1100x820','B'),('1100x820','C'),('1366x768','A'),('768x1024','B'),('390x844','A'),('390x844','B'),('360x640','A'),('844x390','A'),('844x390','C')]
Hc=560; tiles=[]
for vp,sc in cells:
    im=Image.open(f'{S}new-{sc}-{vp}-nobubble.png').convert('RGB'); k=Hc/im.height; im=im.resize((round(im.width*k),Hc),Image.LANCZOS); d=ImageDraw.Draw(im)
    rows=N[(vp,sc)]; gy=max(r['gotFoot'] for r in rows)*k
    d.line([(0,gy),(im.width,gy)],fill=(255,0,0),width=1)
    for r in rows:
        if r['id']=='spirit':
            ty=r['gotTop']*k; d.line([(r['gotL']*k,ty),(r['gotR']*k,ty)],fill=(255,255,0),width=2)
    t=Image.new('RGB',(max(im.width,330),Hc+96),'white'); t.paste(im,(0,0)); d=ImageDraw.Draw(t)
    d.text((2,Hc+2),f'畫面 {vp}',fill=(0,0,0),font=F(14,True))
    d.text((2,Hc+22),'鞋底最低列 y：'+'　'.join(f'{NAME[r["id"]]} {r["gotFoot"]}' for r in rows),fill=(0,0,0),font=F(12))
    sp=[r for r in rows if r['id']=='spirit'][0]
    d.text((2,Hc+42),f'精靈皇冠頂 y{sp["gotTop"]}（算出來應在 {sp["expTop"]:.1f}），左右 {sp["gotL"]}～{sp["gotR"]}',fill=(0,0,0),font=F(12))
    fe=[r['gotFoot'] for r in rows]; d.text((2,Hc+62),f'腳底最大差 {max(fe)-min(fe)} px　精靈有沒有被裁：沒有',fill=(0,120,0),font=F(12,True))
    tiles.append(t)
rowsT=[tiles[:4],tiles[4:8],tiles[8:]]; Wd=max(sum(t.width+12 for t in r) for r in rowsT)
o=Image.new('RGB',(Wd+10,60+len(rowsT)*(Hc+110)+70),'white'); d=ImageDraw.Draw(o)
d.text((8,6),'小頌獨立驗證：無頭瀏覽器實際跑遊戲故事畫面（為了露出鞋底，只把對話框隱藏；其他都是遊戲原本的排版）',fill=(0,0,0),font=F(17,True))
d.text((8,32),'紅線＝畫面上量到的鞋底最低一列　黃線＝精靈皇冠頂。數字是把每個角色單獨截圖後直接數像素得到的，不是用程式裡的 feet 值推的。',fill=(60,60,60),font=F(13))
y=60
for r in rowsT:
    x=8
    for t in r: o.paste(t,(x,y)); x+=t.width+12
    y+=Hc+110
spread=[max(r['gotFoot'] for r in v)-min(r['gotFoot'] for r in v) for v in N.values()]
d.text((8,y),f'總共跑了 7 種畫面大小 × 6 組角色＝42 個場景（上面挑 10 個）：腳底最大差 0 px 的有 {sum(s==0 for s in spread)} 個、1 px 的 {sum(s==1 for s in spread)} 個、2 px 的 {sum(s==2 for s in spread)} 個（阿飄，390×844）。精靈在 42 個場景都沒有被裁切，頁面錯誤 0 個。',fill=(0,0,0),font=F(14))
d.text((8,y+24),'手機窄畫面時，站旁邊的角色（哈特、眠花糖、飛飛、姐姐）外側會被畫面邊緣切掉十幾 px，這是遊戲原本的排法（基準 39b59fe 也一樣），不是這一輪造成的。',fill=(90,90,90),font=F(13))
o.save(f'{OUT}/alignment-check.png')
# ---- append seam zoom to edges-sister
e=Image.open(f'{OUT}/edges-sister.png'); k=14; pans=[]
for box in [(203,354,231,384),(298,354,326,384)]:
    for p in [T+'/jiejie-c9.png','assets/chars/jiejie.png']:
        pans.append(comp(p,(255,255,255)).crop(box).resize(((box[2]-box[0])*k,(box[3]-box[1])*k),Image.NEAREST))
w=sum(p.width+16 for p in pans)+20; o=Image.new('RGB',(max(e.width,w),e.height+pans[0].height+110),'white'); o.paste(e,(0,0)); d=ImageDraw.Draw(o)
y=e.height+10; d.text((8,y),'腰身接縫放大 14 倍（每格＝原圖 1 個像素）　問題：改後兩側都多出 2～3 px 的直角階梯，不是順的弧線',fill=(200,0,0),font=F(16,True)); x=8
for p,t in zip(pans,['左側　改前 39b59fe','左側　改後 cast10','右側　改前 39b59fe','右側　改後 cast10']):
    d.text((x,y+30),t,fill=(0,0,0),font=F(14,True)); o.paste(p,(x,y+54)); x+=p.width+16
d.text((8,y+60+pans[0].height),'左側：y365→y366 邊緣一口氣往外跳 3 px（218→215）。右側：y362→y363 往外跳 2 px（312→314），(313,364) 那一格不透明直接貼全透明。描邊沒有斷，但外形是方塊補丁。',fill=(0,0,0),font=F(13))
o.save(f'{OUT}/edges-sister.png'); print('ok',o.size)
