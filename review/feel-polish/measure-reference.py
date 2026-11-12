"""Native frames only; cyan potion segmentation, no temporal resampling."""
from pathlib import Path
import cv2,numpy as np,json,csv
root=Path(__file__).resolve().parent
frames=Path('/Volumes/外接資料碟/ai-lab/fantaco-feel-ref/tmp')
p=json.loads((root/'reference-probe.json').read_text());ts=[float(x['best_effort_timestamp_time']) for x in p['frames']];delta=np.diff(ts)*1000
rows=[]
for i in range(8,44):
 im=cv2.imread(str(frames/f'frame-{i:04d}.png'));roi=im[1100:1800,450:950];hsv=cv2.cvtColor(roi,cv2.COLOR_BGR2HSV)
 mask=cv2.inRange(hsv,np.array([80,140,140]),np.array([105,255,255]));n,labels,stats,centers=cv2.connectedComponentsWithStats(mask)
 candidates=[j for j in range(1,n) if stats[j,4]>300]
 if not candidates:continue
 j=max(candidates,key=lambda j:stats[j,4]);x,y,w,h,area=stats[j];cx,cy=centers[j]
 rows.append(dict(frame=i,time_ms=round((ts[i-1]-ts[7])*1000,3),x_px=round(cx+450,2),y_px=round(cy+1100,2),width_px=int(w),height_px=int(h),area_px=int(area)))
for r in rows:r['scale_proxy']=round((r['area_px']/rows[0]['area_px'])**.5,4)
with (root/'reference-curve.csv').open('w') as f:w=csv.DictWriter(f,fieldnames=rows[0],lineterminator="\n");w.writeheader();w.writerows(rows)
summary=dict(source='game-rec.mp4',r_frame_rate=p['streams'][0]['r_frame_rate'],avg_frame_rate=p['streams'][0]['avg_frame_rate'],frames=len(ts),interval_ms={str(round(float(x),2)):int(y) for x,y in zip(*np.unique(np.round(delta,2),return_counts=True))},vfr=True,tracked_frames=[8,43],tracking='cyan-region centroid/area proxy, original 1320x2868 px; not whole sprite bounds',time_curve_basis='drag only; no identifiable spring/merge impulse in selected segment')
(root/'reference-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(summary)
