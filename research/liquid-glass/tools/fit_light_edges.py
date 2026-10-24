"""LIGHT-EDGES.md, step 3: one parametric edge model, fitted to iOS and to the kit on the six flats.

At depth t (pt, inward from the outline) and angle a between the edge normal and the light axis
(top-left ↔ bottom-right), with x the backdrop and M(x) the interior result of the material:

    out = (1 − W) · (M + K · (x − M)) + W
    W(t, a) = (w0 + w1 · |cos a| ^ p) · (1 − (t / wt) ^ 3)₊      white specular layer
    K(t, a) = (k0 + k1 · |cos a|) · (1 − t / kt)₊                 veil thinning (share of M given back to x)

M(x) is the measured interior transfer of the same shape (interpolated over the flat levels), so
the fit only describes what the edge adds. Samples: device px 0..5 inward, 15° angle bins,
shapes circle44/88, capsule132x44/300x64 (exact outlines); clipped points (≥ 0.985) dropped.

    LG_RAW=../raw python3 fit_light_edges.py      → data/light-edges-model.json
"""
import json

import numpy as np
from scipy.optimize import least_squares

from lg import DATA, RAW, SCALE, load, shape_sdf, shapes

FLATS = ["ffffff", "ebebeb", "d0d0d0", "808080", "1a1a1a", "000000"]
SHAPES = ["circle88", "capsule132x44", "circle44", "capsule300x64"]  # exact outlines only (iOS cards have continuous corners)
KEYS = ["clear-light", "clear-dark", "regular-light", "regular-dark"]
NAMES = ["w0", "w1", "p", "wt", "k0", "k1", "kt"]


def samples(shot, key, levels):
    imgs = [load(f"{shot}/{key}-flat-{f}.png").mean(axis=2) for f in FLATS]
    h, w = imgs[0].shape
    rows = []
    for s in shapes("edges"):
        if s["id"] not in SHAPES:
            continue
        d, nx, ny, _ = shape_sdf(s, h, w)
        ang = (np.degrees(np.arctan2(ny, nx)) + 360) % 360
        off = np.abs(((ang - 45 + 90) % 180) - 90)
        inner = (d < -6 * SCALE) & (d > -9 * SCALE)
        interior = np.array([np.median(i[inner]) for i in imgs])
        order = np.argsort(levels)
        for k in range(6):
            band = (d >= -(k + 1)) & (d < -k)
            for a in range(0, 91, 15):
                m = band & (np.abs(off - a) < 7.5)
                if not m.any():
                    continue
                for fi in range(6):
                    x = levels[fi]
                    M = np.interp(x, levels[order], interior[order])
                    y = float(np.median(imgs[fi][m]))
                    if y < 0.985 and M < 0.985:
                        rows.append((k / SCALE + 0.5 / SCALE, np.radians(a), x, M, y, s["id"]))
    return rows


def model(p, t, a, x, M):
    w0, w1, pw, wt, k0, k1, kt = p
    c = np.abs(np.cos(a))
    W = (w0 + w1 * c ** pw) * np.clip(1 - (t / wt) ** 3, 0, 1)
    K = (k0 + k1 * c) * np.clip(1 - t / kt, 0, 1)
    return (1 - W) * (M + K * (x - M)) + W


def fit(rows):
    t, a, x, M, y = (np.array([r[i] for r in rows]) for i in range(5))
    res = least_squares(lambda p: model(p, t, a, x, M) - y, [0.1, 0.4, 1, 1, 0, 0, 0.5],
                        bounds=([-0.5, -1, 0.2, 0.2, -2, -2, 0.1], [1, 1.5, 4, 2.5, 2, 2, 2]))
    rms = float(np.sqrt(np.mean(res.fun ** 2))) * 255
    return dict(zip(NAMES, np.round(res.x, 3).tolist())), round(rms, 2), len(rows)


def main():
    levels = np.array([np.median(load(RAW / f"lightedges/none-flat-{f}.png").mean(axis=2)) for f in FLATS])
    out = {"model": __doc__.split("\n\n")[1].strip(), "fits": {}}
    for src, shot in [("ios", RAW / "lightedges"), ("kit", RAW / "lightedges-kit")]:
        for key in KEYS:
            params, rms, n = fit(samples(shot, key, levels))
            out["fits"][f"{src}/{key}"] = {"params": params, "rms_255": rms, "n": n}
            print(f"{src} {key:14s} rms {rms:5.2f} (n {n})  " + "  ".join(f"{k} {v:6.3f}" for k, v in params.items()), flush=True)
    (DATA / "light-edges-model.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
