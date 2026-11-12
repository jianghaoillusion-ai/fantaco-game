"""Verify delivered pixels, animation loop, alpha and absence of audio."""
from pathlib import Path
import json,subprocess,hashlib,math
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/jimeng';FF=str(Path.home()/'media-tools/bin/ffmpeg');FP=str(Path.home()/'media-tools/bin/ffprobe')
def colors(a):
 rgb=a[:,:,:3].astype(int);opaque=a[:,:,3]>250
 def mode(mask):
  p=rgb[mask&opaque];c,n=np.unique(p,axis=0,return_counts=True);return '#%02X%02X%02X'%tuple(c[n.argmax()]) if len(c) else None
 return {'body':mode(rgb.min(2)>240),'outline':mode((rgb[:,:,2]-rgb[:,:,0]>20)&(rgb.max(2)<140)),'yellow_pixels':int(((rgb[:,:,0]>180)&(rgb[:,:,1]>170)&(rgb[:,:,2]<150)&opaque).sum())}
from scipy import ndimage

def face_parts(a,index=None):
 # Follow the source animation transform so the ROI never includes the head outline.
 scale=a.shape[0]/720
 region=Image.new('L',(720,720));ImageDraw.Draw(region).rectangle((277,248,442,302),fill=255)
 if index is not None:
  phase=0 if index==119 else 2*math.pi*index/119
  dy=round(-22*(1-math.cos(phase*2))/2);angle=2.3*math.sin(phase)
  region=region.rotate(angle,center=(360,358.5),resample=Image.Resampling.NEAREST)
  region=region.transform(region.size,Image.Transform.AFFINE,(1,0,0,0,1,-dy))
 region=np.array(region.resize((a.shape[1],a.shape[0]),Image.Resampling.NEAREST))>0
 brightness=a[:,:,:3].astype(float)@np.array([.2126,.7152,.0722])
 labels,n=ndimage.label((brightness<240)&(a[:,:,3]>128)&region,structure=np.ones((3,3)))
 assert n==3,('face components',n,index)
 parts=sorted([np.argwhere(labels==i) for i in range(1,n+1)],key=lambda p:p[:,1].mean())
 mouth=labels==int(labels[tuple(parts[1][0])])
 dist=ndimage.distance_transform_edt(~mouth)
 gaps=[float(dist[tuple(p.T)].min()-1) for p in (parts[0],parts[2])]
 # Pixel-center distance minus one pixel is the edge-to-edge blank gap.
 assert min(gaps)>=8*scale,('eye-mouth gap',gaps,scale)
 return {'components':n,'eye_mouth_blank_px':[round(v,2) for v in gaps]}

report={'poses':{},'animation':{}}
for name in ['sad','hold-hat','hold-rose','blink']:
 a=np.array(Image.open(OUT/f'poses/{name}.png').convert('RGBA'));result=colors(a)
 face=a[225:305,270:450,:3].astype(int)
 result['face_red_pixels']=int(((face[:,:,0]>face[:,:,1]+35)&(face[:,:,0]>face[:,:,2]+35)).sum())
 assert result['face_red_pixels']==0
 assert result['body']=='#FFFFFF' and result['outline']=='#47536F' and result['yellow_pixels']==0
 assert a[:,:,3].min()==0 and a[:,:,3].max()==255
 if name=='blink':result['face_parts']=face_parts(a)
 report['poses'][name]=result
for ext in ['mp4','webm']:
 path=OUT/f'anim/happy.{ext}'
 meta=json.loads(subprocess.check_output([FP,'-v','error','-show_streams','-show_format','-of','json',str(path)]))
 assert not any(s['codec_type']=='audio' for s in meta['streams'])
 if ext=='mp4': assert meta['streams'][0]['codec_name']=='h264' and meta['streams'][0]['pix_fmt']=='yuv420p'
 else: assert path.stat().st_size<1500000
 cmd=[FF,'-v','error']+(['-c:v','libvpx-vp9'] if ext=='webm' else [])+['-i',str(path),'-f','rawvideo','-pix_fmt','rgba','-']
 proc=subprocess.Popen(cmd,stdout=subprocess.PIPE);frames=[];first=None;last=None;count=0;unique=set();alpha=[];face_checks=[]
 while True:
  data=proc.stdout.read(720*720*4)
  if not data:break
  assert len(data)==720*720*4
  a=np.frombuffer(data,np.uint8).reshape(720,720,4)
  if first is None:first=a.copy()
  face_checks.append(face_parts(a,count))
  last=a.copy();unique.add(hashlib.sha256(data).hexdigest());count+=1
  if count in [1,31,61,91,120]:
   sample=colors(a)
   assert sample['yellow_pixels']==0
   for key,target in [('body',(255,255,255)),('outline',(71,83,111))]:
    measured=tuple(int(sample[key][j:j+2],16) for j in (1,3,5))
    assert max(abs(x-y) for x,y in zip(measured,target))<=4,(ext,key,measured)
   frames.append(sample)
  alpha.append([int(a[:,:,3].min()),int(a[:,:,3].max())])
 assert proc.wait()==0 and count==120 and len(unique)>20
 assert np.array_equal(first,last),ext+' first/last differ'
 if ext=='webm':assert all(x==[0,255] for x in alpha)
 report['animation'][ext]={'face_components_all_frames':sorted(set(x['components'] for x in face_checks)),'minimum_eye_mouth_blank_px':min(min(x['eye_mouth_blank_px']) for x in face_checks),'bytes':path.stat().st_size,'frames':count,'seconds':float(meta['format']['duration']),'first_last_identical':True,'unique_frames':len(unique),'sampled_palette':frames,'alpha_range':alpha[0],'audio_streams':0,'codec':meta['streams'][0]['codec_name'],'pixel_format':meta['streams'][0]['pix_fmt']}
# Measure the actual decoded happy face separately as well.
from scipy.ndimage import distance_transform_edt
from skimage.morphology import skeletonize
for ext in ['mp4','webm']:
 data=subprocess.check_output([FF,'-v','error']+(['-c:v','libvpx-vp9'] if ext=='webm' else [])+['-i',str(OUT/f'anim/happy.{ext}'),'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'])
 a=np.frombuffer(data,np.uint8).reshape(720,720,4)[227:302,284:441];rgb=a[:,:,:3].astype(int)
 mask=(rgb.max(2)<140)&(rgb[:,:,2]-rgb[:,:,0]>20)&(a[:,:,3]>128)
 width=float(2*np.median(distance_transform_edt(mask)[skeletonize(mask)]))
 assert 12<=width<=16,(ext,width)
 report.setdefault('face_stroke',{})['happy_'+ext]={'median_width_px':width}
# Compare uniform line widths relative to body height using distance-transform skeletons.
from scipy.ndimage import distance_transform_edt
from skimage.morphology import skeletonize
for name,path in [('official',ROOT/'assets/mascot/sticker/front.png')]+[(n,OUT/f'poses/{n}.png') for n in ['sad','hold-hat','hold-rose','blink']]:
 a=np.array(Image.open(path).convert('RGBA'));rgb=a[:,:,:3].astype(int)
 mask=(rgb.max(2)<140)&(rgb[:,:,2]-rgb[:,:,0]>20)&(a[:,:,3]>128)
 width=float(2*np.median(distance_transform_edt(mask)[skeletonize(mask)]));ys=np.where(a[:,:,3]>128)[0]
 report.setdefault('stroke',{})[name]={'width_px':width,'height_px':int(ys.max()-ys.min()+1),'ratio':round(width/(ys.max()-ys.min()+1),4)}
# Face-only measurement excludes the body outline, ears and hands.
for name,path in [('official',ROOT/'assets/mascot/sticker/front.png')]+[(n,OUT/f'poses/{n}.png') for n in ['sad','blink']]:
 im=Image.open(path).convert('RGBA')
 if name=='official':
  im=im.resize((322,573),Image.Resampling.LANCZOS);im=im.crop((85,155,242,230))
 else: im=im.crop((284,227,441,302))
 a=np.array(im);rgb=a[:,:,:3].astype(int)
 mask=(rgb.max(2)<140)&(rgb[:,:,2]-rgb[:,:,0]>20)&(a[:,:,3]>128)
 width=float(2*np.median(distance_transform_edt(mask)[skeletonize(mask)]))
 assert 12<=width<=16,(name,width)
 report.setdefault('face_stroke',{})[name]={'median_width_px':width}
gif=Image.open(OUT/'anim/happy.gif');start=gif.convert('RGBA');duration=0;gif_checks=[];gif_colors=set()
assert gif.size==(480,480) and gif.n_frames==120
assert (OUT/'anim/happy.gif').stat().st_size<1500000
for i in range(gif.n_frames):
 gif.seek(i);duration+=gif.info['duration']
 a=np.array(gif.convert('RGBA'));gif_checks.append(face_parts(a,i))
 gif_colors.update(map(tuple,np.unique(a[a[:,:,3]>0,:3],axis=0)))
 assert gif.convert('RGBA').getchannel('A').getextrema()==(0,255)
assert np.array_equal(np.array(start),np.array(gif.convert('RGBA')))
assert duration==5000 and gif.info['loop']==0
assert len(gif_colors)>=18
report['animation']['gif']={'opaque_colors':len(gif_colors),'face_components_all_frames':sorted(set(x['components'] for x in gif_checks)),'minimum_eye_mouth_blank_px':min(min(x['eye_mouth_blank_px']) for x in gif_checks),'bytes':(OUT/'anim/happy.gif').stat().st_size,'frames':gif.n_frames,'duration_ms':duration,'first_last_identical':True,'transparent':True}
(OUT/'redraw-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
