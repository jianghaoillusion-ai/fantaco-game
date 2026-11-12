"""Measure a color-area proxy, NOT a clean sprite scale, from native frames."""
from pathlib import Path
import csv, json, sys
import cv2
import numpy as np
frames = Path(sys.argv[1])
probe = json.loads((frames / 'probe.json').read_text())
times = [float(f['best_effort_timestamp_time']) for f in probe['frames']]
rows = []
for i in range(60, 101):
    im = cv2.imread(str(frames / f'{i:04}.png'))[570:650, 290:355]
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([18,110,100]), np.array([38,255,255]))
    y, x = np.nonzero(mask)
    rows.append([i, round((times[i-1]-times[59])*1000,3), float(x.mean()+290), float(y.mean()+570), len(x)])
baseline = np.mean([r[4] for r in rows[-5:]])
with Path(sys.argv[2]).open('w') as f:
    w = csv.writer(f)
    w.writerow(['frame_1based','time_ms_from_frame60','gold_centroid_x','gold_centroid_y','gold_pixels','sqrt_area_relative_last5'])
    w.writerows([r+[round((r[4]/baseline)**.5,4)] for r in rows)
