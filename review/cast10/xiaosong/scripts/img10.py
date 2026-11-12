import sys,numpy as np,cv2,json,os; T=sys.argv[1]; sys.path.insert(0,T)
from PIL import Image,ImageDraw,ImageFont
from zoom import comp,alpha,panel
OUT='review/cast10/xiaosong'; os.makedirs(OUT,exist_ok=True)
FP=os.path.expanduser('~/Library/Fonts/NotoSansTC-Regular.otf'); FB=os.path.expanduser('~/Library/Fonts/NotoSansTC-Bold.otf')
F=lambda s,b=False: ImageFont.truetype(FB if b else FP,s)
R=json.load(open(T+'/R.json')); I=json.load(open(T+'/iris.json'))
NAME={'bulu':'布魯','jiejie':'微笑姐姐','hate':'哈特','spirit':'氣球精靈','feifei':'飛飛','apiao':'阿飄','sika':'西卡'}
P=lambda n:f'assets/chars/{n}.png'
BLUE=(30,90,230); RED=(225,40,40); GREEN=(0,140,0)
def half(im):
    x=np.array(im).astype(float); x[...,3]*=0.5; return Image.fromarray(x.astype(np.uint8))
def cont(a): return a&~(cv2.erode(a.astype(np.uint8),np.ones((3,3),np.uint8))>0)
pc=lambda v,b:'%+.1f%%'%((v-b)/b*100)
# ---------- 1 overlay
W,H=540,800; DY=80
b=Image.new('RGBA',(W,H),(0,0,0,0)); b.paste(Image.open(P('bulu')).convert('RGBA'),(0,DY)); c=Image.open(P('spirit')).convert('RGBA')
o=Image.new('RGB',(W*2+20,H+150),'white')
L=Image.new('RGBA',(W,H),(255,255,255,255)); L.alpha_composite(half(b)); L.alpha_composite(half(c)); o.paste(L.convert('RGB'),(0,0))
Rr=np.zeros((H,W,3),np.uint8)+255; Rr[cont(np.array(b)[...,3]>=128)]=BLUE; Rr[cont(np.array(c)[...,3]>=128)]=RED; o.paste(Image.fromarray(Rr),(W+20,0))
d=ImageDraw.Draw(o); rb,rs=R['bulu'],R['spirit']
for who,col,r,dy in [('bulu',BLUE,rb,DY),('spirit',RED,rs,0)]:
    for off in (0,W+20):
        for key,lab in [('top','髮頂'),('chin','下巴'),('waist','腰'),('split','腿分開')]:
            y=r[key]+dy; x0=off+(0 if who=='bulu' else W//2)
            for xx in range(x0,x0+W//2,8): d.line([(xx,y),(xx+4,y)],fill=col)
            if off==W+20: d.text((off+(4 if who=='bulu' else W-92),y-15),f'{lab} y{y:g}',fill=col,font=F(12))
for off in (0,W+20):
    d.line([(off,765),(off+W,765)],fill=(0,0,0)); d.line([(off,7),(off+W,7)],fill=(150,150,150))
d.text((W+24,9),'皇冠頂 y7',fill=(110,110,110),font=F(12))
d.text((8,H+6),'左：布魯與氣球精靈各 50% 透明相疊（原尺寸，沒有縮放；布魯整張下移 80px，兩人腳底對齊 y765）　右：輪廓線　藍＝布魯　紅＝精靈',fill=(0,0,0),font=F(14))
s1=f'身長（下巴到腰） {rs["body"]:g}／{rb["body"]:g}（{pc(rs["body"],rb["body"])}）　腿長 {rs["leg"]:g}／{rb["leg"]:g}（{pc(rs["leg"],rb["leg"])}）　不含帽總高 {rs["total"]}／{rb["total"]}（{pc(rs["total"],rb["total"])}）　含帽總高 {rs["total_hat"]}（{pc(rs["total_hat"],rb["total"])}）'
s2=f'臉寬 {rs["faceW"]}／{rb["faceW"]}（{pc(rs["faceW"],rb["faceW"])}）　頭部面積 {rs["headArea"]}／{rb["headArea"]}（{pc(rs["headArea"],rb["headArea"])}）　髮量 {rs["hair"]}／{rb["hair"]}（{pc(rs["hair"],rb["hair"])}）　頭高 {rs["headH"]:g}／{rb["headH"]:g}（{pc(rs["headH"],rb["headH"])}）　頭身比 {rs["ratio"]:.4f}／{rb["ratio"]:.4f}（{pc(rs["ratio"],rb["ratio"])}）'
d.text((8,H+34),'精靈／布魯：'+s1,fill=(0,0,0),font=F(13)); d.text((8,H+58),'精靈／布魯：'+s2,fill=(0,0,0),font=F(13))
d.text((8,H+86),'身長、腿長、不含帽總高、臉寬、頭部面積都在 ±5% 內。髮量 +6.1%、頭高 −13.4%、頭身比 −10.2% 超過（布魯是往上翹的刺蝟頭，精靈頭頂被皇冠壓平）。',fill=(200,0,0),font=F(13,True))
d.text((8,H+112),'帽子、皇冠不算頭。下巴、腰是人工定位點（誤差約 1～2px），腳底、腿分開點、面積由程式量。',fill=(90,90,90),font=F(12))
o.save(f'{OUT}/overlay-spirit-vs-blue.png')
# ---------- 2 naturalness
items=[('氣球精靈 cast10（新）','assets/chars/spirit.png',(125,0,415,345),'spirit'),('飛飛（自然感參考）','assets/chars/feifei.png',(110,20,430,340),'feifei'),('布魯（比例標準）','assets/chars/bulu.png',(150,20,390,280),'bulu'),
       ('精靈原設定 origin/main','%s/spirit-orig.png'%T,(140,25,360,300),'spirit_orig'),('精靈 cast9（放大臉貼縮小身體那版）','%s/spirit-c9.png'%T,(135,0,415,355),'spirit9'),('精靈 cast10 頭→脖子→肩膀','assets/chars/spirit.png',(180,270,360,400),None),('飛飛 頭→脖子→肩膀','assets/chars/feifei.png',(170,215,370,345),None)]
S=520; o=Image.new('RGB',(S*4+50,(S+70)*2+60),'white'); d=ImageDraw.Draw(o)
for i,(t,p,bx,key) in enumerate(items):
    im=comp(p,(255,255,255)).crop(bx); sc=S/max(im.size); im=im.resize((int(im.size[0]*sc),int(im.size[1]*sc)),Image.LANCZOS)
    x0=10+(i%4)*(S+10) if i<3 else 10+((i-3)%4)*(S+10); y0=40 if i<3 else S+110
    o.paste(im,(x0,y0)); s=t
    if key and key in I:
        r=I[key]; s+=f'　眼線傾斜 {abs(r["tilt"]):.1f}°'
        (ax,ay),(bx_,by)=r['L'][:2],r['R'][:2]; pt=lambda X,Y:(x0+(X-bx[0])*sc,y0+(Y-bx[1])*sc)
        ex=(bx_-ax)*0.6; ey=(by-ay)*0.6; d.line([pt(ax-ex,ay-ey),pt(bx_+ex,by+ey)],fill=(0,170,0),width=2)
    d.text((x0,y0-30),s,fill=(0,0,0),font=F(16,True))
d.text((10+3*(S+10),60),'上排：新精靈、飛飛、布魯\n（各自等比放大到同樣格子，\n沒有做任何變形）\n\n綠線＝兩眼瞳孔中心連線\n\n下排：原設定、cast9、\n以及新精靈和飛飛的\n頭→脖子→肩膀銜接\n\n新精靈成品＝來源圖\nreview/cast10/source/\nspirit-built-in.png\n整張等比縮小 0.523 倍\n（橫 0.5229、直 0.5231），\n頭和身體是同一張圖、\n同一個倍率，沒有分開處理。',fill=(60,60,60),font=F(16))
o.save(f'{OUT}/naturalness-vs-feifei.png')
# ---------- 3 cmp-seven (game scale logic, vh=820, speaker role)
M=json.load(open('data/cast-metrics.json'))['chars']; REF=224/657; vh=820
def vscale(n):
    m=M[n]; tb=0.5*vh; th=tb*REF
    span=(m['feet']-m['headTop']) if n in('hate','spirit','jiejie') else (m['feet']-m.get('bboxTop',0))
    ratio=m['head']/span
    return (th/m['head'],'頭對齊') if abs(ratio/REF-1)<=0.10 else (tb/span,'只對齊身高')
order=['bulu','jiejie','hate','spirit','feifei','apiao','sika']; cw=330; GY=560; Ht=GY+60
o=Image.new('RGB',(cw*7+20,Ht+470),'white'); d=ImageDraw.Draw(o); info={}
for i,n in enumerate(order):
    im=Image.open(f'assets/chars/expr/{n}-happy.png').convert('RGBA'); s,mode=vscale(n); m=M[n]
    a=np.array(im)[...,3]>=128; ys=np.where(a.any(1))[0]; xs=np.where(a.any(0))[0]
    im2=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    x=10+i*cw+cw//2-round((xs.min()+xs.max())/2*s); y=GY-m['feet']*s
    tmp=Image.new('RGBA',o.size,(0,0,0,0)); tmp.alpha_composite(im2,(int(x),int(round(y)))); o.paste(tmp.convert('RGB'),(0,0),tmp)
    info[n]=dict(s=s,mode=mode,sole=y+(ys.max()+1)*s,top=y+ys.min()*s,headTop=y+m['headTop']*s,chin=y+m['chin']*s)
    d=ImageDraw.Draw(o); d.text((10+i*cw+cw//2-60,GY+8),f'{NAME[n]}',fill=(0,0,0),font=F(17,True)); d.text((10+i*cw+cw//2-60,GY+32),f'倍率 {s:.3f}（{mode}）',fill=(90,90,90),font=F(12))
d.line([(0,GY),(cw*7+20,GY)],fill=(0,0,0)); d.text((4,GY-18),'同一條地面線',fill=(0,0,0),font=F(12))
for key,lab,col in [('headTop','布魯髮頂',BLUE),('chin','布魯下巴',BLUE)]:
    y=info['bulu'][key]
    for xx in range(0,cw*7+20,10): d.line([(xx,y),(xx+5,y)],fill=col)
    d.text((4,y-16),lab,fill=col,font=F(12))
y0=Ht+6
d.text((10,y0),'上圖：照遊戲程式 visualScale（畫面高 820、主講者）算出的倍率縮放，腳底用遊戲的 feet 值對在同一條地面線。遊戲一次最多同時出現三人，這裡七人排一起只是方便比較。',fill=(0,0,0),font=F(13))
d.text((10,y0+22),'實際鞋底位置（地面線=0，正值=比地面低）：'+'　'.join(f'{NAME[n]} {info[n]["sole"]-GY:+.1f}' for n in order)+'　px',fill=(0,0,0),font=F(13))
rows=[('頭身比（頭高÷不含帽總高）','ratio','%.4f'),('頭高（髮頂到下巴）','headH','%g'),('臉寬（不含耳）','faceW','%d'),('頭部面積（不含帽、含耳）','headArea','%d'),('髮量（藍髮圈＋黑髮）','hair','%d'),('頭寬（含頭髮、不含耳）','headW_noear','%d'),('肩外輪廓全寬（含袖子）','shFull','%d'),('身長（下巴到腰）','body','%g'),('腰到腳底','waist2foot','%g'),('腿長（腿分開點到腳底）','leg','%g'),('總高（不含帽）','total','%d'),('總高（含皇冠）','total_hat','%d')]
R['bulu']['total_hat']=655
yt=y0+56; d.text((10,yt),'原圖量測（未縮放，px／px²）',fill=(0,0,0),font=F(15,True))
for j,t in enumerate(['布魯','精靈 cast10','精靈 cast9（對照）']): d.text((330+j*330,yt),t,fill=(0,0,0),font=F(15,True))
for i,(lab,k,fm) in enumerate(rows):
    y=yt+28+i*26; d.text((10,y),lab,fill=(0,0,0),font=F(14))
    for j,n in enumerate(['bulu','spirit','spirit9']):
        v=R[n].get(k); bv=R['bulu'].get(k) if k!='total_hat' else 655; s=fm%v; col=(0,0,0)
        if n!='bulu': p=(v-bv)/bv*100; s+='（%+.1f%%）'%p; col=(200,0,0) if abs(p)>5 else (0,120,0)
        d.text((330+j*330,y),s,fill=col,font=F(14))
xs_=1340; d.text((xs_,yt),'微笑姐姐（對 39b59fe）',fill=(0,0,0),font=F(15,True))
for i,t in enumerate(['差異像素 1558 個，全部在 y364～429、x169～319','頭、頭髮（y0～363）、裙擺以下、腿、腳（y430～719）：0 個像素不同','腰寬 y369：96 → 100 px（+4.2%）','腰帶上緣 y375：98 → 107 px（+9.2%）；腰帶中段 y380：101 → 108（+6.9%）','裙腰 y410：151 → 156（+3.3%）；胸寬 y349：93 → 93（沒改）','紅字＝和布魯差超過 5%，綠字＝5% 內']): d.text((xs_,yt+28+i*26),t,fill=(200,0,0) if i==5 else (0,0,0),font=F(14))
o.save(f'{OUT}/cmp-seven.png'); json.dump(info,open(T+'/seven.json','w'),indent=1)
# ---------- 4/5 edges
def edges(p,regions,title,fn,H=720):
    full_d=comp(p,(40,40,48)); full_w=comp(p,(255,255,255)); dw=ImageDraw.Draw(full_w)
    for i,(lab,box,k) in enumerate(regions): dw.rectangle(box,outline=(255,0,0),width=2); dw.text((box[0]+2,box[1]-16),str(i+1),fill=(255,0,0),font=F(14,True))
    pans=[(f'{i+1}. {lab}（放大 {k} 倍：白底｜深底｜透明度）',panel(p,box,k)) for i,(lab,box,k) in enumerate(regions)]
    cols=[[],[],[]]; hs=[0,0,0]
    for it in pans:
        j=int(np.argmin(hs)); cols[j].append(it); hs[j]+=it[1].size[1]+34
    cwid=[max([q.size[0] for _,q in c]+[10])+20 for c in cols]
    o=Image.new('RGB',(1080+20+sum(cwid),max(H+40,max(hs)+10)),'white'); o.paste(full_d,(0,40)); o.paste(full_w,(540,40)); d=ImageDraw.Draw(o)
    d.text((8,8),title,fill=(0,0,0),font=F(16,True)); x=1100
    for j,c in enumerate(cols):
        y=6
        for lab,q in c:
            d.text((x,y),lab,fill=(0,0,0),font=F(14)); o.paste(q,(x,y+24)); y+=q.size[1]+34
        x+=cwid[j]
    o.save(f'{OUT}/{fn}')
edges(P('spirit'),[('皇冠頂、毛球',(225,2,330,70),4),('右側毛球與皇冠尖',(315,20,370,115),4),('皇冠底座和頭髮交界',(205,105,335,150),4),('藍髮圈外緣（左）',(160,140,225,235),4),('左耳、鬢角',(150,225,225,300),4),('舉手手指、指縫',(130,280,205,350),4),('下巴、脖子、領口',(225,295,320,345),4),('右耳尖',(325,225,405,300),4),('左袖口荷葉邊',(130,335,205,410),4),('叉腰手、手臂和腰的空隙',(300,375,410,480),3),('褲腳、鞋子',(180,690,360,770),3)],'氣球精靈 cast10（540×800，腳底 y765）　左：深色底　右：白底＋放大位置','edges-spirit.png',800)
edges(P('jiejie'),[('腰身改動區左側（腰、腰帶、裙腰）',(165,352,240,436),6),('腰身改動區右側（腰、腰帶到手）',(290,352,345,400),8),('整段腰（含腰帶、裙腰）',(160,335,350,440),4),('下巴、脖子（沒改）',(225,212,335,262),4),('叉腰手、手臂和腰的空隙',(290,300,425,420),3),('襪口與裙擺（沒改）',(185,500,355,570),3),('腳踝、鞋子（沒改）',(180,600,360,690),3)],'微笑姐姐 cast10 第 2 輪（改動範圍 y364～429：腰、腰帶、上段裙腰）　左：深色底　右：白底＋放大位置','edges-sister.png')
# ---------- 6 diff-sister
a=np.array(Image.open(P('jiejie')).convert('RGBA')); b9=np.array(Image.open(T+'/jiejie-c9.png').convert('RGBA')); dm=(a!=b9).any(2)
k=6; box=(160,352,345,436); bw,bh=(box[2]-box[0])*k,(box[3]-box[1])*k
o=Image.new('RGB',(540*2+30+bw+20, max(760,3*(bh+40)+120)),'white'); d=ImageDraw.Draw(o)
full=np.array(comp(P('jiejie'),(255,255,255))); g=(full*0.35+255*0.65).astype(np.uint8); g[dm]=(255,0,0); o.paste(Image.fromarray(g),(0,40))
mk=np.zeros((720,540,3),np.uint8)+255; mk[a[...,3]>=128]=(215,215,215); mk[dm]=(255,0,0); o.paste(Image.fromarray(mk),(550,40))
for off in (0,550):
    for y in (364,430): d.line([(off,40+y),(off+540,40+y)],fill=(0,0,255))
    d.rectangle((off+box[0],40+box[1],off+box[2],40+box[3]),outline=(0,160,0))
d.text((8,8),'微笑姐姐：和 39b59fe 逐像素比（RGBA 四個色版）　紅＝有改的像素 1558 個　藍線＝y364、y430　綠框＝右側放大範圍',fill=(0,0,0),font=F(15,True))
x0=1110
def crop(arr): return Image.fromarray(arr).crop(box).resize((bw,bh),Image.NEAREST)
w9=np.array(comp(T+'/jiejie-c9.png',(255,255,255))); wn=np.array(comp(P('jiejie'),(255,255,255))); wm=wn.copy(); wm[dm]=(255,0,0)
for i,(t,arr) in enumerate([('改前 39b59fe（放大 6 倍）',w9),('改後 cast10',wn),('改後＋紅色標出有改的像素',wm)]):
    y=40+i*(bh+40); d.text((x0,y-22),t,fill=(0,0,0),font=F(14,True)); o.paste(crop(arr),(x0,y))
y=40+3*(bh+40)
for i,t in enumerate(['範圍：y364～429（66 列）、x169～319；上方 y0～363、下方 y430～719 完全相同（0 個像素不同）。','腰 y369：96→100（+4.2%）　腰帶上緣 y375：98→107（+9.2%）　腰帶中段 y380：101→108（+6.9%）　裙腰 y410：151→156（+3.3%）','左側最多往外 6 px、右側最多 3 px（右邊下半被叉腰的手擋住）；胸 y349 衣料寬 93→93 沒改。','只有外緣一條窄帶往外移，中間的衣料圖案沒有縮放；左右輪廓逐列最多移 1 px，沒有階梯。']): d.text((x0,y+i*24),t,fill=(0,0,0),font=F(13))
o.save(f'{OUT}/diff-sister.png')
print('ok')
