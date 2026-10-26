"""Finds every flat-backed shape in a capture (connected region that differs from the known flat
background) and measures its bounds and corner. Used for toolbars, search, segmented, toggle,
slider, text fields, alerts and menus.

    LG_RAW=<raw> python3 analyze_shapes.py <capture> [bg=808080] [min_pt=8] [y0 y1]
"""
import sys

import numpy as np
from scipy import ndimage

from ctl import S, fit_corner, load


def shapes(img, bg_rgb, min_pt=8, thr=24, region=None, fill_holes=True):
    """Regions whose colour differs from bg by > thr (max channel). Each: bbox pt, fill colour,
    corner fit on a soft coverage relative to that fill."""
    bg = np.asarray(bg_rgb, dtype=np.float64)
    d = np.abs(img - bg).max(axis=2)
    m = d > thr
    if region is not None:
        y0, y1 = int(region[0] * S), int(region[1] * S)
        m[:y0] = False
        m[y1:] = False
    if fill_holes:
        m = ndimage.binary_fill_holes(m)
    lab, n = ndimage.label(m)
    out = []
    for k, sl in enumerate(ndimage.find_objects(lab), start=1):
        h = (sl[0].stop - sl[0].start) / S
        w = (sl[1].stop - sl[1].start) / S
        if h < min_pt or w < min_pt:
            continue
        pad = 6
        y0, y1 = max(sl[0].start - pad, 0), min(sl[0].stop + pad, img.shape[0])
        x0, x1 = max(sl[1].start - pad, 0), min(sl[1].stop + pad, img.shape[1])
        crop = img[y0:y1, x0:x1]
        own = ndimage.binary_dilation(lab[y0:y1, x0:x1] == k, iterations=4)
        # fill = most common colour of the region (median of its eroded interior)
        core = ndimage.binary_erosion(lab[y0:y1, x0:x1] == k, iterations=int(3 * S))
        if core.sum() < 10:
            core = lab[y0:y1, x0:x1] == k
        fill = np.median(crop[core], axis=0)
        span = np.linalg.norm(fill - bg)
        cov = np.clip(np.linalg.norm(crop - bg, axis=2) / max(span, 1), 0, 1) * own
        try:
            fit = fit_corner(cov)
        except Exception:
            fit = {}
        out.append({"x": round(sl[1].start / S, 2), "y": round(sl[0].start / S, 2), "w": round(w, 2), "h": round(h, 2),
                    "fill": [int(v) for v in fill], **fit})
    return out


if __name__ == "__main__":
    name = sys.argv[1]
    bg = sys.argv[2] if len(sys.argv) > 2 else "808080"
    min_pt = float(sys.argv[3]) if len(sys.argv) > 3 else 8
    region = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else None
    img, frames = load(name)
    rgb = [int(bg[i:i + 2], 16) for i in (0, 2, 4)]
    print("frames", frames)
    for s in shapes(img, rgb, min_pt, region=region):
        print(s)
