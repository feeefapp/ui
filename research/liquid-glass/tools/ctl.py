"""Shared pixel helpers for the controls measurements (CtlLab screenshots, 3x, 1 pt = 3 px)."""
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("LG_RAW", ROOT / "raw")) / "controls"
DATA = ROOT / "data"
S = 3.0


def load(name):
    """(image float HxWx3, frames dict in pt) for a capture name like 'buttons-glass-light'."""
    img = np.asarray(Image.open(RAW / f"{name}.png").convert("RGB"), dtype=np.float64)
    meta = RAW / f"{name}.json"
    frames = json.loads(meta.read_text()).get("frames", {}) if meta.exists() else {}
    return img, frames


def diff_mask(img, ref):
    """Max channel absolute difference between two captures."""
    return np.abs(img - ref).max(axis=2)


def box(frame, pad=0.0):
    x, y, w, h = frame
    return (int(round((x - pad) * S)), int(round((y - pad) * S)), int(round((x + w + pad) * S)), int(round((y + h + pad) * S)))


def coverage(img, bg, fill, region):
    """Soft coverage (0..1) of a flat-filled shape inside region (x0,y0,x1,y1 px), from the colour
    distance to the background colour relative to the distance of the fill colour."""
    x0, y0, x1, y1 = region
    crop = img[y0:y1, x0:x1]
    span = np.linalg.norm(np.asarray(fill) - np.asarray(bg))
    d = np.linalg.norm(crop - np.asarray(bg), axis=2)
    return np.clip(d / max(span, 1e-6), 0, 1)


def bbox(mask, thr=0.5):
    ys, xs = np.nonzero(mask > thr)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def largest_blob_bbox(mask):
    from scipy import ndimage
    lab, n = ndimage.label(mask)
    if n == 0:
        return None
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    ys, xs = np.nonzero(lab == k)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def edges(cov, thr=0.5):
    """Per row: sub-pixel left and right crossings of coverage thr, scanning from outside in
    (so holes from labels inside the shape don't matter). NaN where the row misses the shape."""
    n = cov.shape[0]
    L = np.full(n, np.nan)
    R = np.full(n, np.nan)
    for i in range(n):
        row = cov[i]
        idx = np.nonzero(row >= thr)[0]
        if len(idx) == 0:
            continue
        a, b = idx[0], idx[-1]
        if a > 0:
            L[i] = a - (row[a] - thr) / max(row[a] - row[a - 1], 1e-6) + 0.5
        else:
            L[i] = 0
        if b < len(row) - 1:
            R[i] = b + (row[b] - thr) / max(row[b] - row[b + 1], 1e-6) + 0.5
        else:
            R[i] = len(row)
    return L, R


def fit_corner(cov):
    """Fits a rounded rectangle to a soft-coverage crop holding one shape (with margin).
    Height = coverage sum down the middle column, width = widest row. Corner: per-row inset
    (W - w(y)) / 2 against a circular corner r - sqrt(r² - (r - d)²), d = depth from the top edge
    (top and bottom halves averaged). Also the area-equivalent circular radius from the missing
    corner area (4 · (1 - π/4) · r²). Returns pt; rms in px. A continuous (squircle) corner fits a
    circle worse and its area radius comes out smaller than its profile radius."""
    Hp, Wp = cov.shape
    lefts, rights = edges(cov)
    rows = np.where(np.isnan(lefts), 0, rights - lefts)
    W = rows.max()
    tops, bottoms = edges(cov.T)
    heights = np.where(np.isnan(tops), 0, bottoms - tops)
    H = heights.max()
    k = int(np.argmax(heights))
    y_t, y_b = tops[k], bottoms[k]
    yy = np.arange(Hp) + 0.5
    d = np.minimum(yy - y_t, y_b - yy)
    inset = (W - rows) / 2
    sel = (d > 0.5) & (d < H / 2)
    best = (0, 1e9)
    for r in np.arange(0.5, H / 2 + 0.01, 0.1):
        dd = d[sel]
        model = np.where(dd < r, r - np.sqrt(np.clip(r * r - (r - dd) ** 2, 0, None)), 0)
        err = np.sqrt(np.mean((model - inset[sel]) ** 2))
        if err < best[1]:
            best = (r, err)
    filled = rows.sum()
    deficit = max(W * H - filled, 0)
    r_area = np.sqrt(deficit / 4 / (1 - np.pi / 4))
    return {"width": round(W / S, 2), "height": round(H / S, 2), "radius": round(best[0] / S, 2),
            "radius_area": round(r_area / S, 2), "rms_px": round(best[1], 2)}


def median_colour(img, region):
    x0, y0, x1, y1 = region
    return np.median(img[y0:y1, x0:x1].reshape(-1, 3), axis=0)


def save(name, data):
    DATA.mkdir(exist_ok=True)
    (DATA / name).write_text(json.dumps(data, indent=1, sort_keys=True, default=lambda o: o.item() if hasattr(o, "item") else str(o)))
