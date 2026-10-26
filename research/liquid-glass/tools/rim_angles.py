"""Rim layer by fine angle: for each 15° normal bin and depth px 0,1,2,3 (outermost first), fit
out = g·bg + o over the flats that do not clip, report α = 1 − g and layer grey c = o / α, relative to
the interior transfer at 6–9 pt depth (so the interior material is removed: α_edge = how much of
the interior result the edge replaces).
    LG_RAW=../raw python3 rim_angles.py <shot dir> <key> <shape id>"""
import sys
import numpy as np
from lg import RAW, SCALE, load, shape_sdf, shapes
FLATS = ["ffffff", "ebebeb", "d0d0d0", "808080", "1a1a1a", "000000"]
shot, key, sid = sys.argv[1], sys.argv[2], sys.argv[3]
shape = [s for s in shapes("edges") if s["id"] == sid][0]
imgs = [load(f"{shot}/{key}-flat-{f}.png").mean(axis=2) for f in FLATS]
h, w = imgs[0].shape
d, nx, ny, _ = shape_sdf(shape, h, w)
ang = (np.degrees(np.arctan2(ny, nx)) + 360) % 360
inner = (d < -6 * SCALE) & (d > -9 * SCALE)
interior = np.array([np.median(i[inner]) for i in imgs])
print(f"{key} {sid}  interior: " + " ".join(f"{v*255:5.1f}" for v in interior))
print("angle  " + "  ".join(f"px{k}: α     c   Δ128 Δ235" for k in range(4)))
for a0 in range(0, 360, 15):
    m_ang = (np.abs(((ang - a0 + 180) % 360) - 180) < 7.5)
    line = f"{a0:4d}  "
    for k in range(4):
        m = m_ang & (d >= -(k + 1)) & (d < -k)
        e = np.array([np.median(i[m]) for i in imgs])
        ok = (interior < 0.985) & (e < 0.985)  # drop clipped points
        if ok.sum() >= 2:
            g, o = np.polyfit(interior[ok], e[ok], 1)
            alpha = 1 - g
            c = o / alpha if abs(alpha) > 0.02 else float("nan")
        else:
            alpha, c = float("nan"), float("nan")
        line += f"   {alpha:5.2f} {c:5.2f} {255*(e[3]-interior[3]):5.0f} {255*(e[1]-interior[1]):4.0f}"
    print(line)
