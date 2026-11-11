"""Verify delivered pixels, animation loop, alpha and absence of audio."""
from pathlib import Path
import json,subprocess,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/jimeng';FF=str(Path.home()/'media-tools/bin/ffmpeg');FP=str(Path.home()/'media-tools/bin/ffprobe')
def colors(a):
 rgb=a[:,:,:3].astype(int);opaque=a[:,:,3]>250
 def mode(mask):
  p=rgb[mask&opaque];c,n=np.unique(p,axis=0,return_counts=True);return '#%02X%02X%02X'%tuple(c[n.argmax()]) if len(c) else None
 return {'body':mode(rgb.min(2)>240),'outline':mode((rgb[:,:,2]-rgb[:,:,0]>20)&(rgb.max(2)<140)),'yellow_pixels':int(((rgb[:,:,0]>180)&(rgb[:,:,1]>170)&(rgb[:,:,2]<150)&opaque).sum())}
report={'poses':{},'animation':{}}
for name in ['sad','hold-hat','hold-rose','blink']:
 a=np.array(Image.open(OUT/f'poses/{name}.png').convert('RGBA'));result=colors(a)
 face=a[225:305,270:450,:3].astype(int)
 result['face_red_pixels']=int(((face[:,:,0]>face[:,:,1]+35)&(face[:,:,0]>face[:,:,2]+35)).sum())
 assert result['face_red_pixels']==0
 assert result['body']=='#FFFFFF' and result['outline']=='#47536F' and result['yellow_pixels']==0
 assert a[:,:,3].min()==0 and a[:,:,3].max()==255
 report['poses'][name]=result
for ext in ['mp4','webm']:
 path=OUT/f'anim/happy.{ext}'
 meta=json.loads(subprocess.check_output([FP,'-v','error','-show_streams','-show_format','-of','json',str(path)]))
 assert not any(s['codec_type']=='audio' for s in meta['streams'])
 cmd=[FF,'-v','error']+(['-c:v','libvpx-vp9'] if ext=='webm' else [])+['-i',str(path),'-f','rawvideo','-pix_fmt','rgba','-']
 proc=subprocess.Popen(cmd,stdout=subprocess.PIPE);frames=[];first=None;last=None;count=0;unique=set();alpha=[]
 while True:
  data=proc.stdout.read(720*720*4)
  if not data:break
  assert len(data)==720*720*4
  a=np.frombuffer(data,np.uint8).reshape(720,720,4)
  if first is None:first=a.copy()
  last=a.copy();unique.add(hashlib.sha256(data).hexdigest());count+=1
  if count in [1,31,61,91,120]:
   sample=colors(a)
   assert sample['body']=='#FFFFFF' and sample['outline']=='#47536F' and sample['yellow_pixels']==0
   frames.append(sample)
  alpha.append([int(a[:,:,3].min()),int(a[:,:,3].max())])
 assert proc.wait()==0 and count==120 and len(unique)>20
 assert np.array_equal(first,last),ext+' first/last differ'
 if ext=='webm':assert all(x==[0,255] for x in alpha)
 report['animation'][ext]={'frames':count,'seconds':float(meta['format']['duration']),'first_last_identical':True,'unique_frames':len(unique),'sampled_palette':frames,'alpha_range':alpha[0],'audio_streams':0,'codec':meta['streams'][0]['codec_name'],'pixel_format':meta['streams'][0]['pix_fmt']}
# Compare uniform line widths relative to body height using distance-transform skeletons.
from scipy.ndimage import distance_transform_edt
from skimage.morphology import skeletonize
for name,path in [('official',ROOT/'assets/mascot/sticker/front.png')]+[(n,OUT/f'poses/{n}.png') for n in ['sad','hold-hat','hold-rose','blink']]:
 a=np.array(Image.open(path).convert('RGBA'));rgb=a[:,:,:3].astype(int)
 mask=(rgb.max(2)<140)&(rgb[:,:,2]-rgb[:,:,0]>20)&(a[:,:,3]>128)
 width=float(2*np.median(distance_transform_edt(mask)[skeletonize(mask)]));ys=np.where(a[:,:,3]>128)[0]
 report.setdefault('stroke',{})[name]={'width_px':width,'height_px':int(ys.max()-ys.min()+1),'ratio':round(width/(ys.max()-ys.min()+1),4)}
(OUT/'redraw-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
