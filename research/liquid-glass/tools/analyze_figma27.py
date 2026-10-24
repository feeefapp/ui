"""iOS 27 (Apple's Figma kit, figma27/*.png, 3x): interior transfer, edge profile, vertical profile.

    python3 analyze_figma27.py [sheet.png sizes.png]   → data/figma27.json (+ printed tables)

Layouts (pt, 3x renders), measured from the images:
  sheet: 5 × 4 tiles of 120 pt at a 130 pt pitch; backdrops 255, 235, 128, 26, 0; a 6 pt stripe
         across each tile's centre (black on 255/235, white on the rest); a circle centred in the
         tile, 48 pt (rows 0–2: regular light, regular dark, prominent) or 66 pt (row 3: clear).
  sizes: 4 × 2 tiles of 340 × 320 pt at 350 / 330 pt; backdrops white, ebebeb, a blue→orange
         gradient, 1a1a1a; a 160×44 bar at (90, 20) and a 300×200 capsule at (20, 100), each with a
         4 pt stripe through its centre. Row 0 light, row 1 dark.
Edge profile: luminance minus the bare backdrop by signed distance (1 px = ⅓ pt bins, negative
inside) in 8 normal directions (0° = right, 90° = down), away from the stripe.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FIG = ROOT / "figma27"
S = 3
SHEET_BG = [255, 235, 128, 26, 0]
SHEET_ROWS = [("regular", "light", 48), ("regular", "dark", 48), ("prominent", "light", 48), ("clear", "light", 66)]
SIZES_BG = ["ffffff", "ebebeb", "gradient", "1a1a1a"]


def load(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float64)


def circle_geo(cx, cy, r, h, w):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64) + 0.5
    dx, dy = xx - cx, yy - cy
    rr = np.hypot(dx, dy)
    return rr - r, dx / np.maximum(rr, 1e-9), dy / np.maximum(rr, 1e-9)


def capsule_geo(x, y, w, h, H, W):
    """Signed distance (px) of a capsule/rounded box with radius min(w, h)/2."""
    r = min(w, h) / 2
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64) + 0.5
    cx, cy = x + w / 2, y + h / 2
    qx = np.abs(xx - cx) - w / 2 + r
    qy = np.abs(yy - cy) - h / 2 + r
    ox, oy = np.maximum(qx, 0), np.maximum(qy, 0)
    out = np.hypot(ox, oy)
    d = out + np.minimum(np.maximum(qx, qy), 0) - r
    nx = np.where(out > 0, ox / np.maximum(out, 1e-9), np.where(qx > qy, 1.0, 0.0)) * np.sign(xx - cx)
    ny = np.where(out > 0, oy / np.maximum(out, 1e-9), np.where(qx > qy, 0.0, 1.0)) * np.sign(yy - cy)
    return d, nx, ny


def profile(lum, bg, d, nx, ny, stripe_mask, dmin=-12, dmax=9):
    """Δ luminance by distance bin (px) for 8 directions, stripe excluded."""
    ang = (np.degrees(np.arctan2(ny, nx)) + 360 + 22.5) % 360 // 45
    di = np.floor(d).astype(int)
    out = {}
    for a in range(8):
        row = []
        for k in range(dmin, dmax):
            m = (ang == a) & (di == k) & ~stripe_mask
            row.append(round(float(np.median(lum[m] - bg[m])), 1) if m.sum() > 3 else None)
        out[a * 45] = row
    return {"d_px": list(range(dmin, dmax)), "by_angle": out}


def main():
    sheet = load(sys.argv[1] if len(sys.argv) > 1 else FIG / "sheet-3x.png")
    sizes = load(sys.argv[2] if len(sys.argv) > 2 else FIG / "sizes-3x.png")
    result = {"sheet": {}, "sizes": {}}
    for row, (variant, scheme, size) in enumerate(SHEET_ROWS):
        for col, bgv in enumerate(SHEET_BG):
            y0, x0 = row * 390, col * 390
            tile = sheet[y0:y0 + 360, x0:x0 + 360]
            lum = tile.mean(axis=2)
            h, w = lum.shape
            d, nx, ny = circle_geo(180, 180, size * S / 2, h, w)
            stripe = np.abs(np.mgrid[0:h, 0:w][0] + 0.5 - 180) < 9 + 6
            bg = np.full_like(lum, float(bgv))
            inner = d < -9
            upper = inner & (np.mgrid[0:h, 0:w][0] < 180 - 15)
            lower = inner & (np.mgrid[0:h, 0:w][0] > 180 + 15)
            key = f"{variant}-{scheme}/{bgv}"
            result["sheet"][key] = {
                "upper": round(float(np.median(lum[upper])), 1),
                "lower": round(float(np.median(lum[lower])), 1),
                "edge": profile(lum, bg, d, nx, ny, stripe),
            }
    for row, scheme in enumerate(["light", "dark"]):
        for col, bgname in enumerate(SIZES_BG):
            y0, x0 = row * 990, col * 1050
            tile = sizes[y0:y0 + 960, x0:x0 + 1020]
            lum = tile.mean(axis=2)
            h, w = lum.shape
            # Bare backdrop: the tile's first row repeated (flat, or the horizontal gradient).
            bgimg = np.repeat(tile[2:3], h, axis=0)
            bg = bgimg.mean(axis=2)
            yy = np.mgrid[0:h, 0:w][0] + 0.5
            for name, (x, y, ww, hh), half in [("bar", (90, 20, 160, 44), 6), ("capsule", (20, 100, 300, 200), 6)]:
                d, nx, ny = capsule_geo(x * S, y * S, ww * S, hh * S, h, w)
                cy = (y + hh / 2) * S
                stripe = np.abs(yy - cy) < half + 9
                inner = (d < -12) & ~stripe
                key = f"{name}-{scheme}/{bgname}"
                entry = {
                    "edge": profile(lum, bg, d, nx, ny, stripe | (d < -40)),
                    "interior": round(float(np.median(lum[inner])), 1),
                    "backdrop": round(float(np.median(bg[inner])), 1),
                }
                # Chroma kept (gradient): mean (max−min) inside vs the backdrop under it.
                chroma = tile.max(axis=2) - tile.min(axis=2)
                bchroma = bgimg.max(axis=2) - bgimg.min(axis=2)
                entry["chroma_ratio"] = round(float(chroma[inner].mean() / max(bchroma[inner].mean(), 1e-6)), 3)
                # Vertical profile through the centre column band, interior only (pt from top).
                col_band = (np.abs(np.mgrid[0:h, 0:w][1] + 0.5 - (x + ww / 2) * S) < 30) & (d < -3) & ~stripe
                rows = []
                for k in range(int(y * S), int((y + hh) * S), 6):
                    m = col_band & (yy >= k) & (yy < k + 6)
                    if m.any():
                        rows.append([round((k - y * S) / S, 1), round(float(np.median(lum[m] - bg[m])), 1)])
                entry["vertical"] = rows
                result["sizes"][key] = entry
    (ROOT / "data" / "figma27.json").write_text(json.dumps(result, indent=1))
    print("interior (sheet, 48/66 pt, upper / lower half):")
    for k, v in result["sheet"].items():
        print(f"  {k:22s} {v['upper']:6.1f} / {v['lower']:6.1f}")
    print("interior (sizes): ")
    for k, v in result["sizes"].items():
        print(f"  {k:24s} backdrop {v['backdrop']:6.1f} → {v['interior']:6.1f}  chroma kept {v['chroma_ratio']}")


if __name__ == "__main__":
    main()
