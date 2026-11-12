import sys,numpy as np,cv2,json,os; T=sys.argv[1]; sys.path.insert(0,T)
from PIL import Image,ImageDraw,ImageFont
from zoom import comp,alpha,panel
OUT='review/cast8/xiaosong'
FP=os.path.expanduser('~/Library/Fonts/NotoSansTC-Regular.otf'); FB=os.path.expanduser('~/Library/Fonts/NotoSansTC-Bold.otf')
F=lambda s,b=False: ImageFont.truetype(FB if b else FP,s)
R=json.load(open(T+'/R.json'))
R['hate']=dict(top=28,chin=245.5,waist=395,split=462,total=657,headH=217.5,ratio=0.3311,faceW=137,headW=194,headArea=32626,hair=15562,hairLong=15562,shFull=None,shRight=83,body=149.5,waist2foot=290,leg=223,total_hat=663)
R['jiejie']['leg']=None; R['bulu']['total_hat']=655
NAME={'bulu':'布魯','jiejie':'微笑姐姐','hate':'哈特','spirit':'氣球精靈','feifei':'飛飛','apiao':'阿飄','sika':'西卡'}
P=lambda n:f'assets/chars/{n}.png'
BLUE=(30,90,230); RED=(225,40,40)
def contour(n):
    a=np.array(Image.open(P(n)).convert('RGBA'))[...,3]>=128
    return a&~(cv2.erode(a.astype(np.uint8),np.ones((3,3),np.uint8))>0)
def overlay(n):
    b=Image.open(P('bulu')).convert('RGBA'); c=Image.open(P(n)).convert('RGBA')
    W,H=540,720; o=Image.new('RGB',(W*2+20,H+70),'white')
    def half(im):
        x=np.array(im).astype(float); x[...,3]*=0.5; return Image.fromarray(x.astype(np.uint8))
    L=Image.new('RGBA',(W,H),(255,255,255,255)); L.alpha_composite(half(b)); L.alpha_composite(half(c)); o.paste(L.convert('RGB'),(0,0))
    Rr=np.zeros((H,W,3),np.uint8)+255; Rr[contour('bulu')]=BLUE; Rr[contour(n)]=RED; o.paste(Image.fromarray(Rr),(W+20,0))
    d=ImageDraw.Draw(o)
    for who,col,xo in [('bulu',BLUE,0),(n,RED,W+20)]:
        r=R[who]
        for off in (0,W+20):
            for key,lab in [('top','髮頂'),('chin','下巴'),('waist','腰'),('split','腿分開')]:
                y=r.get(key) if key!='split' or r.get('leg') else None
                if y is None: continue
                x0=off+(0 if who=='bulu' else W//2); 
                for xx in range(x0,x0+W//2,8): d.line([(xx,y),(xx+4,y)],fill=col)
                if off==W+20: d.text((off+(4 if who=='bulu' else W-70),y-15),f'{lab} y{y:g}',fill=col,font=F(12))
    for off in (0,W+20): d.line([(off,685),(off+W,685)],fill=(0,0,0))
    d.text((8,H+6),f'左：布魯與{NAME[n]}各 50% 透明相疊（原尺寸、腳底 y685 對齊）　右：輪廓線　藍＝布魯　紅＝{NAME[n]}',fill=(0,0,0),font=F(15))
    r=R[n]; b_=R['bulu']; pc=lambda k:'%+.1f%%'%((r[k]-b_[k])/b_[k]*100)
    d.text((8,H+34),f'頭身比 {r["ratio"]:.4f}（{pc("ratio")}）　臉寬 {r["faceW"]}（{pc("faceW")}）　頭部面積 {r["headArea"]}（{pc("headArea")}）　髮量 {r["hair"]}（{pc("hair")}）　身長 {r["body"]:g}（{pc("body")}）　總高不含帽 {r["total"]}（{pc("total")}）',fill=(0,0,0),font=F(13))
    o.save(f'{OUT}/overlay-{n}-vs-blue.png')
for n in ['jiejie','hate','spirit']: overlay(n)
# seven
order=['bulu','jiejie','hate','spirit','feifei','apiao','sika']; cw=420; H=720
o=Image.new('RGB',(cw*7+20,H+330),'white'); d=ImageDraw.Draw(o)
for i,n in enumerate(order):
    im=Image.open(P(n)).convert('RGBA'); a=np.array(im)[...,3]>=128; xs=np.where(a.any(0))[0]; cxm=(xs.min()+xs.max())//2
    bg=Image.new('RGBA',(cw,H),(255,255,255,255)); bg.alpha_composite(im,(cw//2-cxm,0)); o.paste(bg.convert('RGB'),(10+i*cw,0))
    d.text((10+i*cw+cw//2-30,H-28),NAME[n],fill=(0,0,0),font=F(18,True))
b_=R['bulu']
for key,lab in [('top','布魯髮頂'),('chin','布魯下巴'),('waist','布魯腰'),('split','布魯腿分開')]:
    y=b_[key]
    for xx in range(0,cw*7+20,10): d.line([(xx,y),(xx+5,y)],fill=BLUE)
    d.text((4,y-16),f'{lab} y{y:g}',fill=BLUE,font=F(12))
d.line([(0,685),(cw*7+20,685)],fill=(0,0,0))
HP=dict(ratio=0.2,faceW=3.0,headArea=-1.0,hair=0.1,hairLong=0.1,body=1.4,leg=4.2,total=0.3,total_hat=1.2)
rows=[('頭身比','ratio','%.4f'),('臉寬','faceW','%d'),('頭部面積（不含帽）','headArea','%d'),('髮量（下巴以上）','hair','%d'),('髮量（含下巴以下長髮）','hairLong','%d'),('肩外輪廓全寬','shFull','%d'),('身長（下巴到腰）','body','%g'),('腿長（腿分開到腳底）','leg','%g'),('總高（不含帽／蝴蝶結）','total','%d'),('總高（含帽／蝴蝶結）','total_hat','%d')]
y0=H+8; d.text((10,y0),'項目',fill=(0,0,0),font=F(15,True))
for j,n in enumerate(order[:4]): d.text((260+j*300,y0),NAME[n],fill=(0,0,0),font=F(15,True))
d.text((260+4*300+200,y0),'飛飛、阿飄、西卡：這輪沒有動，只放圖沒有量',fill=(90,90,90),font=F(14))
for i,(lab,k,fm) in enumerate(rows):
    y=y0+28+i*27; d.text((10,y),lab,fill=(0,0,0),font=F(14))
    for j,n in enumerate(order[:4]):
        v=R[n].get(k); bv=b_.get(k)
        if v is None: s='量不到'; col=(120,120,120)
        else:
            s=fm%v; col=(0,0,0)
            if n=='hate':
                p=HP.get(k); s+=('（%+.1f%%）'%p if p is not None else ''); col=(0,120,0)
            elif n!='bulu' and bv:
                p=(v-bv)/bv*100; s+='（%+.1f%%）'%p; col=(200,0,0) if abs(p)>5 else (0,120,0)
        d.text((260+j*300,y),s,fill=col,font=F(14))
d.text((10,y0+28+len(rows)*27+2),'紅字＝和布魯差超過 5%。哈特像素和 cast7 完全相同，數字和差距沿用 cast7 第 2 次審查（當時布魯臉寬 133、髮量 15553）。精靈依我的王決定只要求頭身比、臉寬、頭部面積、髮量；姐姐要求頭身比、頭部大小、身長、總高。',fill=(60,60,60),font=F(13))
o.save(f'{OUT}/cmp-seven.png')
# edges
def edges(n,regions,extra=None):
    full_d=comp(P(n),(40,40,48)); full_w=comp(P(n),(255,255,255)); dw=ImageDraw.Draw(full_w)
    for i,(lab,box,k) in enumerate(regions): dw.rectangle(box,outline=(255,0,0),width=2); dw.text((box[0]+2,box[1]-16),str(i+1),fill=(255,0,0),font=F(14,True))
    pans=[]
    for i,(lab,box,k) in enumerate(regions): pans.append((f'{i+1}. {lab}（放大 {k} 倍：白底｜深底｜透明度）',panel(P(n),box,k)))
    if extra: pans+=extra
    pw=max(p.size[0] for _,p in pans)+20; ph=sum(p.size[1]+34 for _,p in pans)+10
    o=Image.new('RGB',(1080+20+pw,max(720+40,ph)),'white'); o.paste(full_d,(0,40)); o.paste(full_w,(540,40)); d=ImageDraw.Draw(o)
    d.text((8,8),f'{NAME[n]}　cast8　左：深色底　右：白底＋放大位置',fill=(0,0,0),font=F(16,True))
    y=6
    for lab,p in pans:
        d.text((1100,y),lab,fill=(0,0,0),font=F(14)); o.paste(p,(1100,y+24)); y+=p.size[1]+34
    o.save(f'{OUT}/edges-{n}.png')
edges('jiejie',[('左側瀏海：髮片裡有一格透空破洞',(180,105,240,150),6),('左臉頰外側髮絲與透明縫',(170,195,230,255),5),('右側頭髮外緣',(350,180,410,245),5),('下巴、脖子接縫',(225,225,335,275),4),('舉手指尖',(120,120,190,180),5),('鞋子',(195,615,295,690),4)])
cuff=[('袖口對照：原設定（origin/main）',panel(T+'/spirit-orig.png',(118,300,188,370),5)),('袖口對照：cast7（描邊斷掉那版）',panel(T+'/spirit-c7.png',(118,305,188,375),5))]
edges('spirit',[('舉手袖口：cast8 現版',(130,335,200,405),5),('皇冠底座和頭髮交界：有透空小洞',(215,108,325,148),5),('左耳、鬢角',(140,225,220,300),4),('下巴、脖子接縫',(220,295,320,345),4),('右耳尖',(320,205,400,275),4)],extra=cuff)
edges('hate',[('右側頭髮外緣（和 cast7 逐像素相同）',(322,45,372,170),4),('頭頂',(200,15,300,60),5)])
print('done')
