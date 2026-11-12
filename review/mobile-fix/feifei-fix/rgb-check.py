# 只讀：比對起點與目前所有改過的 PNG，檢查兩邊都不透明（alpha>=250）像素的 RGB 是否基本不變
import sys, subprocess, io
import numpy as np
from PIL import Image
wt, base = sys.argv[1], sys.argv[2]
files = subprocess.check_output(['git','-C',wt,'diff','--name-only',base,'--','*.png','*.webp']).decode().split()
files += [l[3:] for l in subprocess.check_output(['git','-C',wt,'status','--porcelain','--','*.png','*.webp']).decode().splitlines() if l.startswith(' M')]
bad = []; n = 0
for f in sorted(set(files)):
    try:
        old = Image.open(io.BytesIO(subprocess.check_output(['git','-C',wt,'show',f'{base}:{f}'],stderr=subprocess.DEVNULL))).convert('RGBA')
    except Exception:
        continue  # 新檔
    new = Image.open(f'{wt}/{f}').convert('RGBA')
    if old.size != new.size:
        bad.append(f'{f} 尺寸改變 {old.size}->{new.size}'); continue
    o = np.asarray(old).astype(int); w = np.asarray(new).astype(int)
    m = (o[...,3] >= 250) & (w[...,3] >= 250)
    if not m.any(): continue
    d = np.abs(o[...,:3] - w[...,:3])[m].max(axis=1)
    n += 1
    p99 = float(np.percentile(d, 99))
    if p99 > 8: bad.append(f'{f} 不透明像素 RGB 差 p99={p99:.1f} max={int(d.max())}')
print(f'RGB 檢查：比對 {n} 個改過的圖檔；' + ('全部不透明像素 RGB 基本不變（p99≤8）。' if not bad else '可能改了設計：' + '；'.join(bad[:15])))
sys.exit(1 if bad else 0)
