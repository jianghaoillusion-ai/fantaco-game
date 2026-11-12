import sys,numpy as np,cv2,json,os; T=sys.argv[1]; sys.path.insert(0,T)
from PIL import Image,ImageDraw,ImageFont
from zoom import comp,alpha,panel
OUT='review/cast9/xiaosong'
FP=os.path.expanduser('~/Library/Fonts/NotoSansTC-Regular.otf'); FB=os.path.expanduser('~/Library/Fonts/NotoSansTC-Bold.otf')
if not os.path.exists(FP):
    import glob; c=glob.glob(os.path.expanduser('~/Library/Fonts/NotoSansTC*')); FP=FB=c[0]
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
def overlay(n,fn,note):
    b=Image.open(P('bulu')).convert('RGBA'); c=Image.open(P(n)).convert('RGBA')
    W,H=540,720; o=Image.new('RGB',(W*2+20,H+96),'white')
    def half(im):
        x=np.array(im).astype(float); x[...,3]*=0.5; return Image.fromarray(x.astype(np.uint8))
    L=Image.new('RGBA',(W,H),(255,255,255,255)); L.alpha_composite(half(b)); L.alpha_composite(half(c)); o.paste(L.convert('RGB'),(0,0))
    Rr=np.zeros((H,W,3),np.uint8)+255; Rr[contour('bulu')]=BLUE; Rr[contour(n)]=RED; o.paste(Image.fromarray(Rr),(W+20,0))
    d=ImageDraw.Draw(o)
    for who,col in [('bulu',BLUE),(n,RED)]:
        r=R[who]
        for off in (0,W+20):
            for key,lab in [('top','髮頂'),('chin','下巴'),('waist','腰'),('split','腿分開')]:
                y=r.get(key) if key!='split' or r.get('leg') else None
                if y is None: continue
                x0=off+(0 if who=='bulu' else W//2)
                for xx in range(x0,x0+W//2,8): d.line([(xx,y),(xx+4,y)],fill=col)
                if off==W+20: d.text((off+(4 if who=='bulu' else W-70),y-15),f'{lab} y{y:g}',fill=col,font=F(12))
    for off in (0,W+20): d.line([(off,685),(off+W,685)],fill=(0,0,0))
    d.text((8,H+6),f'左：布魯與{NAME[n]}各 50% 透明相疊（原尺寸、腳底 y685 對齊）　右：輪廓線　藍＝布魯　紅＝{NAME[n]}',fill=(0,0,0),font=F(15))
    r=R[n]; b_=R['bulu']; pc=lambda k:'%+.1f%%'%((r[k]-b_[k])/b_[k]*100)
    s=f'頭身比 {r["ratio"]:.4f}（{pc("ratio")}）　臉寬 {r["faceW"]}（{pc("faceW")}）　頭部面積 {r["headArea"]}（{pc("headArea")}）　髮量 {r["hair"]}（{pc("hair")}）　身長 {r["body"]:g}（{pc("body")}）　總高不含帽 {r["total"]}（{pc("total")}）'
    if r.get('leg'): s+=f'　腿長 {r["leg"]:g}（{pc("leg")}）'
    d.text((8,H+34),s,fill=(0,0,0),font=F(13)); d.text((8,H+60),note,fill=(200,0,0),font=F(14,True))
    o.save(f'{OUT}/{fn}')
overlay('jiejie','overlay-sister-vs-blue.png','cast9 第 2 輪姐姐（整張重畫）。頭部面積、身長、總高在 ±5% 內；頭高 −11.1%、頭身比 −9.1%、臉寬 −7.5% 超過 ±5%。')
overlay('spirit','overlay-spirit-vs-blue.png','注意：精靈這張圖和 cast8 逐像素相同，第 2 輪仍然沒有重畫、沒有加高。')
# seven
order=['bulu','jiejie','hate','spirit','feifei','apiao','sika']; cw=420; H=720
o=Image.new('RGB',(cw*7+20,H+400),'white'); d=ImageDraw.Draw(o)
for i,n in enumerate(order):
    im=Image.open(P(n)).convert('RGBA'); a=np.array(im)[...,3]>=128; xs=np.where(a.any(0))[0]; cxm=(xs.min()+xs.max())//2
    bg=Image.new('RGBA',(cw,H),(255,255,255,255)); bg.alpha_composite(im,(cw//2-cxm,0)); o.paste(bg.convert('RGB'),(10+i*cw,0))
    d.text((10+i*cw+cw//2-30,H-28),NAME[n]+('（仍是 cast8）' if n=='spirit' else ''),fill=(0,0,0),font=F(18,True))
b_=R['bulu']
for key,lab in [('top','布魯髮頂'),('chin','布魯下巴'),('waist','布魯腰'),('split','布魯腿分開')]:
    y=b_[key]
    for xx in range(0,cw*7+20,10): d.line([(xx,y),(xx+5,y)],fill=BLUE)
    d.text((4,y-16),f'{lab} y{y:g}',fill=BLUE,font=F(12))
d.line([(0,685),(cw*7+20,685)],fill=(0,0,0))
HP=dict(ratio=0.2,faceW=2.2,headArea=-1.0,hair=3.1,hairLong=3.1,body=1.4,leg=4.2,total=0.3,total_hat=1.2,headH=0.5,waist2foot=-0.3)
rows=[('頭身比（頭高÷不含帽總高）','ratio','%.4f'),('頭高（髮頂到下巴）','headH','%g'),('臉寬（不含耳）','faceW','%d'),('頭部面積（不含帽）','headArea','%d'),('髮量（下巴以上）','hair','%d'),('髮量（含下巴以下長髮）','hairLong','%d'),('肩外輪廓全寬（含袖子）','shFull','%d'),('身長（下巴到腰）','body','%g'),('腰到腳底','waist2foot','%g'),('腿長（腿分開到腳底）','leg','%g'),('總高（不含帽／皇冠／蝴蝶結）','total','%d'),('總高（含帽／皇冠／蝴蝶結）','total_hat','%d')]
y0=H+8; d.text((10,y0),'項目',fill=(0,0,0),font=F(15,True))
for j,n in enumerate(order[:4]): d.text((300+j*300,y0),NAME[n],fill=(0,0,0),font=F(15,True))
d.text((300+4*300+100,y0),'飛飛、阿飄、西卡：只放圖沒有量。姐姐腿被裙子蓋住，腿長量不到。',fill=(90,90,90),font=F(14))
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
        d.text((300+j*300,y),s,fill=col,font=F(14))
d.text((10,y0+28+len(rows)*27+4),'紅字＝和布魯差超過 5%。哈特像素和 cast7 完全相同，數字沿用。精靈第 2 輪仍沒有換圖，數字和 cast8 相同：身長、腿長、不含帽總高都沒有達到要求。',fill=(60,60,60),font=F(13))
o.save(f'{OUT}/cmp-seven.png')
def edges(n,regions,title):
    full_d=comp(P(n),(40,40,48)); full_w=comp(P(n),(255,255,255)); dw=ImageDraw.Draw(full_w)
    for i,(lab,box,k) in enumerate(regions): dw.rectangle(box,outline=(255,0,0),width=2); dw.text((box[0]+2,box[1]-16),str(i+1),fill=(255,0,0),font=F(14,True))
    pans=[(f'{i+1}. {lab}（放大 {k} 倍：白底｜深底｜透明度）',panel(P(n),box,k)) for i,(lab,box,k) in enumerate(regions)]
    # two columns of panels
    cols=[[],[]]; hs=[0,0]
    for it in pans:
        j=0 if hs[0]<=hs[1] else 1; cols[j].append(it); hs[j]+=it[1].size[1]+34
    cwid=[max([p.size[0] for _,p in c]+[10])+20 for c in cols]
    o=Image.new('RGB',(1080+20+sum(cwid),max(720+40,max(hs)+10)),'white'); o.paste(full_d,(0,40)); o.paste(full_w,(540,40)); d=ImageDraw.Draw(o)
    d.text((8,8),title,fill=(0,0,0),font=F(16,True)); x=1100
    for j,c in enumerate(cols):
        y=6
        for lab,p in c:
            d.text((x,y),lab,fill=(0,0,0),font=F(14)); o.paste(p,(x,y+24)); y+=p.size[1]+34
        x+=cwid[j]
    o.save(f'{OUT}/edges-{n}.png')
edges('jiejie',[('蝴蝶結',(248,15,402,120),3),('瀏海',(205,95,345,150),3),('舉手指縫、手和頭髮之間的空隙',(125,125,215,240),4),('下巴、脖子',(225,212,335,262),4),('右側頭髮外緣與袖子間的空隙',(370,235,430,310),4),('左袖口',(105,215,205,335),3),('叉腰手、手錶、手臂和腰的空隙',(290,300,425,420),3),('襪口與裙擺',(185,500,355,570),3),('腳踝、鞋子',(180,600,360,690),3)],'微笑姐姐　cast9 第 2 輪　左：深色底　右：白底＋放大位置')
edges('spirit',[('舉手袖口',(130,335,200,405),5),('皇冠底座和頭髮交界',(215,108,325,148),5),('左耳、鬢角',(140,225,220,300),4),('下巴、脖子',(220,295,320,345),4),('右耳尖',(320,205,400,275),4)],'氣球精靈　和 cast8 逐像素相同（第 2 輪仍沒有換圖）　左：深色底　右：白底＋放大位置')
edges('hate',[('右側頭髮外緣',(322,45,372,170),4),('頭頂',(200,15,300,60),5)],'哈特　和 5b125dc 逐像素相同　左：深色底　右：白底＋放大位置')
# legs
L=json.load(open(T+'/legs.json')); J={int(k):v for k,v in L['J'].items()}; Fe={int(k):v for k,v in L['F'].items()}
k=3; box=(120,470,440,700); bw,bh=(box[2]-box[0])*k,(box[3]-box[1])*k
o=Image.new('RGB',(bw*3+40,bh+230),'white'); d=ImageDraw.Draw(o)
def big(p): return comp(p,(255,255,255)).crop(box).resize((bw,bh),Image.LANCZOS)
ja=Image.open(P('jiejie')).convert('RGBA'); fa=Image.open(P('feifei')).convert('RGBA')
# align leg centres for overlay: centre between legs
def half(im):
    x=np.array(im).astype(float); x[...,3]*=0.5; return Image.fromarray(x.astype(np.uint8))
def gapc(p,y):
    a=np.array(Image.open(p).convert('RGBA'))[...,3]>=128; xs=np.where(a[y,100:440])[0]+100; i=np.where(np.diff(xs)>1)[0][0]; return (xs[i]+xs[i+1])/2
dx=int(round(gapc(P('jiejie'),600)-gapc(P('feifei'),600)))
Lr=Image.new('RGBA',(540,720),(255,255,255,255)); Lr.alpha_composite(half(ja)); sh=Image.new('RGBA',(540,720),(0,0,0,0)); sh.paste(fa,(dx,0)); Lr.alpha_composite(half(sh))
o.paste(big(P('jiejie')),(0,30)); o.paste(big(P('feifei')),(bw+20,30)); o.paste(Lr.convert('RGB').crop(box).resize((bw,bh),Image.LANCZOS),(bw*2+40,30))
for i,t in enumerate(['微笑姐姐 cast9 第 2 輪','飛飛',f'兩人各 50% 相疊（飛飛橫移 {dx:+d} px 對齊兩腿中線，腳底同一條線）']): d.text((i*(bw+20)+6,4),t,fill=(0,0,0),font=F(16,True))
for y in (572,590,608,620,632):
    yy=30+(y-box[1])*k
    for i,(dct,xo) in enumerate([(J,0),(Fe,bw+20)]):
        for xx in range(xo,xo+bw,10): d.line([(xx,yy),(xx+5,yy)],fill=RED)
        d.text((xo+6,yy-18),f'y{y}　左腿 {dct[y][0]}　右腿 {dct[y][1]} px',fill=RED,font=F(13,True))
yb=bh+40
def _m(d,y0,y1): return np.array([(d[y][0]+d[y][1])/2 for y in range(y0,y1+1) if y in d])
jm,fm=_m(J,572,632),_m(Fe,572,632); jc,fc=_m(J,572,604),_m(Fe,572,604); ja_,fa_=_m(J,608,628),_m(Fe,608,628)
lines=['單腿寬（alpha≥128、原圖 540×720、腳底 y685；左右指畫面左右）',
 '同一高度 y572～632（兩人都露出兩條腿）平均：姐姐 %.1f px／飛飛 %.1f px＝%.2f'%(jm.mean(),fm.mean(),jm.mean()/fm.mean()),
 '小腿段 y572～604：姐姐 %.1f／飛飛 %.1f＝%.2f　　腳踝段 y608～628：姐姐 %.1f／飛飛 %.1f＝%.2f'%(jc.mean(),fc.mean(),jc.mean()/fc.mean(),ja_.mean(),fa_.mean(),ja_.mean()/fa_.mean()),
 '最粗處：姐姐 %.1f／飛飛 %.1f＝%.2f　　最細處（腳踝）：姐姐 %.1f／飛飛 %.1f＝%.2f'%(jm.max(),fm.max(),jm.max()/fm.max(),jm.min(),fm.min(),jm.min()/fm.min()),
 '對照：cast8 姐姐同高度平均 32.7 px（對飛飛 0.58）；cast9 第 1 輪 50.0 px（0.89）。布魯單腿平均 52.5 px。',
 '姐姐穿及膝長襪、飛飛光腿穿短襪，量的是外輪廓。姐姐腿往腳踝收細，飛飛是直筒。']
print(lines)
for i,t in enumerate(lines): d.text((8,yb+i*28),t,fill=(0,0,0),font=F(16,i==0))
o.save(f'{OUT}/legs-sister-vs-feifei.png')
# naturalness
I=json.load(open(T+'/iris.json'))
items=[('微笑姐姐 cast9 第 2 輪','assets/chars/jiejie.png',(125,12,425,312),'jiejie9'),('氣球精靈（仍是 cast8）','assets/chars/spirit.png',(135,95,415,355),'spirit'),('飛飛（參考）','assets/chars/feifei.png',(110,20,430,340),'feifei'),
       ('姐姐原設定 origin/main',T+'/jiejie-orig.png',(190,35,350,210),None),('姐姐 cast8（被說魚眼那版）',T+'/jiejie-c8.png',(150,8,420,290),None),('精靈原設定 origin/main',T+'/spirit-orig.png',(190,150,350,300),'spirit_orig'),('布魯（比例標準）','assets/chars/bulu.png',(150,20,390,280),'bulu')]
S=560; o=Image.new('RGB',(S*4+50,(S+70)*2+10),'white'); d=ImageDraw.Draw(o)
for i,(t,p,b,key) in enumerate(items):
    im=comp(p,(255,255,255)).crop(b); sc=S/max(im.size); im=im.resize((int(im.size[0]*sc),int(im.size[1]*sc)),Image.LANCZOS)
    x0=10+(i%4)*(S+10) if i<3 else 10+((i-3)%4)*(S+10); y0=40 if i<3 else S+110
    o.paste(im,(x0,y0)); dd=ImageDraw.Draw(o)
    s=t
    if key and key in I:
        r=I[key]; s+=f'　眼線傾斜 {abs(r["tilt"]):.1f}°'
        (ax,ay),(bx,by)=r['L'][:2],r['R'][:2]
        pt=lambda X,Y:(x0+(X-b[0])*sc,y0+(Y-b[1])*sc)
        ex=(bx-ax)*0.6; ey=(by-ay)*0.6
        dd.line([pt(ax-ex,ay-ey),pt(bx+ex,by+ey)],fill=(0,170,0),width=2)
    d.text((x0,y0-30),s,fill=(0,0,0),font=F(17,True))
d.text((10+3*(S+10),60),'上排：這一輪要比的三張臉\n（各自等比放大到同樣格子大小，\n沒有做任何變形）\n\n綠線＝兩眼瞳孔中心連線\n\n下排：對照用\n（原設定、cast8、布魯）',fill=(60,60,60),font=F(17))
o.save(f'{OUT}/naturalness-vs-feifei.png')
print('ok')
