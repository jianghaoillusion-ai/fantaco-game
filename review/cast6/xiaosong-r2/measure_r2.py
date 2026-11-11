#!/usr/bin/env python3
"""小頌 cast6-r2 獨立量測（程式由小頌設計撰寫，小夏代執行）。

執行：~/media-tools/venv/bin/python -I /Volumes/外接資料碟/AI工作/共用/fantaco-cast6-r2/measure_r2.py
只讀 repo 的四張角色圖，不寫入 repo；輸出全部在本檔旁的 out/。
需要：numpy、scipy、Pillow（不需要 cv2）。

定義沿用小頌 r1：
- alpha>=128 才算不透明。
- 頭部：下巴以上不透明像素，挖掉蝴蝶結／帽子／皇冠／舉起的手（多邊形範圍內「不像頭髮」的像素才挖）。
- 下巴：臉中線（臉框中心 ±2 欄）往下找臉的輪廓線。
- 臉：膚色 Lab ΔE<=18 且連到臉中心的區塊，補洞；耳朵用同一套膚色，耳朵與臉都含外框線（外框寬度用布魯校正）。
- 髮量 = 頭部 − 臉 − 耳朵 − 脖子；姐姐另加下巴以下長髮（含外框 2px）。
- 遮蔽補回：蝴蝶結、皇冠用兩側頭頂輪廓的二次曲線補；哈特帽子與手用「右半邊鏡射到左邊」補。可見量、推估量分開列。
- 肩寬：下巴往下 34px 那一列，包含身體中線的那段連續外輪廓（隔開的手不算）；另列 y280。
校正：外框寬度、下巴取法只用布魯（本輪沒改圖）對 r1 數字校正一次，四人用同一組參數。
百分比的分母一律是「本程式量的布魯」，r1 數字只當對照。
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

REPO = Path('/Volumes/外接資料碟/ai-lab/fantaco-cast-v2')
OUT = Path(__file__).resolve().parent / 'out'
assert REPO not in OUT.parents, '輸出不得寫進 repo'
IDS = ['bulu', 'jiejie', 'hate', 'spirit']
NAMES = {'bulu': '布魯', 'jiejie': '微笑姐姐', 'hate': '哈特', 'spirit': '氣球精靈'}
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
ALPHA = 128
SKIN_DE = 18
HAIR_DE = 28
WAIST_DE = 25
DARK_DROP = 30          # 比膚色 L 暗 30 以上視為輪廓線
LONG_OUTLINE = 2        # 長髮外框
LONG_MIN = 40           # 長髮色塊最小面積
TOL = 5.0
S8 = np.ones((3, 3), bool)
R1_BULU = dict(body_height=656, head_height=217.5, head_width=204, jaw_width=114, face_width=133,
               head_area=32965, hair_total_est=15470, c34_total=160)

# 位置參數：探針點只用來找臉的區塊與取膚色；耳朵多邊形只用來找耳朵；遮蔽多邊形內只挖「不像頭髮」的像素。
# 姐姐整張重畫，座標是小頌看圖估的，要看 out/overlay-jiejie.png 確認。
SPEC = {
    'bulu': dict(probe=(266, 200), hair_rule='lab', hair_samples=[(240, 60), (300, 70)],
                 ears=[[(175, 164), (198, 164), (209, 215), (175, 217)], [(336, 162), (361, 162), (361, 214), (331, 217)]],
                 occluders=[], waist_seed=(225, 392), raised=None, long_hair=False),
    'jiejie': dict(probe=(270, 195), hair_rule='lab', hair_samples=[(190, 110), (350, 110)],
                   ears=[[(176, 158), (206, 158), (212, 216), (176, 218)], [(334, 158), (364, 158), (364, 218), (328, 218)]],
                   occluders=[dict(name='蝴蝶結', poly=[(222, 0), (322, 0), (322, 72), (222, 72)], fill='dome')],
                   waist_seed=(240, 391), raised='left', long_hair=True, long_hair_ymax=430, skirt=True,
                   # r2c：只在手臂範圍（及膚色外 5px）內套寬度過濾；左臂 x≤202（左側髮束 x≥205），右臂避開 x327–335 的右髮束
                   arm_zones=[[(118, 188), (202, 188), (202, 348), (118, 348)],
                              [(340, 316), (400, 316), (400, 400), (294, 400), (294, 350), (340, 350)]]),
    'hate': dict(probe=(269, 195), hair_rule='lab', hair_samples=[(320, 70), (345, 115)],
                 ears=[[(174, 165), (198, 165), (209, 215), (174, 215)], [(337, 165), (362, 165), (362, 214), (331, 216)]],
                 # r2b：帽子和帽子同色（深色），手套有深色外框，所以多邊形內「全部」挖掉，只用右半鏡射補；多邊形 x 不超過 268（軸 270）。
                 occluders=[dict(name='帽子', poly=[(140, 8), (268, 8), (268, 50), (240, 62), (205, 85), (180, 110), (168, 125), (140, 125)], fill='mirror'),
                            dict(name='手', poly=[(108, 100), (182, 100), (182, 140), (172, 150), (168, 205), (108, 205)], fill='mirror')],
                 waist_seed=(245, 394), raised='left', long_hair=False),
    'spirit': dict(probe=(270, 205), hair_rule='blue', hair_samples=[],
                   ears=[[(163, 160), (197, 170), (206, 214), (167, 211)], [(342, 169), (378, 158), (373, 215), (335, 218)]],
                   occluders=[dict(name='皇冠', poly=[(205, 0), (335, 0), (335, 58), (205, 58)], fill='dome')],
                   waist_seed=(245, 397), raised=None, long_hair=False),
}


def font(n):
    try:
        return ImageFont.truetype(FONT, n)
    except OSError:
        return ImageFont.load_default()


def srgb_to_lab(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = (c @ m.T) / np.array([0.95047, 1.0, 1.08883])
    d = 6 / 29
    f = np.where(xyz > d ** 3, np.cbrt(xyz), xyz / (3 * d * d) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def poly_mask(poly, w, h):
    im = Image.new('L', (w, h))
    ImageDraw.Draw(im).polygon([tuple(p) for p in poly], fill=255)
    return np.array(im) > 0


def largest(m):
    lab, n = ndi.label(m, structure=S8)
    if n == 0:
        return m.copy()
    return lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)


def fill(m):
    return ndi.binary_fill_holes(m)


def dilate(m, k):
    return m.copy() if k <= 0 else ndi.binary_dilation(m, structure=S8, iterations=k)


def mirror(m, axis):
    out = np.zeros_like(m)
    ys, xs = np.nonzero(m)
    xm = np.rint(2 * axis - xs).astype(int)
    ok = (xm >= 0) & (xm < m.shape[1])
    out[ys[ok], xm[ok]] = True
    return out


def span(m):
    xs = np.where(m.any(0))[0]
    return 0 if len(xs) == 0 else int(xs.max() - xs.min() + 1)


def longest_run(v):
    best = cur = 0
    for b in v:
        cur = cur + 1 if b else 0
        best = max(best, cur)
    return best


def run_containing(row, x):
    r = ndi.binary_closing(np.pad(row, 3), structure=np.ones(5, bool))[3:-3] | row
    if not r[x]:
        return None
    s = e = x
    while s > 0 and r[s - 1]:
        s -= 1
    while e < len(r) - 1 and r[e + 1]:
        e += 1
    return s, e


def dome_fill(head, occ, chin_row, yy, warn, name, width=25):
    h, w = head.shape
    occ = occ & (yy <= chin_row)
    hidden = np.zeros_like(head)
    xs = np.where(occ.any(0))[0]
    if len(xs) == 0:
        return hidden, hidden.copy(), dict(method='none')
    x0, x1 = int(xs.min()), int(xs.max())
    tops = {x: int(np.where(head[:, x])[0].min()) for x in range(w) if head[:, x].any()}
    fx = [x for x in list(range(x0 - width, x0)) + list(range(x1 + 1, x1 + width + 1)) if x in tops and not occ[:, x].any()]
    if len(fx) < 8:
        warn.append(f'{name}：兩側可用頭頂欄數 {len(fx)} 不足，未補遮蔽')
        return hidden, hidden.copy(), dict(method='insufficient', x0=x0, x1=x1)
    fy = [tops[x] for x in fx]
    coef = np.polyfit(fx, fy, 2)
    method = 'quadratic'
    if coef[0] <= 0:
        coef = np.polyfit(fx, fy, 1)
        method = 'linear(二次曲線開口方向不對)'
        warn.append(f'{name}：二次曲線開口向下，改用直線補')
    for x in range(x0, x1 + 1):
        et = max(0, int(np.ceil(np.polyval(coef, x))))
        col = occ[et:, x] & ~head[et:, x]
        hidden[et:, x] = col
    # 對照：同一批頭頂點改用圓弧（Kasa 最小平方圓）補，看補法差多少
    hidden_c = np.zeros_like(head)
    fxa, fya = np.array(fx, float), np.array(fy, float)
    D, E, F = np.linalg.lstsq(np.c_[fxa, fya, np.ones(len(fxa))], -(fxa ** 2 + fya ** 2), rcond=None)[0]
    ccx, ccy = -D / 2, -E / 2
    rad2 = ccx ** 2 + ccy ** 2 - F
    c_top = None
    if rad2 > 0:
        for x in range(x0, x1 + 1):
            if abs(x - ccx) < np.sqrt(rad2):
                et = max(0, int(np.ceil(ccy - np.sqrt(rad2 - (x - ccx) ** 2))))
                c_top = et if c_top is None else min(c_top, et)
                hidden_c[et:, x] = occ[et:, x] & ~head[et:, x]
    else:
        warn.append(f'{name}：圓弧擬合失敗')
    return hidden, hidden_c, dict(method=method, x0=x0, x1=x1, fit_cols=len(fx), coef=[float(c) for c in coef],
                                  est_top=int(min(max(0, np.ceil(np.polyval(coef, x))) for x in range(x0, x1 + 1))),
                                  circle_center=[round(float(ccx), 1), round(float(ccy), 1)],
                                  circle_r=round(float(np.sqrt(max(rad2, 0))), 1), circle_top=c_top)


def runs_of(v):
    d = np.diff(np.r_[0, v.astype(np.int8), 0])
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0] - 1))


def leg_split(op, cxi, sole):
    """從小腿高度兩腿之間的透明縫往上追，追到縫合起來為止；回傳縫的最高一列（兩腿輪廓真正分開點）。"""
    h, w = op.shape
    y = sole - 80
    cand = [(s, e) for s, e in runs_of(~op[y]) if s > 0 and e < w - 1 and e - s < 80]
    if not cand:
        return None, y
    cur = min(cand, key=lambda r: 0 if r[0] <= cxi <= r[1] else min(abs(r[0] - cxi), abs(r[1] - cxi)))
    if not (cur[0] - 40 <= cxi <= cur[1] + 40):
        return None, y
    top = y
    for yy in range(y - 1, 0, -1):
        ov = [(s, e) for s, e in runs_of(~op[yy]) if s <= cur[1] and e >= cur[0] and s > 0 and e < w - 1 and e - s < 80]
        if not ov:
            break
        cur = max(ov, key=lambda r: min(r[1], cur[1]) - max(r[0], cur[0]))
        top = yy
    return top, y


def measure(key, a, spec, cal):
    h, w = a.shape[:2]
    rgb = a[..., :3]
    op = a[..., 3] >= ALPHA
    lab = srgb_to_lab(rgb)
    yy = np.indices((h, w))[0]
    warn = []

    # 頭髮顏色
    if spec['hair_rule'] == 'blue':
        r, g, b = [rgb[..., i].astype(float) for i in range(3)]
        hairlike = (b > r * 1.15) & (b > g * 1.03) & op
        hair_refs = 'blue: B>1.15R 且 B>1.03G'
    else:
        refs = []
        for x, y in spec['hair_samples']:
            win = a[y - 4:y + 5, x - 4:x + 5]
            m = win[..., 3] >= ALPHA
            if m.sum() < 20:
                warn.append(f'髮色取樣點 {(x, y)} 不透明像素不足')
                continue
            refs.append(srgb_to_lab(np.median(win[..., :3][m], axis=0)))
        hairlike = np.zeros((h, w), bool)
        for ref in refs:
            hairlike |= np.linalg.norm(lab - ref, axis=-1) <= HAIR_DE
        hairlike &= op
        hair_refs = [[round(float(v), 1) for v in ref] for ref in refs]

    # 膚色
    px, py = spec['probe']
    sub = rgb[py - 25:py + 26, px - 40:px + 41].reshape(-1, 3).astype(int)
    subop = op[py - 25:py + 26, px - 40:px + 41].reshape(-1)
    R, G, B = sub.T
    ok = subop & (R > 170) & (G > 110) & (B > 70) & (R >= G) & (G >= B) & (R - B > 25) & (R - G < 80)
    if ok.sum() < 50:
        warn.append(f'膚色取樣只有 {int(ok.sum())} 像素')
    skin_rgb = np.median(sub[ok], axis=0)
    skin_lab = srgb_to_lab(skin_rgb)
    skin = op & (np.linalg.norm(lab - skin_lab, axis=-1) <= SKIN_DE)
    # 不讓頭髮色被當成膚色
    if spec['hair_rule'] != 'blue':
        skin &= ~(hairlike & (np.linalg.norm(lab - skin_lab, axis=-1) > SKIN_DE / 2))

    # 遮蔽物
    excluded = np.zeros((h, w), bool)
    excl_dome = np.zeros((h, w), bool)
    occ_parts = []
    for o in spec['occluders']:
        pm = poly_mask(o['poly'], w, h)
        e = pm & op
        if o['fill'] == 'dome':
            e &= ~hairlike          # 蝴蝶結／皇冠：壓在範圍裡的頭髮照算
            excl_dome |= e
        excluded |= e               # 鏡射（哈特帽子、手）：範圍內全部挖掉，用右半鏡射取代
        occ_parts.append((o, pm, e))

    # 臉
    skin_nx = skin & ~excluded
    lab_s, _ = ndi.label(skin_nx, structure=S8)
    win = lab_s[py - 20:py + 21, px - 20:px + 21]
    ids, counts = np.unique(win[win > 0], return_counts=True)
    if len(ids) == 0:
        raise SystemExit(f'{key}: 探針附近找不到膚色，請回報小頌')
    pid = int(ids[np.argmax(counts)])
    face0 = fill(lab_s == pid)

    # 耳朵：先找跟臉分開的膚色塊；沒有就用多邊形從臉切下來
    ears0 = np.zeros((h, w), bool)
    ear_ids = set()
    ear_info = []
    for poly in spec['ears']:
        pm = poly_mask(poly, w, h)
        sep = np.zeros((h, w), bool)
        for i in set(np.unique(lab_s[pm & skin_nx])) - {0, pid}:
            comp = lab_s == i
            if comp.sum() >= 30 and (comp & pm).sum() >= 0.5 * comp.sum():
                sep |= comp
                ear_ids.add(int(i))
        if sep.sum() >= 50:
            ears0 |= fill(sep)
            ear_info.append(dict(method='分開的膚色塊', area=int(fill(sep).sum())))
        else:
            cut = face0 & pm
            ears0 |= cut
            face0 &= ~pm
            ear_info.append(dict(method='多邊形從臉切下', area=int(cut.sum())))
    face0 = fill(largest(face0))

    fxs = np.where(face0.any(0))[0]
    cx = (fxs.min() + fxs.max()) / 2
    cxi = int(round(cx))

    # 下巴
    ls = skin_lab[0]
    vals = {'skin_end': [], 'outline_mid': [], 'outline_end': []}
    for x in range(cxi - 2, cxi + 3):
        yf = int(np.where(face0[:, x])[0].max())
        start = end = None
        for y in range(yf + 1, min(h, yf + 12)):
            if op[y, x] and lab[y, x, 0] < ls - DARK_DROP:
                start = y if start is None else start
                end = y
            elif start is not None:
                break
        if start is None:
            warn.append(f'x{x} 找不到下巴輪廓線')
            start = end = yf
        vals['skin_end'].append(yf)
        vals['outline_mid'].append((start + end) / 2)
        vals['outline_end'].append(end)
    chins = {k: float(np.mean(v)) for k, v in vals.items()}
    chin = chins[cal['chin']]
    chin_row = int(np.floor(chin))

    # 頭部、手、脖子
    base = op & (yy <= chin_row) & ~excluded
    hand = np.zeros((h, w), bool)
    neck = np.zeros((h, w), bool)
    for i in set(np.unique(lab_s[base & skin_nx])) - {0, pid} - ear_ids:
        comp = (lab_s == i) & base
        n = int(comp.sum())
        if n < 150:
            continue
        cy_, cx_ = np.argwhere(comp).mean(0)
        if fxs.min() <= cx_ <= fxs.max() and cy_ > chin - 40:
            neck |= comp
        elif not (fxs.min() <= cx_ <= fxs.max()):
            hand |= comp
    if hand.any():
        warn.append(f'頭部範圍內有手的膚色 {int(hand.sum())} px，已挖掉（未補被手遮住的頭髮）' if key != 'hate' else '頭部範圍內另有手的膚色，已挖掉')
    head = largest(base & ~dilate(hand, 2))
    face = dilate(face0, cal['k_face']) & head
    ears = dilate(ears0, cal['k_ear']) & head & ~face
    neck &= head & ~face & ~ears
    hair_head = head & ~face & ~ears & ~neck

    # 遮蔽補回
    xx = np.indices((h, w))[1]
    hid_q = np.zeros((h, w), bool)      # 蝴蝶結／皇冠：二次曲線補（主要）
    hid_c = np.zeros((h, w), bool)      # 蝴蝶結／皇冠：圓弧補（對照）
    hid_other = np.zeros((h, w), bool)  # 鏡射＋洞
    occ_info = {}
    mir_occ = np.zeros((h, w), bool)
    mir_poly = np.zeros((h, w), bool)
    for o, pm, e in occ_parts:
        if o['fill'] == 'dome':
            hq, hc, info = dome_fill(head, e, chin_row, yy, warn, o['name'])
            hid_q |= hq
            hid_c |= hc
            occ_info[o['name']] = dict(info, excluded_px=int(e.sum()), hidden_px=int(hq.sum()), hidden_circle_px=int(hc.sum()))
        else:
            mir_occ |= e
            mir_poly |= pm
    hidden_upper = np.zeros((h, w), bool)
    if mir_occ.any():
        right = head & (xx > cx)
        mh = mirror(right, cx)
        mfe = mirror((face | ears) & (xx > cx), cx)
        hm = mh & mir_poly & ~head & (yy <= chin_row)
        # 上限：多邊形內凡是髮色都當頭髮（會把同色的帽子也算進去，只當上限）
        hidden_upper = hm | (op & mir_poly & hairlike & (yy <= chin_row) & ~head & ~face & ~ears)
        hid_other |= hm
        occ_info['鏡射'] = dict(axis=float(cx), excluded_px=int(mir_occ.sum()), hidden_px=int(hm.sum()),
                              hidden_face_ear_px=int((hm & mfe).sum()), upper_px=int(hidden_upper.sum()))
    else:
        mfe = np.zeros((h, w), bool)
    # 洞只補蝴蝶結／皇冠範圍（鏡射範圍不補洞，避免手套外框圍出的洞被當頭髮）
    holes = fill(head | (excl_dome & (yy <= chin_row))) & excl_dome & ~head & fill(head)
    hid_other |= holes
    hidden = hid_other | hid_q
    hidden_c = hid_other | hid_c
    hidden_hair = hidden & ~mfe
    head_est = head | hidden

    # 長髮
    long_hair = np.zeros((h, w), bool)
    long_comps = []
    long_zone = np.zeros((h, w), bool)
    long_info = {}
    if spec.get('long_hair'):
        below = op & (yy > chin_row) & (yy <= spec['long_hair_ymax']) & ~dilate(skin, 1)
        # 長髮有亮部，髮色取樣點太暗會漏掉，所以另加「棕色」條件。
        # r2c：寬度過濾（開運算，去掉 <5px 細線）只套在「手臂範圍＋膚色外 5px」內，那裡的細線是手臂/手指/脖子描邊；
        # 範圍外的細髮束（例如 y260–317 肩膀兩側）保留，但只收「不是深色描邊」的髮色像素，避免把衣服深色描邊沿線收進來。
        Lc, ac, bc = lab[..., 0], lab[..., 1], lab[..., 2]
        brown = (Lc < 58) & (ac >= 2) & (ac <= 30) & (bc >= 3) & (bc <= 38)
        dark = op & (Lc < ls - DARK_DROP)
        cand = below & (hairlike | brown)
        arm_poly = np.zeros((h, w), bool)
        for poly in spec.get('arm_zones', []):
            arm_poly |= poly_mask(poly, w, h)
        long_zone = arm_poly | (dilate(skin, 5) & (yy > chin_row))
        core = ndi.binary_opening(cand, structure=S8, iterations=2)
        thin_out = cand & ~core & ~long_zone & ~dark
        core = core | thin_out
        long_info = dict(cand_px=int(cand.sum()), removed_in_zone_px=int((cand & ~core & long_zone).sum()),
                         thin_kept_outside_zone_px=int(thin_out.sum()),
                         dark_thin_outside_zone_px=int((cand & ~core & ~long_zone & dark).sum()))
        lc, n = ndi.label(core, structure=S8)
        sel = np.zeros((h, w), bool)
        for i in range(1, n + 1):
            comp = lc == i
            s = int(comp.sum())
            if s < LONG_MIN:
                continue
            ys, xs = np.nonzero(comp)
            long_comps.append(dict(area=s, bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]))
            sel |= comp
        # 外框 2px 照 r1 算進長髮，但不從手臂多邊形裡收（避免把手臂描邊當髮框）
        long_hair = (sel | (dilate(sel, LONG_OUTLINE) & below & (dark | hairlike | brown) & ~arm_poly)) & ~head
        long_info['outline_px'] = int((long_hair & ~sel).sum())
        long_info['in_arm_poly_px'] = int((long_hair & arm_poly).sum())
        long_info['rows_260_317_px'] = int((long_hair & (yy >= 260) & (yy <= 317)).sum())

    # 頭寬、臉
    rows = face.sum(1)
    jaw_row = int(round(chin - 30))
    r = dict(id=key, cx=float(cx), chin=chin, chin_variants=chins, chin_row=chin_row,
             skin_rgb=[float(v) for v in skin_rgb], hair_refs=hair_refs, ears=ear_info, occluders=occ_info, warnings=warn)
    top = int(np.where(head.any(1))[0].min())
    top_est = int(np.where(head_est.any(1))[0].min())
    sole = int(np.where(op.any(1))[0].max())
    r.update(top=top, top_est=top_est, sole=sole,
             body_height=sole - top + 1, body_height_est=sole - top_est + 1,
             head_height=chin - top + cal['hh_off'], head_height_est=chin - top_est + cal['hh_off'],
             face_width=int(rows.max()), jaw_row=jaw_row, jaw_width=int(rows[jaw_row]),
             head_width=span(head), head_width_est=span(head_est), head_width_no_ears=span(head & ~ears),
             head_area=int(head.sum()), head_area_est=int(head_est.sum()),
             face_area=int(face.sum()), ear_area=int(ears.sum()), neck_area=int(neck.sum()), hand_area=int(hand.sum()),
             hair_head=int(hair_head.sum()), hair_hidden=int(hidden_hair.sum()), long_hair=int(long_hair.sum()),
             long_hair_components=long_comps, long_hair_filter=long_info)
    r['hair_total_vis'] = r['hair_head'] + r['long_hair']
    r['hair_total_est'] = r['hair_total_vis'] + r['hair_hidden']
    r['hair_head_est'] = r['hair_head'] + r['hair_hidden']
    r['hair_total_est_circle'] = r['hair_total_vis'] + int((hidden_c & ~mfe).sum())
    r['head_area_est_circle'] = int((head | hidden_c).sum())
    r['hair_upper_bound'] = r['hair_total_vis'] + int(((hidden | hidden_upper) & ~mfe).sum())
    r['head_area_upper'] = int((head_est | hidden_upper).sum())
    r['head_width_upper'] = span(head_est | hidden_upper)
    if spec['hair_rule'] != 'blue':
        dark = op & (lab[..., 0] < ls - DARK_DROP)
        r['hair_non_hairlike_px'] = int((hair_head & ~hairlike & ~dark).sum())
    else:
        r['hair_non_hairlike_px'] = int((hair_head & ~hairlike & ~(lab[..., 0] < ls - DARK_DROP)).sum())

    # 肩寬
    # r2b：下巴+34 改從「下巴輪廓線中心」起算（布魯 246.5→第 280 列，對上 r1 的 160）
    for tag, y in [('c34', int(np.floor(chins['outline_mid'])) + 34), ('y280', 280)]:
        run = run_containing(op[y], cxi)
        if run is None:
            warn.append(f'{tag} 那一列中線不是不透明')
            r.update({f'{tag}_y': y, f'{tag}_left': None, f'{tag}_right': None, f'{tag}_total': None})
            continue
        s, e = run
        r.update({f'{tag}_y': y, f'{tag}_left': cxi - s, f'{tag}_right': e - cxi, f'{tag}_total': e - s})

    # 腰、腿分開點
    sx, sy = spec['waist_seed']
    m = (np.linalg.norm(lab[:, sx] - lab[sy, sx], axis=-1) <= WAIST_DE) & op[:, sx]
    t = bt = sy
    while t > 0 and (m[t - 1] or (t > 1 and m[t - 2])):
        t -= 1
    while bt < h - 1 and (m[bt + 1] or (bt < h - 2 and m[bt + 2])):
        bt += 1
    r.update(waist_top=t, waist_bottom=bt, waist=(t + bt) / 2, torso=(t + bt) / 2 - chin)
    split, split_from = leg_split(op, cxi, sole)
    if split is not None and split <= r['waist']:
        warn.append(f'腿縫追到腰以上（y{split}），判定失敗')
        split = None
    if spec.get('skirt'):
        warn.append(f'裙子蓋住胯下，腿分開點 y{split} 只是裙襬下緣，不可當比例依據')
    r.update(split=split, split_from=split_from, split_skirt=bool(spec.get('skirt')),
             chin_to_split=None if split is None else split - chin,
             leg=None if split is None else sole - split)

    masks = dict(head=head, head_est=head_est, face=face, ears=ears, neck=neck, hand=hand, hair=hair_head,
                 hidden=hidden, hidden_circle=hidden_c, upper=hidden_upper & ~hidden, long=long_hair, excluded=excluded & op,
                 long_zone=long_zone)
    return r, masks


def calibrate(a):
    best = None
    table = []
    for chin_mode in ['skin_end', 'outline_mid', 'outline_end']:
        for hh_off in [0, 1]:
            for kf in range(0, 4):
                for ke in range(0, 5):
                    cal = dict(chin=chin_mode, hh_off=hh_off, k_face=kf, k_ear=ke)
                    r, _ = measure('bulu', a, SPEC['bulu'], cal)
                    keys = ['head_height', 'face_width', 'jaw_width', 'head_area', 'hair_total_est', 'head_width']
                    score = sum(abs(r[k] / R1_BULU[k] - 1) for k in keys)
                    table.append(dict(cal, score=round(score, 5), **{k: r[k] for k in keys}))
                    if best is None or score < best[0]:
                        best = (score, cal)
    return best[1], sorted(table, key=lambda t: t['score'])[:10]


def overlay(a, masks, r, path):
    h, w = a.shape[:2]
    al = a[..., 3:4] / 255.0
    base = np.full((h, w, 3), (244, 241, 235), float) * (1 - al) + a[..., :3] * al
    for name, col, t in [('excluded', (110, 110, 110), .65), ('hair', (0, 200, 220), .5), ('long', (255, 140, 0), .6),
                         ('face', (30, 200, 80), .4), ('ears', (30, 90, 240), .55), ('neck', (200, 200, 0), .5),
                         ('hand', (120, 60, 0), .5), ('upper', (255, 220, 0), .7), ('hidden', (230, 0, 200), .75)]:
        m = masks[name]
        base[m] = base[m] * (1 - t) + np.array(col) * t
    im = Image.fromarray(base.clip(0, 255).astype(np.uint8)).resize((w * 2, h * 2), Image.NEAREST)
    canvas = Image.new('RGB', (w * 2 + 80, h * 2 + 120), (255, 255, 255))
    canvas.paste(im, (80, 0))
    d = ImageDraw.Draw(canvas)
    for y in range(0, h, 10):
        d.line((70 if y % 50 == 0 else 75, 2 * y, 80, 2 * y), fill=(0, 0, 0))
        if y % 50 == 0:
            d.text((2, 2 * y - 8), str(y), font=font(16), fill=(0, 0, 0))
            d.line((80, 2 * y, 80 + 2 * w, 2 * y), fill=(200, 200, 200))
    for x in range(0, w, 50):
        d.line((80 + 2 * x, 0, 80 + 2 * x, 2 * h), fill=(200, 200, 200))
        d.text((80 + 2 * x + 2, 2 * h + 4), str(x), font=font(16), fill=(0, 0, 0))
    lines = [('頂', r['top'], (200, 0, 0)), ('下巴', r['chin'], (200, 0, 0)), ('下巴+34', r['c34_y'], (0, 0, 200)),
             ('y280', 280, (0, 120, 0)), ('腰', r['waist'], (150, 0, 150)), ('腳底', r['sole'], (0, 0, 0))]
    if r['split'] is not None:
        lines.append(('腿分開', r['split'], (150, 80, 0)))
    for label, y, col in lines:
        d.line((80, 2 * y, 80 + 2 * w, 2 * y), fill=col, width=1)
        d.text((80 + 2 * w - 140, 2 * y - 20), f'{label} {y:g}', font=font(18), fill=col)
    d.line((80 + 2 * r['cx'], 0, 80 + 2 * r['cx'], 2 * h), fill=(255, 0, 0))
    d.text((90, 2 * h + 30), '青＝看得到的頭髮　橘＝長髮　綠＝臉　藍＝耳　黃＝脖子　灰＝挖掉的遮蔽物　洋紅＝補回的遮蔽頭髮　金＝分類敏感度不判定　褐＝手',
           font=font(20), fill=(0, 0, 0))
    d.text((90, 2 * h + 62), f"{NAMES[r['id']]}｜2 倍放大｜格線每 50px", font=font(20), fill=(0, 0, 0))
    canvas.save(path)


def seam_check(a, r):
    op = a[..., 3] >= ALPHA
    lab = srgb_to_lab(a[..., :3])
    rows = []
    for y in range(r['chin_row'] - 15, r['chin_row'] + 50):
        edge = op[y] & ~op[y + 1]
        step = op[y] & op[y + 1] & (np.abs(lab[y + 1, :, 0] - lab[y, :, 0]) > 25)
        rows.append(dict(y=y, alpha_edge_run=longest_run(edge), color_step_run=longest_run(step)))
    flagged = [x for x in rows if x['alpha_edge_run'] >= 10 or x['color_step_run'] >= 30]
    x0, y0, x1, y1 = 130, r['chin_row'] - 30, 410, r['chin_row'] + 55
    crop = a[y0:y1, x0:x1]
    al = crop[..., 3:4] / 255.0
    rgbc = np.full(crop[..., :3].shape, (244, 241, 235), float) * (1 - al) + crop[..., :3] * al
    Image.fromarray(rgbc.astype(np.uint8)).resize(((x1 - x0) * 4, (y1 - y0) * 4), Image.NEAREST).save(OUT / 'seam-jiejie-color-x4.png')
    Image.fromarray(crop[..., 3]).resize(((x1 - x0) * 4, (y1 - y0) * 4), Image.NEAREST).save(OUT / 'seam-jiejie-alpha-x4.png')
    return dict(crop=[x0, y0, x1, y1], rows=rows, flagged=flagged)


def pct(v, ref):
    return None if v is None or ref in (None, 0) else (v / ref - 1) * 100


def fmt(v):
    if v is None:
        return '量不到'
    return f'{v:.1f}' if isinstance(v, float) and v != int(v) else str(int(v)) if isinstance(v, (int, float)) else str(v)


def cell(v, ref, gate=False):
    p = pct(v, ref)
    if p is None:
        return fmt(v)
    s = f'{fmt(v)}（{p:+.1f}%）'
    return f'**{s} 超標**' if gate and abs(p) > TOL else s


def main():
    OUT.mkdir(exist_ok=True)
    paths = {k: REPO / f'assets/chars/{k}.png' for k in IDS}
    sha_before = {k: hashlib.sha1(p.read_bytes()).hexdigest() for k, p in paths.items()}
    imgs = {}
    sanity = {}
    for k, p in paths.items():
        im = Image.open(p)
        a = np.array(im.convert('RGBA'))
        imgs[k] = a
        corners = [int(a[y, x, 3]) for y, x in [(0, 0), (0, -1), (-1, 0), (-1, -1)]]
        op = a[..., 3] >= ALPHA
        edge = op & ~ndi.binary_erosion(op, structure=S8)
        L = srgb_to_lab(a[..., :3])[..., 0]
        sanity[k] = dict(size=list(im.size), mode=im.mode, corner_alpha=corners,
                         semi_alpha_px=int(((a[..., 3] > 0) & (a[..., 3] < 255)).sum()),
                         white_halo_px=int((edge & (L > 95)).sum()))
        if a.shape[:2] != (720, 540) or max(corners) > 0:
            print(f'!! {k} 尺寸或透明背景異常：{sanity[k]}', file=sys.stderr)

    cal, cal_table = calibrate(imgs['bulu'])
    rows, masks = {}, {}
    for k in IDS:
        rows[k], masks[k] = measure(k, imgs[k], SPEC[k], cal)
        overlay(imgs[k], masks[k], rows[k], OUT / f'overlay-{k}.png')
        for n, m in masks[k].items():
            Image.fromarray((m * 255).astype(np.uint8)).save(OUT / f'mask-{k}-{n}.png')
    seam = seam_check(imgs['jiejie'], rows['jiejie'])

    sha_after = {k: hashlib.sha1(p.read_bytes()).hexdigest() for k, p in paths.items()}
    assert sha_before == sha_after, '角色圖在量測中被改動！'

    b = rows['bulu']
    md = ['# 小頌 cast6-r2 量測結果 r2c（程式小頌寫、小夏代跑）', '',
          '> 這是程式輸出，還沒經小頌看過 overlay。小頌確認遮罩正確之前，數字不能當過關依據。', '',
          '## 圖檔', '']
    for k in IDS:
        md.append(f"- `assets/chars/{k}.png` SHA1 `{sha_before[k]}`；{sanity[k]}")
    md += ['', '## 布魯校正（只用布魯對 r1 定義校正一次，四人同參數）', '',
           f"選用：下巴取 `{cal['chin']}`、頭高加 {cal['hh_off']}、臉外框 {cal['k_face']} px、耳外框 {cal['k_ear']} px", '',
           '|項目|r1 布魯|本程式布魯|差|', '|---|---:|---:|---:|']
    for k2, v in R1_BULU.items():
        md.append(f'|{k2}|{v}|{fmt(b[k2])}|{pct(b[k2], v):+.2f}%|')
    md += ['', '百分比分母一律用「本程式布魯」。', '']

    metrics = [('body_height', 'body_height_est', '總高（不含結帽冠）'), ('head_height', 'head_height_est', '頭高'),
               ('face_width', None, '臉最寬（不含耳）'), ('jaw_width', None, '下顎寬（下巴上 30px）'),
               ('head_width', 'head_width_est', '頭寬'), ('head_width_no_ears', None, '頭寬不含耳'),
               ('head_area', 'head_area_est', '頭部面積'), ('hair_head', 'hair_head_est', '髮量：下巴以上'),
               ('long_hair', None, '髮量：下巴以下長髮（含外框）'), ('hair_total_vis', 'hair_total_est', '髮量：合計'),
               ('hair_total_est_circle', None, '髮量合計：蝴蝶結／皇冠改圓弧補（對照）'),
               ('hair_upper_bound', None, '髮量：遮蔽範圍內深色全算（分類敏感度，含帽/手，不判定）'),
               ('head_area_est_circle', None, '頭部面積：圓弧補（對照）'), ('head_area_upper', None, '頭部面積：分類敏感度（不判定）'),
               ('head_width_upper', None, '頭寬：分類敏感度（不判定）'),
               ('c34_left', None, '下巴+34 左側'), ('c34_right', None, '下巴+34 右側'), ('c34_total', None, '下巴+34 合計'),
               ('y280_left', None, 'y280 左側'), ('y280_right', None, 'y280 右側'), ('y280_total', None, 'y280 合計'),
               ('torso', None, '下巴到腰'), ('chin_to_split', None, '下巴到腿分開'), ('leg', None, '腿分開到腳底')]
    md += ['## 逐項（可見｜推估），括號是對本程式布魯的差距', '',
           '|項目|布魯|姐姐 可見|姐姐 推估|哈特 可見|哈特 推估|精靈 可見|精靈 推估|', '|---|---:|---:|---:|---:|---:|---:|---:|']
    for vk, ek, label in metrics:
        line = f'|{label}|{fmt(b[vk])}|'
        for k in ['jiejie', 'hate', 'spirit']:
            rr = rows[k]
            line += cell(rr[vk], b[vk]) + '|' + (cell(rr[ek], b[ek]) if ek else '—') + '|'
        md.append(line)

    gates = {'jiejie': ['hair_total_est', 'hair_total_est_circle', 'head_area_est', 'head_area_est_circle', 'head_width_est', 'jaw_width', 'face_width', 'head_height', 'body_height', 'c34_total', 'c34_right'],
             'hate': ['hair_total_est', 'head_area_est', 'head_width_est', 'jaw_width', 'face_width', 'head_height', 'body_height', 'c34_right', 'chin_to_split', 'leg'],
             'spirit': ['hair_total_est', 'hair_total_est_circle', 'head_area_est', 'head_area_est_circle', 'head_width_est', 'jaw_width', 'face_width', 'head_height', 'body_height', 'c34_total', 'y280_total', 'chin_to_split', 'leg']}
    bulu_ref = {k: b['hair_total_est'] for k in ['hair_total_est', 'hair_total_est_circle', 'hair_upper_bound']}
    bulu_ref.update({k: b['head_area_est'] for k in ['head_area_est', 'head_area_est_circle', 'head_area_upper']})
    bulu_ref.update({k: b['head_width_est'] for k in ['head_width_est', 'head_width_upper']})
    md += ['', '## 關卡（±5%，用推估值）', '']
    for k, gl in gates.items():
        rr = rows[k]
        md.append(f'### {NAMES[k]}')
        for gk in gl:
            ref = bulu_ref.get(gk, b[gk])
            p = pct(rr[gk], ref)
            ok = '量不到' if p is None else ('通過' if abs(p) <= TOL else '不通過')
            md.append(f'- {gk}: {fmt(rr[gk])} vs 布魯 {fmt(ref)} → {"" if p is None else f"{p:+.1f}% "}{ok}')
        md.append('')
    md += ['姐姐舉左手、哈特舉左手：舉手側的肩寬只列參考。姐姐長髮移到肩後，被身體蓋住的長髮只算看得到的，'
           '長髮算不算進髮量仍待我的王決定。', '',
           '判讀：姐姐、精靈的「主要推估」和「圓弧對照」結論不同時，算邊界，不判通過。'
           '哈特依 r1 用右半鏡射推估判定；「分類敏感度」把帽子／手套範圍內深色全算，只顯示遮罩分類的影響，不當關卡。', '',
           '腿分開點：從小腿高度（腳底往上 80 列）兩腿之間的 alpha<128 透明縫往上追到合起來那一列；'
           '布魯本程式 y' + str(b['split']) + '，r1 記 465（r1 不是同一個 alpha 定義），兩者都列。姐姐被裙子蓋住，只列參考。', '',
           '姐姐長髮：只算看得到的（含 2px 外框）；被衣服、身體遮住的長髮無法從像素驗證。', '',
           '## 遮蔽與診斷', '']
    for k in IDS:
        rr = rows[k]
        md.append(f"- {NAMES[k]}：下巴候選 {rr['chin_variants']}；膚色 {rr['skin_rgb']}；髮色 {rr['hair_refs']}；耳朵 {rr['ears']}；"
                  f"遮蔽 {rr['occluders']}；脖子 {rr['neck_area']}、手 {rr['hand_area']}；髮量中不像頭髮也非輪廓的像素 {rr['hair_non_hairlike_px']}；"
                  f"鏡射上限髮量 {rr['hair_upper_bound']}；腰 y{rr['waist_top']}–{rr['waist_bottom']}；長髮色塊 {rr['long_hair_components']}；長髮過濾 {rr['long_hair_filter']}；警告 {rr['warnings']}")
    md += ['', '## 姐姐接縫（下巴上下）', '', f"疑似水平切線的列（alpha 水平邊 ≥10px 或色階 ≥30px）：{seam['flagged']}", '',
           '放大圖：`out/seam-jiejie-color-x4.png`、`out/seam-jiejie-alpha-x4.png`（小頌會看圖判斷）。', '',
           '## 校正前 10 名', '', '```', json.dumps(cal_table, ensure_ascii=False, indent=1), '```', '',
           f'角色圖 SHA1 量測前後一致：{sha_before == sha_after}']
    (OUT / 'results.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    (OUT / 'results.json').write_text(json.dumps(dict(calibration=cal, calibration_top10=cal_table, sanity=sanity,
                                                      sha1=sha_before, rows=rows, seam=seam), ensure_ascii=False, indent=2,
                                                 default=lambda o: o.item() if hasattr(o, 'item') else str(o)) + '\n', encoding='utf-8')
    print('\n'.join(md))


if __name__ == '__main__':
    main()
