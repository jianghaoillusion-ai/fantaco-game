"""Free, offline redraw from official stickers. Run with Pillow/numpy/scipy installed.
Outputs only the four requested poses, happy animation and review evidence.
"""
from pathlib import Path
import math, json, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/jimeng'
WHITE=(255,255,255); LINE=(71,83,111); STAR=(244,233,105)
S=3
FF=str(Path.home()/'media-tools/bin/ffmpeg')

def official(path, prop=False):
    im=Image.open(ROOT/path).convert('RGBA'); a=np.array(im)
    if not prop:
        rgb=a[:,:,:3].astype(float)
        t=np.clip(((255-rgb)@(255-np.array(LINE)))/sum((255-np.array(LINE))**2),0,1)
        a[:,:,:3]=np.rint(255-t[:,:,None]*(255-np.array(LINE))).astype('uint8')
        a[t>.94,:3]=LINE; a[t<.06,:3]=WHITE
    else:
        # Remove only border-connected white paper; retain any internal white.
        mask=(a[:,:,:3].min(2)>235)
        labels,n=ndimage.label(mask)
        ids=np.unique(np.r_[labels[0],labels[-1],labels[:,0],labels[:,-1]])
        a[np.isin(labels,ids[ids>0]),3]=0
        dark=(a[:,:,:3].max(2)<150)&(a[:,:,2].astype(int)-a[:,:,0]>15)
        a[dark,:3]=LINE
    result=Image.fromarray(a)
    return result.crop(result.getbbox()) if prop else result

base=official('assets/mascot/sticker/front.png').resize((248*S,441*S),Image.Resampling.LANCZOS)

def line(im, pts, width=8, fill=LINE):
    pts=[(round(x*S),round(y*S)) for x,y in pts]; d=ImageDraw.Draw(im)
    d.line(pts,fill=fill,width=round(width*S),joint='curve')
    r=width*S/2
    for x,y in (pts[0],pts[-1]): d.ellipse((x-r,y-r,x+r,y+r),fill=fill)

def curve(points):
    out=[]
    for i in range(0,len(points)-1,3):
        p=np.array(points[i:i+4]);
        for t in np.linspace(0,1,45): out.append(tuple((1-t)**3*p[0]+3*(1-t)**2*t*p[1]+3*(1-t)*t*t*p[2]+t**3*p[3]))
    return out

def face(im,kind):
    d=ImageDraw.Draw(im)
    d.rectangle((64*S,132*S,189*S,177*S),fill=WHITE)
    if kind=='sad':
        for x in [78,169]: d.ellipse(((x-6)*S,145*S,(x+6)*S,157*S),fill=LINE)
        line(im,[(73,131),(84,126)],10.8);line(im,[(163,126),(174,131)],10.8)
        line(im,[(124,148),(124,161)],10.8)
        line(im,curve([(111,165),(119,159),(128,159),(137,165)]),10.8)
    elif kind=='blink':
        d.ellipse((71*S,145*S,85*S,159*S),fill=LINE)
        line(im,curve([(158,154),(164,147),(174,147),(180,154)]),10.8)
        line(im,[(124,149),(124,165)],10.8)
        line(im,curve([(99,158),(115,168),(133,168),(147,158)]),10.8)
    else:
        for x in [78,169]:line(im,curve([(x-10,154),(x-5,145),(x+5,145),(x+10,154)]),10.8)
        line(im,[(124,149),(124,165)],10.8)
        line(im,curve([(99,158),(115,168),(133,168),(147,158)]),10.8)

def character(kind):
    im=base.copy()
    if kind=='sad':
        # Replace upright ears with drooping ears; keep official lower body and hands.
        ImageDraw.Draw(im).rectangle((0,0,248*S,136*S),fill=(0,0,0,0))
        pts=curve([(41,175),(36,143),(55,122),(77,104),(54,123),(20,169),(8,153),(-5,137),(32,83),(66,66),(87,52),(105,65),(124,64),(143,64),(164,52),(183,66),(216,83),(252,137),(240,153),(227,169),(193,123),(171,104),(192,122),(211,143),(207,175)])
        ImageDraw.Draw(im).polygon([(int(x*S),int(y*S)) for x,y in pts],fill=WHITE)
        line(im,pts,11)
        face(im,'sad')
    elif kind in ['blink','happy']:face(im,kind)
    elif kind=='hold-hat':
        hat_layer=Image.new('RGBA',im.size)
        d=ImageDraw.Draw(hat_layer)
        # Trace the official flat hat with clean edges (the source has a stray paper wedge).
        def poly(points,fill):
            d.polygon([(x*S,y*S) for x,y in points],fill=fill)
            line(hat_layer,points+[points[0]],5)
        d.ellipse((77*S,257*S,172*S,282*S),fill=(100,104,107),outline=LINE,width=5*S)
        poly([(88,211),(160,211),(150,267),(98,267)],(100,104,107))
        poly([(95,244),(153,244),(150,260),(98,260)],(235,115,96))
        d.ellipse((88*S,200*S,160*S,222*S),fill=(100,104,107),outline=LINE,width=5*S)
        im.alpha_composite(hat_layer,(0,-18*S))
        # Restore the exact official S-shaped short hands in front of the brim.
        hands=np.array(base.crop((45*S,234*S,205*S,298*S)))
        strength=np.clip((255-hands[:,:,:3].astype(float).mean(2))/(255-np.mean(LINE)),0,1)
        hands[:,:,:3]=LINE;hands[:,:,3]=np.rint(strength*255).astype('uint8')
        im.alpha_composite(Image.fromarray(hands),(45*S,234*S))
    elif kind=='hold-rose':
        line(im,curve([(154,261),(159,245),(162,226),(166,211)]),5,fill=(100,139,112))
        prop=official('assets/items/rose-official.png',True)
        prop.thumbnail((67*S,67*S),Image.Resampling.LANCZOS)
        im.alpha_composite(prop,(137*S,181*S))
        line(im,curve([(179,247),(176,258),(156,258),(151,266)]),10)
    return im

def frame(im,dy=0,angle=0):
    # Same official arm/body proportions in every animation frame; rigid movement only.
    im=im.resize((322,573),Image.Resampling.LANCZOS)
    im=im.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    out=Image.new('RGBA',(720,720));out.alpha_composite(im,((720-im.width)//2,72+round(dy)-(im.height-573)//2));return out

for name in ['sad','hold-hat','hold-rose','blink']:frame(character(name)).save(OUT/f'poses/{name}.png')
with tempfile.TemporaryDirectory(prefix='mascot-redraw-',dir='/Volumes/外接資料碟/AI工作/暫存') as tmp:
    tmp=Path(tmp); (tmp/'webm').mkdir(); happy=character('happy')
    for i in range(120):
        phase=0 if i==119 else 2*math.pi*i/119
        im=frame(happy,-22*(1-math.cos(phase*2))/2,2.3*math.sin(phase))
        im.save(tmp/f'{i:03}.png')
        # Compensate the measured +1 RGB VP9 full-range round trip for outline pixels.
        a=np.array(im);strength=np.clip((255-a[:,:,:3].astype(float).mean(2))/(255-np.mean(LINE)),0,1)
        a[:,:,:3]=np.clip(a[:,:,:3].astype(int)-np.rint(strength[:,:,None]).astype(int),0,255)
        Image.fromarray(a).save(tmp/'webm'/f'{i:03}.png')
    common=[FF,'-v','error','-y','-framerate','24','-i',str(tmp/'webm/%03d.png'),'-an']
    subprocess.run(common+['-c:v','libvpx-vp9','-crf','42','-b:v','0','-g','120','-pix_fmt','yuva420p','-vf','scale=in_range=full:out_range=full','-color_range','pc','-auto-alt-ref','0',str(OUT/'anim/happy.webm')],check=True)
    webm=OUT/'anim/happy.webm'
    subprocess.run([FF,'-v','error','-y','-i',str(webm),'-frames:v','119','-c','copy',str(tmp/'body.webm')],check=True)
    subprocess.run([FF,'-v','error','-y','-i',str(webm),'-frames:v','1','-c','copy',str(tmp/'end.webm')],check=True)
    (tmp/'concat.txt').write_text("file 'body.webm'\nduration 4.958333333\nfile 'end.webm'\n")
    subprocess.run([FF,'-v','error','-y','-f','concat','-safe','0','-i',str(tmp/'concat.txt'),'-c','copy',str(webm)],check=True)
    common=[FF,'-v','error','-y','-framerate','24','-i',str(tmp/'%03d.png'),'-an']
    # Refresh the existing transparent GIF from the repaired source frames.
    gif_frames=[]
    palette=Image.new('P',(1,1))
    palette.putpalette([0,0,0,*WHITE,*LINE]+[0,0,0]*253)
    for i in range(120):
        rgba=Image.open(tmp/f'{i:03}.png').resize((480,480),Image.Resampling.LANCZOS)
        g=rgba.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE)
        g.paste(0,mask=rgba.getchannel('A').point(lambda x:255 if x<160 else 0))
        gif_frames.append(g)
    durations=[round((i+1)*100/24)*10-round(i*100/24)*10 for i in range(120)]
    gif_frames[0].save(OUT/'anim/happy.gif',save_all=True,append_images=gif_frames[1:],duration=durations,loop=0,transparency=0,disposal=2,optimize=False)
    # Standard H.264 4:2:0 for mobile playback; identical intra coding at loop ends.
    for p in tmp.glob('*.png'):
        im=Image.open(p);bg=Image.new('RGBA',im.size,(222,239,247,255));bg.alpha_composite(im);bg.convert('RGB').save(p)
    subprocess.run(common+['-c:v','libx264','-qp','18','-g','1','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'anim/happy.mp4')],check=True)

# Contact sheet: official upper row, replacements lower row; explicit no-star labels.
font='/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
f=ImageFont.truetype(font,22);small=ImageFont.truetype(font,18)
sheet=Image.new('RGB',(1500,1020),'#ECF1F5');d=ImageDraw.Draw(sheet)
d.text((25,15),'官方貼紙（上）／小夏本機重做（下）',font=f,fill=LINE)
labels=['難過','拿高帽','拿玫瑰','眨眼','開心動畫']
for i,name in enumerate(['sad','hold-hat','hold-rose','blink','happy']):
    x=i*300
    ref=official('assets/mascot/sticker/blink.png') if name=='blink' else frame(base)
    ref.thumbnail((285,340))
    sheet.paste(ref,(x,55),ref)
    if name=='hold-hat':
        prop=official('assets/items/hat-black.png',True)
        a=np.array(prop); components,_=ndimage.label(a[:,:,3]>0)
        sizes=np.bincount(components.ravel());sizes[0]=0
        a[components!=sizes.argmax(),3]=0;prop=Image.fromarray(a)
    elif name=='hold-rose':prop=official('assets/items/rose-official.png',True)
    else:prop=None
    if prop:
        prop.thumbnail((90,90));sheet.paste(prop,(x+200,280),prop)
    d.text((x+15,385),'官方眨眼貼紙' if name=='blink' else '官方正面：不露星星',font=small,fill=LINE)
    im=frame(character(name));im.thumbnail((285,340));sheet.paste(im,(x,475),im)
    d.text((x+15,825),labels[i]+'｜不露星星',font=f,fill=LINE)
    for j,(text,color) in enumerate([('身體 #FFFFFF',WHITE),('外框 #47536F',LINE),('星星不顯示',STAR)]):
        d.rectangle((x+15,870+j*31,x+33,888+j*31),fill=color,outline=LINE)
        d.text((x+43,866+j*31),text,font=small,fill=LINE)
d.text((25,985),'星星官方色 #F4E969（本次全為正面，不使用）；無腮紅、無紅口腔。',font=small,fill=LINE)
sheet.save(OUT/'style-compare.png')
print('Rendered four poses, happy MP4/WebM and style comparison.')
