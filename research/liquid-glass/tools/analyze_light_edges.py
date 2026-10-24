"""LIGHT-EDGES.md, step 1: the edge as a per-band layer.

For every (signed distance, edge-normal angle) bin the six flat backgrounds (white … black) give six
(bg, out) pairs; a line fit `out = g · bg + o` separates what the edge does:
  α = 1 − g   share of the backdrop replaced at that band (g > 1 = contrast boost),
  o           what the replacement adds (o / α = its grey level; 0 = a black layer, α = white).
Luminance = channel mean, sRGB 0–1, 1 device px bins (1/3 pt), 12 angle bins of 30° (0° = right,
90° = down). Background levels are taken from the glass=none capture.

    LG_RAW=../raw python3 analyze_light_edges.py <shot dir> <prefix> <label>
      shot dir: raw/lightedges (iOS, prefix "") or a kit render dir (lightedges_kit.mjs)
      → data/light-edges-<label>.json
"""
import json
import sys
from pathlib import Path

import numpy as np

from lg import DATA, RAW, SCALE, load, shape_sdf, shapes

FLATS = ["ffffff", "ebebeb", "d0d0d0", "808080", "1a1a1a", "000000"]
DMIN, DMAX = -45, 120  # device px (−15 pt … 40 pt)
BINS = 12
LAYOUT = "edges"


def tables(img, bins):
    """Median luminance per shape, angle bin, distance bin."""
    lum = img.mean(axis=2)
    out = {}
    for shape, (di, ang, sel) in bins.items():
        t = np.full((BINS, DMAX - DMIN), np.nan)
        flat_idx = (ang * (DMAX - DMIN) + (di - DMIN))[sel]
        vals = lum[sel]
        order = np.argsort(flat_idx, kind="stable")
        flat_idx, vals = flat_idx[order], vals[order]
        cuts = np.flatnonzero(np.diff(flat_idx)) + 1
        for chunk_i, chunk_v in zip(np.split(flat_idx, cuts), np.split(vals, cuts)):
            if chunk_v.size:
                t.flat[chunk_i[0]] = np.median(chunk_v)
        out[shape] = t
    return out


def geometry(h, w):
    bins = {}
    for s in shapes(LAYOUT):
        d, nx, ny, _ = shape_sdf(s, h, w)
        ang = ((np.degrees(np.arctan2(ny, nx)) + 360 + 15) % 360 // 30).astype(int)
        di = np.floor(d).astype(int)
        # Keep the bins of this shape only: within its box ± 45 pt.
        sel = (di >= DMIN) & (di < DMAX)
        bins[s["id"]] = (di, ang, sel)
    return bins


def main():
    shot_dir, prefix, label = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
    names = {"ios": ["regular", "clear"]}
    result = {"dmin_px": DMIN, "dmax_px": DMAX, "scale": SCALE, "angles": [i * 30 for i in range(BINS)], "fits": {}}
    bins = None
    levels = []
    for f in FLATS:
        none = load(RAW / f"lightedges/none-flat-{f}.png").mean(axis=2)
        levels.append(float(np.median(none)))
    result["levels"] = levels
    for glass in names["ios"]:
        for scheme in ["light", "dark"]:
            per_flat = []
            for f in FLATS:
                img = load(shot_dir / f"{prefix}{glass}-{scheme}-flat-{f}.png")
                if bins is None:
                    bins = geometry(*img.shape[:2])
                per_flat.append(tables(img, bins))
            key = f"{glass}-{scheme}"
            result["fits"][key] = {}
            x = np.array(levels)
            for sid in per_flat[0]:
                y = np.stack([p[sid] for p in per_flat])  # flats × angle × dist
                ok = np.all(np.isfinite(y), axis=0)
                xm = x.mean()
                ym = np.where(ok, y, 0).mean(axis=0)
                g = ((x - xm)[:, None, None] * (y - ym)).sum(axis=0) / ((x - xm) ** 2).sum()
                o = ym - g * xm
                res = np.sqrt(((y - (g * x[:, None, None] + o)) ** 2).mean(axis=0))
                g[~ok] = np.nan
                o[~ok] = np.nan
                res[~ok] = np.nan
                result["fits"][key][sid] = {
                    "g": np.round(g, 4).tolist(),
                    "o": np.round(o, 4).tolist(),
                    "rms": np.round(res, 4).tolist(),
                    "flats": [np.round(p[sid], 4).tolist() for p in per_flat],
                }
            print("fit", key, flush=True)
    DATA.mkdir(exist_ok=True)
    (DATA / f"light-edges-{label}.json").write_text(json.dumps(result, separators=(",", ":")).replace("NaN", "null"))


if __name__ == "__main__":
    main()
