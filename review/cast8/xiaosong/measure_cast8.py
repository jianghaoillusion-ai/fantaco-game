#!/usr/bin/env python3
"""小頌 cast8 獨立量測程式（cast7 第 2 次審查量法的固定版）。

只讀圖、只寫 --out 指定的資料夾。需要 numpy、Pillow（有 scipy 會比較快，沒有也能跑）。

用法（在 repo 根目錄）：
  python3 -I review/cast8/xiaosong/measure_cast8.py \
    --jiejie /Volumes/外接資料碟/ai-lab/fantaco-logs/tmp-xiaoxia-cast8/jiejie-final-new.png \
    --spirit /Volumes/外接資料碟/ai-lab/fantaco-logs/tmp-xiaoxia-cast8/spirit-new.png \
    --out review/cast8/xiaosong/out

固定規則（寫死，不隨候選改）：
  * 看得到 = alpha >= 128。原圖 540x720 直接比，不縮放，腳底 y685。
  * 總高 = 腳底 - 髮頂；髮頂只認「頭髮顏色」最上緣（帽子、皇冠、蝴蝶結不算）。
  * 頭高 = 下巴 - 髮頂；頭身比 = 頭高 / 總高。
  * 臉遮罩 = 下巴以上、最大一塊膚色連通區，再把內部的洞補滿
    （眼睛、眉毛、嘴、腮紅都在洞裡，算臉，不會被算成頭髮）。
    耳朵用半徑 EAR_OPEN 的開運算切掉，切下來的膚色另算耳朵。
  * 髮遮罩 = 下巴以上、頭髮顏色、不在臉遮罩裡、連到最大一塊頭髮的像素。
    五官黑色在臉遮罩內，所以不算頭髮；配件顏色不在頭髮色範圍內。
  * 頭部面積 = 臉 + 髮 + 耳（不含帽子、皇冠、蝴蝶結、舉起來的手）。
  * 臉最寬 = 臉遮罩（不含耳）最寬一列；頭寬 = 頭部遮罩最寬一列。
  * 肩寬 = 下巴往下 34 px 那一列，只算連著身體中線的那一段。
  * 身長 = 腰 - 下巴；腰到腳底；腿長 = 腳底 - 兩腿分開點。
    下巴、腰、分開點從 landmarks.json 讀（cast7 也是人判讀），程式會畫在 overlay 上供核對。
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
ALPHA = 128
EAR_OPEN = 7
TOL = 0.05

# 頭髮顏色（HSV，h 以度數）。top=用來抓髮頂；area=用來算髮量。
HAIR = {
    'bulu':   {'top': [('dark',)],                       'area': [('dark',)]},
    'hate':   {'top': [('hsv', 8, 42, .30, 1, .12, .80)], 'area': [('hsv', 8, 42, .30, 1, .12, .80)]},
    'jiejie': {'top': [('hsv', 5, 40, .25, 1, .10, .75)], 'area': [('hsv', 5, 40, .25, 1, .10, .75)]},
    'spirit': {'top': [('hsv', 195, 255, .35, 1, .20, 1)],
               'area': [('hsv', 195, 255, .35, 1, .20, 1), ('dark',)]},
}

# ---------- 基本工具 ----------
def load(p):
    im = Image.open(p).convert('RGBA')
    if im.size != (540, 720):
        sys.exit(f'尺寸不對 {p} {im.size}，應為 540x720')
    a = np.asarray(im).astype(np.float32)
    return a

def hsv(a):
    rgb = a[..., :3] / 255.0
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    nz = d > 1e-6
    i = nz & (mx == r); h[i] = ((g - b)[i] / d[i]) % 6
    i = nz & (mx == g) & (mx != r); h[i] = (b - r)[i] / d[i] + 2
    i = nz & (mx == b) & (mx != r) & (mx != g); h[i] = (r - g)[i] / d[i] + 4
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx

def colour_mask(a, rules):
    h, s, v = hsv(a)
    vis = a[..., 3] >= ALPHA
    m = np.zeros(vis.shape, bool)
    for r in rules:
        if r[0] == 'dark':
            m |= v < 0.30
        else:
            _, h0, h1, s0, s1, v0, v1 = r
            m |= (h >= h0) & (h <= h1) & (s >= s0) & (s <= s1) & (v >= v0) & (v <= v1)
    return m & vis

def skin_mask(a):
    h, s, v = hsv(a)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (a[..., 3] >= ALPHA) & (((h <= 45) | (h >= 345)) & (s >= .08) & (s <= .65) & (v >= .55) & (R >= G) & (G >= B * 0.9))

try:
    from scipy import ndimage as ndi
    def label(m):
        return ndi.label(m, structure=np.ones((3, 3)))
    def binary_open(m, r):
        y, x = np.ogrid[-r:r + 1, -r:r + 1]
        return ndi.binary_opening(m, structure=(x * x + y * y) <= r * r)
except ImportError:
    ndi = None
    def label(m):
        H, W = m.shape
        lab = np.zeros((H, W), np.int32); n = 0
        for y0, x0 in zip(*np.nonzero(m)):
            if lab[y0, x0]:
                continue
            n += 1; st = [(y0, x0)]; lab[y0, x0] = n
            while st:
                y, x = st.pop()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n; st.append((yy, xx))
        return lab, n
    def _shift_all(m, r, op):
        out = m.copy() if op == 'and' else m.copy()
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy > r * r:
                    continue
                sh = np.zeros_like(m)
                ys = slice(max(dy, 0), m.shape[0] + min(dy, 0)); yd = slice(max(-dy, 0), m.shape[0] + min(-dy, 0))
                xs = slice(max(dx, 0), m.shape[1] + min(dx, 0)); xd = slice(max(-dx, 0), m.shape[1] + min(-dx, 0))
                sh[yd, xd] = m[ys, xs]
                out = (out & sh) if op == 'and' else (out | sh)
        return out
    def binary_open(m, r):
        return _shift_all(_shift_all(m, r, 'and'), r, 'or')

def largest(m):
    lab, n = label(m)
    if n == 0:
        return m & False
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    return lab == sizes.argmax()

def fill_holes(m):
    lab, n = label(~m)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    holes = (lab > 0) & ~np.isin(lab, list(border))
    return m | holes

def row_width(m):
    return m.sum(1)

def max_span(m):
    best, by = 0, -1
    for y in range(m.shape[0]):
        xs = np.nonzero(m[y])[0]
        if len(xs):
            w = xs[-1] - xs[0] + 1
            if w > best:
                best, by = w, y
    return best, by

# ---------- 量一個角色 ----------
def measure(name, kind, a, lm, foot):
    vis = a[..., 3] >= ALPHA
    H, W = vis.shape
    ys = np.nonzero(vis.any(1))[0]
    top_vis = int(ys[0])
    upper = np.zeros_like(vis); upper[: int(top_vis + 0.45 * (foot - top_vis))] = True

    hair_top_m = largest(colour_mask(a, HAIR[kind]['top']) & upper)
    auto_hairtop = int(np.nonzero(hair_top_m.any(1))[0][0]) if hair_top_m.any() else None
    hairtop = lm.get('hairtop') if lm.get('hairtop') is not None else auto_hairtop
    chin = float(lm['chin']); cy = int(round(chin))

    band = np.zeros_like(vis); band[int(hairtop):cy] = True
    skin = skin_mask(a) & band
    face_all = fill_holes(largest(skin))
    face = largest(binary_open(face_all, EAR_OPEN)) & face_all
    face = fill_holes(face)
    ears = face_all & ~face
    # 耳朵只留貼著臉的大塊（去掉開運算削下來的臉邊細屑）
    lab, n = label(ears)
    keep = np.zeros_like(ears)
    for i in range(1, n + 1):
        c = lab == i
        if c.sum() >= 150:
            keep |= c
    ears = keep
    face = face_all & ~ears

    hair_c = colour_mask(a, HAIR[kind]['area']) & band & ~face_all
    hair = largest(hair_c | (hair_top_m & band))
    hair = hair & ~face_all
    head = face | ears | hair

    face_w, face_wy = max_span(face)
    head_w, head_wy = max_span(head)

    # 含垂到下巴以下的長髮（給姐姐用）：整張圖頭髮色、連到頭頂髮塊
    hair_long = None
    if kind == 'jiejie':
        lab, n = label(colour_mask(a, HAIR[kind]['area']) & ~face_all)
        ids = set(np.unique(lab[hair])) - {0}
        hair_long = int(np.isin(lab, list(ids)).sum())

    # 肩寬：下巴下 34 px 那一列，只算包含身體中線的連續段
    sy = cy + 34
    body_cx = int(round(np.nonzero(vis[foot - 40:foot].any(0))[0].mean()))
    row = vis[sy]
    l = r = body_cx
    if row[body_cx]:
        while l > 0 and row[l - 1]: l -= 1
        while r < W - 1 and row[r + 1]: r += 1
        shoulder_full, shoulder_right = r - l + 1, r - body_cx + 1
    else:
        shoulder_full = shoulder_right = None

    total = foot - hairtop
    head_h = chin - hairtop
    out = {
        'name': name, 'auto_hairtop': auto_hairtop, 'hairtop': hairtop, 'chin': chin,
        'top_visible_incl_accessory': top_vis,
        '總高': total, '頭高': head_h, '頭身比': head_h / total,
        '臉最寬': int(face_w), '頭寬': int(head_w),
        '頭部面積': int(head.sum()), '臉面積': int(face.sum()), '耳朵面積': int(ears.sum()),
        '髮量': int(hair.sum()), '髮量含長髮': hair_long,
        '肩全寬': shoulder_full, '肩右單邊': shoulder_right,
        '身長': (lm['waist'] - chin) if lm.get('waist') is not None else None,
        '腰到腳底': (foot - lm['waist']) if lm.get('waist') is not None else None,
        '腿長': (foot - lm['legsplit']) if lm.get('legsplit') is not None else None,
        '_masks': {'face': face, 'ears': ears, 'hair': hair}, '_body_cx': body_cx,
        '_shoulder': (sy, l, r),
    }
    return out

ITEMS = ['總高', '頭高', '頭身比', '臉最寬', '頭寬', '頭部面積', '臉面積', '髮量', '髮量含長髮',
         '肩全寬', '肩右單邊', '身長', '腰到腳底', '腿長']

def overlay(a, m, lm, path, foot):
    im = Image.fromarray(a.astype(np.uint8), 'RGBA')
    bg = Image.new('RGBA', im.size, (40, 40, 40, 255)); bg.alpha_composite(im)
    col = np.zeros((*a.shape[:2], 4), np.uint8)
    col[m['_masks']['face']] = (255, 200, 0, 110)
    col[m['_masks']['ears']] = (0, 255, 0, 140)
    col[m['_masks']['hair']] = (255, 0, 255, 110)
    bg.alpha_composite(Image.fromarray(col, 'RGBA'))
    d = ImageDraw.Draw(bg)
    for key, c in (('hairtop', (0, 255, 255)), ('chin', (255, 255, 0)), ('waist', (255, 128, 0)), ('legsplit', (0, 255, 0))):
        v = m.get(key) if key in ('hairtop', 'chin') else lm.get(key)
        if v is not None:
            d.line([(0, v), (539, v)], fill=c, width=1); d.text((2, v - 11), key, fill=c)
    d.line([(0, foot), (539, foot)], fill=(255, 255, 255), width=1)
    sy, l, r = m['_shoulder']; d.line([(l, sy), (r, sy)], fill=(0, 160, 255), width=2)
    bg.convert('RGB').save(path)

# ---------- 精靈：皇冠是否原尺寸、完整 ----------
def crown_check(orig, new, hairtop_orig):
    o_vis = orig[..., 3] >= ALPHA
    crown = o_vis.copy(); crown[int(hairtop_orig):] = False
    crown &= ~colour_mask(orig, HAIR['spirit']['top'])
    crown = largest(crown | False) if crown.any() else crown
    ys, xs = np.nonzero(crown)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    tpl = orig[y0:y1, x0:x1]; tm = crown[y0:y1, x0:x1]
    best = None
    for dy in range(-y0, 80):
        for dx in range(-60, 61):
            Y, X = y0 + dy, x0 + dx
            if Y < 0 or X < 0 or Y + tpl.shape[0] > 720 or X + tpl.shape[1] > 540:
                continue
            reg = new[Y:Y + tpl.shape[0], X:X + tpl.shape[1]]
            err = np.abs(reg[tm] - tpl[tm]).mean()
            if best is None or err < best[0]:
                best = (err, dx, dy)
    err, dx, dy = best
    Y, X = y0 + dy, x0 + dx
    reg = new[Y:Y + tpl.shape[0], X:X + tpl.shape[1]]
    diff = np.abs(reg - tpl).max(-1)
    # 只看皇冠上半部（底座以下會被新頭髮蓋住，屬合理）
    upper = np.zeros_like(tm); upper[: int(tm.shape[0] * 0.7)] = True
    changed = int(((diff > 24) & tm & upper).sum())
    return {'crown_bbox_orig': [int(x0), int(y0), int(x1), int(y1)], 'size': [int(x1 - x0), int(y1 - y0)],
            'best_shift_dx_dy': [int(dx), int(dy)], 'mean_abs_err': float(err),
            'crown_top_y_new': int(Y), 'touches_top_edge': bool(Y <= 0),
            'upper70pct_pixels_changed_gt24': changed, 'upper70pct_pixels': int((tm & upper).sum())}

# ---------- 描邊斷線：邊緣上沒有黑線的連續段 ----------
def outline_gaps(a, min_len=15):
    vis = a[..., 3] >= ALPHA
    pad = np.pad(vis, 1)
    edge = vis & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    dark = (L < 80) & vis
    near = dark.copy()
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            near |= np.roll(np.roll(dark, dy, 0), dx, 1)
    bad = edge & ~near
    lab, n = label(bad)
    gaps = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) >= min_len:
            gaps.append({'px': int(len(ys)), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]})
    gaps.sort(key=lambda g: -g['px'])
    return {'edge_px': int(edge.sum()), 'edge_without_outline_px': int(bad.sum()),
            'ratio': float(bad.sum() / max(edge.sum(), 1)), 'gaps_ge_%d' % min_len: gaps[:20]}

# ---------- 姐姐：臉是否覆回原臉（估倍率後比對） ----------
def face_match(orig, new, fo, fn):
    oy, ox = np.nonzero(fo); ny, nx = np.nonzero(fn)
    s = ((nx.max() - nx.min()) / (ox.max() - ox.min()) + (ny.max() - ny.min()) / (oy.max() - oy.min())) / 2
    crop = Image.fromarray(orig[oy.min():oy.max() + 1, ox.min():ox.max() + 1].astype(np.uint8), 'RGBA')
    fm = Image.fromarray((fo[oy.min():oy.max() + 1, ox.min():ox.max() + 1] * 255).astype(np.uint8))
    best = None
    for ss in np.arange(s - 0.04, s + 0.041, 0.01):
        w, h = max(1, round(crop.width * ss)), max(1, round(crop.height * ss))
        c = np.asarray(crop.resize((w, h), Image.LANCZOS)).astype(np.float32)
        mm = np.asarray(fm.resize((w, h), Image.NEAREST)) > 127
        for dy in range(-6, 7):
            for dx in range(-6, 7):
                Y, X = ny.min() + dy, nx.min() + dx
                if Y < 0 or X < 0 or Y + h > 720 or X + w > 540:
                    continue
                e = np.abs(new[Y:Y + h, X:X + w, :3] - c[..., :3])[mm].mean()
                if best is None or e < best[0]:
                    best = (e, float(ss), dx, dy)
    return {'scale_est': best[1], 'mean_abs_rgb_err_on_face': best[0], 'shift': [best[2], best[3]],
            '_判讀': '< 6 幾乎可視為同一張臉縮放；> 15 代表臉被重畫或換了'}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jiejie', required=True); ap.add_argument('--spirit', required=True)
    ap.add_argument('--bulu', default=os.path.join(REPO, 'assets/chars/bulu.png'))
    ap.add_argument('--hate', default=os.path.join(REPO, 'assets/chars/hate.png'))
    ap.add_argument('--jiejie-orig', default=os.path.join(REPO, 'assets/chars/jiejie.png'))
    ap.add_argument('--spirit-orig', default=os.path.join(REPO, 'assets/chars/spirit.png'))
    ap.add_argument('--landmarks', default=os.path.join(HERE, 'landmarks.json'))
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    LM = json.load(open(a.landmarks, encoding='utf-8')); foot = LM['foot']

    imgs = {'bulu': load(a.bulu), 'hate': load(a.hate), 'jiejie_new': load(a.jiejie), 'spirit_new': load(a.spirit),
            'jiejie_orig': load(a.jiejie_orig), 'spirit_orig': load(a.spirit_orig)}
    kinds = {'bulu': 'bulu', 'hate': 'hate', 'jiejie_new': 'jiejie', 'spirit_new': 'spirit',
             'jiejie_orig': 'jiejie', 'spirit_orig': 'spirit'}
    for k, im in imgs.items():
        fy = np.nonzero((im[..., 3] >= ALPHA).any(1))[0][-1]
        if fy != foot:
            print(f'注意：{k} 最低可見列 y{fy}，不是 {foot}')
    M = {k: measure(k, kinds[k], imgs[k], LM[k], foot) for k in imgs}
    for k in M:
        overlay(imgs[k], M[k], LM[k], os.path.join(a.out, f'overlay-{k}.png'), foot)

    ref = M['bulu']
    lines = ['| 項目 | 布魯 | 哈特 | 姐姐新 | 精靈新 | 姐姐原 | 精靈原 |', '|---|---:|---:|---:|---:|---:|---:|']
    table = {}
    for it in ITEMS:
        rv = ref[it] if it != '髮量含長髮' else ref['髮量']
        cells = []
        for k in ('bulu', 'hate', 'jiejie_new', 'spirit_new', 'jiejie_orig', 'spirit_orig'):
            v = M[k][it]
            if v is None or rv is None:
                cells.append('—'); continue
            d = v / rv - 1
            table.setdefault(k, {})[it] = {'value': v, 'diff': d, 'pass': abs(d) <= TOL}
            fmt = f'{v:.4f}' if it == '頭身比' else (f'{v:.1f}' if isinstance(v, float) else str(v))
            cells.append(fmt if k == 'bulu' else (f'{fmt}（{d:+.1%}）' if abs(d) <= TOL else f'**{fmt}（{d:+.1%}）**'))
        lines.append(f'| {it} | ' + ' | '.join(cells) + ' |')

    extra = {
        'crown': crown_check(imgs['spirit_orig'], imgs['spirit_new'], LM['spirit_orig']['hairtop']),
        'outline_spirit_new': outline_gaps(imgs['spirit_new']),
        'outline_spirit_orig': outline_gaps(imgs['spirit_orig']),
        'outline_jiejie_new': outline_gaps(imgs['jiejie_new']),
        'outline_jiejie_orig': outline_gaps(imgs['jiejie_orig']),
        'jiejie_face_match': face_match(imgs['jiejie_orig'], imgs['jiejie_new'],
                                        M['jiejie_orig']['_masks']['face'], M['jiejie_new']['_masks']['face']),
        'spirit_face_match': face_match(imgs['spirit_orig'], imgs['spirit_new'],
                                        M['spirit_orig']['_masks']['face'], M['spirit_new']['_masks']['face']),
        'landmarks_used': {k: {kk: M[k][kk] for kk in ('auto_hairtop', 'hairtop', 'chin', 'top_visible_incl_accessory')} for k in M},
    }
    md = '\n'.join(lines)
    open(os.path.join(a.out, 'table.md'), 'w', encoding='utf-8').write(md + '\n')
    json.dump({'table': table, 'extra': extra}, open(os.path.join(a.out, 'result.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1, default=float)
    print(md); print(json.dumps(extra, ensure_ascii=False, indent=1, default=float))
    if abs(ref['頭部面積'] - 32965) > 1500 or abs(ref['髮量'] - 15553) > 1500:
        print('注意：布魯頭部面積/髮量和 cast7 實測（32965／15553）差超過 1500，遮罩顏色範圍要先調再看結果。')

if __name__ == '__main__':
    main()
