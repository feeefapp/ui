"""python3 measure_lens.py <dir>: held<k>.png (full 402 x 874 pt screens at 3x, or .npy crops at
origin 20, 150 pt) per LENS_CYCLE backdrop k -> lens box, bend profiles (pt, positive inward),
material on white/black, rim on black and shadow, for the pill (segmented) and the thumb (slider).
The same numbers for iOS captures (app/controls lens scene) and the kit (tools/lens_kit.mjs).
LENS-MEASURED.md has the method. Needs numpy + Pillow (/usr/bin/python3 on macOS has both)."""
import sys, os, json, math, numpy as np
from PIL import Image
D = sys.argv[1].rstrip('/') + '/'
OX, OY = 60, 450
def held(k):
    if os.path.exists(f'{D}held{k}.npy'): return np.load(f'{D}held{k}.npy') / 255
    a = np.asarray(Image.open(f'{D}held{k}.png').convert('RGB')).astype(np.float64)
    return a[150*3:320*3, 20*3:260*3] / 255
H = {k: held(k) for k in range(16)}
def phase(stack):
    th = [0, 2*np.pi/3, 4*np.pi/3]
    c = sum(I*np.cos(t) for I, t in zip(stack, th)); s = sum(I*np.sin(t) for I, t in zip(stack, th))
    return np.mod(np.arctan2(-s, c), 2*np.pi)
def coord(axis):
    out = None
    for period, base in ((96, 3), (24, 6)) if axis == 'x' else ((96, 9), (24, 12)):
        c = phase([H[base+k][..., 1] for k in range(3)])*period/(2*np.pi)
        h, w = c.shape
        own = np.mgrid[0:h, 0:w][1 if axis == 'x' else 0] + 0.5 + (OX if axis == 'x' else OY)
        out = c + np.round(((own if out is None else out) - c)/period)*period
    return (out - own)/3  # pt
dx, dy = coord('x'), coord('y')
grey = lambda k: H[k].mean(2)
W, B = grey(0), grey(1)
P = lambda img, x, y: float(img[int(round(y*3)) - OY, int(round(x*3)) - OX])
res = {}
for name, (cx, cy, rx, ry, clear_x) in {'pill': (101, 198, 75, 30, 70), 'thumb': (201, 276.5, 40, 26, 183)}.items():
    mag = np.hypot(dx, dy)
    Y0, Y1, X0, X1 = int((cy-ry)*3)-OY, int((cy+ry)*3)-OY, int((cx-rx)*3)-OX, int((cx+rx)*3)-OX
    sub = mag[Y0:Y1, X0:X1] > 0.35
    # lens extent: along the centre row/column (offset rows avoid labels / the track)
    row = sub[int(ry*3) - (0 if name == 'pill' else 24)]; col = sub[:, int(rx*3) + (0 if name == 'pill' else -54)]
    xs, ys = np.nonzero(row)[0], np.nonzero(col)[0]
    left, right = (xs.min() + X0 + OX)/3, (xs.max() + 1 + X0 + OX)/3
    top, bottom = (ys.min() + Y0 + OY)/3, (ys.max() + 1 + Y0 + OY)/3
    r = {'box': [round(left, 2), round(top, 2), round(right-left, 2), round(bottom-top, 2)]}
    # bend along the inward normal from the top edge, per pt of depth (positive = inward)
    xcol = clear_x
    r['bend_top'] = [round(float(dy[int((top + d)*3) - OY, int(xcol*3) - OX]), 2) for d in np.arange(0.17, 14, 1)]
    r['bend_left'] = [round(float(dx[int((cy - (0 if name == 'pill' else 8))*3) - OY, int((left + d)*3) - OX]), 2) for d in np.arange(0.17, 26 if name == 'pill' else 12, 1)]
    # material at depths from the top: white = a + b, black = b  (a: transmission, b: added light)
    r['white_top'] = [round(P(W, xcol, top + d), 3) for d in np.arange(0.5, bottom - top, 2)]
    r['black_top'] = [round(P(B, xcol, top + d), 3) for d in np.arange(0.5, bottom - top, 2)]
    # rim on black around the perimeter, max over the outer 1.5 pt, angles 0 = right, 90 = down
    rim = {}
    for deg in range(0, 360, 45):
        a = math.radians(deg); best = 0
        hw, hh = (right-left)/2, (bottom-top)/2
        mx = (left+right)/2; my = (top+bottom)/2
        for k in range(int(max(hw, hh)*3) + 6):
            x, y = mx + math.cos(a)*k/3, my + math.sin(a)*k/3
            if abs(x - mx) > hw + 1 or abs(y - my) > hh + 1: break
            try: best = max(best, P(B, x, y))
            except IndexError: break
        rim[deg] = round(best, 3)
    r['rim_black'] = rim
    # shadow under the lens on white (outside, below the centre)
    r['shadow_below'] = [round(P(W, xcol, bottom + d), 3) for d in np.arange(0.5, 15, 1.5)]
    r['shadow_above'] = [round(P(W, xcol, top - d), 3) for d in np.arange(0.5, 6, 1.5)]
    res[name] = r
print(json.dumps(res, indent=1))
