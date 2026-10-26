"""Merging: two 64 pt circles in one GlassEffectContainer over a 2 px checker. Glass blurs the
checker away, so low local variance = glass. For each (spacing, gap): the neck half-height on the
midline between the circles and how far each circle's outline bulges toward the other. Then fits
the smooth-min `k` (our quadratic smin on circle SDFs) that reproduces each neck. data/merge.json."""
import json
import math

import numpy as np
from scipy.ndimage import uniform_filter, binary_opening, label

from lg import DATA, RAW, SCALE, load

R = 32.0  # pt
CX, CY = 201.0, 300.0


def mask_of(path):
    g = load(path, gray=True)
    mean = uniform_filter(g, 7)
    var = uniform_filter(g * g, 7) - mean * mean
    m = var < 0.004
    m = binary_opening(m, iterations=2)
    lab, _ = label(m)
    return m, lab


def neck(m, gap):
    s = SCALE
    col = int(round(CX * s))
    row = int(round(CY * s))
    if not m[row, col]:
        return 0.0
    up = row
    while up > 0 and m[up - 1, col]:
        up -= 1
    down = row
    while down < m.shape[0] - 1 and m[down + 1, col]:
        down += 1
    return (down - up + 1) / 2 / s


def inner_edge(m, gap):
    """Where the left circle's glass ends on the centre row (pt), vs its true edge."""
    s = SCALE
    row = int(round(CY * s))
    true_edge = CX - gap / 2
    start = int(round((CX - gap / 2 - R) * s))
    x = start
    while x < m.shape[1] - 1 and m[row, x + 1]:
        x += 1
    return (x + 1) / s - true_edge


def smin_neck(gap, k):
    """Neck half-height for two radius-R circles with quadratic smin `k` (pt)."""
    if k <= 0 or gap / 2 >= k / 4:
        return 0.0
    return math.sqrt(max(0.0, (R + k / 4) ** 2 - (R + gap / 2) ** 2))


def fit_k(gap, h):
    if h <= 0:
        return None
    best = min(np.linspace(0.1, 120, 2400), key=lambda k: abs(smin_neck(gap, k) - h))
    return float(best)


def main():
    rows = []
    for spacing in [0, 20, 40]:
        for gap in [40, 32, 24, 16, 12, 8, 4, 0]:
            m, _ = mask_of(RAW / f"merge/s{spacing}-g{gap}.png")
            h = neck(m, gap)
            rows.append({"spacing": spacing, "gap": gap, "neck": round(h, 2), "bulge": round(inner_edge(m, gap), 2),
                         "k": fit_k(gap, h)})
            print(rows[-1])
    for gap in [40, 16]:
        m, _ = mask_of(RAW / f"merge/union-g{gap}.png")
        rows.append({"union": True, "gap": gap, "neck": round(neck(m, gap), 2), "bulge": round(inner_edge(m, gap), 2)})
        print(rows[-1])
    DATA.mkdir(exist_ok=True)
    (DATA / "merge.json").write_text(json.dumps({"radius": R, "rows": rows}, indent=1))


if __name__ == "__main__":
    main()
