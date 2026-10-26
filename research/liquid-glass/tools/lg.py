"""Shared helpers for decoding LGLab captures: image loading, shape geometry (signed distance in
device pixels, normals) and fringe decoding."""
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("LG_RAW", ROOT / "raw"))
DATA = ROOT / "data"
LAYOUTS = json.loads((ROOT / "app" / "layouts.json").read_text())
SCALE = LAYOUTS["screen"]["scale"]
PERIODS = [768, 192, 96]


def load(path, gray=False):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float64) / 255.0
    return a.mean(axis=2) if gray else a


def shapes(layout):
    return LAYOUTS["layouts"][layout]


def shape_sdf(shape, h, w):
    """Signed distance (device px, negative inside) and outward unit normal for every pixel centre.
    Circles and capsules are exact; rounded rects use circular corners (Apple draws continuous
    corners, which differ by well under a pixel except right at the corner apex)."""
    s = SCALE
    x0, y0, sw, sh = shape["x"] * s, shape["y"] * s, shape["w"] * s, shape["h"] * s
    if shape["kind"] in ("circle", "capsule"):
        r = min(sw, sh) / 2
    else:
        r = min(shape.get("r", 0) * s, sw / 2, sh / 2)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    px, py = xx + 0.5, yy + 0.5
    cx, cy = x0 + sw / 2, y0 + sh / 2
    qx = np.abs(px - cx) - sw / 2 + r
    qy = np.abs(py - cy) - sh / 2 + r
    ox, oy = np.maximum(qx, 0), np.maximum(qy, 0)
    outside = np.hypot(ox, oy)
    d = outside + np.minimum(np.maximum(qx, qy), 0) - r
    # Normal: in the corner region along (ox, oy); on the flat sides along the nearer side.
    nx = np.where(outside > 0, ox / np.maximum(outside, 1e-9), np.where(qx > qy, 1.0, 0.0))
    ny = np.where(outside > 0, oy / np.maximum(outside, 1e-9), np.where(qx > qy, 0.0, 1.0))
    nx *= np.sign(px - cx)
    ny *= np.sign(py - cy)
    return d, nx, ny, r


def decode_fringe(stack):
    """stack: 4 grey images I_k = A + B cos(phi + k*pi/2). Returns phi (0..2pi), B, A."""
    i0, i1, i2, i3 = stack
    c = (i0 - i2) / 2
    sn = (i3 - i1) / 2
    phi = np.mod(np.arctan2(sn, c), 2 * np.pi)
    return phi, np.hypot(c, sn), (i0 + i1 + i2 + i3) / 4


def fringe_set(glass, scheme, layout, axis):
    """Source coordinate (device px) per pixel along `axis`, plus modulation and mean per period."""
    out = {}
    coord = None
    for period in PERIODS:
        stack = [load(RAW / f"fringe/{glass}-{scheme}-{layout}-{axis}{period}-{k}.png", gray=True) for k in range(4)]
        phi, b, a = decode_fringe(stack)
        c = phi * period / (2 * np.pi)
        h, w = c.shape
        if coord is None:
            base = np.mgrid[0:h, 0:w][1 if axis == "x" else 0].astype(np.float64)
            # Coarsest period: unambiguous within ±period/2 of the pixel's own coordinate.
            coord = c + np.round((base - c) / period) * period
        else:
            coord = c + np.round((coord - c) / period) * period
        out[period] = {"mod": b, "mean": a}
    return coord, out
