"""Edge veil: out = G·bg + O against the bare backdrop level (not the interior), per depth px and
angle from the light axis (0 = lit ends, 90 = perpendicular), unclipped flats only. Veil share
1 − G; for a white-ish surface O/(1−G) is the layer colour.
    LG_RAW=../raw python3 edge_veil.py <shot dir> <key> <shape id>"""
import sys
import numpy as np
from lg import RAW, SCALE, load, shape_sdf, shapes
FLATS = ["ffffff", "ebebeb", "d0d0d0", "808080", "1a1a1a", "000000"]
shot, key, sid = sys.argv[1], sys.argv[2], sys.argv[3]
shape = [s for s in shapes("edges") if s["id"] == sid][0]
imgs = [load(f"{shot}/{key}-flat-{f}.png").mean(axis=2) for f in FLATS]
bg = np.array([np.median(load(RAW / f"lightedges/none-flat-{f}.png").mean(axis=2)) for f in FLATS])
h, w = imgs[0].shape
d, nx, ny, _ = shape_sdf(shape, h, w)
ang = (np.degrees(np.arctan2(ny, nx)) + 360) % 360
off = np.abs(((ang - 45 + 90) % 180) - 90)  # angle between normal and the TL-BR axis, 0..90
rows = []
for label, m in [("interior", (d < -6 * SCALE) & (d > -9 * SCALE))] + [
        (f"px{k} a{a}", (d >= -(k + 1)) & (d < -k) & (np.abs(off - a) < 7.5)) for k in range(3) for a in (0, 45, 90)]:
    e = np.array([np.median(i[m]) for i in imgs])
    ok = e < 0.985
    G, O = np.polyfit(bg[ok], e[ok], 1) if ok.sum() >= 2 else (np.nan, np.nan)
    print(f"{key:14s} {sid:10s} {label:10s} G {G:5.2f} O {O:5.2f}  veil {1-G:5.2f} colour {O/max(1-G,1e-3):5.2f}   out@235 {255*e[1]:5.1f}")
