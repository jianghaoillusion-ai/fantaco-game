"""本機免費去除指定原圖青色背景；不改動哈特、不縮放人物。"""
import json
import cv2
import numpy as np
from PIL import Image
from build_cast7 import ROOT, OUT, MAIN, source, checker, font
from PIL import ImageDraw

def clean(k):
    original=source(MAIN,k)
    if k=='spirit':
        shifted=Image.new('RGBA',(540,720));shifted.alpha_composite(original,(0,3));original=shifted
    a=np.array(original);rgb=a[:,:,:3];alpha=a[:,:,3].copy()
    hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
    # 青色背景的 hue 與精靈的藍衣、藍髮分離；只接受能連到透明區的色塊。
    cyan=(hsv[:,:,0]>=80)&(hsv[:,:,0]<=100)&(hsv[:,:,1]>60)
    candidates=cyan|(alpha==0)
    n,labels=cv2.connectedComponents(candidates.astype('uint8'),8)
    exterior=np.unique(labels[alpha==0]);remove=cyan&np.isin(labels,exterior)&(alpha>0)
    # 姐姐的髮絲間、腰與手肘間、鞋帶孔是封閉背景空隙。
    if k=='jiejie':
        holes=np.zeros_like(remove)
        for x0,y0,x1,y1 in [(313,285,335,332),(341,152,352,182),(363,209,378,236),(218,171,226,186),(231,175,236,190),(270,618,275,623),(208,610,213,614)]:
            holes[y0:y1,x0:x1]=True
        remove |= cyan&holes&(alpha>0)
    if k=='spirit':
        holes=np.zeros_like(remove);holes[358:377,331:346]=True
        remove |= cyan&holes&(alpha>0)
    cleared=alpha.copy();cleared[remove]=0
    # 在清除區旁一像素接回原描邊色，局部平滑 alpha，保留內部所有像素。
    zone=cv2.dilate(remove.astype('uint8'),np.ones((3,3),np.uint8))>0
    solid=(cleared>=128).astype('uint8')
    band=(cv2.dilate(solid,np.ones((3,3),np.uint8))!=cv2.erode(solid,np.ones((3,3),np.uint8)))&zone
    blurred=cv2.GaussianBlur(cleared,(3,3),.55)
    cleared[band]=blurred[band]
    core=(cleared>=128)&~cyan
    _,nearest=cv2.distanceTransformWithLabels((~core).astype('uint8'),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
    colors=rgb[core];replace=zone&(cleared>0)&(cyan|(alpha==0))
    a[:,:,:3][replace]=colors[nearest[replace]-1]
    a[:,:,3]=cleared
    # 清掉原設定中 alpha 極低且與人物不連通的背景碎點。
    n,l,stats,_=cv2.connectedComponentsWithStats((a[:,:,3]>0).astype('uint8'),8)
    largest=1+np.argmax(stats[1:,4]);isolated=(l!=largest)&(l>0)
    removed_components=[dict(x=int(st[0]),y=int(st[1]),width=int(st[2]),height=int(st[3]),pixels=int(st[4]),max_alpha=int(a[:,:,3][l==i].max())) for i,st in enumerate(stats) if i>0 and i!=largest]
    a[:,:,3][isolated]=0
    # 外緣去色後留下的單像素碎點，不當成服裝細節保留。
    n,sl,ss,_=cv2.connectedComponentsWithStats((a[:,:,3]>=128).astype('uint8'),8)
    tiny=np.isin(sl,1+np.where(ss[1:,4]<8)[0])
    main=np.isin(sl,1+np.where(ss[1:,4]>=8)[0])
    fringe=(cv2.dilate(tiny.astype('uint8'),np.ones((3,3),np.uint8))>0)&~main
    fringe_pixels=int(((a[:,:,3]>0)&fringe).sum())
    fringe_components=[dict(x=int(st[0]),y=int(st[1]),width=int(st[2]),height=int(st[3]),pixels=int(st[4])) for st in ss[1:] if st[4]<8]
    a[:,:,3][fringe]=0
    a[a[:,:,3]==0]=0
    a[2:]=a[:-2].copy();a[:2]=0
    im=Image.fromarray(a);im.save(ROOT/f'assets/chars/{k}.png');im.save(ROOT/f'assets/chars/{k}.webp',lossless=True,exact=True,method=6)
    aligned_before=Image.new('RGBA',(540,720));aligned_before.alpha_composite(original,(0,2))
    diff=np.any(a!=np.array(aligned_before),axis=2)
    visible_diff=diff&((np.array(aligned_before)[:,:,3]>0)|(a[:,:,3]>0))
    mask=np.zeros_like(a);mask[visible_diff]=[255,50,50,255];Image.fromarray(mask).save(OUT/f'background-diff-{k}.png')
    c=Image.new('RGB',(1620,770),'#382e38');d=ImageDraw.Draw(c)
    for i,(img,title) in enumerate([(original,'清理前'),(im,'青色背景清理後'),(Image.fromarray(mask),'改動範圍')]):
        c.paste(img,(i*540,40),img);d.text((i*540+12,8),title,font=font(24),fill='white')
    c.save(OUT/f'background-cleanup-{k}.png')
    return {'detached_components':removed_components,'fringe_components':fringe_components,'fringe_removed_pixels':fringe_pixels,'removed_cyan_pixels':int(remove.sum()),'visible_changed_pixels':int(visible_diff.sum()),'isolated_removed_pixels':int(isolated.sum()),'scale':1,'translate_after_cleanup':[0,2]}
if __name__=='__main__':
    result={k:clean(k) for k in ['jiejie','spirit']}
    (OUT/'background-cleanup.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)
