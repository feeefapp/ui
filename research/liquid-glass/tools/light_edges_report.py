"""LIGHT-EDGES.md, step 2: metrics, the proposed edge terms applied to the kit's renders, and the
side-by-side images.

    LG_RAW=../raw python3 light_edges_report.py <kit render dir>
      → data/light-edges-metrics.json, reference/light-edges-*.png

Metrics (0–255 luminance or channel units):
  compare    mean |kit − iOS| over each shape's box + 16 pt, all channels (as compare_kit.py)
  silhouette mean over 12 normal directions of |L(−2…−⅓ pt) − L(⅓…2 pt)|, both from the same
             image: how much the edge stands out from what is right outside it
  band       luminance std and chroma in the edge band (−4…−⅓ pt) and interior (< −8 pt), as a
             ratio to the bare backdrop under the shape (textured backgrounds)

The proposal is simulated over the kit renders by `apply_proposal` (parameters from
data/light-edges-model.json, written by fit_light_edges.py); "kit + proposal" rows and the
`compare_plus` metric come from that simulation.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from lg import DATA, RAW, ROOT, SCALE, load, shape_sdf, shapes

BGS = ["flat-ffffff", "flat-ebebeb", "flat-d0d0d0", "lightphoto", "lightstripes", "text",
       "flat-808080", "flat-1a1a1a", "flat-000000", "darkphoto", "photo"]
TEXTURED = ["lightphoto", "lightstripes", "text", "photo", "darkphoto"]
SIDE_BGS = ["flat-ffffff", "flat-ebebeb", "lightphoto", "text", "flat-1a1a1a", "darkphoto"]
SIDE_SHAPES = ["circle44", "capsule132x44", "card240x160r28"]
MARGIN = 16
LIGHT = np.array([-np.sqrt(0.5), -np.sqrt(0.5)])  # toward the light (top-left), y down

_geo = {}


def geo(shape, h, w):
    if shape["id"] not in _geo:
        d, nx, ny, _ = shape_sdf(shape, h, w)
        _geo[shape["id"]] = ((d / SCALE).astype(np.float32), nx.astype(np.float32), ny.astype(np.float32))  # pt
    return _geo[shape["id"]]


def box(shape, margin=MARGIN):
    x0 = int((shape["x"] - margin) * SCALE)
    y0 = int((shape["y"] - margin) * SCALE)
    x1 = int((shape["x"] + shape["w"] + margin) * SCALE)
    y1 = int((shape["y"] + shape["h"] + margin) * SCALE)
    return slice(max(0, y0), y1), slice(max(0, x0), x1)


def silhouette(img, shape):
    h, w = img.shape[:2]
    d, nx, ny = geo(shape, h, w)
    sy, sx = box(shape, 4)
    d, nx, ny, lum = d[sy, sx], nx[sy, sx], ny[sy, sx], img[sy, sx].mean(axis=2)
    ang = ((np.degrees(np.arctan2(ny, nx)) + 375) % 360 // 30).astype(int)
    vals = []
    for a in range(12):
        inner = lum[(ang == a) & (d > -2) & (d < -1 / 3)]
        outer = lum[(ang == a) & (d > 1 / 3) & (d < 2)]
        if inner.size and outer.size:
            vals.append(abs(inner.mean() - outer.mean()))
    return 255 * float(np.mean(vals))


def band_stats(img, none, shape):
    h, w = img.shape[:2]
    d, _, _ = geo(shape, h, w)
    sy, sx = box(shape, 0)
    d, im, bg = d[sy, sx], img[sy, sx], none[sy, sx]
    inside = d < 0
    lum_bg = bg.mean(axis=2)[inside]
    chroma_bg = (bg.max(axis=2) - bg.min(axis=2))[inside]
    out = {}
    for name, m in (("band", (d > -4) & (d < -1 / 3)), ("interior", d < -8)):
        if not m.any():
            continue
        lum = im.mean(axis=2)[m]
        chroma = (im.max(axis=2) - im.min(axis=2))[m]
        out[name] = {
            "std_ratio": round(float(lum.std() / max(lum_bg.std(), 1e-6)), 3),
            "chroma_ratio": round(float(chroma.mean() / max(chroma_bg.mean(), 1e-6)), 3),
            "lum": round(255 * float(lum.mean()), 1),
        }
    out["backdrop_lum"] = round(255 * float(lum_bg.mean()), 1)
    return out


def edge_terms(params, t, cosabs):
    w0, w1, pw, wt, k0, k1, kt = (params[n] for n in ["w0", "w1", "p", "wt", "k0", "k1", "kt"])
    W = np.clip((w0 + w1 * cosabs ** pw) * np.clip(1 - (t / wt) ** 3, 0, 1), 0, 0.98)
    K = np.clip((k0 + k1 * cosabs) * np.clip(1 - t / kt, 0, 1), -1, 1)
    return W, K


def apply_proposal(img, glass, scheme, prop, none=None):
    """The proposed material over a kit render (simulation only, LIGHT-EDGES.md "Proposal"):
    1. remove the kit's rim (its fitted W, data/light-edges-model.json kit/*),
    2. clear: undo the kit's white-preserving lift (0.924·x + 0.076) and apply the measured
       min(1, 1.03·x + 0.076) with a 1.6 pt blur inside the glass,
    3. add the proposed edge: white layer W and veil thinning K (iOS fits, ios/*); clear dark uses
       the additive rim M + |cos a|^1.1 · (0.106 + 0.31·x) · profile instead of a white layer."""
    if not prop:
        return img
    from scipy.ndimage import gaussian_filter
    fits = prop["fits"]
    steps = prop.get("steps", ("rim", "lift", "blur", "edge"))
    key = f"{glass}-{scheme}"
    kit_p = fits[f"kit/{key}"]["params"]
    ios_p = fits[f"ios/{key}"]["params"]
    out = img.copy()
    h, w = img.shape[:2]
    for shape in shapes("edges"):
        d, nx, ny = geo(shape, h, w)
        sy, sx = box(shape, 4)
        dd = d[sy, sx]
        inside = dd < 0
        t = np.maximum(0, -dd)
        cosabs = np.abs(nx[sy, sx] * LIGHT[0] + ny[sy, sx] * LIGHT[1])
        y = out[sy, sx].copy()
        Wk, _ = edge_terms(kit_p, t, cosabs)
        if "edge" not in steps:
            Wk = Wk * 0
        base = (y - Wk[..., None]) / (1 - Wk[..., None])
        x = none[sy, sx] if none is not None else base
        if glass == "clear" and "lift" in steps:
            xh = np.clip((base - 0.076) / 0.924, 0, 1)
            # Blur σ 1.6 pt inside the glass (normalized so outside pixels do not leak in).
            m = inside.astype(float)
            sig = 1.6 * SCALE if "blur" in steps else 0.01
            num = np.stack([gaussian_filter(xh[..., c] * m, sig) for c in range(3)], -1)
            den = gaussian_filter(m, sig)[..., None]
            xb = np.where(den > 1e-3, num / np.maximum(den, 1e-3), xh)
            M = np.clip(1.03 * xb + 0.076, 0, 1)
            x = xh
        else:
            M = base
        if "edge" not in steps:
            new = M
        elif key == "clear-dark":
            prof = np.clip(1 - (t / 1.17) ** 3, 0, 1)
            new = np.clip(M + (cosabs ** 1.1 * prof)[..., None] * (0.106 + 0.31 * x), 0, 1)
        else:
            W, K = edge_terms(ios_p, t, cosabs)
            new = (1 - W[..., None]) * (M + K[..., None] * (x - M)) + W[..., None]
        out[sy, sx] = np.where(inside[..., None], np.clip(new, 0, 1), y)
    return out


def crop(img, shape, margin=20):
    sy, sx = box(shape, margin)
    return (np.clip(img[sy, sx], 0, 1) * 255).astype(np.uint8)


def side_by_side(rows, labels, cols, path):
    """rows: list of row lists of uint8 crops (same shapes per column)."""
    pad, lab = 6, 34
    widths = [c.shape[1] for c in rows[0]]
    heights = [r[0].shape[0] for r in rows]
    W = sum(widths) + pad * (len(widths) + 1) + 150
    H = sum(heights) + pad * (len(rows) + 1) + lab
    canvas = Image.new("RGB", (W, H), (128, 128, 128))
    draw = ImageDraw.Draw(canvas)
    x = 150 + pad
    for c, wd in zip(cols, widths):
        draw.text((x, 10), c, fill=(255, 255, 255))
        x += wd + pad
    y = lab + pad
    for row, label, ht in zip(rows, labels, heights):
        draw.text((8, y + ht // 2 - 6), label, fill=(255, 255, 255))
        x = 150 + pad
        for c in row:
            canvas.paste(Image.fromarray(c), (x, y))
            x += c.shape[1] + pad
        y += ht + pad
    canvas.save(path)


def main():
    """light_edges_report.py <kit dir> [<kit after dir>]: with an after dir (the real built kit after
    the change), the third row and `compare_plus` are that render instead of the simulation, and
    the metrics go to data/light-edges-metrics-after.json."""
    kit_dir = Path(sys.argv[1])
    after_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    prop_path = DATA / "light-edges-model.json"
    prop = json.loads(prop_path.read_text()) if prop_path.exists() else None
    metrics = {}
    ref = ROOT / "reference"
    for glass in ["clear", "regular"]:
        for scheme in ["light", "dark"]:
            key = f"{glass}-{scheme}"
            side = {s: {"ios": [], "kit": [], "plus": []} for s in SIDE_SHAPES}
            for bg in BGS:
                ios = load(RAW / f"lightedges/{glass}-{scheme}-{bg}.png")
                none = load(RAW / f"lightedges/none-{bg}.png")
                kit = load(kit_dir / f"{glass}-{scheme}-{bg}.png")
                plus = load(after_dir / f"{glass}-{scheme}-{bg}.png") if after_dir else apply_proposal(kit, glass, scheme, prop, none)
                m = {}
                for s in shapes("edges"):
                    sy, sx = box(s)
                    e = {
                        "compare": round(255 * float(np.abs(kit[sy, sx] - ios[sy, sx]).mean()), 2),
                        "compare_plus": round(255 * float(np.abs(plus[sy, sx] - ios[sy, sx]).mean()), 2),
                        "silhouette": {"ios": round(silhouette(ios, s), 2), "kit": round(silhouette(kit, s), 2),
                                       "plus": round(silhouette(plus, s), 2), "none": round(silhouette(none, s), 2)},
                    }
                    if bg in TEXTURED:
                        e["band"] = {"ios": band_stats(ios, none, s), "kit": band_stats(kit, none, s)}
                    m[s["id"]] = e
                    if s["id"] in side and bg in SIDE_BGS:
                        side[s["id"]]["ios"].append(crop(ios, s))
                        side[s["id"]]["kit"].append(crop(kit, s))
                        side[s["id"]]["plus"].append(crop(plus, s))
                metrics[f"{key}/{bg}"] = m
                c = np.mean([v["compare"] for v in m.values()])
                cp = np.mean([v["compare_plus"] for v in m.values()])
                si = np.mean([v["silhouette"]["ios"] for v in m.values()])
                sk = np.mean([v["silhouette"]["kit"] for v in m.values()])
                sp = np.mean([v["silhouette"]["plus"] for v in m.values()])
                print(f"{key:14s} {bg:13s} compare {c:5.2f} → {cp:5.2f}   silhouette iOS {si:5.1f} kit {sk:5.1f} kit+ {sp:5.1f}", flush=True)
            for sid, rows in side.items():
                # One image per shape and material: columns = backgrounds, rows = iOS / kit / kit+.
                side_by_side([rows["ios"], rows["kit"], rows["plus"]],
                             ["iOS 26.2", "kit before", "kit after"] if after_dir else ["iOS 26.2", "kit today", "kit + proposal"], SIDE_BGS,
                             ref / (f"light-edges-after-{key}-{sid}.png" if after_dir else f"light-edges-{key}-{sid}.png"))
    (DATA / ("light-edges-metrics-after.json" if after_dir else "light-edges-metrics.json")).write_text(json.dumps(metrics, indent=1))


if __name__ == "__main__":
    main()
